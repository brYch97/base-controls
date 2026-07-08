import React from "react";
import { Gantt, IGanttProps } from "./Gantt";
import { GanttGridBridge, IGanttGridBridge } from "./GanttGridBridge";

export interface IGanttDescriptor {
    onGetGanttComponent: (props: IGanttProps) => JSX.Element;
    getGridBridge: () => IGanttGridBridge
}

export class GanttDescriptor implements IGanttDescriptor {
    private _bridge: IGanttGridBridge;
    constructor() {
        this._bridge = new GanttGridBridge();
    }
    public onGetGanttComponent(props: IGanttProps) {
        return React.createElement(Gantt, props);
    }

    public getGridBridge() {
        return this._bridge;
    }
}