import { GanttStatic } from "gantt-trial";
import { ITaskGridDatasetControl } from "../../interfaces";
import { ILocalizationService } from "../../../..";
import { ITaskGridLabels } from "../../labels";
import { GanttDates, IGanttDates } from "./GanttDates";
import { IProjectDataProvider } from "../../extensions/providers/project";

interface IGanttMarkersParams {
    gantt: GanttStatic;
    dates: GanttDates;
    datasetControl: ITaskGridDatasetControl;
}

export interface IGanttMarkers {
    render(): void;
    getMarkers(): IGanttMarker[];
}

export type MarkerType = 'milestone' | 'project_start' | 'project_end' | 'today' | 'custom';

export interface IGanttMarker {
    id: number | string;
    text: string;
    type: MarkerType;
    start_date: Date;
    color?: string;
    end_date?: Date;
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
    private _datasetControl: ITaskGridDatasetControl;
    private _projectDataProvider: IProjectDataProvider | null;
    private _localizationService: ILocalizationService<ITaskGridLabels>;
    private _markers: IGanttMarker[] = [];

    constructor(params: IGanttMarkersParams) {
        this._datasetControl = params.datasetControl;
        this._gantt = params.gantt;
        this._dates = params.dates;
        this._localizationService = this._datasetControl.getLocalizationService();
        this._projectDataProvider = this._datasetControl.getProjectDataProvider();
    }

    public render() {
        this._clearMarkers();
        this._addTodayMarker();
        this._addProjectStartMarker();
        this._addProjectEndMarker();
        this._addMilestoneMarker();
    }
    public getMarkerIds() {
        return this._markers;
    }

    private _clearMarkers() {
        this._markers.forEach((marker) => {
            this._gantt.deleteMarker(marker.id);
        });
        this._markers = [];
    }

    private _addMarker(config: { start_date: Date; text: string; css: string, type: MarkerType, color: string, end_date?: Date }) {
        const markerId = this._gantt.addMarker(config);
        this._markers.push({
            id: markerId,
            text: config.text,
            start_date: config.start_date,
            type: config.type,
            color: config.color,
            end_date: config.end_date
        })
    }

    private _addTodayMarker() {
        this._addMarker({ start_date: new Date(), text: 'Today', css: TODAY_MARKER_CLASS });
    }

    private _addProjectStartMarker() {
        const startDate = this._projectDataProvider?.getProjectStartDate() ?? this._dates.getStartDate();
        this._addMarker({ start_date: startDate, text: 'Project Start', css: PROJECT_START_MARKER_CLASS });
    }

    private _addMilestoneMarker() {
        this._addMarker({ start_date: new Date('2025-01-01'), text: 'Milestone', css: MILESTONE_MARKER_CLASS });
    }

    private _addProjectEndMarker() {
        const endDate = this._projectDataProvider?.getProjectEndDate() ?? this._dates.getEndDate();
        this._addMarker({ start_date: endDate, text: 'Project End', css: PROJECT_END_MARKER_CLASS });
    }
    private _addCustomMarkers() {
        this._addMarker({ start_date: new Date('2025-01-01'), text: 'Custom Marker', css: CUSTOM_MARKER_CLASS });
        this._addMarker({ start_date: new Date('2025-02-01'), text: 'Custom Marker 2', css: CUSTOM_MARKER_CLASS });
    }
}