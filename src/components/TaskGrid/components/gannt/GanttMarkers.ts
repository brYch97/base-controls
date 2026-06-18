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
}

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
        this._projectDataProvider = this._datasetControl.getProjectDataProvider() ;
    }

    public render() {
        this._clearMarkers();
        this._addTodayMarker();
        this._addProjectStartMarker();
        this._addProjectEndMarker();
    }

    private _clearMarkers() {
        this._markerIds.forEach((id) => {
            this._gantt.deleteMarker(id);
        });
        this._markerIds = [];
    }

    
    private _addTodayMarker() {
        const markerId = this._gantt.addMarker({
            start_date: new Date(),
            text: 'Today',
            css: 'gantt_marker_today'
        });
        this._markerIds.push(String(markerId));
    }
    
    private _addProjectStartMarker() {
        const startDate = this._projectDataProvider?.getProjectStartDate() ?? this._dates.getStartDate();
        const markerId = this._gantt.addMarker({
            start_date: startDate,
            text: 'Project Start',
            css: 'gantt_marker_project_start'
        });
        this._markerIds.push(String(markerId));
    }

    private _addProjectEndMarker() {
        const endDate = this._projectDataProvider?.getProjectEndDate() ?? this._dates.getEndDate();
        const markerId = this._gantt.addMarker({
            start_date: endDate,
            text: 'Project End',
            css: 'gantt_marker_project_end'
        });
        this._markerIds.push(String(markerId));
    }
}