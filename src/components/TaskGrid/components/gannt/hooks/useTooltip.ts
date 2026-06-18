import { GanttStatic, Task } from 'gantt-trial'
import { useCallback, useEffect, useRef, useState } from 'react';

interface IUseTooltipParams {
	gantt: GanttStatic;
}

export interface ITooltipState {
	task: Task;
	event: MouseEvent;
}

export const useTooltip = (params: IUseTooltipParams) => {
	const [tooltipState, setTooltipState] = useState<ITooltipState | null>(null);
	const containerRef = useRef<HTMLDivElement | null>(null);
    const { gantt } = params;

	const onMouseMove = useCallback((event: MouseEvent) => {
		const taskAttr = params.gantt.config.task_attribute;
		const taskNode = (event.target as HTMLElement).closest<HTMLElement>(`[${taskAttr}]:not(.gantt_task_row)`);
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
		const taskAttr = gantt.config.task_attribute;
		const related = event.relatedTarget as HTMLElement | null;
		if (!related?.closest(`[${taskAttr}]:not(.gantt_task_row)`)) {
			setTooltipState(null);
		}
	}, []);

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