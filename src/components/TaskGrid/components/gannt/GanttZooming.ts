import { gantt } from 'dhtmlx-gantt';
import { ITaskGridDatasetControl } from '../../interfaces';
import { ITaskDataProvider } from '../../providers';

export interface IGanttZooming {
    init: () => void;
    zoomToFitSelectedTasks: () => void;
}

interface IGanttZoomingParams {
    datasetControl: ITaskGridDatasetControl;
}

export class GanttZooming implements IGanttZooming {
    private _datasetControl: ITaskGridDatasetControl;
    private _taskDataProvider: ITaskDataProvider;

    constructor(params: IGanttZoomingParams) {
        this._datasetControl = params.datasetControl;
        this._taskDataProvider = params.datasetControl.getDataProvider();
    }

    public init() {
        //gantt.config.fit_tasks = true;
        gantt.ext.zoom.init(this._getZoomConfig() as any);
    }

    public zoomToFitSelectedTasks() {
        const selectedRecordIds = this._taskDataProvider.getSelectedRecordIds();
        const selectedIds = selectedRecordIds.length > 0 ? selectedRecordIds : this._taskDataProvider.getSortedRecordIds();

        // Single task selected — just scroll it into view without changing zoom
        if (selectedRecordIds.length === 1) {
            const task = gantt.getTask(selectedRecordIds[0]);
            if (task?.start_date) {
                gantt.showDate(task.start_date);
            }
            return;
        }

        let minDate: Date | null = null;
        let maxDate: Date | null = null;

        for (const taskId of selectedIds) {
            const task = gantt.getTask(taskId);
            if (!task) continue;
            if (task.start_date && (!minDate || task.start_date < minDate)) minDate = task.start_date;
            if (task.end_date && (!maxDate || task.end_date > maxDate)) maxDate = task.end_date;
        }

        if (!minDate || !maxDate) return;

        this._applyZoomToFit(minDate, maxDate);
    }

    private _applyZoomToFit(startDate: Date, endDate: Date) {
        const areaWidth = (gantt as any).$task?.offsetWidth ?? gantt.$container?.offsetWidth ?? 800;
        const levels = this._getZoomConfig().levels;

        let targetLevelIndex = levels.length - 1; // default: coarsest

        for (let i = 0; i < levels.length; i++) {
            const scalesArr: any[] = (levels[i] as any).scales ?? levels[i];
            const bottomScale = scalesArr[scalesArr.length - 1];
            const topScale = scalesArr[0];
            const columnCount = this._getUnitsBetween(startDate, endDate, bottomScale.unit, topScale.step ?? 1);
            if ((columnCount + 2) * gantt.config.min_column_width <= areaWidth) {
                targetLevelIndex = i;
                break;
            }
        }

        const level = levels[targetLevelIndex] as any;
        const levelName = level.name ?? targetLevelIndex;
        gantt.ext.zoom.setLevel(levelName);
        gantt.render();
        gantt.showDate(startDate);
    }

    // Count calendar units between two dates using gantt.date.add for accuracy
    private _getUnitsBetween(from: Date, to: Date, unit: string, step: number): number {
        let start = new Date(from);
        const end = new Date(to);
        let units = 0;
        while (start.valueOf() < end.valueOf()) {
            units++;
            start = gantt.date.add(start, step, unit as any);
        }
        return units;
    }

    private _getZoomConfig() {
        return {
            minColumnWidth: 20,
            maxColumnWidth: 300,
            keepCurrentTime: true,
            levels: [
                {
                    name: 'day',
                    scales: [
                        { unit: 'month', format: '%F %Y', step: 1 },
                        { unit: 'day', format: '%d %D', step: 1 },
                    ],
                },
                {
                    name: '3days',
                    scales: [
                        { unit: 'month', format: '%F %Y', step: 1 },
                        { unit: 'day', format: '%d', step: 3 },
                    ],
                },
                {
                    name: 'week',
                    scales: [
                        { unit: 'month', format: '%F %Y', step: 1 },
                        { unit: 'week', format: 'W%W', step: 1 },
                    ],
                },
                {
                    name: '2weeks',
                    scales: [
                        { unit: 'month', format: '%F %Y', step: 2 },
                        { unit: 'week', format: 'W%W', step: 2 },
                    ],
                },
                {
                    name: 'month',
                    scales: [
                        { unit: 'year', format: '%Y', step: 1 },
                        { unit: 'month', format: '%M', step: 1 },
                    ],
                },
                {
                    name: '2months',
                    scales: [
                        { unit: 'year', format: '%Y', step: 1 },
                        { unit: 'month', format: '%M', step: 2 },
                    ],
                },
                {
                    name: 'quarter',
                    scales: [
                        { unit: 'year', format: '%Y', step: 1 },
                        { unit: 'month', format: '%M', step: 3 },
                    ],
                },
                {
                    name: 'year',
                    scales: [
                        { unit: 'year', format: '%Y', step: 1 },
                        { unit: 'month', format: '%M', step: 6 },
                    ],
                },
            ],
            useKey: 'ctrlKey',
            trigger: 'wheel',
            element: function () {
                return gantt.$root.querySelector('.gantt_task');
            },
        };
    }
}