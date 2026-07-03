import { IRawRecord, IRecord } from "@talxis/client-libraries";
import { GanttStatic, Task } from "gantt-trial";
import { ITaskGridDatasetControl } from "../..";
import { IDeleteTasksResult, ITaskDataProvider } from "../../providers";
import { IGanttDates } from "./GanttDates";

export interface IGanttData { }

interface IGanttDataParams {
    datasetControl: ITaskGridDatasetControl;
    gantt: GanttStatic;
    dates: IGanttDates;
    expandedNodeSet: ReadonlySet<string>;
}

export class GanttData implements IGanttData {
    private _datasetControl: ITaskGridDatasetControl;
    private _dataProvider: ITaskDataProvider;
    private _gantt: GanttStatic;
    private _dates: IGanttDates;
    private _expandedNodeSet: ReadonlySet<string>;

    constructor(params: IGanttDataParams) {
        this._datasetControl = params.datasetControl;
        this._dataProvider = params.datasetControl.getDataProvider();
        this._gantt = params.gantt;
        this._dates = params.dates;
        this._expandedNodeSet = params.expandedNodeSet;
        this._registerEventListeners();
    }

    private _registerEventListeners() {
        this._dataProvider.addEventListener('onNewDataLoaded', () => this._loadTasksToGantt());
        this._dataProvider.addEventListener('onAfterRecordSaved', (result) => this._syncRecordsToGanttByIds([result.recordId]));
        this._dataProvider.taskEvents.addEventListener('onTaskDataUpdated', (data) => this._onTaskDataUpdated(data));
        this._dataProvider.taskEvents.addEventListener('onAfterTaskMoved', (movingFromTaskId) => this._onAfterTaskMoved(movingFromTaskId));
        this._dataProvider.taskEvents.addEventListener('onAfterTasksCreated', (records, parentId) => this._onAfterTasksCreated(records, parentId));
        this._dataProvider.taskEvents.addEventListener('onAfterTasksDeleted', (result) => this._onAfterTasksDeleted(result));
    }

    private _loadTasksToGantt() {
        const previousOpenState = new Map<string, boolean>();
        this._gantt.eachTask((task: Task) => previousOpenState.set(String(task.id), !!task.$open));

        const records = this._dataProvider.getRecordTree().getNode(null).allChildren;
        const data = records.map(record => {
            const task = this._convertRecordToTask(record);
            const previousOpen = previousOpenState.get(String(task.id));
            if (previousOpen !== undefined) {
                task.open = previousOpen;
            }
            return task;
        });

        this._gantt.clearAll();
        this._gantt.parse({
            data: data
        });
    }

    private _onAfterTasksCreated(rawRecords: IRawRecord[] | null, parentId?: string) {
        if (!rawRecords || rawRecords.length === 0) {
            return;
        }

        if (!this._insertCreatedTasksToGantt(rawRecords, parentId)) {
            this._loadTasksToGantt();
        }
    }

    private _insertCreatedTasksToGantt(rawRecords: IRawRecord[], parentId?: string): boolean {
        const primaryIdAttribute = this._dataProvider.getMetadata().PrimaryIdAttribute;
        const recordsMap = this._dataProvider.getRecordsMap();
        const recordTree = this._dataProvider.getRecordTree();
        const createdRecords = rawRecords
            .map(rawRecord => recordsMap[rawRecord[primaryIdAttribute]])
            .filter((record): record is IRecord => !!record);

        if (createdRecords.length !== rawRecords.length) {
            return false;
        }

        const treeOrder = new Map(recordTree.getSortedIds().map((id, index) => [id, index]));
        createdRecords.sort((recordA, recordB) => {
            return (treeOrder.get(recordA.getRecordId()) ?? Number.MAX_SAFE_INTEGER)
                - (treeOrder.get(recordB.getRecordId()) ?? Number.MAX_SAFE_INTEGER);
        });

        let canInsertIncrementally = true;
        this._gantt.batchUpdate(() => {
            for (const record of createdRecords) {
                const task = this._convertRecordToTask(record);
                const node = recordTree.getNode(record.getRecordId());
                const parentTaskId = task.parent as string | undefined;

                if (this._gantt.isTaskExists(task.id)) {
                    canInsertIncrementally = false;
                    return;
                }
                if (parentTaskId && !this._gantt.isTaskExists(parentTaskId)) {
                    canInsertIncrementally = false;
                    return;
                }

                this._gantt.addTask(task, parentTaskId, node.index);
            }

            if (!canInsertIncrementally) {
                return;
            }

            if (parentId && this._gantt.isTaskExists(parentId)) {
                this._syncRecordsToGanttByIds([parentId], false);
                this._gantt.open(parentId);
            }
        });

        return canInsertIncrementally;
    }

    private _onAfterTaskMoved(movingFromTaskId: string) {
        if (!this._moveTaskInGantt(movingFromTaskId)) {
            this._loadTasksToGantt();
        }
    }

    private _moveTaskInGantt(movingFromTaskId: string): boolean {
        if (!this._gantt.isTaskExists(movingFromTaskId)) {
            return false;
        }

        const node = this._dataProvider.getRecordTree().getNode(movingFromTaskId);
        const oldParentId = this._getParentTaskId(this._gantt.getTask(movingFromTaskId).parent);
        const newParentId = node.parent?.getRecordId();

        if (newParentId && !this._gantt.isTaskExists(newParentId)) {
            return false;
        }

        this._gantt.batchUpdate(() => {
            this._gantt.moveTask(movingFromTaskId, node.index, newParentId);
            this._refreshHierarchyTask(oldParentId, false);
            this._refreshHierarchyTask(newParentId, false);
        });

        return true;
    }

    private _onAfterTasksDeleted(result: IDeleteTasksResult | null) {
        const deletedTaskIds = result?.deletedTaskIds ?? [];
        if (deletedTaskIds.length === 0) {
            return;
        }

        if (!this._deleteTasksFromGantt(deletedTaskIds)) {
            this._loadTasksToGantt();
        }
    }

    private _deleteTasksFromGantt(deletedTaskIds: string[]): boolean {
        const affectedParentIds = new Set<string>();

        this._gantt.batchUpdate(() => {
            for (const taskId of deletedTaskIds) {
                if (!this._gantt.isTaskExists(taskId)) {
                    continue;
                }

                const parentId = this._getParentTaskId(this._gantt.getTask(taskId).parent);
                if (parentId) {
                    affectedParentIds.add(parentId);
                }

                this._gantt.deleteTask(taskId);
            }

            for (const parentId of affectedParentIds) {
                this._refreshHierarchyTask(parentId, false);
            }
        });

        return true;
    }

    private _onTaskDataUpdated(data: IRawRecord[]) {
        this._syncRecordsToGantt(this._getRecordsFromRawData(data));
    }

    private _convertRecordToTask(record: IRecord): Task {
        const parentColumnName = this._datasetControl.getNativeColumns().parentId;
        const parent: ComponentFramework.EntityReference | null = record.getValue(parentColumnName)?.[0];
        let startDate = this._dates.getDateFromString(record.getValue(this._dates.getStartDateColumnName())) ?? undefined;
        let endDate = this._dates.getDateFromString(record.getValue(this._dates.getEndDateColumnName())) ?? undefined;
        const isMilestone = !endDate;

        const hasChildren = this._dataProvider.getRecordTree().hasChildren(record.getRecordId());
        const taskType = String(isMilestone ? this._gantt.config.types.milestone : this._gantt.config.types.task);
        
        return {
            id: record.getRecordId(),
            text: record.getNamedReference().name,
            start_date: startDate,
            end_date: endDate,
            type: taskType,
            bar_height: hasChildren ? 16 : 26,
            progress: this._getPercentComplete(record),
            parent: this._dataProvider.isFlatListEnabled() ? undefined : parent?.id?.guid,
            active: record.isActive(),
            open: this._isTaskExpandedByDefault(record.getRecordId()),
        };
    }

    private _getPercentComplete(record: IRecord): number {
        const percentCompleteColName = this._datasetControl.getNativeColumns().percentComplete;
        if (!percentCompleteColName) {
            return 0;
        }
        return (record.getValue(percentCompleteColName) ?? 0) / 100;
    }

    private _isTaskExpandedByDefault(recordId: string): boolean {
        const matchingRecords = this._dataProvider.getRecordTree().getMatchingRecords();
        if (this._dataProvider.isFlatListEnabled()) {
            return false;
        }
        if (!matchingRecords[recordId]) {
            return true;
        }
        return this._expandedNodeSet.has(recordId);
    }

    private _syncRecordToGantt(record: IRecord) {
        const id = record.getRecordId();
        if (!this._gantt.isTaskExists(id)) {
            return;
        }
        const taskToUpdate = this._gantt.getTask(id);
        const updatedTask = this._convertRecordToTask(record);
        for (const key in updatedTask) {
            if (key === 'parent') continue;
            taskToUpdate[key] = updatedTask[key];
        }
    }

    private _syncRecordsToGantt(records: IRecord[], useBatch: boolean = true) {
        const sync = () => {
            for (const record of records) {
                this._syncRecordToGantt(record);
            }
        };

        if (useBatch) {
            this._gantt.batchUpdate(sync);
            return;
        }

        sync();
    }

    private _syncRecordsToGanttByIds(recordIds: string[], useBatch: boolean = true) {
        const records = recordIds.map(recordId => this._dataProvider.getRecordsMap()[recordId])
        if (records.length === 0) {
            return;
        }
        this._syncRecordsToGantt(records, useBatch);
    }

    private _getRecordsFromRawData(data: IRawRecord[]) {
        const primaryIdAttribute = this._dataProvider.getMetadata().PrimaryIdAttribute;
        return data.map(rawRecord => this._dataProvider.getRecordsMap()[rawRecord[primaryIdAttribute]])
    }

    private _refreshHierarchyTask(taskId?: string, useBatch: boolean = true) {
        if (!taskId) {
            return;
        }

        this._syncRecordsToGanttByIds([taskId], useBatch);
    }

    private _getParentTaskId(parent: Task["parent"]): string | undefined {
        if (parent == null || parent === 0) {
            return undefined;
        }

        return String(parent);
    }
}
