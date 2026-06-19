import { GanttStatic } from "gantt-trial";
import { ITaskGridDatasetControl } from "../../interfaces";
import { ILocalizationService } from "../../../..";
import { ITaskGridLabels } from "../../labels";
import { GanttDates, IGanttDates } from "./GanttDates";
import { IProjectDataProvider } from "../../extensions/providers/project";
import { getClassNames } from "@talxis/react-components";

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
    private _datasetControl: ITaskGridDatasetControl;
    private _projectDataProvider: IProjectDataProvider | null;
    private _localizationService: ILocalizationService<ITaskGridLabels>;
    private _markers: IGanttMarker[] = [];
    private _getCustomMarkers: () => ICustomMarker[];

    constructor(params: IGanttMarkersParams) {
        this._datasetControl = params.datasetControl;
        this._gantt = params.gantt;
        this._dates = params.dates;
        this._localizationService = this._datasetControl.getLocalizationService();
        this._projectDataProvider = this._datasetControl.getProjectDataProvider();
        this._getCustomMarkers = this._datasetControl.extensions.gantt?.onGetCustomMarkers ?? (() => []);
    }

    public render() {
        this._clearMarkers();
        this._addTodayMarker();
        this._addProjectStartMarker();
        this._addProjectEndMarker();
        this._addMilestoneMarker();
        this._addCustomMarkers();
    }
    public getMarkers(): IGanttMarker[] {
        return this._markers;
    }

    private _clearMarkers() {
        this._markers.forEach((marker) => {
            this._gantt.deleteMarker(marker.id);
        });
        this._markers = [];
    }

    private _addMarker(marker: Omit<IGanttMarker, 'id'>) {
        const markerId = this._gantt.addMarker(marker);
        this._markers.push({ ...marker, id: markerId });
        const ganttElement = (this._gantt as any).$root as HTMLElement | undefined;
        if (marker.color) {
            ganttElement?.style.setProperty(`--${marker.type}-marker-color`, marker.color);
        }
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
        const startDate = this._projectDataProvider?.getProjectStartDate() ?? this._dates.getStartDate();
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
        const endDate = this._projectDataProvider?.getProjectEndDate() ?? this._dates.getEndDate();
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
            this._addMarker({...marker, css: classNames, type: 'custom' });
        });
    }
}