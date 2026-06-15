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
        this._gantt.ext.zoom.init(this._getZoomConfig());
        this._taskDataProvider = params.datasetControl.getDataProvider();
        this._registerEventListeners();

    }


    private _getZoomConfig(): ZoomConfig {
        return {
            minColumnWidth: 20,
            maxColumnWidth: 300,
            levels: [
                {
                    name: 'day',
                    scale_height: 43,
                    min_column_width: 70,
                    scales: [
                        { unit: 'day', step: 1, format: '%d %M' },
                    ],
                },
                {
                    name: 'week',
                    scale_height: 43,
                    scales: [
                        {
                            unit: 'week',
                            step: 1,
                            format: (date: Date) => {
                                const formatDate = this._gantt.date.date_to_str('%d %M');
                                const endDate = this._gantt.date.add(this._gantt.date.add(date, 1, 'week'), -1, 'day');
                                return `${formatDate(date)} - ${formatDate(endDate)}`;
                            },
                        },
                    ],
                },
                {
                    name: 'month',
                    scale_height: 43,
                    scales: [
                        { unit: 'month', step: 1, format: '%F, %Y' },
                        { unit: 'day', step: 1, format: '%j, %D' },
                    ],
                },
                {
                    name: 'year',
                    scale_height: 43,
                    scales: [
                        { unit: 'year', step: 1, format: '%Y' },
                        { unit: 'month', step: 1, format: '%M' },
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
            this._gantt.show
        }
    }

    private _registerEventListeners() {
        this._taskDataProvider.addEventListener('onRecordsSelected', () => this._zoomToFit());
        this._taskDataProvider.addEventListener('onNewDataLoaded', () => this._zoomToFit());
    }
}