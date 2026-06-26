import { GanttStatic } from 'gantt-trial';
import { ITaskGridDatasetControl } from '../..';
import { ITaskDataProvider } from '../../providers';
import { IGanttDates } from './GanttDates';

export interface IGanttDragging {
}

interface IGanttDraggingParams {
    datasetControl: ITaskGridDatasetControl;
    gantt: GanttStatic;
    dates: IGanttDates;
}

export class GanttDragging implements IGanttDragging {
    private _datasetControl: ITaskGridDatasetControl;
    private _taskDataProvider: ITaskDataProvider;
    private _gantt: GanttStatic;
    private _dates: IGanttDates;

    constructor(params: IGanttDraggingParams) {
        this._datasetControl = params.datasetControl;
        this._taskDataProvider = params.datasetControl.getDataProvider();
        this._gantt = params.gantt;
        this._dates = params.dates;
        this._gantt.config.drag_timeline = { ignore: '.gantt_shift_held, .gantt_task_link, .gantt_task_line' };
        this._registerEventListeners();
    }

    private _registerEventListeners() {
        this._gantt.attachEvent('onBeforeTaskDrag', (id: string, mode: string) => this._onBeforeTaskDrag(id, mode));
        this._gantt.attachEvent('onTaskDrag', (id: string, mode: string) => this._onTaskDrag(id, mode));
        this._gantt.attachEvent('onAfterTaskDrag', () => this._onAfterTaskDrag());

        //TODO: remove the listeners/put them on root container
        window.addEventListener('keydown', (e) => { if (e.key === 'Shift') this._setShiftClass(true); });
        window.addEventListener('keyup', (e) => { if (e.key === 'Shift') this._setShiftClass(false); });
        window.addEventListener('blur', () => this._setShiftClass(false));
    }

    private _setShiftClass(held: boolean) {
        ((this._gantt as any).$root as HTMLElement | null)?.classList.toggle('gantt_shift_held', held);
    }

    private _onBeforeTaskDrag(taskId: string, mode?: string) {
        const task = this._gantt.getTask(taskId);
        if (!task?.active) return false;
        return true;
    }

    private _onTaskDrag(taskId: string, mode: string) {
        const draggedTask = this._gantt.getTask(taskId);
        const startColumnName = this._dates.getStartDateColumnName();
        const endColumnName = this._dates.getEndDateColumnName();
        const selectedRecordIds = this._taskDataProvider.getSelectedRecordIds();

        if (mode === 'resize') {
            const record = this._taskDataProvider.getRecordsMap()[taskId];
            record.setValue(startColumnName, draggedTask.start_date);
            record.setValue(endColumnName, draggedTask.end_date);
        }
        else {
            const selectedTaskIds = new Set<string>(
                (selectedRecordIds.includes(taskId) ? selectedRecordIds : [taskId])
                    .filter(selectedTaskId => this._gantt.getTask(selectedTaskId)?.active)
            );
            const draggedRecord = this._taskDataProvider.getRecordsMap()[taskId];
            const originalDraggedStartDate = draggedRecord.getValue(startColumnName);
            const originalDraggedStartTime = this._dates.getDateFromString(originalDraggedStartDate)?.getTime();
            const draggedTaskStartTime = draggedTask.start_date?.getTime();

            if (originalDraggedStartTime === undefined || draggedTaskStartTime === undefined) {
                return;
            }

            const draggedOffset = draggedTaskStartTime - originalDraggedStartTime;

            for (const taskIdToMove of selectedTaskIds) {
                const taskToMove = this._gantt.getTask(taskIdToMove);
                const recordToMove = this._taskDataProvider.getRecordsMap()[taskIdToMove];
                const originalStartDate = this._dates.getDateFromString(recordToMove.getValue(startColumnName));
                const originalEndDate = this._dates.getDateFromString(recordToMove.getValue(endColumnName));

                if (!originalStartDate || !originalEndDate) {
                    continue;
                }

                taskToMove.start_date = new Date(originalStartDate.getTime() + draggedOffset);
                taskToMove.end_date = new Date(originalEndDate.getTime() + draggedOffset);

                recordToMove.setValue(startColumnName, taskToMove.start_date);
                recordToMove.setValue(endColumnName, taskToMove.end_date);
            }
        }

        if (selectedRecordIds.length > 1) {
            this._gantt.render();
        }
    }

    private _onAfterTaskDrag() {
        this._taskDataProvider.save();
    }
}