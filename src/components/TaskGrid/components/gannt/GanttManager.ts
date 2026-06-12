import { gantt } from 'dhtmlx-gantt';
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
    onInit: (params: IInitParams) => void;
    getGanttInstance: () => typeof gantt;
}

export class GanttManager implements IGanttManager {
    private _datasetControl: ITaskGridDatasetControl;
    private _dataProvider: ITaskDataProvider;
    private _bridge: IGanttGridBridge;
    private _zooming: IGanttZooming;
    private _expandedNodeSet: Set<string> = new Set();
    

    constructor(params: IGanttManagerParams) {
        this._datasetControl = params.datasetControl;
        this._dataProvider = this._datasetControl.getDataProvider();
        this._bridge = this._datasetControl.ganttGridBridge;
        this._zooming = new GanttZooming({ datasetControl: this._datasetControl });
    }

    public onInit(params: IInitParams) {
        gantt.plugins({
            multiselect: true
        });
        gantt.config.multiselect = true;
        gantt.config.show_grid = false;
        gantt.config.row_height = this._datasetControl.getParameters().RowHeight?.raw ?? 42;
        gantt.config.scale_height = 43;
        this._zooming.init();
        gantt.templates.task_row_class = (_start, _end, task) => task.active ? '' : 'gantt_row_inactive';
        gantt.init(params.container);
        this._registerEventListeners();
    }

    public getGanttInstance() {
        return gantt;
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
        this._bridge.addEventListener('onAgGridScrolled', (scrollTop) => gantt.scrollTo(undefined, scrollTop));
        this._getScrollingContainer().addEventListener('scroll', (event) => this._bridge.dispatchEvent('onGanttScrolled', (event.target as Element).scrollTop));
        gantt.attachEvent('onBeforeTaskDrag', (id) => !!gantt.getTask(id)?.active);
        gantt.attachEvent('onBeforeLinkAdd', (_id, link) => !!gantt.getTask(link.source)?.active && !!gantt.getTask(link.target)?.active);
        gantt.attachEvent('onTaskDrag', (id: string) => this._onTaskDrag(id));
        gantt.attachEvent('onAfterTaskDrag', (id: string) => this._onAfterTaskDrag(id));
        gantt.attachEvent('onTaskMultiSelect', (id: string) => this._onRecordSelectedFromGantt(id));
    }

    private _onRecordsSelected(recordIds: string[]) {
        const selectedIds = new Set((recordIds ?? []).map(id => String(id)));
        gantt.eachTask((task: any) => {
            const taskId = String(task.id);
            const isSelected = gantt.isSelectedTask(task.id);
            if (selectedIds.has(taskId) && !isSelected) {
                (gantt as any).selectTask(task.id, true);
            }
            if (!selectedIds.has(taskId) && isSelected) {
                gantt.unselectTask(task.id);
            }
        });
        this._zooming.zoomToFitSelectedTasks();
    }

    private _onRecordSelectedFromGantt(taskId: string) {
        this._dataProvider.setSelectedRecordIds(gantt.getSelectedTasks());
    }

    private async _onTaskDrag(taskId: string) {
        const task = gantt.getTask(taskId);
        const record = this._dataProvider.getRecordsMap()[taskId];

        const startColumnName = this._getStartDateColumn().name;
        const endColumnName = this._getEndDateColumn().name;

        record.setValue(startColumnName, task.start_date);
        record.setValue(endColumnName, task.end_date);
    }

    private _onAfterTaskDrag(taskId: string) {
        this._dataProvider.getRecordsMap()[taskId].save();
    }

    private _loadTasksToGantt() {
        const records = this._dataProvider.getRecordTree().getNode(null).allChildren;
        const data = records.map(record => this._convertRecordToTask(record));
        gantt.clearAll();
        gantt.parse({
            data: data
        });

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
        gantt.open(taskId);
        this._expandedNodeSet.add(taskId);
    }

    private _onAgGridTaskCollapsed(taskId: string) {
        gantt.close(taskId);
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
        const taskToUpdate = gantt.getTask(id);
        const updatedTask = this._convertRecordToTask(record);
        for (const key in updatedTask) {
            if (key === 'parent') continue;
            taskToUpdate[key] = updatedTask[key];
        }
        gantt.refreshTask(id);
    }
}