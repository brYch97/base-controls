import { Gantt, GanttStatic, Task } from 'dhtmlx-gantt';
import { ITaskGridDatasetControl } from '../..';
import { ITaskDataProvider } from '../../providers';
import { IColumn, IRawRecord, IRecord } from '@talxis/client-libraries';
import { IGanttGridBridge } from "../../bridges/GanttGridBridge";
import dayjs from 'dayjs';
import { GanttZooming, IGanttZooming } from './GanttZooming';
import { GanttDates } from './GanttDates';


interface IInitParams {
    container: HTMLDivElement;
}

interface IGanttManagerParams {
    datasetControl: ITaskGridDatasetControl;
}

export interface IGanttManager {
    init: (params: IInitParams) => void;
    getGanttInstance: () => GanttStatic;
}

export class GanttManager implements IGanttManager {
    private _datasetControl: ITaskGridDatasetControl;
    private _dataProvider: ITaskDataProvider;
    private _bridge: IGanttGridBridge;
    private _zooming: IGanttZooming;
    private _dates: GanttDates;
    private _gantt: GanttStatic;
    private _expandedNodeSet: Set<string> = new Set();
    private _selectionAnchorTaskId: string | null = null;


    constructor(params: IGanttManagerParams) {
        this._gantt = Gantt.getGanttInstance();
        this._datasetControl = params.datasetControl;
        this._dataProvider = this._datasetControl.getDataProvider();
        this._bridge = this._datasetControl.ganttGridBridge;
        this._dates = new GanttDates({ datasetControl: this._datasetControl });
        this._zooming = new GanttZooming({ datasetControl: this._datasetControl, gantt: this._gantt, dates: this._dates });
    }

    public init(params: IInitParams) {
        this._gantt.config.show_grid = false;
        this._gantt.config.select_task = false;
        this._gantt.config.row_height = this._datasetControl.getParameters().RowHeight?.raw ?? 42;
        this._gantt.templates.task_row_class = (_start, _end, task) => this._getTaskRowClass(task);
        this._gantt.templates.task_class = (_start, _end, task) => this._getTaskClass(task);
        this._gantt.templates.task
        this._gantt.init(params.container);
        this._registerEventListeners();
    }

    public getGanttInstance() {
        return this._gantt;
    }

    private _registerEventListeners() {
        this._dataProvider.addEventListener('onNewDataLoaded', () => this._loadTasksToGantt());
        this._dataProvider.addEventListener('onAfterRecordSaved', (result) => this._syncRecordChangeFromOutside(this._dataProvider.getRecordsMap()[result.recordId]));
        this._dataProvider.addEventListener('onRecordsSelected', (recordIds) => this._onRecordsSelected(recordIds));
        //this._dataProvider.taskEvents.addEventListener('onTaskDataUpdated', (data) => this._syncRawDataChangeFromOutside(data));
        this._dataProvider.taskEvents.addEventListener('onAfterTaskMoved', () => this._loadTasksToGantt());
        this._dataProvider.taskEvents.addEventListener('onAfterTasksCreated', () => this._loadTasksToGantt());
        this._dataProvider.taskEvents.addEventListener('onAfterTasksDeleted', () => this._loadTasksToGantt());
        this._bridge.addEventListener('onAgGridRowExpanded', (taskId) => this._onAgGridTaskExpanded(taskId));
        this._bridge.addEventListener('onAgGridRowCollapsed', (taskId) => this._onAgGridTaskCollapsed(taskId));
        this._bridge.addEventListener('onAgGridScrolled', (scrollTop) => this._gantt.scrollTo(undefined, scrollTop));
        this._getScrollingContainer().addEventListener('scroll', (event) => this._bridge.dispatchEvent('onGanttScrolled', (event.target as Element).scrollTop));
        this._gantt.attachEvent('onTaskDrag', (id: string, mode) => this._onTaskDrag(id, mode));
        this._gantt.attachEvent('onAfterTaskDrag', (id: string) => this._onAfterTaskDrag(id));
        this._gantt.attachEvent('onTaskMultiSelect', (id: string) => this._onRecordSelectedFromGantt(id));
        this._gantt.attachEvent('onTaskClick', (id: string, e?: MouseEvent) => {
            this._onRecordSelectedFromGantt(id, e);
            return true;
        });
    }

    private _getTaskRowClass(task: Task) {
        const id = task.id as string;
        const classNames = [];
        if (!task.active) {
            classNames.push('gantt_row_inactive');
        }
        if (this._dataProvider.getSelectedRecordIds().includes(id)) {
            classNames.push('gantt_selected');
        }
        return classNames.join(' ');
    }

    private _getTaskClass(task: Task) {
        const id = task.id as string;
        const classNames = [];
        if (this._dataProvider.getSelectedRecordIds().includes(id)) {
            classNames.push('gantt_task_selected');
        }
        return classNames.join(' ');
    }

    private _onRecordsSelected(recordIds: string[]) {
        this._gantt.render();
        /*         const selectedIds = new Set((recordIds ?? []).map(id => String(id)));
                this._gantt.eachTask((task: any) => {
                    const taskId = String(task.id);
                    const isSelected = this._gantt.isSelectedTask(task.id);
                    if (selectedIds.has(taskId) && !isSelected) {
                        (this._gantt as any).selectTask(task.id, true);
                    }
                    if (!selectedIds.has(taskId) && isSelected) {
                        (this._gantt as any).unselectTask(task.id);
                    }
                });
                this._zooming.zoomToFitSelectedTasks(); */
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

    private async _onTaskDrag(taskId: string, mode: string) {
        const draggedTask = this._gantt.getTask(taskId);
        const startColumnName = this._dates.getStartDateColumnName();
        const endColumnName = this._dates.getEndDateColumnName();
        const selectedRecordIds = this._dataProvider.getSelectedRecordIds();

        if (mode === 'resize') {
            const record = this._dataProvider.getRecordsMap()[taskId];
            record.setValue(startColumnName, draggedTask.start_date);
            record.setValue(endColumnName, draggedTask.end_date);
        }

        else {
            const selectedTaskIds = new Set<string>(
                selectedRecordIds.includes(taskId) ? selectedRecordIds : [taskId]
            );
            const draggedRecord = this._dataProvider.getRecordsMap()[taskId];
            const originalDraggedStartDate = draggedRecord.getValue(startColumnName);
            const originalDraggedStartTime = this._dates.getDateFromString(originalDraggedStartDate)?.getTime();
            const draggedTaskStartTime = draggedTask.start_date?.getTime();

            if (originalDraggedStartTime === undefined || draggedTaskStartTime === undefined) {
                return;
            }

            const draggedOffset = draggedTaskStartTime - originalDraggedStartTime;

            for (const selectedTaskId of selectedTaskIds) {
                const selectedTask = this._gantt.getTask(selectedTaskId);
                const selectedRecord = this._dataProvider.getRecordsMap()[selectedTaskId];
                const originalStartDate = this._dates.getDateFromString(selectedRecord.getValue(startColumnName));
                const originalEndDate = this._dates.getDateFromString(selectedRecord.getValue(endColumnName));

                if (!originalStartDate || !originalEndDate) {
                    continue;
                }

                selectedTask.start_date = new Date(originalStartDate.getTime() + draggedOffset);
                selectedTask.end_date = new Date(originalEndDate.getTime() + draggedOffset);

                selectedRecord.setValue(startColumnName, selectedTask.start_date);
                selectedRecord.setValue(endColumnName, selectedTask.end_date);
            }
        }
        if (selectedRecordIds.length > 1) {
            this._gantt.render();
        }
    }

    private _onAfterTaskDrag(taskId: string) {
        this._dataProvider.save();
    }

    private _loadTasksToGantt() {
        const records = this._dataProvider.getRecordTree().getNode(null).allChildren;
        const data = records.map(record => this._convertRecordToTask(record));
        this._gantt.clearAll();
        this._gantt.parse({
            data: data
        });
    }

    private _convertRecordToTask(record: IRecord): any {
        const parentColumnName = this._datasetControl.getNativeColumns().parentId;
        const parent: ComponentFramework.EntityReference | null = record.getValue(parentColumnName)?.[0];
        let startDate = this._dates.getDateFromString(record.getValue(this._dates.getStartDateColumnName()));
        let endDate = this._dates.getDateFromString(record.getValue(this._dates.getEndDateColumnName()));

        if (!startDate) {
            startDate = new Date();
        }
        if (!endDate) {
            endDate = dayjs(startDate).add(7, 'day').toDate();
        }

        return {
            id: record.getRecordId(),
            text: record.getNamedReference().name,
            start_date: startDate,
            end_date: endDate,
            parent: this._dataProvider.isFlatListEnabled() ? undefined : parent?.id?.guid,
            active: record.isActive(),
            open: this.isTaskExpandedByDefault(record.getRecordId()),
        };
    }

    private isTaskExpandedByDefault(recordId: string): boolean {
        const matchingRecords = this._dataProvider.getRecordTree().getMatchingRecords();
        //never expand on flatlist
        if (this._dataProvider.isFlatListEnabled()) {
            return false
        }
        //always expand if no matching foud
        if (!matchingRecords[recordId]) {
            return true;
        }
        //expand if previously expanded
        return this._expandedNodeSet.has(recordId);
    }

    private _onAgGridTaskExpanded(taskId: string) {
        this._gantt.open(taskId);
        this._expandedNodeSet.add(taskId);
    }

    private _onAgGridTaskCollapsed(taskId: string) {
        this._gantt.close(taskId);
        this._expandedNodeSet.delete(taskId);
    }

    private _getScrollingContainer(): Element {
        const container = document.querySelector('.gantt_data_area');
        if (!container) {
            throw new Error("Could not find Gantt scrolling container");
        }
        return container;
    }

    private _syncRawDataChangeFromOutside(data: IRawRecord[]) {
        for (const rawRecord of data) {
            const id = rawRecord[this._dataProvider.getMetadata().PrimaryIdAttribute];
            const record = this._dataProvider.getRecordsMap()[id];
            this._syncRecordChangeFromOutside(record);
        }
    }

    private _syncRecordChangeFromOutside(record: IRecord) {
        const id = record.getRecordId();
        const taskToUpdate = this._gantt.getTask(id);
        const updatedTask = this._convertRecordToTask(record);
        for (const key in updatedTask) {
            if (key === 'parent') continue;
            taskToUpdate[key] = updatedTask[key];
        }
        this._gantt.refreshTask(id);
    }
}