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
    private _markersAdded: boolean = false;
    private _dates: IGanttDates;
    private _datasetControl: ITaskGridDatasetControl;
    private _projectDataProvider: IProjectDataProvider | null;
    private _localizationService: ILocalizationService<ITaskGridLabels>;

    constructor(params: IGanttMarkersParams) {
        this._datasetControl = params.datasetControl;
        this._gantt = params.gantt;
        this._dates = params.dates;
        this._localizationService = this._datasetControl.getLocalizationService();
        this._projectDataProvider = this._datasetControl.getProjectDataProvider() ;
    }

    public render() {
        this._addTodayMarker();
        this._addProjectStartMarker();
        this._addProjectEndMarker();
    }
    
    private _addTodayMarker() {
        this._gantt.addMarker({
            start_date: new Date(),
            text: 'Today'
        })
    }
    
    private _addProjectStartMarker() {
        const startDate = this._projectDataProvider?.getProjectStartDate() ?? this._dates.getStartDate();
        this._gantt.addMarker({
            start_date: startDate,
            text: 'Project Start'
        })
    }
    private _addProjectEndMarker() {
        const endDate = this._projectDataProvider?.getProjectEndDate() ?? this._dates.getEndDate();
        this._gantt.addMarker({
            start_date: endDate,
            text: 'Project End'
        })
    }
}