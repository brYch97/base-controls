import { Callout, ICalloutProps } from "@fluentui/react";
import { ITaskTooltipProps, TaskTooltip } from "./task-tooltip";

export interface IGanttComponents {
    onRenderTaskTooltip: (props: ITaskTooltipProps) => React.ReactElement;
    onRenderTaskTooltipCallout: (props: ICalloutProps) => React.ReactElement;
}

export const GanttComponents: IGanttComponents = {
    onRenderTaskTooltip: (props: ITaskTooltipProps) => <TaskTooltip {...props} />,
    onRenderTaskTooltipCallout: (props: ICalloutProps) => <Callout {...props} />
}