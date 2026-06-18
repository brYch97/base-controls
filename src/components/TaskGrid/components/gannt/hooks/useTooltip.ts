import { GanttStatic, Task } from 'gantt-trial'
import { useCallback, useEffect, useState } from 'react';

interface IUseTooltipParams {
	container: HTMLDivElement | null;
	gantt: GanttStatic;
}

export interface ITooltipState {
	task: Task;
	event: MouseEvent;
}

export const useTooltip = (params: IUseTooltipParams) => {
	const [tooltip, setTooltip] = useState<ITooltipState | null>(null);
    const { gantt, container} = params;

	const onMouseMove = useCallback((event: MouseEvent) => {
		const taskAttr = params.gantt.config.task_attribute;
		const taskNode = (event.target as HTMLElement).closest<HTMLElement>(`[${taskAttr}]:not(.gantt_task_row)`);
		if (!taskNode) {
			setTooltip(null);
			return;
		}

		const taskId = taskNode.getAttribute(taskAttr);
		if (!taskId || !gantt.isTaskExists(taskId)) {
			setTooltip(null);
			return;
		}

		setTooltip({ task: gantt.getTask(taskId), event });
	}, []);

	const onMouseOut = useCallback((event: MouseEvent) => {
		const taskAttr = gantt.config.task_attribute;
		const related = event.relatedTarget as HTMLElement | null;
		if (!related?.closest(`[${taskAttr}]:not(.gantt_task_row)`)) {
			setTooltip(null);
		}
	}, []);

	useEffect(() => {
		if (!container) {
			return;
		}
		container.addEventListener('mousemove', onMouseMove);
		container.addEventListener('mouseout', onMouseOut);

		return () => {
			container.removeEventListener('mousemove', onMouseMove);
			container.removeEventListener('mouseout', onMouseOut);
		};
	}, [container, onMouseMove, onMouseOut]);

	return tooltip;
}