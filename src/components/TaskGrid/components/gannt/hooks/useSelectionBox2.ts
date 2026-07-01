import Selecto, { OnDrag, OnDragEnd, OnDragStart, OnScroll, OnSelect } from "selecto";
import { IGanttManager } from "../GanttManager";
import { useEventEmitter } from "../../../../../hooks";
import { useCallback, useEffect, useRef } from "react";
import { useTaskDataProvider } from "../../../context";

export const GANTT_TASK_LINE_CLASS = 'gantt_task_line';
export const GANTT_SHIFT_HELD_CLASS = 'gantt_shift_held';
export const GANT_SELECTED_CLASS = 'gantt_task_selected';

const getDirection = (arr: number[]): 'up' | 'down' | 'left' | 'right' | null => {
    if (arr[0] === -1 && arr[1] === 0) return 'left';
    if (arr[0] === 1 && arr[1] === 0) return 'right';
    if (arr[0] === 0 && arr[1] === -1) return 'up';
    if (arr[0] === 0 && arr[1] === 1) return 'down';
    return null;
}

export const useSelectionBox = (ganttManager: IGanttManager) => {
    const gantt = ganttManager.getGanttInstance();
    const selectoRef = useRef<Selecto>();
    const selectedIdsRef = useRef<string[]>([]);
    const dataProvider = useTaskDataProvider();
    const lastScrollDirectionRef = useRef<'up' | 'down' | 'left' | 'right' | null>(null);

    const onInit = () => {
        const container = gantt.$task;
        selectoRef.current = new Selecto({
            container: container,
            hitRate: 0,
            ratio: 0,
            selectableTargets: [`.${GANTT_TASK_LINE_CLASS}`],
            scrollOptions: {
                container: gantt.$scroll_hor,
                throttleTime: 30,
                //threshold: 100,
            }

        });
        selectoRef.current.on('select', onSelect);
        selectoRef.current.on('scroll', onScroll);
        selectoRef.current.on('dragStart', onDragStart);
        selectoRef.current.on('dragEnd', onDragEnd);
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
        e.removed.forEach(el => {
            el.classList.remove(GANT_SELECTED_CLASS);
        })
        e.added.forEach(el => {
            el.classList.add(GANT_SELECTED_CLASS);
        });
        selectedIdsRef.current = e.selected.map(el => el.getAttribute('data-task-id')!);
    };

    const onDragStart = (e: OnDragStart<Selecto>) => {
        if (!e.inputEvent.shiftKey) {
            e.stop();
        }
        onDrag(e as any);
    };

    const onDrag = (e: OnDrag<Selecto>) => {
        const { clientX, clientY } = e.inputEvent as MouseEvent;
        const rect = (gantt.$task as HTMLElement).getBoundingClientRect();

        const distToHorizontalEdge = Math.min(Math.abs(clientX - rect.left), Math.abs(clientX - rect.right));
        const distToVerticalEdge = Math.min(Math.abs(clientY - rect.top), Math.abs(clientY - rect.bottom));

        if (distToHorizontalEdge < distToVerticalEdge) {
            selectoRef.current!.scrollOptions.container = gantt.$scroll_hor;
        } else {
            selectoRef.current!.scrollOptions.container = gantt.$scroll_ver;
        }
    }

    const onDragEnd = (e: OnDragEnd<Selecto>) => {
        if(selectedIdsRef.current.length > 0) {
            dataProvider.setSelectedRecordIds(selectedIdsRef.current);
        }
    }


    const onScroll = (e: OnScroll) => {
        const direction = getDirection(e.direction);
        lastScrollDirectionRef.current = direction;
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