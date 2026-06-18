import React from "react";
import { ICalloutProps } from "@fluentui/react";
import { Task } from "gantt-trial";

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
}

export const GanttComponentsContext = React.createContext<IGanttComponents | null>(null);

export const useGanttComponents = () => {
    const components = React.useContext(GanttComponentsContext);
    if (!components) {
        throw new Error('GanttComponentsContext is not provided');
    }
    return components;
};