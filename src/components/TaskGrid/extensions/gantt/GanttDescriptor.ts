import React from "react";
import { Gantt, IGanttProps } from "./Gantt";
import { IRibbonQuickFindWrapperProps } from "../../..";
import { RibbonQuickFindWrapper } from "./components/ribbon-quickfind-wrapper/RibbonQuickFindWrapper";
import type { ICommandBarItemProps } from "@talxis/react-components";
import debounce from "debounce";
import { EventEmitter, IEventEmitter } from "@talxis/client-libraries";
import { ITaskGridState } from "../../TaskGridDatasetControlFactory";
import { ICustomMarker } from "./gantt-timeline/GanttMarkers";

export interface IGanttDescriptorInitializationParameters {
    state: ITaskGridState;
}

export interface IGanttDescriptorEvents {
    onAgGridScrolled: (scrollTop: number) => void;
    onAgGridRowExpanded: (taskId: string) => void;
    onAgGridRowCollapsed: (taskId: string) => void;
    onGanttScrolled: (scrollTop: number) => void;
    onGanttTaskExpanded: (taskId: string) => void;
    onGanttTaskCollapsed: (taskId: string) => void;
    onJumpToTodayRequested: () => void;
    onShowWeekendsChanged: (showWeekends: boolean) => void;
    onZoomLevelChanged: (level: number) => void;
}

type GanttDescriptorEventName = keyof IGanttDescriptorEvents;

const MIRROR_EVENTS: Partial<Record<GanttDescriptorEventName, GanttDescriptorEventName>> = {
    onAgGridScrolled: 'onGanttScrolled',
    onGanttScrolled: 'onAgGridScrolled',
    onAgGridRowExpanded: 'onGanttTaskExpanded',
    onGanttTaskExpanded: 'onAgGridRowExpanded',
    onAgGridRowCollapsed: 'onGanttTaskCollapsed',
    onGanttTaskCollapsed: 'onAgGridRowCollapsed',
};

export interface IGanttDescriptor {
    events: IEventEmitter<IGanttDescriptorEvents>;
    initialize: (parameters: IGanttDescriptorInitializationParameters) => void;
    destroy: () => void;
    onGetGanttComponent: (props: IGanttProps) => JSX.Element;
    onRenderDatasetControlRibbonQuickFindWrapper: (props: IExtendedRibbonQuickFindWrapperProps, defaultRender: (props: IExtendedRibbonQuickFindWrapperProps) => JSX.Element) => JSX.Element;
    onGetCustomMarkers: () => ICustomMarker[];
    getZoomLevel: () => number;
    setZoomLevel: (zoomLevel: number) => void;
    jumpToToday: () => void;
    isWeekendVisible: () => boolean;
    showWeekend: (showWeekends: boolean) => void;
    getGanttWidth: () => number | undefined;
    setGanttWidth: (ganttWidth: number) => void;
}

export interface IExtendedRibbonQuickFindWrapperProps extends IRibbonQuickFindWrapperProps {
    onRenderZoomSlider?: () => JSX.Element;
    onGetCommandBarItems?: (items: ICommandBarItemProps[]) => ICommandBarItemProps[];
    onRenderSettingsCallout?: () => JSX.Element;
}

export class GanttDescriptor implements IGanttDescriptor {
    
    public readonly events: IEventEmitter<IGanttDescriptorEvents> = new EventEmitter<IGanttDescriptorEvents>();
    private _state: ITaskGridState | null = null;
    private _suppressedEvents = new Set<GanttDescriptorEventName>();
    private _debouncedClean: debounce.DebouncedFunction<() => void>;
    private _zoomLevel: number = 0;

    constructor() {
        this._debouncedClean = debounce(() => this._suppressedEvents.clear(), 100);
    }

    public initialize(parameters: IGanttDescriptorInitializationParameters) {
        this._state = parameters.state;
    }

    public destroy() {
        this._debouncedClean.clear();
        this._suppressedEvents.clear();
        this.events.clearEventListeners();
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

    public onGetCustomMarkers() {
        return [];
    }

    public setZoomLevel(zoomLevel: number) {
        if (this._zoomLevel !== zoomLevel) {
            this._zoomLevel = zoomLevel;
            this._dispatchEvent('onZoomLevelChanged', zoomLevel);
        }
    }

    public jumpToToday() {
        this._dispatchEvent('onJumpToTodayRequested');
    }

    public isWeekendVisible(): boolean {
        return this._getSavedQueryState().showWeekends ?? false;
    }

    public showWeekend(showWeekends: boolean) {
        this._getSavedQueryState().showWeekends = showWeekends;
        this._dispatchEvent('onShowWeekendsChanged', showWeekends);
    }

    public getGanttWidth(): number | undefined {
        return this._getSavedQueryState().ganttWidth;
    }

    public setGanttWidth(ganttWidth: number) {
        this._getSavedQueryState().ganttWidth = ganttWidth;
    }

    public getZoomLevel(): number {
        return this._zoomLevel;
    }

    private _dispatchEvent<K extends GanttDescriptorEventName>(event: K, ...args: Parameters<IGanttDescriptorEvents[K]>): boolean {
        if (this._suppressedEvents.has(event)) {
            return false;
        }

        const mirror = MIRROR_EVENTS[event];
        if (mirror) {
            this._suppressedEvents.add(mirror);
            this._debouncedClean();
        }

        return this.events.dispatchEvent(event, ...args);
    }

    private _getSavedQueryState() {
        if (!this._state?.savedQuery) {
            throw new Error('Cannot access gantt state before the descriptor is initialized with a saved query.');
        }

        return this._state.savedQuery;
    }
}