import { Callout, ICalloutProps } from "@fluentui/react";
import { TaskTooltip } from "./task-tooltip";
import { IGanttComponents, ITaskTooltipProps } from "../context";

export const GanttComponents: IGanttComponents = {
    onRenderTaskTooltip: (props: ITaskTooltipProps) => <TaskTooltip {...props} />,
    onRenderTaskTooltipCallout: (props: ICalloutProps) => <Callout {...props} />
};