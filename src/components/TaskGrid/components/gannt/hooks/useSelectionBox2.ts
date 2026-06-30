import Selecto, { OnDragStart, OnScroll, OnSelect, OnDrag } from "selecto";
import { IGanttManager } from "../GanttManager";
import { useEventEmitter } from "../../../../../hooks";
import { useCallback, useEffect, useMemo, useRef } from "react";

export const GANTT_TASK_LINK_CLASS = 'gantt_task_link';
export const GANTT_SHIFT_HELD_CLASS = 'gantt_shift_held';

export const useSelectionBox = (ganttManager: IGanttManager) => {
    const gantt = ganttManager.getGanttInstance();
    const isShiftHeld = useRef(false);
    const isMouseDown = useRef(false);
    const selectionBoxId = useMemo(() => `gantt_selection_box_${window.crypto.randomUUID()}`, []);

    const onInit = () => {
        createSelectionBox();
    }


    const createSelectionBox = () => {
        if (document.getElementById(selectionBoxId)) return;
        const selectionBox = document.createElement('div');
        selectionBox.style.position = 'absolute';
        selectionBox.style.backgroundColor = 'red';
        selectionBox.id = selectionBoxId;
        gantt.$root.appendChild(selectionBox);
    }
    
    const getSelectionBox = () => {
        return document.getElementById(selectionBoxId);
    }

    const onKeyUp = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Shift') {
            isShiftHeld.current = false;
            gantt.$root.classList.remove(GANTT_SHIFT_HELD_CLASS);
        }
    }, []);

    const onKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Shift') {
            isShiftHeld.current = true;
            gantt.$root.classList.add(GANTT_SHIFT_HELD_CLASS);
        }
    }, []);

    const onMouseMove = useCallback((e: MouseEvent) => {
        if(!isMouseDown.current || !isShiftHeld.current) return;
        const selectionBox = getSelectionBox();
        
    }, []);

    const onMouseDown = useCallback((e: MouseEvent) => {
        isMouseDown.current = true;
    }, []);

    const onMouseUp = useCallback((e: MouseEvent) => {
        isMouseDown.current = false;
    }, []);

    useEffect(() => {
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mouseup', onMouseUp);
        window.addEventListener('mousemove', onMouseMove);
        return () => {
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('mousemove', onMouseMove);
        }
    }, []);

    useEventEmitter(ganttManager.events, 'onInit', onInit);
}