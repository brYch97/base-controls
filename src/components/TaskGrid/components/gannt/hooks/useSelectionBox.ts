import { GanttStatic } from 'dhtmlx-gantt';
import { useEffect, useRef, useState } from 'react';
import { ITaskDataProvider } from '../../../providers';

interface IUseSelectionBoxParams {
	container: HTMLDivElement | null;
	gantt: GanttStatic;
	dataProvider: ITaskDataProvider;
}

interface IPoint {
	x: number;
	y: number;
}

export interface ISelectionBoxState {
	left: number;
	top: number;
	width: number;
	height: number;
}

interface IDragState {
	anchor: IPoint;
	additive: boolean;
}

const DRAG_THRESHOLD = 4;
const AUTO_SCROLL_EDGE_SIZE = 32;
const AUTO_SCROLL_STEP = 24;
const SELECTION_PREVIEW_CLASS = 'gantt_selection_preview';

export const useSelectionBox = (params: IUseSelectionBoxParams) => {
	const [selectionBox, setSelectionBox] = useState<ISelectionBoxState | null>(null);
	const bufferedSelectionRef = useRef<string[] | null>(null);
	const lastMouseEventRef = useRef<MouseEvent | null>(null);
	const autoScrollFrameRef = useRef<number | null>(null);
	const dragStateRef = useRef<IDragState | null>(null);
	const dragStartSelectionRef = useRef<Set<string>>(new Set<string>());

	useEffect(() => {
		if (!params.container) {
			return;
		}

		const timelineContainer = params.container.querySelector<HTMLElement>('.gantt_data_area');

		const getContainerPoint = (event: MouseEvent): IPoint => {
			const rect = params.container!.getBoundingClientRect();
			return {
				x: event.clientX - rect.left,
				y: event.clientY - rect.top,
			};
		};

		const getTaskBarIdsInRect = (rect: ISelectionBoxState): string[] => {
			const taskAttr = params.gantt.config.task_attribute;
			const containerRect = params.container!.getBoundingClientRect();
			const taskNodes = params.container!.querySelectorAll<HTMLElement>(`.gantt_task_line[${taskAttr}]`);
			const selectedIds: string[] = [];

			taskNodes.forEach(taskNode => {
				const taskId = taskNode.getAttribute(taskAttr);
				if (!taskId || !params.gantt.isTaskExists(taskId) || !params.gantt.isTaskVisible(taskId)) {
					return;
				}

				const taskRect = taskNode.getBoundingClientRect();
				const relativeRect = {
					left: taskRect.left - containerRect.left,
					top: taskRect.top - containerRect.top,
					right: taskRect.right - containerRect.left,
					bottom: taskRect.bottom - containerRect.top,
				};

				const intersects = !(
					relativeRect.right < rect.left ||
					relativeRect.left > rect.left + rect.width ||
					relativeRect.bottom < rect.top ||
					relativeRect.top > rect.top + rect.height
				);

				if (intersects) {
					selectedIds.push(taskId);
				}
			});

			return selectedIds;
		};

		const updatePreviewClasses = (taskIds: string[]) => {
			const taskAttr = params.gantt.config.task_attribute;
			const previewTaskIds = new Set(taskIds);
			const previewNodes = params.container!.querySelectorAll<HTMLElement>(`.${SELECTION_PREVIEW_CLASS}`);

			previewNodes.forEach(node => node.classList.remove(SELECTION_PREVIEW_CLASS));

			if (previewTaskIds.size === 0) {
				return;
			}

			const taskNodes = params.container!.querySelectorAll<HTMLElement>(`[${taskAttr}]`);
			taskNodes.forEach(taskNode => {
				const taskId = taskNode.getAttribute(taskAttr);
				if (taskId && previewTaskIds.has(taskId)) {
					taskNode.classList.add(SELECTION_PREVIEW_CLASS);
				}
			});
		};

		const updateBufferedSelection = (event: MouseEvent) => {
			const dragState = dragStateRef.current;
			if (!dragState) {
				return;
			}

			const current = getContainerPoint(event);
			const left = Math.min(dragState.anchor.x, current.x);
			const top = Math.min(dragState.anchor.y, current.y);
			const width = Math.abs(current.x - dragState.anchor.x);
			const height = Math.abs(current.y - dragState.anchor.y);

			if (width < DRAG_THRESHOLD && height < DRAG_THRESHOLD) {
				setSelectionBox(null);
				bufferedSelectionRef.current = null;
				updatePreviewClasses([]);
				return;
			}

			const nextBox = { left, top, width, height };
			setSelectionBox(nextBox);

			const taskIdsInRect = getTaskBarIdsInRect(nextBox);
			const nextSelectedIds = dragState.additive
				? Array.from(new Set([...dragStartSelectionRef.current, ...taskIdsInRect]))
				: taskIdsInRect;

			bufferedSelectionRef.current = nextSelectedIds;
			updatePreviewClasses(taskIdsInRect);
		};

		const stopAutoScroll = () => {
			if (autoScrollFrameRef.current !== null) {
				cancelAnimationFrame(autoScrollFrameRef.current);
				autoScrollFrameRef.current = null;
			}
		};

		const tickAutoScroll = () => {
			if (!dragStateRef.current || !timelineContainer || !lastMouseEventRef.current) {
				stopAutoScroll();
				return;
			}

			const timelineRect = timelineContainer.getBoundingClientRect();
			const pointerY = lastMouseEventRef.current.clientY;
			let nextScrollTop = timelineContainer.scrollTop;

			if (pointerY <= timelineRect.top + AUTO_SCROLL_EDGE_SIZE) {
				nextScrollTop = Math.max(0, timelineContainer.scrollTop - AUTO_SCROLL_STEP);
			}
			else if (pointerY >= timelineRect.bottom - AUTO_SCROLL_EDGE_SIZE) {
				const maxScrollTop = timelineContainer.scrollHeight - timelineContainer.clientHeight;
				nextScrollTop = Math.min(maxScrollTop, timelineContainer.scrollTop + AUTO_SCROLL_STEP);
			}

			if (nextScrollTop !== timelineContainer.scrollTop) {
				params.gantt.scrollTo(undefined, nextScrollTop);
				updateBufferedSelection(lastMouseEventRef.current);
				autoScrollFrameRef.current = requestAnimationFrame(tickAutoScroll);
				return;
			}

			stopAutoScroll();
		};

		const scheduleAutoScroll = (event: MouseEvent) => {
			if (!timelineContainer) {
				return;
			}

			const timelineRect = timelineContainer.getBoundingClientRect();
			const shouldAutoScroll = event.clientY <= timelineRect.top + AUTO_SCROLL_EDGE_SIZE || event.clientY >= timelineRect.bottom - AUTO_SCROLL_EDGE_SIZE;

			if (!shouldAutoScroll) {
				stopAutoScroll();
				return;
			}

			if (autoScrollFrameRef.current === null) {
				autoScrollFrameRef.current = requestAnimationFrame(tickAutoScroll);
			}
		};

		const onMouseDown = (event: MouseEvent) => {
			if (event.button !== 0) {
				return;
			}

			const target = event.target as HTMLElement | null;
			const timelineArea = target?.closest('.gantt_task_bg, .gantt_task_data, .gantt_bars_area, .gantt_task_cell');
			if (!timelineArea) {
				return;
			}

			dragStartSelectionRef.current = new Set(params.dataProvider.getSelectedRecordIds());
			dragStateRef.current = {
				anchor: getContainerPoint(event),
				additive: Boolean(event.ctrlKey || event.metaKey),
			};
			lastMouseEventRef.current = event;
			bufferedSelectionRef.current = null;
			updatePreviewClasses([]);
			setSelectionBox(null);
		};

		const onMouseMove = (event: MouseEvent) => {
			if (!dragStateRef.current) {
				return;
			}

			lastMouseEventRef.current = event;
			updateBufferedSelection(event);
			scheduleAutoScroll(event);
		};

		const onMouseUp = () => {
			stopAutoScroll();
			if (bufferedSelectionRef.current) {
				params.dataProvider.setSelectedRecordIds(bufferedSelectionRef.current);
			}

			dragStateRef.current = null;
			lastMouseEventRef.current = null;
			bufferedSelectionRef.current = null;
            setTimeout(() => updatePreviewClasses([]), 0);
			setSelectionBox(null);
		};

		params.container.addEventListener('mousedown', onMouseDown);
		window.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mouseup', onMouseUp);

		return () => {
			stopAutoScroll();
			updatePreviewClasses([]);
			params.container?.removeEventListener('mousedown', onMouseDown);
			window.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('mouseup', onMouseUp);
		};
	}, [params.container, params.dataProvider, params.gantt]);

	return selectionBox;
}