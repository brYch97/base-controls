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
    getMarkerIds(): string[];
}

export const LABEL_OVERLAY_ATTR = 'data-marker-label-overlay';
export const TODAY_MARKER_CLASS = 'gantt_marker_today';
export const PROJECT_START_MARKER_CLASS = 'gantt_marker_project_start';
export const PROJECT_END_MARKER_CLASS = 'gantt_marker_project_end';
export const SCALE_LABEL_ATTR = 'data-gantt-marker-label';
export const MILESTONE_MARKER_CLASS = 'gantt_marker_milestone';

//pro feature
export class GanttMarkers implements IGanttMarkers {
    private _gantt: GanttStatic;
    private _dates: IGanttDates;
    private _datasetControl: ITaskGridDatasetControl;
    private _projectDataProvider: IProjectDataProvider | null;
    private _localizationService: ILocalizationService<ITaskGridLabels>;
    private _markerIds: string[] = [];

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
    public getMarkerIds(): string[] {
        return this._markerIds;
    }

    private _clearMarkers() {
        this._markerIds.forEach((id) => {
            this._gantt.deleteMarker(id);
        });
        this._markerIds = [];
    }

    private _addMarker(config: { start_date: Date; text: string; css: string }) {
        const markerId = this._gantt.addMarker(config);
        this._markerIds.push(String(markerId));
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
}