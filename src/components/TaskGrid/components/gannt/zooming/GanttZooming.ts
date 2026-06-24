import { Formatting } from '@talxis/client-libraries';
import { GanttStatic } from 'gantt-trial';
import { ITaskGridDatasetControl } from '../../../interfaces';
import { ITaskDataProvider } from '../../../providers';
import { IGanttDates } from '../GanttDates';
import { ZoomingConfig } from './ZoomingConfig';

export interface IGanttZooming {
    destroy: () => void;
}

interface IGanttZoomingParams {
    datasetControl: ITaskGridDatasetControl;
    gantt: GanttStatic;
    dates: IGanttDates;
}

export class GanttZooming implements IGanttZooming {
    private static readonly WHEEL_TICKS_PER_SLIDER_UNIT = 1;

    private _lastSliderValue = 0;
    private _datasetControl: ITaskGridDatasetControl;
    private _taskDataProvider: ITaskDataProvider;
    private _gantt: GanttStatic;
    private _dates: IGanttDates;
    private _formatting = Formatting.Get();

    private _isFitting = false;

    constructor(params: IGanttZoomingParams) {
        this._datasetControl = params.datasetControl;
        this._gantt = params.gantt;
        //@ts-ignore
        window.GANTT = this._gantt;
        this._dates = params.dates;
        this._gantt.config.scale_height = 43;
        this._gantt.config.show_tasks_outside_timescale = true;
        this._gantt.ext.zoom.init(ZoomingConfig.getScrollZoomConfig(this._gantt, this._formatting.locale));
        this._taskDataProvider = params.datasetControl.getDataProvider();
        this._registerEventListeners();
    }

    private _onZoomToValue(value: number) {
        const zoom = this._gantt.ext.zoom as typeof this._gantt.ext.zoom & {
            _handler?: (event: { clientX: number; deltaY: number; wheelDelta: number; preventDefault: () => void; stopPropagation: () => void; }) => void;
        };
        const taskArea = this._gantt.$task;
        if (!zoom?._handler || !taskArea || value === this._lastSliderValue) {
            this._lastSliderValue = value;
            return;
        }

        const delta = value - this._lastSliderValue;
        this._lastSliderValue = value;

        const steps = Math.abs(delta) * GanttZooming.WHEEL_TICKS_PER_SLIDER_UNIT;
        if (steps === 0) {
            return;
        }

        const deltaY = delta > 0 ? -120 : 120;
        const wheelDelta = -deltaY;
        const centerX = taskArea.getBoundingClientRect().x + taskArea.clientWidth / 2;

        for (let i = 0; i < steps; i++) {
            zoom._handler({
                clientX: centerX,
                deltaY,
                wheelDelta,
                preventDefault() { },
                stopPropagation() { },
            });
        }
    }

    private _zoomToFit() {
        let records = this._taskDataProvider.getAllRecords();
        const selectedRecordIds = this._taskDataProvider.getSelectedRecordIds();
        if (selectedRecordIds.length > 0) {
            records = selectedRecordIds.map(id => this._taskDataProvider.getRecordsMap()[id]);
        }
        const { startDate, endDate } = this._dates.getStartEndDateFromRecords(records);
        if (!this._gantt.$task) {
            return;
        }
        const level = ZoomingConfig.getZoomLevelForRange(startDate, endDate);
        this._gantt.ext.zoom.zoomToFit({
            maxLevel: level,
            minLevel: level,
            range: {
                end_date: endDate,
                start_date: startDate,
            },
        });
    }

    private _fitToRange(startDate: Date, endDate: Date) {
        if (!startDate || !endDate) {
            return;
        }

        if (!this._gantt.$task) {
            return;
        }

        let start = new Date(Math.min(startDate.getTime(), endDate.getTime()));
        let end = new Date(Math.max(startDate.getTime(), endDate.getTime()));
        if (start.getTime() === end.getTime()) {
            end = this._gantt.date.add(end, 1, 'day');
        }
        const padding = Math.max((end.getTime() - start.getTime()) * 0.05, 0);
        start = new Date(start.getTime() - padding);
        end = new Date(end.getTime() + padding);

        const level = ZoomingConfig.getZoomLevelForRange(start, end);

        this._isFitting = true;
        try {
            this._gantt.ext.zoom.setLevel(level);
            this._gantt.config.min_column_width = ZoomingConfig.scrollZoomMinColumnWidth;
            this._gantt.config.start_date = start;
            this._gantt.config.end_date = end;
            this._gantt.render();
            this._gantt.showDate(start);
        }
        finally {
            this._isFitting = false;
        }
    }

    private _jumpToToday() {
        const today = new Date();
        this._gantt.showDate(today);
    }

    private _registerEventListeners() {
        //this._taskDataProvider.addEventListener('onRecordsSelected', () => this._zoomToFit());
        this._datasetControl.ganttGridBridge.addEventListener('onJumpToTodayRequested', () => this._jumpToToday());
        this._datasetControl.ganttGridBridge.addEventListener('onZoomLevelChanged', (value) => this._onZoomToValue(value));
    }

    public destroy() {
    }
}
