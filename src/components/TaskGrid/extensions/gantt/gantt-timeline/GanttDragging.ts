import { EventEmitter, IEventEmitter } from '@talxis/client-libraries';
import { GanttStatic } from 'gantt-trial';
import { ITaskGridDatasetControl } from '../../../interfaces';
import { ITaskDataProvider } from '../../../providers';
import { IGanttDates } from './GanttDates';
import {
    GANTT_DRAGGING_DISABLED_CLASS,
    GANTT_TASK_LINE_CLASS,
} from './classNames';

export interface IGanttDragging {
    events: IEventEmitter<IGanttDraggingEvents>;
    setDraggingDisabled: (disabled: boolean) => void;
}

export interface IGanttDraggingEvents {
    onDragStarted: (taskId: string) => void;
    onDragEnded: () => void;
}

interface IGanttDraggingParams {
    datasetControl: ITaskGridDatasetControl;
    gantt: GanttStatic;
    dates: IGanttDates;
}

export class GanttDragging implements IGanttDragging {
    public readonly events: IEventEmitter<IGanttDraggingEvents> = new EventEmitter<IGanttDraggingEvents>();
    private _datasetControl: ITaskGridDatasetControl;
    private _taskDataProvider: ITaskDataProvider;
    private _gantt: GanttStatic;
    private _dates: IGanttDates;

    constructor(params: IGanttDraggingParams) {
        this._datasetControl = params.datasetControl;
        this._taskDataProvider = params.datasetControl.getDataProvider();
        this._gantt = params.gantt;
        this._dates = params.dates;
        this._gantt.config.drag_timeline = { ignore: `.${GANTT_DRAGGING_DISABLED_CLASS}, .${GANTT_TASK_LINE_CLASS}` };
        this._gantt.config.round_dnd_dates = false;
        this._registerEventListeners();
    }

    public setDraggingDisabled(disabled: boolean) {
        this._gantt.$root.classList.toggle(GANTT_DRAGGING_DISABLED_CLASS, disabled);
    }

    private _registerEventListeners() {
        this._gantt.attachEvent('onBeforeTaskDrag', (id: string, mode: string) => this._onBeforeTaskDrag(id, mode));
        this._gantt.attachEvent('onTaskDrag', (id: string, mode: string) => this._onTaskDrag(id, mode));
        this._gantt.attachEvent('onAfterTaskDrag', () => this._onAfterTaskDrag());
    }

    private _onBeforeTaskDrag(taskId: string, mode?: string) {
        if (this._gantt.$root.classList.contains(GANTT_DRAGGING_DISABLED_CLASS)) {
            return false;
        }
        const task = this._gantt.getTask(taskId);
        if (!task?.active) return false;
        this.events.dispatchEvent('onDragStarted', taskId);
        return true;
    }

    private _onTaskDrag(taskId: string, mode: string) {
        const draggedTask = this._gantt.getTask(taskId);
        const startColumnName = this._dates.getStartDateColumnName();
        const endColumnName = this._dates.getEndDateColumnName();

        if (mode === 'resize') {
            const record = this._taskDataProvider.getRecordsMap()[taskId];
            record.setValue(startColumnName, draggedTask.start_date);
            record.setValue(endColumnName, draggedTask.end_date);
        }
        else {
            const draggedRecord = this._taskDataProvider.getRecordsMap()[taskId];
            const originalDraggedStartDate = draggedRecord.getValue(startColumnName);
            const originalDraggedStartTime = this._dates.getDateFromString(originalDraggedStartDate)?.getTime();
            const draggedTaskStartTime = draggedTask.start_date?.getTime();

            if (originalDraggedStartTime === undefined || draggedTaskStartTime === undefined) {
                return;
            }

            const draggedOffset = draggedTaskStartTime - originalDraggedStartTime;
            const originalEndDate = this._dates.getDateFromString(draggedRecord.getValue(endColumnName));

            if (!originalEndDate) {
                return;
            }

            draggedTask.start_date = new Date(originalDraggedStartTime + draggedOffset);
            draggedTask.end_date = new Date(originalEndDate.getTime() + draggedOffset);

            draggedRecord.setValue(startColumnName, draggedTask.start_date);
            draggedRecord.setValue(endColumnName, draggedTask.end_date);
        }
    }

    private _onAfterTaskDrag() {
        this.events.dispatchEvent('onDragEnded');
        this._taskDataProvider.save();
    }
}