import { GanttStatic } from "gantt-trial";
import { ITaskGridDatasetControl } from "../../interfaces";
import { ILocalizationService } from "../../../..";
import { ITaskGridLabels } from "../../labels";
import { GanttDates, IGanttDates } from "./GanttDates";
import { IProjectDataProvider } from "../../extensions/providers/project";
import { getClassNames } from "@talxis/react-components";
import { EventEmitter, IEventEmitter } from "@talxis/client-libraries";

interface IGanttMarkersParams {
    gantt: GanttStatic;
    dates: GanttDates;
    datasetControl: ITaskGridDatasetControl;
}

export interface IGanttMarkersEvents {
    onMarkersUpdated: () => void;
}

export interface IGanttMarkers {
    events: IEventEmitter<IGanttMarkersEvents>;
    getMarkers(): IGanttMarker[];
}

export type MarkerType = 'milestone' | 'project_start' | 'project_end' | 'today' | 'custom';

export interface IGanttMarker {
    id: number | string;
    text: string;
    type: MarkerType;
    start_date: Date;
    css?: string;
    color?: string;
    end_date?: Date;
}

export interface ICustomMarker extends Omit<IGanttMarker, 'id' | 'type'> {

}

export const LABEL_OVERLAY_ATTR = 'data-marker-label-overlay';
export const TODAY_MARKER_CLASS = 'gantt_marker_today';
export const PROJECT_START_MARKER_CLASS = 'gantt_marker_project_start';
export const PROJECT_END_MARKER_CLASS = 'gantt_marker_project_end';
export const SCALE_LABEL_ATTR = 'data-gantt-marker-label';
export const MILESTONE_MARKER_CLASS = 'gantt_marker_milestone';
export const CUSTOM_MARKER_CLASS = 'gantt_marker_custom';

//pro feature
export class GanttMarkers implements IGanttMarkers {
    private _gantt: GanttStatic;
    private _dates: IGanttDates;
    private _initialized: boolean = false;
    private _datasetControl: ITaskGridDatasetControl;
    private _projectDataProvider: IProjectDataProvider | null;
    private _localizationService: ILocalizationService<ITaskGridLabels>;
    private _markers: Map<string | number, IGanttMarker> = new Map();
    public readonly events: IEventEmitter<IGanttMarkersEvents> = new EventEmitter<IGanttMarkersEvents>();
    private _getCustomMarkers: () => ICustomMarker[];

    constructor(params: IGanttMarkersParams) {
        this._datasetControl = params.datasetControl;
        this._gantt = params.gantt;
        this._dates = params.dates;
        this._localizationService = this._datasetControl.getLocalizationService();
        this._projectDataProvider = this._datasetControl.getProjectDataProvider();
        this._getCustomMarkers = this._datasetControl.extensions.gantt?.onGetCustomMarkers ?? (() => []);
        this._registerEventListeners();
    }

    public init() {
        this._addTodayMarker();
        this._addMilestoneMarker();
        this._addCustomMarkers();
    }

    public getMarkers(): IGanttMarker[] {
        return Array.from(this._markers.values());
    }

    private _addMarker(marker: Omit<IGanttMarker, 'id'>): IGanttMarker {
        const id = this._gantt.addMarker(marker);
        const stored: IGanttMarker = { ...marker, id };
        this._markers.set(id, stored);
        const ganttElement = (this._gantt as any).$root as HTMLElement | undefined;
        if (marker.color) {
            ganttElement?.style.setProperty(`--${marker.type}-marker-color`, marker.color);
        }

        this.events.dispatchEvent('onMarkersUpdated');
        return stored;
    }

    private _deleteMarker(id: string | number) {
        if (!this._markers.has(id)) return;
        this._gantt.deleteMarker(id);
        this._markers.delete(id);
        this.events.dispatchEvent('onMarkersUpdated');
    }

    private _updateMarker(id: string | number, patch: Partial<Omit<IGanttMarker, 'id'>>) {
        const stored = this._markers.get(id)!;
        const ganttMarker = this._gantt.getMarker(id);
        Object.assign(ganttMarker, patch);
        this._gantt.updateMarker(id);
        this._markers.set(id, { ...stored, ...patch });
        this.events.dispatchEvent('onMarkersUpdated');
    }

    private _findByType(type: MarkerType): IGanttMarker | undefined {
        for (const marker of this._markers.values()) {
            if (marker.type === type) return marker;
        }
        return undefined;
    }

    private _addTodayMarker() {
        this._addMarker({
            start_date: new Date(),
            text: 'Today',
            css: TODAY_MARKER_CLASS,
            type: 'today',
            color: '#0078d4',
        });
    }

    private _addProjectStartMarker() {
        const startDate = this._projectDataProvider?.getProjectStartDate();
        if (!startDate) return;
        this._addMarker({
            start_date: startDate,
            text: 'Project Start',
            css: PROJECT_START_MARKER_CLASS,
            type: 'project_start',
            color: 'rgb(255, 185, 0)',
        });
    }

    private _addMilestoneMarker() {
        this._addMarker({
            start_date: new Date('2025-01-01'),
            text: 'Milestone',
            css: MILESTONE_MARKER_CLASS,
            type: 'milestone',
            color: '#5c2d91',
        });
    }

    private _addProjectEndMarker() {
        const endDate = this._projectDataProvider?.getProjectEndDate();
        if (!endDate) return;
        this._addMarker({
            start_date: endDate,
            text: 'Project End',
            css: PROJECT_END_MARKER_CLASS,
            type: 'project_end',
            color: 'rgb(255, 185, 0)',
        });
    }

    private _addCustomMarkers() {
        this._getCustomMarkers().forEach((marker) => {
            const classNames = getClassNames([CUSTOM_MARKER_CLASS, marker.css]);
            this._addMarker({ ...marker, css: classNames, type: 'custom' });
        });
    }

    private _updateMarkerDate(type: 'project_start' | 'project_end', date: Date | null) {
        const existing = this._findByType(type);
        if (existing && !date) {
            this._deleteMarker(existing.id);
        } else if (!existing && date) {
            type === 'project_start' ? this._addProjectStartMarker() : this._addProjectEndMarker();
        } else if (existing && date) {
            this._updateMarker(existing.id, { start_date: date });
        }
    }

    private _registerEventListeners() {
        this._projectDataProvider?.events.addEventListener('onDatesChanged', (dates) => {
            this._updateMarkerDate('project_start', dates.startDate);
            this._updateMarkerDate('project_end', dates.endDate);
        });
        this._gantt.attachEvent('onClear', () => this._render())
        this._gantt.attachEvent('onGanttReady', () => this._init());
    }

    private _init() {
        this._addTodayMarker();
        this._addCustomMarkers();
    }

    private _render() {
        for (const marker of this._markers.values()) {
            this._addMarker(marker);
        }
    }
}