import { ITaskTooltipProps, TaskTooltip } from "./task-tooltip";

export interface IGanttComponents {
    onRenderTaskTooltip: (props: ITaskTooltipProps) => React.ReactElement;
}

export const GanttComponents: IGanttComponents = {
    onRenderTaskTooltip: (props: ITaskTooltipProps) => <TaskTooltip {...props} />
}