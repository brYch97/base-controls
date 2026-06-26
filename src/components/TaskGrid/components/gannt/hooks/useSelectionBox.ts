import { GanttStatic } from 'gantt-trial';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ITaskDataProvider } from '../../../providers';

interface IUseSelectionBoxParams {
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
	hasDragged: boolean;
}

const DRAG_THRESHOLD = 4;
const AUTO_SCROLL_EDGE_SIZE = 32;
const AUTO_SCROLL_STEP = 24;
export const GANTT_SHIFT_HELD_CLASS = 'gantt_shift_held';
export const GANTT_TASK_LINE_CLASS = 'gantt_task_line';
export const GANTT_TASK_LINK_CLASS = 'gantt_task_link';
const SELECTION_PREVIEW_CLASS = 'gantt_selection_preview';

export const useSelectionBox = (params: IUseSelectionBoxParams) => {
	const [selectionBox, setSelectionBox] = useState<ISelectionBoxState | null>(null);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const bufferedSelectionRef = useRef<string[] | null>(null);
	const lastMouseEventRef = useRef<MouseEvent | null>(null);
	const autoScrollFrameRef = useRef<number | null>(null);
	const dragStateRef = useRef<IDragState | null>(null);
	const dragStartSelectionRef = useRef<Set<string>>(new Set<string>());
	const { gantt, dataProvider } = params;

	const getContainerPoint = (event: MouseEvent): IPoint => {
		const rect = containerRef.current!.getBoundingClientRect();
		return {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top,
		};
	};

	const getTaskBarIdsInRect = (rect: ISelectionBoxState): string[] => {
		const taskAttr = gantt.config.task_attribute;
		const containerRect = containerRef.current!.getBoundingClientRect();
		const selectedIds: string[] = [];

		// Check both the task bar and its left-side outside label.
		const nodes = containerRef.current!.querySelectorAll<HTMLElement>(
			`.gantt_task_line[${taskAttr}], .gantt_left`
		);

		nodes.forEach(node => {
			const taskId = node.getAttribute(taskAttr)
				?? node.closest<HTMLElement>(`[${taskAttr}]`)?.getAttribute(taskAttr);
			if (!taskId || !gantt.isTaskExists(taskId) || !gantt.isTaskVisible(taskId)) {
				return;
			}

			const nodeRect = node.getBoundingClientRect();
			const relativeRect = {
				left: nodeRect.left - containerRect.left,
				top: nodeRect.top - containerRect.top,
				right: nodeRect.right - containerRect.left,
				bottom: nodeRect.bottom - containerRect.top,
			};

			const intersects = !(
				relativeRect.right < rect.left ||
				relativeRect.left > rect.left + rect.width ||
				relativeRect.bottom < rect.top ||
				relativeRect.top > rect.top + rect.height
			);

			if (intersects && !selectedIds.includes(taskId)) {
				selectedIds.push(taskId);
			}
		});

		return selectedIds;
	};

	const updatePreviewClasses = (taskIds: string[]) => {
		const taskAttr = gantt.config.task_attribute;
		const previewTaskIds = new Set(taskIds);
		const previewNodes = containerRef.current!.querySelectorAll<HTMLElement>(`.${SELECTION_PREVIEW_CLASS}`);

		previewNodes.forEach(node => node.classList.remove(SELECTION_PREVIEW_CLASS));

		if (previewTaskIds.size === 0) {
			return;
		}

		const taskNodes = containerRef.current!.querySelectorAll<HTMLElement>(`[${taskAttr}]`);
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

	const stopAutoScroll = useCallback(() => {
		if (autoScrollFrameRef.current !== null) {
			cancelAnimationFrame(autoScrollFrameRef.current);
			autoScrollFrameRef.current = null;
		}
	}, []);

	const getTimelineContainer = () => containerRef.current?.querySelector<HTMLElement>('.gantt_data_area') ?? null;

	const setShiftClass = useCallback((held: boolean) => {
		containerRef.current?.classList.toggle(GANTT_SHIFT_HELD_CLASS, held);
	}, []);

	const tickAutoScroll = () => {
		const timelineContainer = getTimelineContainer();
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
			gantt.scrollTo(undefined, nextScrollTop);
			updateBufferedSelection(lastMouseEventRef.current);
			autoScrollFrameRef.current = requestAnimationFrame(tickAutoScroll);
			return;
		}

		stopAutoScroll();
	};

	const scheduleAutoScroll = (event: MouseEvent) => {
		const timelineContainer = getTimelineContainer();
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

	const onMouseDown = useCallback((event: MouseEvent) => {
		if (event.button !== 0 || !event.shiftKey) {
			return;
		}

		const target = event.target as HTMLElement | null;
		const startedOnTask = target?.closest('.gantt_task_line, .gantt_task_content, .gantt_task_drag, .gantt_link_control');
		if (startedOnTask) {
			return;
		}

		const timelineArea = target?.closest('.gantt_task_bg, .gantt_task_cell');
		if (!timelineArea) {
			return;
		}

		dragStartSelectionRef.current = new Set(dataProvider.getSelectedRecordIds());
		dragStateRef.current = {
			anchor: getContainerPoint(event),
			additive: Boolean(event.ctrlKey || event.metaKey),
			hasDragged: false,
		};
		lastMouseEventRef.current = event;
		bufferedSelectionRef.current = null;
		updatePreviewClasses([]);
		setSelectionBox(null);
		event.preventDefault();
		event.stopPropagation();
	}, []);

	const onMouseMove = useCallback((event: MouseEvent) => {
		if (!dragStateRef.current) {
			return;
		}

		lastMouseEventRef.current = event;
		updateBufferedSelection(event);
		if (dragStateRef.current?.hasDragged || bufferedSelectionRef.current) {
			dragStateRef.current!.hasDragged = true;
			event.preventDefault();
		}
		scheduleAutoScroll(event);
	}, []);

	const onMouseUp = useCallback((event: MouseEvent) => {
		if (dragStateRef.current?.hasDragged || bufferedSelectionRef.current) {
			event.preventDefault();
			if ('stopPropagation' in event) {
				event.stopPropagation();
			}
		}

		stopAutoScroll();
		if (bufferedSelectionRef.current) {
			dataProvider.setSelectedRecordIds(bufferedSelectionRef.current);
		}

		dragStateRef.current = null;
		lastMouseEventRef.current = null;
		bufferedSelectionRef.current = null;
		setTimeout(() => updatePreviewClasses([]), 0);
		setSelectionBox(null);
	}, []);

	const onKeyDown = useCallback((event: KeyboardEvent) => {
		if (event.key === 'Shift') {
			setShiftClass(true);
		}
	}, []);

	const onKeyUp = useCallback((event: KeyboardEvent) => {
		if (event.key === 'Shift') {
			setShiftClass(false);
		}
	}, []);

	const onBlur = useCallback(() => {
		setShiftClass(false);
	}, []);

	const init = (container: HTMLDivElement) => {
		containerRef.current = container;
		container.tabIndex = container.tabIndex >= 0 ? container.tabIndex : 0;
		container.addEventListener('mousedown', onMouseDown);
		container.addEventListener('mousemove', onMouseMove);
		container.addEventListener('mouseup', onMouseUp);
		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('keyup', onKeyUp);
		window.addEventListener('blur', onBlur);
	};

	useEffect(() => {
		return () => {
			stopAutoScroll();
			if (containerRef.current) {
				setShiftClass(false);
				updatePreviewClasses([]);
				containerRef.current.removeEventListener('mousedown', onMouseDown);
				containerRef.current.removeEventListener('mousemove', onMouseMove);
				containerRef.current.removeEventListener('mouseup', onMouseUp);
			}
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('keyup', onKeyUp);
			window.removeEventListener('blur', onBlur);
		};
	}, [onBlur, onKeyDown, onKeyUp, onMouseDown, onMouseMove, onMouseUp]);

	return {
		selectionBox: {
			state: selectionBox,
			init,
		}
	};
}