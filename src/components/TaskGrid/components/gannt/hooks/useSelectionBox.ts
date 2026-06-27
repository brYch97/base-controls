import { GanttStatic } from 'gantt-trial';
import { useEffect, useRef, useState } from 'react';
import { ITaskDataProvider } from '../../../providers';
import { IGanttInfiniteTimeline } from '../GanttInfiniteTimeline';

interface IUseSelectionBoxParams {
	gantt: GanttStatic;
	dataProvider: ITaskDataProvider;
	timeline: IGanttInfiniteTimeline;
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

export const GANTT_SHIFT_HELD_CLASS = 'gantt_shift_held';
export const GANTT_TASK_LINE_CLASS = 'gantt_task_line';
export const GANTT_TASK_LINK_CLASS = 'gantt_task_link';

const SELECTION_PREVIEW_CLASS = 'gantt_selection_preview';
const TASK_SELECTION_QUERY = '.gantt_task_line, .gantt_left';
const DRAG_START_BLOCKERS_QUERY = '.gantt_task_line, .gantt_task_content, .gantt_task_drag, .gantt_link_control';
const TIMELINE_AREA_QUERY = '.gantt_task_bg, .gantt_task_cell';
const TIMELINE_CONTAINER_QUERY = '.gantt_task';
const DRAG_THRESHOLD = 4;
const AUTO_SCROLL_EDGE_SIZE = 32;
const AUTO_SCROLL_STEP = 24;

// --- Pure helpers (no React / no refs) ---

const toContentPoint = (clientPoint: IPoint, containerRect: DOMRect, scrollLeft: number, scrollTop: number): IPoint => ({
	x: clientPoint.x - containerRect.left + scrollLeft,
	y: clientPoint.y - containerRect.top + scrollTop,
});

const toContentRect = (a: IPoint, b: IPoint): IRectangle => ({
	left: Math.min(a.x, b.x),
	top: Math.min(a.y, b.y),
	right: Math.max(a.x, b.x),
	bottom: Math.max(a.y, b.y),
});

const toViewportBox = (rect: IRectangle, scrollLeft: number, scrollTop: number): ISelectionBoxState => ({
	left: rect.left - scrollLeft,
	top: rect.top - scrollTop,
	width: rect.right - rect.left,
	height: rect.bottom - rect.top,
});

const rectsIntersect = (a: IRectangle, b: IRectangle): boolean =>
	a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;

const boxKey = (box: ISelectionBoxState): string =>
	`${box.left}:${box.top}:${box.width}:${box.height}`;

const findTaskIdsInRect = (
	container: HTMLElement,
	gantt: GanttStatic,
	timelineContainer: HTMLElement,
	contentRect: IRectangle,
): string[] => {
	const taskAttribute = gantt.config.task_attribute;
	const containerRect = container.getBoundingClientRect();
	const { scrollLeft, scrollTop } = timelineContainer;
	const taskBounds = new Map<string, IRectangle>();

	container.querySelectorAll<HTMLElement>(TASK_SELECTION_QUERY).forEach(node => {
		const taskId = node.getAttribute(taskAttribute)
			?? node.closest<HTMLElement>(`[${taskAttribute}]`)?.getAttribute(taskAttribute);

		if (!taskId || !gantt.isTaskExists(taskId) || !gantt.isTaskVisible(taskId)) {
			return;
		}

		const nodeRect = node.getBoundingClientRect();
		const nodeContent: IRectangle = {
			left: nodeRect.left - containerRect.left + scrollLeft,
			top: nodeRect.top - containerRect.top + scrollTop,
			right: nodeRect.right - containerRect.left + scrollLeft,
			bottom: nodeRect.bottom - containerRect.top + scrollTop,
		};

		const existing = taskBounds.get(taskId);
		if (!existing) {
			taskBounds.set(taskId, nodeContent);
			return;
		}

		taskBounds.set(taskId, {
			left: Math.min(existing.left, nodeContent.left),
			top: Math.min(existing.top, nodeContent.top),
			right: Math.max(existing.right, nodeContent.right),
			bottom: Math.max(existing.bottom, nodeContent.bottom),
		});
	});

	const result: string[] = [];
	taskBounds.forEach((bounds, taskId) => {
		if (rectsIntersect(bounds, contentRect)) {
			result.push(taskId);
		}
	});
	return result;
};

const syncPreviewClasses = (
	container: HTMLElement,
	taskAttribute: string,
	previousIds: Set<string>,
	nextIds: Set<string>,
): void => {
	previousIds.forEach(id => {
		if (!nextIds.has(id)) {
			container
				.querySelectorAll<HTMLElement>(`[${taskAttribute}="${CSS.escape(id)}"]`)
				.forEach(node => node.classList.remove(SELECTION_PREVIEW_CLASS));
		}
	});

	nextIds.forEach(id => {
		if (!previousIds.has(id)) {
			container
				.querySelectorAll<HTMLElement>(`[${taskAttribute}="${CSS.escape(id)}"]`)
				.forEach(node => node.classList.add(SELECTION_PREVIEW_CLASS));
		}
	});
};

const clearAllPreviews = (container: HTMLElement): void => {
	container.querySelectorAll<HTMLElement>(`.${SELECTION_PREVIEW_CLASS}`)
		.forEach(node => node.classList.remove(SELECTION_PREVIEW_CLASS));
};

// --- Hook ---

interface IDragSession {
	anchor: IPoint;
	pointerClient: IPoint;
	hasDragged: boolean;
	selectionIds: string[];
	previewIds: Set<string>;
	lastBoxKey: string | null;
}

export const useSelectionBox = (params: IUseSelectionBoxParams) => {
	const { gantt, dataProvider, timeline } = params;
	const [selectionBox, setSelectionBox] = useState<ISelectionBoxState | null>(null);

	const containerRef = useRef<HTMLDivElement | null>(null);
	const sessionRef = useRef<IDragSession | null>(null);
	const autoScrollRef = useRef<number | null>(null);

	// Stable refs so event handlers always see the latest values without re-binding listeners.
	const ganttRef = useRef(gantt);
	ganttRef.current = gantt;
	const dataProviderRef = useRef(dataProvider);
	dataProviderRef.current = dataProvider;
	const timelineRef = useRef(timeline);
	timelineRef.current = timeline;
	const setSelectionBoxRef = useRef(setSelectionBox);
	setSelectionBoxRef.current = setSelectionBox;

	useEffect(() => {
		const getTimelineContainer = () =>
			containerRef.current?.querySelector<HTMLElement>(TIMELINE_CONTAINER_QUERY) ?? null;

		const render = () => {
			const session = sessionRef.current;
			const container = containerRef.current;
			const tc = getTimelineContainer();
			if (!session || !container || !tc) {
				return;
			}

			const containerRect = container.getBoundingClientRect();
			const currentContent = toContentPoint(session.pointerClient, containerRect, tc.scrollLeft, tc.scrollTop);
			const contentRect = toContentRect(session.anchor, currentContent);
			const viewport = toViewportBox(contentRect, tc.scrollLeft, tc.scrollTop);
			const exceededThreshold = viewport.width >= DRAG_THRESHOLD || viewport.height >= DRAG_THRESHOLD;

			if (!exceededThreshold) {
				session.selectionIds = [];
				if (session.previewIds.size > 0) {
					syncPreviewClasses(container, ganttRef.current.config.task_attribute, session.previewIds, new Set());
					session.previewIds = new Set();
				}
				if (session.lastBoxKey !== null) {
					session.lastBoxKey = null;
					setSelectionBoxRef.current(null);
				}
				return;
			}

			session.hasDragged = true;
			session.selectionIds = findTaskIdsInRect(container, ganttRef.current, tc, contentRect);

			const nextPreviewIds = new Set(session.selectionIds);
			syncPreviewClasses(container, ganttRef.current.config.task_attribute, session.previewIds, nextPreviewIds);
			session.previewIds = nextPreviewIds;

			const key = boxKey(viewport);
			if (key !== session.lastBoxKey) {
				session.lastBoxKey = key;
				setSelectionBoxRef.current(viewport);
			}
		};

		const stopAutoScroll = () => {
			if (autoScrollRef.current !== null) {
				cancelAnimationFrame(autoScrollRef.current);
				autoScrollRef.current = null;
			}
		};

		const tickAutoScroll = () => {
			const session = sessionRef.current;
			const tc = getTimelineContainer();
			if (!session || !tc) {
				stopAutoScroll();
				return;
			}

			const rect = tc.getBoundingClientRect();
			let nextLeft = tc.scrollLeft;
			let nextTop = tc.scrollTop;

			if (session.pointerClient.x <= rect.left + AUTO_SCROLL_EDGE_SIZE) {
				nextLeft = Math.max(0, tc.scrollLeft - AUTO_SCROLL_STEP);
			} else if (session.pointerClient.x >= rect.right - AUTO_SCROLL_EDGE_SIZE) {
				nextLeft = Math.min(tc.scrollWidth - tc.clientWidth, tc.scrollLeft + AUTO_SCROLL_STEP);
			}

			if (session.pointerClient.y <= rect.top + AUTO_SCROLL_EDGE_SIZE) {
				nextTop = Math.max(0, tc.scrollTop - AUTO_SCROLL_STEP);
			} else if (session.pointerClient.y >= rect.bottom - AUTO_SCROLL_EDGE_SIZE) {
				nextTop = Math.min(tc.scrollHeight - tc.clientHeight, tc.scrollTop + AUTO_SCROLL_STEP);
			}

			if (nextLeft === tc.scrollLeft && nextTop === tc.scrollTop) {
				stopAutoScroll();
				return;
			}

			// Block infinite timeline from expanding while we programmatically scroll.
			timelineRef.current.setScrollBlock(true);
			ganttRef.current.scrollTo(nextLeft, nextTop);
			timelineRef.current.setScrollBlock(false);

			render();
			autoScrollRef.current = requestAnimationFrame(tickAutoScroll);
		};

		const scheduleAutoScroll = () => {
			const session = sessionRef.current;
			const tc = getTimelineContainer();
			if (!session || !tc) {
				return;
			}

			const rect = tc.getBoundingClientRect();
			const p = session.pointerClient;
			const nearEdge =
				p.x <= rect.left + AUTO_SCROLL_EDGE_SIZE
				|| p.x >= rect.right - AUTO_SCROLL_EDGE_SIZE
				|| p.y <= rect.top + AUTO_SCROLL_EDGE_SIZE
				|| p.y >= rect.bottom - AUTO_SCROLL_EDGE_SIZE;

			if (!nearEdge) {
				stopAutoScroll();
				return;
			}

			if (autoScrollRef.current === null) {
				autoScrollRef.current = requestAnimationFrame(tickAutoScroll);
			}
		};

		const resetSession = () => {
			stopAutoScroll();
			sessionRef.current = null;
			if (containerRef.current) {
				clearAllPreviews(containerRef.current);
			}
			setSelectionBoxRef.current(null);
		};

		const onMouseDown = (event: MouseEvent) => {
			if (event.button !== 0 || !event.shiftKey) {
				return;
			}

			const target = event.target as HTMLElement | null;
			if (target?.closest(DRAG_START_BLOCKERS_QUERY) || !target?.closest(TIMELINE_AREA_QUERY)) {
				return;
			}

			const container = containerRef.current;
			const tc = getTimelineContainer();
			if (!container || !tc) {
				return;
			}

			const containerRect = container.getBoundingClientRect();
			sessionRef.current = {
				anchor: toContentPoint({ x: event.clientX, y: event.clientY }, containerRect, tc.scrollLeft, tc.scrollTop),
				pointerClient: { x: event.clientX, y: event.clientY },
				hasDragged: false,
				selectionIds: [],
				previewIds: new Set(),
				lastBoxKey: null,
			};

			clearAllPreviews(container);
			setSelectionBoxRef.current(null);
			event.preventDefault();
		};

		const onMouseMove = (event: MouseEvent) => {
			const session = sessionRef.current;
			if (!session) {
				return;
			}

			session.pointerClient = { x: event.clientX, y: event.clientY };
			render();
			scheduleAutoScroll();

			if (session.hasDragged) {
				event.preventDefault();
				event.stopPropagation();
			}
		};

		const onMouseUp = (event: MouseEvent) => {
			const session = sessionRef.current;
			if (!session) {
				return;
			}

			if (session.hasDragged) {
				event.preventDefault();
				dataProviderRef.current.setSelectedRecordIds(session.selectionIds);
			}

			resetSession();
		};

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Shift') {
				containerRef.current?.classList.add(GANTT_SHIFT_HELD_CLASS);
			}
		};

		const onKeyUp = (event: KeyboardEvent) => {
			if (event.key !== 'Shift') {
				return;
			}

			containerRef.current?.classList.remove(GANTT_SHIFT_HELD_CLASS);
			if (sessionRef.current) {
				resetSession();
			}
		};

		const onBlur = () => {
			containerRef.current?.classList.remove(GANTT_SHIFT_HELD_CLASS);
			if (sessionRef.current) {
				resetSession();
			}
		};

		const init = (container: HTMLDivElement) => {
			containerRef.current = container;
			if (container.tabIndex < 0) {
				container.tabIndex = 0;
			}

			container.addEventListener('mousedown', onMouseDown);
			window.addEventListener('mousemove', onMouseMove);
			window.addEventListener('mouseup', onMouseUp);
			window.addEventListener('keydown', onKeyDown);
			window.addEventListener('keyup', onKeyUp);
			window.addEventListener('blur', onBlur);
		};

		initRef.current = init;

		return () => {
			stopAutoScroll();

			const container = containerRef.current;
			if (container) {
				clearAllPreviews(container);
				container.classList.remove(GANTT_SHIFT_HELD_CLASS);
				container.removeEventListener('mousedown', onMouseDown);
			}

			window.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('mouseup', onMouseUp);
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('keyup', onKeyUp);
			window.removeEventListener('blur', onBlur);
		};
	}, []);

	const initRef = useRef<(container: HTMLDivElement) => void>(() => {});

	return {
		selectionBox: {
			state: selectionBox,
			init: (container: HTMLDivElement) => initRef.current(container),
		},
	};
};
