import { useCallback, useEffect } from "react";
import { IGanttManager } from "../GanttManager";
import { useEventEmitter } from "../../../../../hooks";
import { GANTT_TIMELINE_TASK_CREATE_CURSOR_CLASS } from "../classNames";

export const useTimelineTaskCreate = (ganttManager: IGanttManager) => {
    const gantt = ganttManager.getGanttInstance();
    const dragging = ganttManager.getDragging();

    const setTaskCreateCursor = (enabled: boolean) => {
        gantt.$root.classList.toggle(GANTT_TIMELINE_TASK_CREATE_CURSOR_CLASS, enabled);
    };

    const onKeyUp = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Control') {
            dragging.setDraggingDisabled(false);
            setTaskCreateCursor(false);
        }
    }, []);

    const onKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Control') {
            dragging.setDraggingDisabled(true);
            setTaskCreateCursor(true);
        }
    }, []);

    const onInit = () => {
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('keydown', onKeyDown);
    };

    useEffect(() => {
        return () => {
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('keydown', onKeyDown);
            dragging.setDraggingDisabled(false);
            setTaskCreateCursor(false);
        };
    }, []);

    useEventEmitter(ganttManager.events, 'onInit', onInit);
};
