import { useCallback, useEffect } from "react";
import { useRef, useState } from "react";
import { IGanttManager } from "../GanttManager";
import { useEventEmitter } from "../../../../../hooks";
import { GANTT_TASK_LINE_CLASS, GANTT_TIMELINE_TASK_CREATE_CURSOR_CLASS } from "../classNames";
import { useTaskDataProvider } from "../../../context";

const EDGE_SCROLL_THRESHOLD = 50;
const EDGE_SCROLL_STEP = 10;

interface ITimelineTaskCreateLinePreview {
    left: number;
    top: number;
    width: number;
}

interface ITimelineTaskCreateRowOverlay {
    top: number;
    height: number;
}

interface IActivePreviewState {
    anchorTimelineX: number;
    currentClientX: number;
    currentTaskId?: string;
    rowHeight: number;
    rowTop: number;
    top: number;
}

export const useTimelineTaskCreate = (ganttManager: IGanttManager) => {
    const gantt = ganttManager.getGanttInstance();
    const dates = ganttManager.getDates();
    const dragging = ganttManager.getDragging();
    const taskDataProvider = useTaskDataProvider();
    const [linePreview, setLinePreview] = useState<ITimelineTaskCreateLinePreview | null>(null);
    const [rowOverlay, setRowOverlay] = useState<ITimelineTaskCreateRowOverlay | null>(null);
    const activePreviewRef = useRef<IActivePreviewState | null>(null);
    const autoScrollIntervalRef = useRef<number | null>(null);
    const autoScrollDirectionRef = useRef<-1 | 0 | 1>(0);

    const setTaskCreateCursor = (enabled: boolean) => {
        gantt.$root.classList.toggle(GANTT_TIMELINE_TASK_CREATE_CURSOR_CLASS, enabled);
    };

    const setTaskCreateMode = (enabled: boolean) => {
        dragging.setDraggingDisabled(enabled);
        setTaskCreateCursor(enabled);
    };

    const clearPreview = () => {
        activePreviewRef.current = null;
        setLinePreview(null);
        setRowOverlay(null);
    };

    const stopAutoScroll = () => {
        if (autoScrollIntervalRef.current !== null) {
            window.clearInterval(autoScrollIntervalRef.current);
            autoScrollIntervalRef.current = null;
        }
        autoScrollDirectionRef.current = 0;
    };

    const getPreviewRowElement = (target: EventTarget | null) => {
        const element = target as HTMLElement | null;
        if (!element || element.closest(`.${GANTT_TASK_LINE_CLASS}`)) {
            return null;
        }

        if (!element.closest('.gantt_task_bg, .gantt_task_cell')) {
            return null;
        }

        return element.closest('.gantt_task_row') as HTMLElement | null;
    };

    const getPreviewTaskId = (rowElement: HTMLElement) => {
        return rowElement.closest('[data-task-id]')?.getAttribute('data-task-id') ?? undefined;
    };

    const getPreviewRowGeometry = (rowElement: HTMLElement) => {
        const rootRect = gantt.$root.getBoundingClientRect();
        const rowRect = rowElement.getBoundingClientRect();

        return {
            top: rowRect.top - rootRect.top,
            height: rowRect.height,
            lineTop: rowRect.top - rootRect.top + (rowRect.height / 2),
        };
    };

    const updatePreview = () => {
        const activePreview = activePreviewRef.current;
        if (!activePreview) {
            setLinePreview(null);
            return;
        }

        const scrollX = gantt.getScrollState().x;
        const rootLeft = gantt.$root.getBoundingClientRect().left;
        const currentTimelineX = scrollX + activePreview.currentClientX - rootLeft;

        setLinePreview({
            left: activePreview.anchorTimelineX - scrollX,
            top: activePreview.top,
            width: Math.max(0, currentTimelineX - activePreview.anchorTimelineX),
        });
        setRowOverlay({
            top: activePreview.rowTop,
            height: activePreview.rowHeight,
        });
    };

    const canScrollLeft = () => {
        const activePreview = activePreviewRef.current;
        if (!activePreview) {
            return false;
        }

        const scrollX = gantt.getScrollState().x;
        const rootLeft = gantt.$root.getBoundingClientRect().left;
        const currentTimelineX = scrollX + activePreview.currentClientX - rootLeft;

        return currentTimelineX > activePreview.anchorTimelineX;
    };

    const startAutoScroll = () => {
        if (autoScrollIntervalRef.current !== null) {
            return;
        }

        autoScrollIntervalRef.current = window.setInterval(() => {
            const direction = autoScrollDirectionRef.current;
            if (direction === 0) {
                return;
            }

            if (direction < 0 && !canScrollLeft()) {
                stopAutoScroll();
                updatePreview();
                return;
            }

            const scrollX = gantt.getScrollState().x;
            const nextScrollX = Math.max(0, scrollX + (direction * EDGE_SCROLL_STEP));
            if (nextScrollX === scrollX) {
                stopAutoScroll();
                updatePreview();
                return;
            }

            gantt.scrollTo(nextScrollX, null);
            updatePreview();
        }, 30);
    };

    const syncAutoScrollDirection = (clientX: number) => {
        const activePreview = activePreviewRef.current;
        if (!activePreview) {
            stopAutoScroll();
            return;
        }

        const taskRect = gantt.$task.getBoundingClientRect();
        let direction: -1 | 0 | 1 = 0;

        if (clientX >= taskRect.right - EDGE_SCROLL_THRESHOLD) {
            direction = 1;
        }
        else if (clientX <= taskRect.left + EDGE_SCROLL_THRESHOLD && canScrollLeft()) {
            direction = -1;
        }

        if (direction === 0) {
            stopAutoScroll();
            return;
        }

        autoScrollDirectionRef.current = direction;
        startAutoScroll();
    };

    const onKeyUp = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Control') {
            if (activePreviewRef.current) {
                return;
            }
            setTaskCreateMode(false);
            stopAutoScroll();
            clearPreview();
        }
    }, []);

    const onKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Control') {
            setTaskCreateMode(true);
        }
    }, []);

    const onMouseDown = useCallback((e: MouseEvent) => {
        if (!e.ctrlKey || e.button !== 0) {
            return;
        }

        const rowElement = getPreviewRowElement(e.target);
        if (!rowElement) {
            return;
        }

        e.preventDefault();

        const scrollX = gantt.getScrollState().x;
        const rootLeft = gantt.$root.getBoundingClientRect().left;
        const anchorTimelineX = scrollX + e.clientX - rootLeft;
        const rowGeometry = getPreviewRowGeometry(rowElement);

        activePreviewRef.current = {
            anchorTimelineX,
            currentClientX: e.clientX,
            currentTaskId: getPreviewTaskId(rowElement),
            rowHeight: rowGeometry.height,
            rowTop: rowGeometry.top,
            top: rowGeometry.lineTop,
        };

        updatePreview();
    }, []);

    const onMouseMove = useCallback((e: MouseEvent) => {
        const activePreview = activePreviewRef.current;
        if (!activePreview) {
            return;
        }

        const rowElement = getPreviewRowElement(e.target);
        if (rowElement) {
            const rowGeometry = getPreviewRowGeometry(rowElement);
            activePreview.currentTaskId = getPreviewTaskId(rowElement);
            activePreview.rowHeight = rowGeometry.height;
            activePreview.rowTop = rowGeometry.top;
            activePreview.top = rowGeometry.lineTop;
        }
        activePreview.currentClientX = e.clientX;
        syncAutoScrollDirection(e.clientX);
        updatePreview();
    }, []);

    const onMouseUp = useCallback(() => {
        stopAutoScroll();
        createTask(activePreviewRef.current);
        clearPreview();
        setTaskCreateMode(false);
    }, []);

    const createTask = (activePreview: IActivePreviewState | null) => {
        if(!activePreview || !activePreview.currentTaskId) return;
        const scrollX = gantt.getScrollState().x;
        const rootLeft = gantt.$root.getBoundingClientRect().left;

        const currentTimelineX = Math.max(
            activePreview.anchorTimelineX,
            scrollX + activePreview.currentClientX - rootLeft
        );

        const currentTask = gantt.getTask(activePreview.currentTaskId);
        const startDate = gantt.dateFromPos(activePreview.anchorTimelineX);
        const endDate = gantt.dateFromPos(currentTimelineX);
        const parentId = currentTask.parent as string
        const recordTree = taskDataProvider.getRecordTree();
        const previousTaskId = recordTree.getPreviousSibling(activePreview.currentTaskId)?.getRecordId();
        const nextTaskId = activePreview.currentTaskId;

        taskDataProvider.createTask({
            parentId,
            previousTaskId,
            nextTaskId,
            data: {
                [dates.getStartDateColumnName()]: startDate,
                [dates.getEndDateColumnName()]: endDate,
            },
        });
    }


    const onInit = () => {
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        gantt.$task.addEventListener('mousedown', onMouseDown);
    };

    useEffect(() => {
        return () => {
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            gantt.$task.removeEventListener('mousedown', onMouseDown);
            setTaskCreateMode(false);
            stopAutoScroll();
            clearPreview();
        };
    }, []);

    useEventEmitter(ganttManager.events, 'onInit', onInit);

    return {
        linePreview,
        rowOverlay,
    };
};
