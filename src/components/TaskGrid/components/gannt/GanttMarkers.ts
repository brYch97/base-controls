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

const SCALE_LABEL_ATTR = 'data-gantt-marker-label';

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
    private _renderEventId: string | number | null = null;

    constructor(params: IGanttMarkersParams) {
        this._datasetControl = params.datasetControl;
        this._gantt = params.gantt;
        this._dates = params.dates;
        this._localizationService = this._datasetControl.getLocalizationService();
        this._projectDataProvider = this._datasetControl.getProjectDataProvider();
        this._renderEventId = this._gantt.attachEvent('onGanttRender', () => this._renderScaleLabels());
    }

    public render() {
        this._clearMarkers();
        this._addTodayMarker();
        this._addProjectStartMarker();
        this._addProjectEndMarker();
        this._renderScaleLabels();
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
        this._addMarker({ start_date: new Date(), text: 'Today', css: 'gantt_marker_today' });
    }

    private _addProjectStartMarker() {
        const startDate = this._projectDataProvider?.getProjectStartDate() ?? this._dates.getStartDate();
        this._addMarker({ start_date: startDate, text: 'Project Start', css: 'gantt_marker_project_start' });
    }

    private _addProjectEndMarker() {
        const endDate = this._projectDataProvider?.getProjectEndDate() ?? this._dates.getEndDate();
        this._addMarker({ start_date: endDate, text: 'Project End', css: 'gantt_marker_project_end' });
    }

    /** Inject label chips into the scale header DOM so they sit above the task data area. */
    private _renderScaleLabels() {
        const scaleEl = (this._gantt as any).$task_scale as HTMLElement | null;
        if (!scaleEl) {
            return;
        }

        scaleEl.querySelectorAll(`[${SCALE_LABEL_ATTR}]`).forEach((el) => el.remove());

        for (const id of this._markerIds) {
            const marker = this._gantt.getMarker(id);
            if (!marker) {
                continue;
            }

            const left = this._gantt.posFromDate(marker.start_date);
            const chip = document.createElement('div');
            chip.setAttribute(SCALE_LABEL_ATTR, id);
            chip.className = `gantt_marker_scale_label ${marker.css ?? ''}`;
            chip.textContent = marker.text ?? '';
            chip.style.left = `${left}px`;
            scaleEl.appendChild(chip);
        }
    }
}