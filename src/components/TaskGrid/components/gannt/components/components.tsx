import { Callout, ICalloutProps } from "@fluentui/react";
import { TaskTooltip } from "./task-tooltip";
import { IGanttComponents, ITaskTooltipProps } from "../context";
import { TaskText } from "./task-text";

export const GanttComponents: IGanttComponents = {
    onRenderTaskText: (props) => <TaskText {...props} />,
    onRenderTaskTooltip: (props: ITaskTooltipProps) => <TaskTooltip {...props} />,
    onRenderTaskTooltipCallout: (props: ICalloutProps) => <Callout {...props} />
};