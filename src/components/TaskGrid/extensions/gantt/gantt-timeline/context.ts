import React from "react";
import { Task } from "gantt-trial";
import { IMarkerProps } from "./components/marker";

export interface IGanttTaskTooltipProps {
    task: Task;
    event: MouseEvent;
}

export interface ITaskTextProps {
    task: Task;
}

export interface IGanttComponents {
    //onRenderTaskText: (props: ITaskTextProps) => React.ReactElement;
    onRenderTaskTooltip: (props: IGanttTaskTooltipProps) => React.ReactElement;
    onRenderMarker: (props: IMarkerProps) => React.ReactElement;
}