import { GanttStatic, Task } from 'gantt-trial'
import { useCallback, useEffect, useRef, useState } from 'react';
import { useEventEmitter } from '../../../../../../hooks';
import { IGanttDragging, IGanttDraggingEvents } from '../GanttDragging';
import { GANTT_TASK_ROW_CLASS } from '../classNames';

interface IUseTooltipParams {
	gantt: GanttStatic;
	dragging: IGanttDragging;
}

export interface ITooltipState {
	task: Task;
	event: MouseEvent;
}

export const useTooltip = (params: IUseTooltipParams) => {
	const [tooltipState, setTooltipState] = useState<ITooltipState | null>(null);
	const draggingTaskIdRef = useRef<string | null>(null);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const { gantt, dragging } = params;

	const onMouseMove = useCallback((event: MouseEvent) => {
		if (draggingTaskIdRef.current) {
			setTooltipState({ task: gantt.getTask(draggingTaskIdRef.current), event });
			return;
		}
		const taskAttr = gantt.config.task_attribute;
		const taskNode = (event.target as HTMLElement).closest<HTMLElement>(`[${taskAttr}]:not(.${GANTT_TASK_ROW_CLASS})`);
		if (!taskNode) {
			setTooltipState(null);
			return;
		}

		const taskId = taskNode.getAttribute(taskAttr);
		if (!taskId || !gantt.isTaskExists(taskId)) {
			setTooltipState(null);
			return;
		}

		setTooltipState({ task: gantt.getTask(taskId), event });
	}, []);

	const onMouseOut = useCallback((event: MouseEvent) => {
		if (draggingTaskIdRef.current) {
			return;
		}
		const taskAttr = gantt.config.task_attribute;
		const related = event.relatedTarget as HTMLElement | null;
		if (!related?.closest(`[${taskAttr}]:not(.${GANTT_TASK_ROW_CLASS})`)) {
			setTooltipState(null);
		}
	}, []);

	useEventEmitter<IGanttDraggingEvents>(dragging.events, 'onDragStarted', (taskId) => {
		draggingTaskIdRef.current = taskId;
	});

	useEventEmitter<IGanttDraggingEvents>(dragging.events, 'onDragEnded', () => {
		draggingTaskIdRef.current = null;
		setTooltipState(null);
	});

	const init = (container: HTMLDivElement) => {
		containerRef.current = container;
		container.addEventListener('mousemove', onMouseMove);
		container.addEventListener('mouseout', onMouseOut);
	}
	useEffect(() => {
		return () => {
			containerRef.current?.removeEventListener('mousemove', onMouseMove);
			containerRef.current?.removeEventListener('mouseout', onMouseOut);
		};
	}, [onMouseMove, onMouseOut]);

	return {
		tooltip: {
			state: tooltipState,
			init: init
		}
	}
}