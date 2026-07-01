import Selecto, { OnDrag, OnDragEnd, OnDragStart, OnScroll, OnSelect } from "selecto";
import { IGanttManager } from "../GanttManager";
import { useEventEmitter } from "../../../../../hooks";
import { useCallback, useEffect, useRef } from "react";
import { useTaskDataProvider } from "../../../context";


export const GANTT_SHIFT_HELD_CLASS = 'gantt_shift_held';
export const GANTT_TASK_SELECTED_CLASS = 'gantt_task_selected';
export const GANTT_TASK_LINE_CLASS = 'gantt_task_line';
export const GANTT_TASK_SIDE_CONTENT_CLASS = 'gantt_side_content';
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
    const dataProvider = useTaskDataProvider();
    const selectedRecordIdsRef = useRef<Set<string>>(new Set());
    const blockDeselectionRef = useRef<boolean>(false);

    const getTaskElementFromElement = (el: Element): HTMLElement => {
        const taskElement = el.closest('[data-task-id]');

        if (!taskElement) {
            throw new Error('Could not find an ancestor with data-task-id for the selected gantt element.');
        }

        return taskElement as HTMLElement;
    }

    const onInit = () => {
        const container = gantt.$task;
        selectoRef.current = new Selecto({
            container: container,
            hitRate: 0,
            selectableTargets: [`.${GANTT_TASK_LINE_CLASS}`, `.${GANTT_TASK_SIDE_CONTENT_CLASS}`],
            scrollOptions: {
                container: container,
                throttleTime: 30,
                threshold: EDGE_SCROLL_THRESHOLD,
                getScrollPosition: () => [gantt.$scroll_hor.scrollLeft, gantt.$scroll_ver.scrollTop],
            }

        });
        selectoRef.current.on('select', onSelect);
        selectoRef.current.on('scroll', onScroll);
        selectoRef.current.on('dragStart', onDragStart);
        selectoRef.current.on('drag', onDrag);
        selectoRef.current.on('dragEnd', onDragEnd);
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
            const taskElement = getTaskElementFromElement(el);
            const taskId = taskElement.getAttribute('data-task-id')!;

            taskElement.classList.add(GANTT_TASK_SELECTED_CLASS);
            selectedRecordIdsRef.current.add(taskId);
        });
        if (!blockDeselectionRef.current) {
            e.removed.forEach(el => {
                const taskElement = getTaskElementFromElement(el);
                const taskId = taskElement.getAttribute('data-task-id')!;

                taskElement.classList.remove(GANTT_TASK_SELECTED_CLASS);
                selectedRecordIdsRef.current.delete(taskId);
            });
        }
    };

    const onDragEnd = (e: OnDragEnd<Selecto>) => {
        if (selectedRecordIdsRef.current.size > 0) {
            dataProvider.setSelectedRecordIds(Array.from(selectedRecordIdsRef.current));
        }
        selectedRecordIdsRef.current.clear();
    }

    const onDragStart = (e: OnDragStart<Selecto>) => {
        if (!e.inputEvent.shiftKey) {
            e.stop();
        }
    };

    const onDrag = (e: OnDrag<Selecto>) => {
        dragPointerRef.current = { clientX: e.clientX, clientY: e.clientY };
    }


    const onScroll = (e: OnScroll) => {
        const pointer = dragPointerRef.current;
        if (!pointer) return;

        const rect = (gantt.$task as HTMLElement).getBoundingClientRect();
        //we need this check to prevent false positives
        //might be replaced by whatever i get from selecto, but for now this works
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
        selectoRef.current?.findSelectableTargets();
        blockDeselectionRef.current = true;
        setTimeout(() => {
            blockDeselectionRef.current = false;
        }, 0);
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