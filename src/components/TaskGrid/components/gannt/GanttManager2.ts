import { gantt } from 'dhtmlx-gantt';
import { ITaskGridDatasetControl } from '../..';
import { ITaskDataProvider } from '../../providers';
import { IColumn, IRawRecord, IRecord, IRecordSaveOperationResult } from '@talxis/client-libraries';
import { IGanttGridBridge } from "../../bridges/GanttGridBridge";
import dayjs from 'dayjs';


interface IInitParams {
    container: HTMLDivElement;
}

interface IGanttManagerParams {
    datasetControl: ITaskGridDatasetControl;
}

export interface IGanttManager {
    onInit: (params: IInitParams) => void;
}

export class GanttManager2 implements IGanttManager {
    private _datasetControl: ITaskGridDatasetControl;
    private _dataProvider: ITaskDataProvider;
    private _bridge: IGanttGridBridge;
    private _expandedNodeSet: Set<string> = new Set();

    constructor(params: IGanttManagerParams) {
        this._datasetControl = params.datasetControl;
        this._dataProvider = this._datasetControl.getDataProvider();
        this._bridge = this._datasetControl.ganttGridBridge;
    }

    public onInit(params: IInitParams) {
        gantt.config.show_grid = false;
        gantt.config.row_height = this._datasetControl.getParameters().RowHeight?.raw ?? 42;
        gantt.config.scale_height = 43;
        gantt.ext.zoom.init(this._getZoomConfig() as any);
        gantt.templates.task_class = (_start, _end, task) => task.active ? '' : 'gantt_task_inactive';
        gantt.init(params.container);
        this._registerEventListeners();
    }

    private _registerEventListeners() {
        this._dataProvider.addEventListener('onNewDataLoaded', () => this._loadTasksToGantt());
        this._dataProvider.addEventListener('onAfterRecordSaved', (result) => this._syncRecordChangeFromOutside(this._dataProvider.getRecordsMap()[result.recordId]));
        //this._dataProvider.taskEvents.addEventListener('onTaskDataUpdated', (data) => this._syncRawDataChangeFromOutside(data));
        this._dataProvider.taskEvents.addEventListener('onAfterTaskMoved', () => this._loadTasksToGantt());
        this._dataProvider.taskEvents.addEventListener('onAfterTasksCreated', () => this._loadTasksToGantt());
        this._dataProvider.taskEvents.addEventListener('onAfterTasksDeleted', () => this._loadTasksToGantt());
        this._bridge.addEventListener('onAgGridRowExpanded', (taskId) => this._onAgGridTaskExpanded(taskId));
        this._bridge.addEventListener('onAgGridRowCollapsed', (taskId) => this._onAgGridTaskCollapsed(taskId));
        this._bridge.addEventListener('onAgGridScrolled', (scrollTop) => gantt.scrollTo(undefined, scrollTop));
        this._getScrollingContainer().addEventListener('scroll', (event) => this._bridge.dispatchEvent('onGanttScrolled', (event.target as Element).scrollTop));
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
            parent: parent?.id?.guid,
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


    private _hourRangeFormat(step: number) {
        return function(date: Date){
            //@ts-ignore
			var intervalEnd = new Date(gantt.date.add(date, step, "hour") - 1)
			return gantt.date.date_to_str("%H:%i");
		};
    }    

    private _getZoomConfig() {
        return {
            minColumnWidth: 40,
            maxColumnWidth: 150,
            levels: [
                // Level 1: decade view — year header, quarter columns
                [
                    { unit: "year", format: "%Y", step: 1 },
                    { unit: "month", format: "%M", step: 3 }
                ],
                // Level 2: year view — year header, month columns
                [
                    { unit: "year", format: "%Y", step: 1 },
                    { unit: "month", format: "%M", step: 1 }
                ],
                // Level 3: quarter view — quarter header, week columns
                [
                    { unit: "month", format: "%F %Y", step: 3 },
                    { unit: "week", format: "W%W", step: 1 }
                ],
                // Level 4: month view — month header, day columns
                [
                    { unit: "month", format: "%F %Y", step: 1 },
                    { unit: "day", format: "%d", step: 1 }
                ],
                // Level 5: week view — week header, day columns with name
                [
                    { unit: "week", format: "Week #%W", step: 1 },
                    { unit: "day", format: "%d %D", step: 1 }
                ],
            ],
            startDate: new Date(2020, 0, 1),
            endDate: new Date(2030, 11, 31),
            useKey: "ctrlKey",
            trigger: "wheel",
            element: function () {
                return gantt.$root.querySelector(".gantt_task");
            }
        }
    }

}