import { Gantt, GanttStatic, Task } from 'dhtmlx-gantt';
import { ITaskGridDatasetControl } from '../..';
import { ITaskDataProvider } from '../../providers';
import { IColumn, IRawRecord, IRecord } from '@talxis/client-libraries';
import { IGanttGridBridge } from "../../bridges/GanttGridBridge";
import dayjs from 'dayjs';
import { GanttZooming, IGanttZooming } from './GanttZooming';


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
    private _gantt: GanttStatic;
    private _expandedNodeSet: Set<string> = new Set();


    constructor(params: IGanttManagerParams) {
        this._gantt = Gantt.getGanttInstance();
        this._datasetControl = params.datasetControl;
        this._dataProvider = this._datasetControl.getDataProvider();
        this._bridge = this._datasetControl.ganttGridBridge;
        this._zooming = new GanttZooming({ datasetControl: this._datasetControl, gantt: this._gantt });
    }

    public init(params: IInitParams) {
        this._gantt.config.multiselect = true;
        this._gantt.config.show_grid = false;
        this._gantt.config.row_height = this._datasetControl.getParameters().RowHeight?.raw ?? 42;
        this._gantt.config.scale_height = 43;
        this._gantt.templates.task_row_class = (_start, _end, task) => this._getTaskRowClass(task);
        this._zooming.init();
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
        this._gantt.attachEvent('onTaskDrag', (id: string) => this._onTaskDrag(id));
        this._gantt.attachEvent('onAfterTaskDrag', (id: string) => this._onAfterTaskDrag(id));
        this._gantt.attachEvent('onTaskMultiSelect', (id: string) => this._onRecordSelectedFromGantt(id));
    }

    private _getTaskRowClass(task: Task) {
        const id = task.id as string;
        const classNames = [];
        if (!task.active) {
            classNames.push('gantt_row_inactive');
        }
        if(this._dataProvider.getSelectedRecordIds().includes(id)) {
            classNames.push('gantt_selected');
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

    private _onRecordSelectedFromGantt(taskId: string) {
        //this._dataProvider.setSelectedRecordIds((this._gantt as any).getSelectedTasks());
    }

    private async _onTaskDrag(taskId: string) {
        const draggedTask = this._gantt.getTask(taskId);
        const record = this._dataProvider.getRecordsMap()[taskId];

        const startColumnName = this._getStartDateColumn().name;
        const endColumnName = this._getEndDateColumn().name;

        const selectedTasks = this._dataProvider.getSelectedRecordIds().map(id => this._gantt.getTask(id));
        for (const selectedTask of selectedTasks) {
            const selectedRecord = this._dataProvider.getRecordsMap()[selectedTask.id];
            selectedRecord.setValue(startColumnName, selectedTask.start_date);
            selectedRecord.setValue(endColumnName, selectedTask.end_date);
            selectedTask.start_date = draggedTask.start_date;
            selectedTask.end_date = draggedTask.end_date;
        }
        this._gantt.render();
    }

    private _onAfterTaskDrag(taskId: string) {
        this._dataProvider.save();
        //this._dataProvider.getRecordsMap()[taskId].save();
    }

    private _loadTasksToGantt() {
        const records = this._dataProvider.getRecordTree().getNode(null).allChildren;
        const data = records.map(record => this._convertRecordToTask(record));
        this._gantt.clearAll();
        this._gantt.parse({
            data: data
        });
        this._zooming.zoomToFitSelectedTasks();

    }

    private _getDateFromString(date: string | null): Date | null {
        if (!date) return null;
        return new Date(date);
    }

    private _convertRecordToTask(record: IRecord): any {
        const parentColumnName = this._datasetControl.getNativeColumns().parentId;
        const parent: ComponentFramework.EntityReference | null = record.getValue(parentColumnName)?.[0];
        let startDate = this._getDateFromString(record.getValue(this._getStartDateColumn().name));
        let endDate = this._getDateFromString(record.getValue(this._getEndDateColumn().name));

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

    private _getStartDateColumn(): IColumn {
        const startDateColumnName = this._datasetControl.getNativeColumns().startDate;
        const startDateColumn = this._dataProvider.getColumnsMap()[startDateColumnName!];
        if (!startDateColumn) {
            throw new Error("Start date column is not defined in the dataset, cannot render Gantt chart. Please make sure that the dataset contains a start date column and that it is properly mapped in the dataset control.");
        }
        return startDateColumn;
    }

    private _getEndDateColumn(): IColumn {
        const endDateColumnName = this._datasetControl.getNativeColumns().endDate;
        const endDateColumn = this._dataProvider.getColumnsMap()[endDateColumnName!];
        if (!endDateColumn) {
            throw new Error("End date column is not defined in the dataset, cannot render Gantt chart. Please make sure that the dataset contains an end date column and that it is properly mapped in the dataset control.");
        }
        return endDateColumn;
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