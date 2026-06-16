import { GanttStatic, ZoomConfig } from 'dhtmlx-gantt';
import { ITaskGridDatasetControl } from '../../interfaces';
import { ITaskDataProvider } from '../../providers';
import { IGanttDates } from './GanttDates';
import { Formatting } from '@talxis/client-libraries';
import dayjs from 'dayjs';

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
    private _formatting = Formatting.Get();

    constructor(params: IGanttZoomingParams) {
        this._datasetControl = params.datasetControl;
        this._gantt = params.gantt;
        //@ts-ignore
        window.GANTT = this._gantt;
        this._dates = params.dates;
        this._gantt.config.scale_height = 43;
        this._gantt.config.min_column_width = 80;
        const now = new Date();
        this._gantt.config.start_date = this._formatting.dateFormattingInfo.calendar.minSupportedDateTime;
        this._gantt.config.end_date = new Date(2099, 11, 31);
        this._gantt.ext.zoom.init(this._getZoomConfig());
        this._taskDataProvider = params.datasetControl.getDataProvider();
        this._registerEventListeners();

    }


    private _getZoomConfig(): ZoomConfig {
        return {
            minColumnWidth: 40,
            maxColumnWidth: 200,
            levels: [
                // "Multiple years" — 5-year spans / individual years
                {
                    name: 'multiple-years',
                    scale_height: 43,
                    scales: [
                        {
                            unit: 'year',
                            step: 4,
                            format: (date: Date) => {
                                const end = this._gantt.date.add(date, 3, 'year');
                                return `${date.getFullYear()} – ${end.getFullYear()}`;
                            },
                        },
                        { unit: 'year', step: 1, format: '%Y' },
                    ],
                },
                // "Years" — year / quarters
                {
                    name: 'years',
                    scale_height: 43,
                    scales: [
                        { unit: 'year', step: 1, format: '%Y' },
                        {
                            unit: 'quarter',
                            step: 1,
                            format: (date: Date) => `Q${Math.floor(date.getMonth() / 3) + 1}`,
                        },
                    ],
                },
                // "Months" — year / months
                {
                    name: 'months',
                    scale_height: 43,
                    scales: [
                        { unit: 'year', step: 1, format: '%Y' },
                        {
                            unit: 'month', step: 1, format: (date) => {
                                return new Intl.DateTimeFormat(this._formatting.locale, { month: 'long' }).format(date);
                            }
                        },
                    ],
                },
                // "Months/weeks" — month / week start days
                {
                    name: 'months-weeks',
                    scale_height: 43,
                    scales: [
                        { unit: 'month', step: 1, format: '%F %Y' },
                        {
                            unit: 'week',
                            step: 1,
                            format: (date: Date) => {
                                const dateToStr = this._gantt.date.date_to_str('%d');
                                const endDate = this._gantt.date.add(date, 6, 'day');
                                return `${dateToStr(date)}–${dateToStr(endDate)}`;
                            },
                        },
                    ],
                },
                // "Month" — month / days
                {
                    name: 'month',
                    scale_height: 43,
                    scales: [
                        { unit: 'month', step: 1, format: '%F %Y' },
                        { unit: 'day', step: 1, format: '%j' },
                    ],
                },
                // "Week" — week / days
                {
                    name: 'week',
                    scale_height: 43,
                    scales: [
                        {
                            unit: 'week',
                            step: 1,
                            format: (date: Date) => {
                                const dateToStr = this._gantt.date.date_to_str('%d %M %Y');
                                return dateToStr(date);
                            },
                        },
                        { unit: 'day', step: 1, format: '%d %M' },
                    ],
                },
                // "Day" — day / hours
                {
                    name: 'day',
                    scale_height: 43,
                    scales: [
                        { unit: 'day', step: 1, format: '%D %d/%m' },
                        { unit: 'hour', step: 1, format: '%H:%i' },
                    ],
                },
                // "Minutes" — hour / 30-minute slots
                {
                    name: 'minutes',
                    scale_height: 43,
                    scales: [
                        { unit: 'hour', step: 1, format: '%d %M, %H:%i' },
                        { unit: 'minute', step: 30, format: '%H:%i' },
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
        return;
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