import { useCallback, useEffect } from "react";
import { useRef, useState } from "react";
import { IGanttManager } from "../GanttManager";
import { useEventEmitter } from "../../../../../hooks";
import { GANTT_TASK_LINE_CLASS, GANTT_TIMELINE_TASK_CREATE_CURSOR_CLASS } from "../classNames";

interface ITimelineTaskCreateLinePreview {
    left: number;
    top: number;
    width: number;
}

interface IActivePreviewState {
    left: number;
    startX: number;
    top: number;
}

export const useTimelineTaskCreate = (ganttManager: IGanttManager) => {
    const gantt = ganttManager.getGanttInstance();
    const dragging = ganttManager.getDragging();
    const [linePreview, setLinePreview] = useState<ITimelineTaskCreateLinePreview | null>(null);
    const activePreviewRef = useRef<IActivePreviewState | null>(null);

    const setTaskCreateCursor = (enabled: boolean) => {
        gantt.$root.classList.toggle(GANTT_TIMELINE_TASK_CREATE_CURSOR_CLASS, enabled);
    };

    const clearPreview = () => {
        activePreviewRef.current = null;
        setLinePreview(null);
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

    const getPreviewTop = (rowElement: HTMLElement) => {
        const rootRect = gantt.$root.getBoundingClientRect();
        const rowRect = rowElement.getBoundingClientRect();

        return rowRect.top - rootRect.top + (rowRect.height / 2);
    };

    const onKeyUp = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Control') {
            dragging.setDraggingDisabled(false);
            setTaskCreateCursor(false);
            clearPreview();
        }
    }, []);

    const onKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Control') {
            dragging.setDraggingDisabled(true);
            setTaskCreateCursor(true);
        }
    }, []);

    const onContextMenu = useCallback((e: MouseEvent) => {
        if (e.ctrlKey) {
            e.preventDefault();
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

        const left = e.clientX - gantt.$root.getBoundingClientRect().left;
        const top = getPreviewTop(rowElement);

        activePreviewRef.current = {
            left,
            startX: e.clientX,
            top,
        };

        setLinePreview({
            left,
            top,
            width: 0,
        });
    }, []);

    const onMouseMove = useCallback((e: MouseEvent) => {
        const activePreview = activePreviewRef.current;
        if (!activePreview) {
            return;
        }

        const rowElement = getPreviewRowElement(e.target);
        const top = rowElement ? getPreviewTop(rowElement) : activePreview.top;
        activePreview.top = top;
        const width = Math.max(0, e.clientX - activePreview.startX);
        setLinePreview({
            left: activePreview.left,
            top,
            width,
        });
    }, []);

    const onMouseUp = useCallback(() => {
        clearPreview();
    }, []);

    const onInit = () => {
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        gantt.$task.addEventListener('mousedown', onMouseDown);
        gantt.$root.addEventListener('contextmenu', onContextMenu);
    };

    useEffect(() => {
        return () => {
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            gantt.$task.removeEventListener('mousedown', onMouseDown);
            gantt.$root.removeEventListener('contextmenu', onContextMenu);
            dragging.setDraggingDisabled(false);
            setTaskCreateCursor(false);
            clearPreview();
        };
    }, []);

    useEventEmitter(ganttManager.events, 'onInit', onInit);

    return {
        linePreview,
    };
};
