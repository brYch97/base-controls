import { GanttStatic, Task } from 'gantt-trial';
import { ITaskDataProvider } from '../../providers';

export interface IGanttSelection {
    destroy: () => void;
}

interface IGanttSelectionParams {
    gantt: GanttStatic;
    dataProvider: ITaskDataProvider;
}

export class GanttSelection implements IGanttSelection {
    private _gantt: GanttStatic;
    private _dataProvider: ITaskDataProvider;
    private _onTaskClickId: string | null = null;
    private _selectionAnchorTaskId: string | null = null;

    constructor(params: IGanttSelectionParams) {
        this._gantt = params.gantt;
        this._dataProvider = params.dataProvider;
        this._registerEventListeners();
    }

    public destroy() {
        if (this._onTaskClickId) {
            this._gantt.detachEvent(this._onTaskClickId);
            this._onTaskClickId = null;
        }
    }

    private _registerEventListeners() {
        this._onTaskClickId = this._gantt.attachEvent('onTaskClick', (id: string, event?: MouseEvent) => {
            this._onRecordSelectedFromGantt(id, event);
            return true;
        });
        this._dataProvider.addEventListener('onRecordsSelected', () => this._gantt.render())
    }

    private _onRecordSelectedFromGantt(taskId: string, event?: MouseEvent) {
        if (event?.shiftKey) {
            const visibleTaskIds = this._getVisibleTaskIds();
            const anchorTaskId = this._selectionAnchorTaskId ?? taskId;
            const clickedTaskIndex = visibleTaskIds.indexOf(taskId);
            const anchorTaskIndex = visibleTaskIds.indexOf(anchorTaskId);

            if (clickedTaskIndex >= 0 && anchorTaskIndex >= 0) {
                const rangeStart = Math.min(anchorTaskIndex, clickedTaskIndex);
                const rangeEnd = Math.max(anchorTaskIndex, clickedTaskIndex);
                const rangeTaskIds = visibleTaskIds.slice(rangeStart, rangeEnd + 1);
                const selectedRecordIds = this._dataProvider.getSelectedRecordIds();
                const nextSelectedIds = event.ctrlKey || event.metaKey
                    ? Array.from(new Set([...selectedRecordIds, ...rangeTaskIds]))
                    : rangeTaskIds;

                this._dataProvider.setSelectedRecordIds(nextSelectedIds);
            }

            return;
        }

        this._selectionAnchorTaskId = taskId;
        if (!event?.ctrlKey && !event?.metaKey) {
            this._dataProvider.setSelectedRecordIds([taskId]);
        }
        else {
            this._dataProvider.toggleSelectedRecordId(taskId, {
                clearExisting: !(event?.ctrlKey || event?.metaKey)
            });
        }
    }

    private _getVisibleTaskIds(): string[] {
        const taskIds: string[] = [];
        this._gantt.eachTask((task: Task) => {
            if (this._gantt.isTaskVisible(task.id)) {
                taskIds.push(String(task.id));
            }
        });

        return taskIds;
    }
}