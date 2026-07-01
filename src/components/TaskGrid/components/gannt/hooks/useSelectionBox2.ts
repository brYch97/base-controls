import Selecto, { OnDrag, OnDragStart, OnScroll, OnSelect } from "selecto";
import { IGanttManager } from "../GanttManager";
import { useEventEmitter } from "../../../../../hooks";
import { useCallback, useEffect, useRef } from "react";
import { useDebouncedCallback } from "use-debounce";

export const GANTT_TASK_LINK_CLASS = 'gantt_task_link';
export const GANTT_SHIFT_HELD_CLASS = 'gantt_shift_held';
const EDGE_SCROLL_THRESHOLD = 50;

const getScrollDirectionAtEdge = (
    clientX: number,
    clientY: number,
    rect: DOMRect,
    threshold: number,
): 'up' | 'down' | 'left' | 'right' | null => {
    const distLeft = Math.abs(clientX - rect.left);
    const distRight = Math.abs(clientX - rect.right);
    const distTop = Math.abs(clientY - rect.top);
    const distBottom = Math.abs(clientY - rect.bottom);

    const distToHorizontalEdge = Math.min(distLeft, distRight);
    const distToVerticalEdge = Math.min(distTop, distBottom);

    if (Math.min(distToHorizontalEdge, distToVerticalEdge) >= threshold) {
        return null;
    }

    if (distToHorizontalEdge < distToVerticalEdge) {
        return distLeft < distRight ? 'left' : 'right';
    }

    return distTop < distBottom ? 'up' : 'down';
}

export const useSelectionBox = (ganttManager: IGanttManager) => {
    const gantt = ganttManager.getGanttInstance();
    const selectoRef = useRef<Selecto>();
    const dragPointerRef = useRef<{ clientX: number; clientY: number } | null>(null);

    const onInit = () => {
        const container = gantt.$task;
        selectoRef.current = new Selecto({
            container: container,
            hitRate: 0,
            toggleContinueSelect: ['shift'],
            ratio: 0,
            selectableTargets: [`.${GANTT_TASK_LINK_CLASS}`],
            scrollOptions: {
                container: gantt.$scroll_hor,
                throttleTime: 30,
                threshold: EDGE_SCROLL_THRESHOLD,
            }

        });
        selectoRef.current.on('select', onSelect);
        selectoRef.current.on('scroll', onScroll);
        selectoRef.current.on('dragStart', onDragStart);
        selectoRef.current.on('drag', onDrag);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('keydown', onKeyDown);
    }

    const onKeyUp = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Shift') {
            gantt.$root.classList.remove(GANTT_SHIFT_HELD_CLASS);
        }
    }, []);

    const onKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Shift') {
            gantt.$root.classList.add(GANTT_SHIFT_HELD_CLASS);
        }
    }, []);

    const onSelect = (e: OnSelect<Selecto>) => {
        e.added.forEach(el => {
            console.log('Selected element:', el);
        });
    };

    const onDragStart = (e: OnDragStart<Selecto>) => {
        if (!e.inputEvent.shiftKey) {
            e.stop();
        }
    };

    const onDrag = (e: OnDrag<Selecto>) => {
        dragPointerRef.current = { clientX: e.clientX, clientY: e.clientY };
        const direction = getScrollDirectionAtEdge(e.clientX, e.clientY, gantt.$task.getBoundingClientRect(), EDGE_SCROLL_THRESHOLD);
        if (direction === 'down' || direction === 'up') {
            console.log('Scrolling vertically');
            selectoRef.current!.scrollOptions.container = gantt.$scroll_ver;
        }
        else if (direction === 'left' || direction === 'right') {
            selectoRef.current!.scrollOptions.container = gantt.$scroll_hor;
        }
    }


    const onScroll = (e: OnScroll) => {
        const pointer = dragPointerRef.current;
        if (!pointer) return;

        const rect = (gantt.$task as HTMLElement).getBoundingClientRect();
        //we need this check to prevent false positives
        const direction = getScrollDirectionAtEdge(pointer.clientX, pointer.clientY, rect, EDGE_SCROLL_THRESHOLD);

        if (!direction) return;
        switch (direction) {
            case 'up': {
                gantt.scrollTo(null, gantt.getScrollState().y - 10);
                break;
            }
            case 'down': {
                gantt.scrollTo(null, gantt.getScrollState().y + 10);
                break;
            }
            case 'left': {
                gantt.scrollTo(gantt.getScrollState().x - 10, null);
                break;
            }
            case 'right': {
                gantt.scrollTo(gantt.getScrollState().x + 10, null);
                break;
            }
        }
    }

    useEffect(() => {
        return () => {
            selectoRef.current?.destroy();
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('keydown', onKeyDown);
        }
    }, []);

    useEventEmitter(ganttManager.events, 'onInit', onInit);
}