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

interface IRectangle {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

export interface ISelectionBoxState {
	left: number;
	top: number;
	width: number;
	height: number;
}

interface IDragSession {
	anchor: IPoint;
	pointerClient: IPoint;
	hasDragged: boolean;
	selectionIds: string[];
	renderedPreviewIds: Set<string>;
	renderedBoxKey: string | null;
	lastRenderedBox: ISelectionBoxState | null;
	lastComputedBox: ISelectionBoxState | null;
}

const DRAG_THRESHOLD = 4;
const AUTO_SCROLL_EDGE_SIZE = 32;
const AUTO_SCROLL_STEP = 24;

export const GANTT_SHIFT_HELD_CLASS = 'gantt_shift_held';
export const GANTT_TASK_LINE_CLASS = 'gantt_task_line';
export const GANTT_TASK_LINK_CLASS = 'gantt_task_link';

const SELECTION_PREVIEW_CLASS = 'gantt_selection_preview';
const TASK_SELECTION_QUERY = '.gantt_task_line, .gantt_left';
const DRAG_START_BLOCKERS_QUERY = '.gantt_task_line, .gantt_task_content, .gantt_task_drag, .gantt_link_control';
const TIMELINE_AREA_QUERY = '.gantt_task_bg, .gantt_task_cell';
const TIMELINE_CONTAINER_QUERY = '.gantt_data_area';

export const useSelectionBox = (params: IUseSelectionBoxParams) => {
	const { gantt, dataProvider } = params;
	const [selectionBox, setSelectionBox] = useState<ISelectionBoxState | null>(null);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const dragSessionRef = useRef<IDragSession | null>(null);
	const autoScrollFrameRef = useRef<number | null>(null);

	const getTimelineContainer = useCallback(() => {
		return containerRef.current?.querySelector<HTMLElement>(TIMELINE_CONTAINER_QUERY) ?? null;
	}, []);

	const setShiftClass = useCallback((held: boolean) => {
		containerRef.current?.classList.toggle(GANTT_SHIFT_HELD_CLASS, held);
	}, []);

	const clearPreviewClasses = useCallback(() => {
		containerRef.current
			?.querySelectorAll<HTMLElement>(`.${SELECTION_PREVIEW_CLASS}`)
			.forEach(node => node.classList.remove(SELECTION_PREVIEW_CLASS));
	}, []);

	const stopAutoScroll = useCallback(() => {
		if (autoScrollFrameRef.current !== null) {
			cancelAnimationFrame(autoScrollFrameRef.current);
			autoScrollFrameRef.current = null;
		}
	}, []);

	const getContainerPoint = useCallback((clientPoint: IPoint): IPoint => {
		const rect = containerRef.current?.getBoundingClientRect();
		if (!rect) {
			return { x: 0, y: 0 };
		}

		return {
			x: clientPoint.x - rect.left,
			y: clientPoint.y - rect.top,
		};
	}, []);

	const getContentPoint = useCallback((clientPoint: IPoint): IPoint => {
		const containerPoint = getContainerPoint(clientPoint);
		const timelineContainer = getTimelineContainer();

		return {
			x: containerPoint.x + (timelineContainer?.scrollLeft ?? 0),
			y: containerPoint.y + (timelineContainer?.scrollTop ?? 0),
		};
	}, [getContainerPoint, getTimelineContainer]);

	const getContentRectangle = useCallback((anchor: IPoint, pointerClient: IPoint): IRectangle => {
		const current = getContentPoint(pointerClient);

		return {
			left: Math.min(anchor.x, current.x),
			top: Math.min(anchor.y, current.y),
			right: Math.max(anchor.x, current.x),
			bottom: Math.max(anchor.y, current.y),
		};
	}, [getContentPoint]);

	const getViewportSelectionBox = useCallback((rect: IRectangle): ISelectionBoxState => {
		const timelineContainer = getTimelineContainer();
		const scrollLeft = timelineContainer?.scrollLeft ?? 0;
		const scrollTop = timelineContainer?.scrollTop ?? 0;

		return {
			left: rect.left - scrollLeft,
			top: rect.top - scrollTop,
			width: rect.right - rect.left,
			height: rect.bottom - rect.top,
		};
	}, [getTimelineContainer]);

	const getTaskIdsInContentRectangle = useCallback((contentRect: IRectangle): string[] => {
		const container = containerRef.current;
		const timelineContainer = getTimelineContainer();
		if (!container || !timelineContainer) {
			return [];
		}

		const taskAttribute = gantt.config.task_attribute;
		const containerRect = container.getBoundingClientRect();
		const taskBounds = new Map<string, IRectangle>();

		container.querySelectorAll<HTMLElement>(TASK_SELECTION_QUERY).forEach(node => {
			const taskId = node.getAttribute(taskAttribute)
				?? node.closest<HTMLElement>(`[${taskAttribute}]`)?.getAttribute(taskAttribute);

			if (!taskId || !gantt.isTaskExists(taskId) || !gantt.isTaskVisible(taskId)) {
				return;
			}

			const nodeRect = node.getBoundingClientRect();
			const nodeContentRect = {
				left: nodeRect.left - containerRect.left + timelineContainer.scrollLeft,
				top: nodeRect.top - containerRect.top + timelineContainer.scrollTop,
				right: nodeRect.right - containerRect.left + timelineContainer.scrollLeft,
				bottom: nodeRect.bottom - containerRect.top + timelineContainer.scrollTop,
			};
			const existingBounds = taskBounds.get(taskId);
			if (!existingBounds) {
				taskBounds.set(taskId, nodeContentRect);
				return;
			}

			taskBounds.set(taskId, {
				left: Math.min(existingBounds.left, nodeContentRect.left),
				top: Math.min(existingBounds.top, nodeContentRect.top),
				right: Math.max(existingBounds.right, nodeContentRect.right),
				bottom: Math.max(existingBounds.bottom, nodeContentRect.bottom),
			});
		});

		return Array.from(taskBounds.entries())
			.filter(([, taskRect]) => !(
				taskRect.right < contentRect.left
				|| taskRect.left > contentRect.right
				|| taskRect.bottom < contentRect.top
				|| taskRect.top > contentRect.bottom
			))
			.map(([taskId]) => taskId);
	}, [gantt, getTimelineContainer]);

	const syncPreviewClasses = useCallback((nextPreviewIds: string[]) => {
		const session = dragSessionRef.current;
		const container = containerRef.current;
		if (!session || !container) {
			return;
		}

		const taskAttribute = gantt.config.task_attribute;
		const nextIds = new Set(nextPreviewIds);
		const previousIds = session.renderedPreviewIds;

		if (nextIds.size === previousIds.size && nextPreviewIds.every(id => previousIds.has(id))) {
			return;
		}

		previousIds.forEach(taskId => {
			if (nextIds.has(taskId)) {
				return;
			}

			container
				.querySelectorAll<HTMLElement>(`[${taskAttribute}="${CSS.escape(taskId)}"]`)
				.forEach(node => node.classList.remove(SELECTION_PREVIEW_CLASS));
		});

		nextIds.forEach(taskId => {
			if (previousIds.has(taskId)) {
				return;
			}

			container
				.querySelectorAll<HTMLElement>(`[${taskAttribute}="${CSS.escape(taskId)}"]`)
				.forEach(node => node.classList.add(SELECTION_PREVIEW_CLASS));
		});

		session.renderedPreviewIds = nextIds;
	}, [gantt]);

	const renderDragSession = useCallback(() => {
		const session = dragSessionRef.current;
		if (!session) {
			return;
		}

		const contentRect = getContentRectangle(session.anchor, session.pointerClient);
		const viewportBox = getViewportSelectionBox(contentRect);
		const hasExceededThreshold = viewportBox.width >= DRAG_THRESHOLD || viewportBox.height >= DRAG_THRESHOLD;

		if (!hasExceededThreshold) {
			session.lastComputedBox = null;
			session.selectionIds = [];
			syncPreviewClasses([]);

			if (session.renderedBoxKey !== null) {
				session.renderedBoxKey = null;
				session.lastRenderedBox = null;
				setSelectionBox(null);
			}

			return;
		}

		session.hasDragged = true;
		session.lastComputedBox = viewportBox;
		session.selectionIds = getTaskIdsInContentRectangle(contentRect);
		syncPreviewClasses(session.selectionIds);

		const nextBoxKey = `${viewportBox.left}:${viewportBox.top}:${viewportBox.width}:${viewportBox.height}`;
		if (nextBoxKey !== session.renderedBoxKey) {
			session.renderedBoxKey = nextBoxKey;
			session.lastRenderedBox = viewportBox;
			setSelectionBox(viewportBox);
		}
	}, [getContentRectangle, getTaskIdsInContentRectangle, getViewportSelectionBox, syncPreviewClasses]);

	const tickAutoScroll = useCallback(() => {
		const session = dragSessionRef.current;
		const timelineContainer = getTimelineContainer();
		if (!session || !timelineContainer) {
			stopAutoScroll();
			return;
		}

		const timelineRect = timelineContainer.getBoundingClientRect();
		let nextScrollLeft = timelineContainer.scrollLeft;
		let nextScrollTop = timelineContainer.scrollTop;

		if (session.pointerClient.x <= timelineRect.left + AUTO_SCROLL_EDGE_SIZE) {
			nextScrollLeft = Math.max(0, timelineContainer.scrollLeft - AUTO_SCROLL_STEP);
		}
		else if (session.pointerClient.x >= timelineRect.right - AUTO_SCROLL_EDGE_SIZE) {
			const maxScrollLeft = timelineContainer.scrollWidth - timelineContainer.clientWidth;
			nextScrollLeft = Math.min(maxScrollLeft, timelineContainer.scrollLeft + AUTO_SCROLL_STEP);
		}

		if (session.pointerClient.y <= timelineRect.top + AUTO_SCROLL_EDGE_SIZE) {
			nextScrollTop = Math.max(0, timelineContainer.scrollTop - AUTO_SCROLL_STEP);
		}
		else if (session.pointerClient.y >= timelineRect.bottom - AUTO_SCROLL_EDGE_SIZE) {
			const maxScrollTop = timelineContainer.scrollHeight - timelineContainer.clientHeight;
			nextScrollTop = Math.min(maxScrollTop, timelineContainer.scrollTop + AUTO_SCROLL_STEP);
		}

		const shouldContinue = nextScrollLeft !== timelineContainer.scrollLeft || nextScrollTop !== timelineContainer.scrollTop;
		if (!shouldContinue) {
			stopAutoScroll();
			return;
		}

		gantt.scrollTo(nextScrollLeft, nextScrollTop);
		renderDragSession();
		autoScrollFrameRef.current = requestAnimationFrame(tickAutoScroll);
	}, [gantt, getTimelineContainer, renderDragSession, stopAutoScroll]);

	const scheduleAutoScroll = useCallback(() => {
		const session = dragSessionRef.current;
		const timelineContainer = getTimelineContainer();
		if (!session || !timelineContainer) {
			return;
		}

		const timelineRect = timelineContainer.getBoundingClientRect();
		const pointerClient = session.pointerClient;
		const isNearEdge =
			pointerClient.x <= timelineRect.left + AUTO_SCROLL_EDGE_SIZE
			|| pointerClient.x >= timelineRect.right - AUTO_SCROLL_EDGE_SIZE
			|| pointerClient.y <= timelineRect.top + AUTO_SCROLL_EDGE_SIZE
			|| pointerClient.y >= timelineRect.bottom - AUTO_SCROLL_EDGE_SIZE;

		if (!isNearEdge) {
			stopAutoScroll();
			return;
		}

		if (autoScrollFrameRef.current === null) {
			autoScrollFrameRef.current = requestAnimationFrame(tickAutoScroll);
		}
	}, [getTimelineContainer, stopAutoScroll, tickAutoScroll]);

	const resetDragSession = useCallback(() => {
		stopAutoScroll();
		dragSessionRef.current = null;
		clearPreviewClasses();
		setSelectionBox(null);
	}, [clearPreviewClasses, stopAutoScroll]);

	const onMouseDown = useCallback((event: MouseEvent) => {
		if (event.button !== 0 || !event.shiftKey) {
			return;
		}

		const target = event.target as HTMLElement | null;
		if (target?.closest(DRAG_START_BLOCKERS_QUERY)) {
			return;
		}

		if (!target?.closest(TIMELINE_AREA_QUERY)) {
			return;
		}

		dragSessionRef.current = {
			anchor: getContentPoint({ x: event.clientX, y: event.clientY }),
			pointerClient: { x: event.clientX, y: event.clientY },
			hasDragged: false,
			selectionIds: [],
			renderedPreviewIds: new Set<string>(),
			renderedBoxKey: null,
			lastRenderedBox: null,
			lastComputedBox: null,
		};

		clearPreviewClasses();
		setSelectionBox(null);
		event.preventDefault();
	}, [clearPreviewClasses, getContentPoint]);

	const onMouseMove = useCallback((event: MouseEvent) => {
		const session = dragSessionRef.current;
		if (!session) {
			return;
		}

		session.pointerClient = { x: event.clientX, y: event.clientY };
		renderDragSession();
		scheduleAutoScroll();

		if (session.hasDragged) {
			event.preventDefault();
			event.stopPropagation();
		}
	}, [renderDragSession, scheduleAutoScroll]);

	const onMouseUp = useCallback((event: MouseEvent) => {
		const session = dragSessionRef.current;
		if (!session) {
			return;
		}

		if (session.hasDragged) {
			event.preventDefault();
			dataProvider.setSelectedRecordIds(session.selectionIds);
		}

		resetDragSession();
	}, [dataProvider, resetDragSession]);

	const onKeyDown = useCallback((event: KeyboardEvent) => {
		if (event.key === 'Shift') {
			setShiftClass(true);
		}
	}, [setShiftClass]);

	const onKeyUp = useCallback((event: KeyboardEvent) => {
		if (event.key !== 'Shift') {
			return;
		}

		setShiftClass(false);
		if (dragSessionRef.current) {
			resetDragSession();
		}
	}, [resetDragSession, setShiftClass]);

	const onBlur = useCallback(() => {
		setShiftClass(false);
		if (dragSessionRef.current) {
			resetDragSession();
		}
	}, [resetDragSession, setShiftClass]);

	const init = useCallback((container: HTMLDivElement) => {
		containerRef.current = container;
		container.tabIndex = container.tabIndex >= 0 ? container.tabIndex : 0;
		container.addEventListener('mousedown', onMouseDown);
		window.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mouseup', onMouseUp);
		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('keyup', onKeyUp);
		window.addEventListener('blur', onBlur);
	}, [onBlur, onKeyDown, onKeyUp, onMouseDown, onMouseMove, onMouseUp]);

	useEffect(() => {
		return () => {
			stopAutoScroll();
			clearPreviewClasses();
			setShiftClass(false);

			if (containerRef.current) {
				containerRef.current.removeEventListener('mousedown', onMouseDown);
			}

			window.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('mouseup', onMouseUp);
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('keyup', onKeyUp);
			window.removeEventListener('blur', onBlur);
		};
	}, [clearPreviewClasses, onBlur, onKeyDown, onKeyUp, onMouseDown, onMouseMove, onMouseUp, setShiftClass, stopAutoScroll]);

	return {
		selectionBox: {
			state: selectionBox,
			init,
		},
	};
};
