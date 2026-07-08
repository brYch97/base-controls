import React from "react";
import { Gantt, IGanttProps } from "./Gantt";
import { GanttGridBridge, IGanttGridBridge } from "./GanttGridBridge";
import { IRibbonQuickFindWrapperProps } from "../../..";
import { RibbonQuickFindWrapper } from "./components/ribbon-quickfind-wrapper/RibbonQuickFindWrapper";
import type { ICommandBarItemProps } from "@talxis/react-components";

export interface IGanttDescriptor {
    onGetGanttComponent: (props: IGanttProps) => JSX.Element;
    onRenderDatasetControlRibbonQuickFindWrapper: (props: IExtendedRibbonQuickFindWrapperProps, defaultRender: (props: IExtendedRibbonQuickFindWrapperProps) => JSX.Element) => JSX.Element;
    getGridBridge: () => IGanttGridBridge;
}

export interface IExtendedRibbonQuickFindWrapperProps extends IRibbonQuickFindWrapperProps {
    onRenderZoomSlider?: () => JSX.Element;
    onGetCommandBarItems?: (items: ICommandBarItemProps[]) => ICommandBarItemProps[];
    onRenderSettingsCallout?: () => JSX.Element;
}

export class GanttDescriptor implements IGanttDescriptor {
    private _bridge: IGanttGridBridge;

    constructor() {
        this._bridge = new GanttGridBridge();
    }
    public onGetGanttComponent(props: IGanttProps) {
        return React.createElement(Gantt, props);
    }

    public onRenderDatasetControlRibbonQuickFindWrapper(props: IExtendedRibbonQuickFindWrapperProps, defaultRender: (props: IExtendedRibbonQuickFindWrapperProps) => JSX.Element) {
        return React.createElement(RibbonQuickFindWrapper, {
            ribbonWrapperProps: props,
            defaultRender: defaultRender
        });
    }

    public getGridBridge() {
        return this._bridge;
    }
}