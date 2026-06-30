import Selecto, { OnDragStart, OnScroll, OnSelect } from "selecto";
import { IGanttManager } from "../GanttManager";
import { useEventEmitter } from "../../../../../hooks";
import { useCallback, useEffect, useRef } from "react";

export const GANTT_TASK_LINK_CLASS = 'gantt_task_link';
export const GANTT_SHIFT_HELD_CLASS = 'gantt_shift_held';

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
    const lastScrollDirectionRef = useRef<'up' | 'down' | 'left' | 'right' | null>(null);

    const onInit = () => {
        const container = gantt.$task
        selectoRef.current = new Selecto({
            container: container,
            hitRate: 100,
            toggleContinueSelect: ['shift'],
            ratio: 0,
            boundContainer: container,
            selectableTargets: [`.${GANTT_TASK_LINK_CLASS}`],
            scrollOptions: {
                container: container,
                throttleTime: 30,
                threshold: 100,
            }

        });
        monkeyPatchSelecto();
        selectoRef.current.on('select', onSelect);
        selectoRef.current.on('scroll', onScroll);
        selectoRef.current.on('dragStart', onDragStart);
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

    const monkeyPatchSelecto = () => {
        //@ts-ignore
        const originalGetEventData = selectoRef.current.gesto.getEventData.bind(selectoRef.current.gesto);
        let originalBoundArea = originalGetEventData?.().boundArea;
        //@ts-ignore
        selectoRef.current.gesto.getEventData = () => {
            const originalEventData = originalGetEventData?.();
            if (!originalBoundArea) {
                originalBoundArea = originalEventData?.boundArea;
                console.log('Original boundArea:', originalBoundArea);
            }
            const rect = gantt.$task.getBoundingClientRect();
            originalEventData.boundArea = { ...originalBoundArea };
            switch (lastScrollDirectionRef.current) {
                case 'up':
                    originalEventData.boundArea.top = rect.top;
                    break;
                case 'down':
                    originalEventData.boundArea.bottom = rect.bottom;
                    break;
                case 'left':
                    originalEventData.boundArea.left = rect.left;
                    break;
                case 'right':
                    originalEventData.boundArea.right = rect.right;
                    break;
            }
            console.log('Modified boundArea:', originalEventData.boundArea);
            return originalEventData;
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