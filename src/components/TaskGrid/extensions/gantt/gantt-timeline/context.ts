import React from "react";
import { ICalloutProps } from "@fluentui/react";
import { Task } from "gantt-trial";
import { IMarkerProps } from "./components/marker";

export interface ITaskTooltipProps {
    task: Task;
    event: MouseEvent;
}

export interface ITaskTextProps {
    task: Task;
}

export interface IGanttComponents {
    //onRenderTaskText: (props: ITaskTextProps) => React.ReactElement;
    onRenderTaskTooltip: (props: ITaskTooltipProps) => React.ReactElement;
    onRenderTaskTooltipCallout: (props: ICalloutProps) => React.ReactElement;
    onRenderMarker: (props: IMarkerProps) => React.ReactElement;
}