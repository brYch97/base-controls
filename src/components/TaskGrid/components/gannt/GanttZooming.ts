import { GanttStatic, ZoomConfig } from 'dhtmlx-gantt';
import { ITaskGridDatasetControl } from '../../interfaces';
import { ITaskDataProvider } from '../../providers';
import { IGanttDates } from './GanttDates';

export interface IGanttZooming {
}

interface IGanttZoomingParams {
    datasetControl: ITaskGridDatasetControl;
    gantt: GanttStatic;
    dates: IGanttDates;
}

export class GanttZooming implements IGanttZooming {
    private _datasetControl: ITaskGridDatasetControl;
    private _taskDataProvider: ITaskDataProvider;
    private _gantt: GanttStatic;
    private _dates: IGanttDates;

    constructor(params: IGanttZoomingParams) {
        this._datasetControl = params.datasetControl;
        this._gantt = params.gantt;
        //@ts-ignore
        window.GANTT = this._gantt;
        this._dates = params.dates;
        this._gantt.config.scale_height = 43;
        this._gantt.config.min_column_width = 80;
        this._gantt.ext.zoom.init(this._getZoomConfig());
        this._taskDataProvider = params.datasetControl.getDataProvider();
        this._registerEventListeners();

    }


    private _hourRangeFormat(step: number): (date: Date) => string {
        const hourToStr = this._gantt.date.date_to_str('%H:%i');
        return (date: Date) => {
            const intervalEnd = new Date(this._gantt.date.add(date, step, 'hour').getTime() - 1);
            return `${hourToStr(date)} - ${hourToStr(intervalEnd)}`;
        };
    }

    private _getZoomConfig(): ZoomConfig {
        return {
            minColumnWidth: 80,
            maxColumnWidth: 150,
            levels: [
                {
                    name: 'year+quarter',
                    scale_height: 43,
                    scales: [
                        { unit: 'year', step: 1, format: '%Y' },
                        {
                            unit: 'month',
                            step: 3,
                            format: (date: Date) => {
                                const q = Math.floor(date.getMonth() / 3) + 1;
                                return `Q${q}`;
                            },
                        },
                    ],
                },
                {
                    name: 'year+month',
                    scale_height: 43,
                    scales: [
                        { unit: 'year', step: 1, format: '%Y' },
                        { unit: 'month', step: 1, format: '%M' },
                    ],
                },
                {
                    name: 'month+week',
                    scale_height: 43,
                    scales: [
                        { unit: 'month', step: 1, format: '%M %Y' },
                        {
                            unit: 'week',
                            step: 1,
                            format: (date: Date) => {
                                const dateToStr = this._gantt.date.date_to_str('%d %M');
                                const weekToStr = this._gantt.date.date_to_str('%W');
                                const endDate = this._gantt.date.add(date, 7 - date.getDay(), 'day');
                                return `Week #${weekToStr(date)}, ${dateToStr(date)} - ${dateToStr(endDate)}`;
                            },
                        },
                    ],
                },
                {
                    name: 'month+day',
                    scale_height: 43,
                    scales: [
                        { unit: 'month', step: 1, format: '%M %Y' },
                        { unit: 'day', step: 1, format: '%d %M' },
                    ],
                },
                {
                    name: 'day+12h',
                    scale_height: 43,
                    scales: [
                        { unit: 'day', step: 1, format: '%d %M' },
                        { unit: 'hour', step: 12, format: this._hourRangeFormat(12) },
                    ],
                },
                {
                    name: 'day+6h',
                    scale_height: 43,
                    scales: [
                        { unit: 'day', step: 1, format: '%d %M' },
                        { unit: 'hour', step: 6, format: this._hourRangeFormat(6) },
                    ],
                },
                {
                    name: 'day+1h',
                    scale_height: 43,
                    scales: [
                        { unit: 'day', step: 1, format: '%d %M' },
                        { unit: 'hour', step: 1, format: '%H:%i' },
                    ],
                },
            ],
            useKey: 'ctrlKey',
            trigger: 'wheel',
            element: () => {
                return this._gantt.$root.querySelector('.gantt_task')!;
            },
        };
    }

    private _zoomToFit() {
        const selectedRecordIds = this._taskDataProvider.getSelectedRecordIds();
        if (selectedRecordIds.length === 0) {
            this._gantt.ext.zoom.zoomToFit();
        }
        else {
            const selectedRecords = selectedRecordIds.map(id => this._taskDataProvider.getRecordsMap()[id]);
            const { startDate, endDate } = this._dates.getStartEndDateFromRecords(selectedRecords);
            this._gantt.ext.zoom.zoomToFit({
                range: {
                    start_date: startDate,
                    end_date: endDate,
                },
                rangeMode: 'preserve'
            });
        }
    }

    private _registerEventListeners() {
        this._taskDataProvider.addEventListener('onRecordsSelected', () => this._zoomToFit());
        this._taskDataProvider.addEventListener('onNewDataLoaded', () => this._zoomToFit());
    }
}