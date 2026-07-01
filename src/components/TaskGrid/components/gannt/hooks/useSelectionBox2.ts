import Selecto, { OnDragEnd, OnDragStart, OnScroll, OnSelect } from "selecto";
import { IGanttManager } from "../GanttManager";
import { useEventEmitter } from "../../../../../hooks";
import { useCallback, useEffect, useRef } from "react";
import { useTaskDataProvider } from "../../../context";


export const GANTT_SHIFT_HELD_CLASS = 'gantt_shift_held';
export const GANTT_TASK_SELECTED_CLASS = 'gantt_task_selected';
export const GANTT_TASK_LINE_CLASS = 'gantt_task_line';
export const GANTT_TASK_SIDE_CONTENT_CLASS = 'gantt_side_content';
const EDGE_SCROLL_THRESHOLD = 50;

export const useSelectionBox = (ganttManager: IGanttManager) => {
    const gantt = ganttManager.getGanttInstance();
    const selectoRef = useRef<Selecto>();
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

    const onScroll = (e: OnScroll) => {
        const [horizontalDirection, verticalDirection] = e.direction;

        if (verticalDirection !== 0) {
            gantt.scrollTo(null, gantt.getScrollState().y + (verticalDirection * 10));
        }

        if (horizontalDirection !== 0) {
            gantt.scrollTo(gantt.getScrollState().x + (horizontalDirection * 10), null);
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