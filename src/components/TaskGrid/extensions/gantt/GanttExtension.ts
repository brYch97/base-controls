import React from "react";
import { Gantt, IGanttProps } from "./Gantt";
import { IRibbonQuickFindWrapperProps } from "../../..";
import { RibbonQuickFindWrapper } from "./components/ribbon-quickfind-wrapper/RibbonQuickFindWrapper";
import type { ICommandBarItemProps } from "@talxis/react-components";
import debounce from "debounce";
import { EventEmitter, IEventEmitter } from "@talxis/client-libraries";
import { ITaskGridState } from "../../TaskGridDatasetControlFactory";
import { ICustomMarker } from "./gantt-timeline/GanttMarkers";
import { ColDef, IGridCustomizer } from "../../components/grid";
import { DatasetConstants, IRecord } from "@talxis/client-libraries";
import { RowGroupOpenedEvent } from "@ag-grid-community/core";

export interface IGanttExtensionInitializationParameters {
    state: ITaskGridState;
}

export interface IGanttExtensionEvents {
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

type GanttExtensionEventName = keyof IGanttExtensionEvents;

const MIRROR_EVENTS: Partial<Record<GanttExtensionEventName, GanttExtensionEventName>> = {
    onAgGridScrolled: 'onGanttScrolled',
    onGanttScrolled: 'onAgGridScrolled',
    onAgGridRowExpanded: 'onGanttTaskExpanded',
    onGanttTaskExpanded: 'onAgGridRowExpanded',
    onAgGridRowCollapsed: 'onGanttTaskCollapsed',
    onGanttTaskCollapsed: 'onAgGridRowCollapsed',
};

export interface IGanttExtension {
    events: IEventEmitter<IGanttExtensionEvents>;
    initialize: (parameters: IGanttExtensionInitializationParameters) => void;
    destroy: () => void;
    getGanttComponent: (props: IGanttProps) => JSX.Element;
    getRenderDatasetContrilRibbonQuickFindWrapper: (props: IExtendedRibbonQuickFindWrapperProps, defaultRender: (props: IExtendedRibbonQuickFindWrapperProps) => JSX.Element) => JSX.Element;
    getCustomMarkers: () => ICustomMarker[];
    setGridCustomizer: (customizer: IGridCustomizer) => void;
    getZoomLevel: () => number | undefined;
    setZoomLevel: (zoomLevel: number) => void;
    jumpToToday: () => void;
    isWeekendVisible: () => boolean;
    showWeekend: (showWeekends: boolean) => void;
    getGanttWidth: () => number | undefined;
    setGanttWidth: (ganttWidth: number) => void;
    getColumnDefinitions: (colDefs: ColDef[]) => ColDef[];
}

export interface IExtendedRibbonQuickFindWrapperProps extends IRibbonQuickFindWrapperProps {
    onRenderZoomSlider?: () => JSX.Element;
    onGetCommandBarItems?: (items: ICommandBarItemProps[]) => ICommandBarItemProps[];
    onRenderSettingsCallout?: () => JSX.Element;
}

class GanttExtensionEventEmitter extends EventEmitter<IGanttExtensionEvents> {
    private _suppressedEvents = new Set<GanttExtensionEventName>();
    private _debouncedClean: debounce.DebouncedFunction<() => void>;

    constructor() {
        super();
        this._debouncedClean = debounce(() => this._suppressedEvents.clear(), 100);
    }

    public destroy() {
        this._debouncedClean.clear();
        this._suppressedEvents.clear();
        this.clearEventListeners();
    }

    public dispatchEvent<K extends GanttExtensionEventName>(event: K, ...args: Parameters<IGanttExtensionEvents[K]>): boolean {
        if (this._suppressedEvents.has(event)) {
            return false;
        }

        const mirror = MIRROR_EVENTS[event];
        if (mirror) {
            this._suppressedEvents.add(mirror);
            this._debouncedClean();
        }

        return super.dispatchEvent(event, ...args);
    }
}

export class GanttExtension implements IGanttExtension {
    public readonly events: IEventEmitter<IGanttExtensionEvents> = new GanttExtensionEventEmitter();
    private _state: ITaskGridState | null = null;
    private _customizer: IGridCustomizer | null = null;

    public initialize(parameters: IGanttExtensionInitializationParameters) {
        this._state = parameters.state;
    }

    public setGridCustomizer(customizer: IGridCustomizer) {
        this._customizer = customizer;
        this._registerGridEventListeners();
    }

    public getColumnDefinitions(colDefs: ColDef[]): ColDef[] {
        const subjectColumnName = this._getCustomizer().getDatasetControl().getNativeColumns().subject;
        for (const colDef of colDefs) {
            if (colDef.colId === subjectColumnName) {
                colDef.pinned = undefined;
            }
            if (colDef.colId === DatasetConstants.CHECKBOX_COLUMN_KEY) {
                colDef.lockPosition = true;
            }
            colDef.autoHeight = false;
        }

        return colDefs;
    }

    public destroy() {
        (this.events as GanttExtensionEventEmitter).destroy();
    }

    public getGanttComponent(props: IGanttProps) {
        return React.createElement(Gantt, props);
    }

    public getRenderDatasetContrilRibbonQuickFindWrapper(props: IExtendedRibbonQuickFindWrapperProps, defaultRender: (props: IExtendedRibbonQuickFindWrapperProps) => JSX.Element) {
        return React.createElement(RibbonQuickFindWrapper, {
            ribbonWrapperProps: props,
            defaultRender: defaultRender
        });
    }

    public getCustomMarkers() {
        return [];
    }

    public setZoomLevel(zoomLevel: number) {
        if (this.getZoomLevel() !== zoomLevel) {
            this._getSavedQueryState().zoomLevel = zoomLevel;
            this.events.dispatchEvent('onZoomLevelChanged', zoomLevel);
        }
    }

    public jumpToToday() {
        this.events.dispatchEvent('onJumpToTodayRequested');
    }

    public isWeekendVisible(): boolean {
        return this._getSavedQueryState().showWeekends ?? false;
    }

    public showWeekend(showWeekends: boolean) {
        this._getSavedQueryState().showWeekends = showWeekends;
        this.events.dispatchEvent('onShowWeekendsChanged', showWeekends);
    }

    public getGanttWidth(): number | undefined {
        return this._getSavedQueryState().ganttWidth;
    }

    public setGanttWidth(ganttWidth: number) {
        this._getSavedQueryState().ganttWidth = ganttWidth;
    }

    public getZoomLevel(): number | undefined {
        return this._getSavedQueryState().zoomLevel;
    }

    private _registerGridEventListeners() {
        const gridApi = this._getCustomizer().getGridApi();
        const viewport = this._getAgGridVerticalViewport();

        viewport.addEventListener('scroll', (event) => this._onAgGridScrolled((event.target as Element).scrollTop));
        gridApi.addEventListener('rowGroupOpened', (event: RowGroupOpenedEvent<IRecord>) => this._onRowGroupOpened(event));
        this.events.addEventListener('onGanttScrolled', (scrollTop) => this._onGanttScrolled(scrollTop));
        this.events.addEventListener('onGanttTaskExpanded', (taskId) => this._onGanttRowExpanded(taskId));
        this.events.addEventListener('onGanttTaskCollapsed', (taskId) => this._onGanttRowCollapsed(taskId));
    }

    private _onGanttScrolled(scrollTop: number) {
        const viewport = this._getAgGridVerticalViewport();
        viewport.scrollTop = scrollTop;
    }

    private _onAgGridScrolled(scrollTop: number) {
        this.events.dispatchEvent('onAgGridScrolled', scrollTop);
    }

    private _onGanttRowExpanded(taskId: string) {
        const node = this._getCustomizer().getGridApi().getRowNode(taskId);
        if (node && !node.expanded) {
            node.setExpanded(true);
        }
    }

    private _onGanttRowCollapsed(taskId: string) {
        const node = this._getCustomizer().getGridApi().getRowNode(taskId);
        if (node && node.expanded) {
            node.setExpanded(false);
        }
    }

    private _getAgGridVerticalViewport(): HTMLElement {
        const controlId = this._getCustomizer().getDatasetControl().getControlId();
        const rootElement = document.getElementById(`${controlId}-root`);
        const viewport = rootElement?.querySelector('.ag-body-viewport');
        if (!(viewport instanceof HTMLElement)) {
            throw new Error('AgGrid vertical viewport not found');
        }

        return viewport;
    }

    private _onRowGroupOpened(event: RowGroupOpenedEvent<IRecord>) {
        if (!event.node.id) {
            return;
        }
        if (event.expanded) {
            this.events.dispatchEvent('onAgGridRowExpanded', event.node.id);
        } else {
            this.events.dispatchEvent('onAgGridRowCollapsed', event.node.id);
        }
    }

    private _getSavedQueryState() {
        if (!this._state?.savedQuery) {
            throw new Error('Cannot access gantt state before the descriptor is initialized with a saved query.');
        }

        return this._state.savedQuery;
    }

    private _getCustomizer(): IGridCustomizer {
        if (!this._customizer) {
            throw new Error('GanttExtension customizer has not been provided.');
        }

        return this._customizer;
    }
}