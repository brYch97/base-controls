import { TaskStore, Gantt, TaskModel } from "@bryntum/gantt";
import { ITaskGridDatasetControl } from "../..";
import { IDeleteTasksResult, ITaskDataProvider } from "../../data-providers";
import { IColumn, IRawRecord, IRecord, IRecordSaveOperationResult } from "@talxis/client-libraries";

interface IGanntManagerParams {
    datasetControl: ITaskGridDatasetControl;
}

export interface IGanntManager {
    getStore: () => TaskStore;
    onRetrieveGanntInstance: (gannt: Gantt) => void;
}

export class GanttManager implements IGanntManager {
    private _store: TaskStore;
    private _datasetControl: ITaskGridDatasetControl;
    private _dataProvider: ITaskDataProvider;
    private _gantt: Gantt | null = null;
    private _saveLockPromise: Promise<void> | null = null;
    private _expandedNodeSet: Set<string> = new Set();

    constructor(params: IGanntManagerParams) {
        this._store = new TaskStore();
        this._datasetControl = params.datasetControl;
        this._gantt?.zoomTo({

        })
        this._dataProvider = this._datasetControl.getDataProvider();
        this._registerEventListeners();
        if (!this._dataProvider.isLoading()) {
            this._loadDataToStore();
        };
    }

    public getStore(): TaskStore {
        return this._store;
    }

    public onRetrieveGanntInstance(gantt: Gantt) {
        this._gantt = gantt;
        this._gantt.subGrids.locked.hide();
        //@ts-ignore - not in typings
        this._gantt.project.autoSetConstraints = true;
        this._gantt.features.tree.expandOnCellClick = false;
        this._gantt.on('scroll', (e: any) => {
            this._syncVerticalScroll(e.scrollTop);
        });
        this._gantt.on('expand', (e: any) => console.log(e))

    }

    private _getGanttInstance(): Gantt {
        if (!this._gantt) {
            throw new Error("Gantt instance is not available yet");
        }
        return this._gantt;
    }

    private _registerEventListeners() {
        this._dataProvider.addEventListener('onNewDataLoaded', () => this._onNewDataLoaded());
        this._dataProvider.addEventListener('onRecordsSelected', (ids) => this._zoomToTasks(ids));
        this._dataProvider.taskEvents.addEventListener('onTaskExpanded', (taskId) => this._onTaskExpanded(taskId));
        this._dataProvider.taskEvents.addEventListener('onTaskCollapsed', (taskId) => this._onTaskCollapsed(taskId));
        this._dataProvider.taskEvents.addEventListener('onAfterTasksCreated', (tasks) => this._addTasksToStore(tasks));
        this._dataProvider.taskEvents.addEventListener('onAfterTasksDeleted', (tasks) => this._removeTasksFromStore(tasks));
        this._dataProvider.addEventListener('onAfterRecordSaved', (result) => this._syncChangesFromOutside(result));
        this._dataProvider.taskEvents.addEventListener('onAfterTaskMoved', (movingFromTaskId, movingToTaskId, position) => this._moveTask(movingFromTaskId, movingToTaskId, position));
        this._store.on('update', (updateEvent: any) => this._syncChangesFromInside(updateEvent));

    }

    private _onNewDataLoaded() {
        this._expandedNodeSet.clear();
        this._loadDataToStore();
        setTimeout(() => {
            this._gantt?.zoomToFit?.();
        }, 0);
    }

    private _syncChangesFromOutside(result: IRecordSaveOperationResult) {
        if (result.success && !this._saveLockPromise) {
            //update everything => delete any add again or global update?
            const taskInStore = this._store.getById(result.recordId);
            if (!taskInStore) return;
            taskInStore.set(this._convertRecordToTask(this._dataProvider.getRecordsMap()[result.recordId]));
        }
    }

    private _moveTask(movingFromId: string, movingToId: string, position: 'above' | 'below' | 'child') {
        this._loadDataToStore();
        console.log(`Task with id ${movingFromId} moved ${position} task with id ${movingToId}`);
    }

    private _syncChangesFromInside(updateEvent: any) {
        if (updateEvent.record instanceof TaskModel) {
            const changes = updateEvent.changes;
            for (const fieldName in changes) {
                const columnName = this._getColumnNameFromGanttField(fieldName);
                if (!columnName) continue;
                const record = this._dataProvider.getRecordsMap()[updateEvent.record.id];
                record.setValue(columnName, changes[fieldName].value);
            }
            if (!this._saveLockPromise) {
                this._saveLockPromise = new Promise((resolve) => {
                    setTimeout(async () => {
                        await this._dataProvider.save();
                        resolve();
                        this._saveLockPromise = null;
                    }, 0);
                })
            }
        }
    }

    //TODO: this could go wrong when adding multiple tasks at once
    //make sure that the order of tasks in the array is correct (parents before children) or implement a more robust way of adding tasks (e.g. by traversing the tree and adding nodes recursively)
    private _addTasksToStore(tasks: IRawRecord[] | null) {
        if (!tasks) return null;
        this._loadDataToStore();
    }

    private _removeTasksFromStore(result: IDeleteTasksResult | null) {
        if (!result) return;
        this._store.remove(result.deletedTaskIds);
    }

    private _onTaskExpanded(taskId: string) {
        this._getGanttInstance().expand(taskId);
        this._expandedNodeSet.add(taskId);
    }

    private _onTaskCollapsed(taskId: string) {
        this._getGanttInstance().collapse(taskId);
        this._expandedNodeSet.delete(taskId);
    }

    private _convertRecordToTask(record: IRecord): any {
        const node = this._dataProvider.getRecordTree().getNode(record.getRecordId());
        return {
            id: record.getRecordId(),
            name: record.getNamedReference().name,
            startDate: record.getValue(this._getStartDateColumn().name),
            endDate: record.getValue(this._getEndDateColumn().name),
            expanded: this.isNodeExpandedByDefault(record.getRecordId()),
            inactive: !record.isActive(),
            manuallyScheduled: true,
            milestone: true,
            ...(node?.directChildren?.length > 0 && {
                children: node.directChildren.map((child: IRecord) => this._convertRecordToTask(child))
            })
        };
    }

    private isNodeExpandedByDefault(recordId: string): boolean {
        if (this._expandedNodeSet.has(recordId)) {
            return true;
        }
        const matchingRecords = this._dataProvider.getRecordTree().getMatchingRecords();
        return !matchingRecords[recordId];
    }

    private _loadDataToStore() {
        // Convert the tree into store-compatible format recursively
        const tree = this._dataProvider.getRecordTree();
        const topLevelRecords = tree.getNode(null)?.directChildren ?? [];
        this._store.removeAll();
        this._store.add(topLevelRecords.map(record => this._convertRecordToTask(record)));
    }

    private _syncVerticalScroll(scrollTop: number) {
        const agGridViewPort = this._getAgGridViewport();
        if (agGridViewPort) {
            agGridViewPort.style.scrollBehavior = 'none';
            agGridViewPort.scrollTop = scrollTop;
        }
    }

    //TODO: SCOPE TO CONTROL, NOT DOCUMENT!
    private _getAgGridViewport(): HTMLElement | null {
        return document.querySelector('.ag-body-vertical-scroll-viewport');
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

    private _getColumnNameFromGanttField(ganttField: string): string | null {
        switch (ganttField) {
            case 'startDate': return this._datasetControl.getNativeColumns().startDate!;
            case 'endDate': return this._datasetControl.getNativeColumns().endDate!;
            default: return null;
        }
    }

    private _zoomToTasks(taskIds: string[]) {
        const tasks = taskIds.map(id => this._store.getById(id)) as TaskModel[];
        if (!tasks.length) return;

        const startDate = new Date(Math.min(...tasks.map(t => new Date(t.startDate).getTime())));
        const endDate = new Date(Math.max(...tasks.map(t => new Date(t.endDate).getTime())));

        this._getGanttInstance().zoomToSpan({ startDate, endDate });
    }
}