import { Grid, TaskStore, Gantt } from "@bryntum/gantt";
import { ITaskGridDatasetControl } from "../..";
import { IDeleteTasksResult, ITaskDataProvider } from "../../data-providers";
import { TaskModel } from "./TaskModel";
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

    constructor(params: IGanntManagerParams) {
        this._store = new TaskStore();
        this._datasetControl = params.datasetControl;
        this._dataProvider = this._datasetControl.getDataProvider();
        this._registerEventListeners();
        if (!this._dataProvider.isLoading()) {
            this._loadDataToStore();
        };
    }

    public getStore(): TaskStore {
        return this._store;
    }

    public onRetrieveGanntInstance(gannt: Gantt) {
        this._gantt = gannt;
        this._gantt.on('scroll', (e: any) => {
            this._syncVerticalScroll(e.scrollTop);
        });

    }

    private _getGanttInstance(): Gantt {
        if (!this._gantt) {
            throw new Error("Gantt instance is not available yet");
        }
        return this._gantt;
    }

    private _registerEventListeners() {
        this._dataProvider.addEventListener('onNewDataLoaded', () => this._loadDataToStore());
        this._dataProvider.taskEvents.addEventListener('onTaskExpanded', (taskId) => this._onTaskExpanded(taskId));
        this._dataProvider.taskEvents.addEventListener('onTaskCollapsed', (taskId) => this._onTaskCollapsed(taskId));
        this._dataProvider.taskEvents.addEventListener('onAfterTasksCreated', (tasks) => this._addTasksToStore(tasks));
        this._dataProvider.taskEvents.addEventListener('onAfterTasksDeleted', (tasks) => this._removeTasksFromStore(tasks));
        this._dataProvider.addEventListener('onAfterRecordSaved', (result) => this._syncChangesFromOutside(result));
        this._store.on('update', (obj: any) => console.log(obj))

    }

    private _syncChangesFromOutside(result: IRecordSaveOperationResult) {
        if (result.success) {
            //update everything => delete any add again or global update?
            const taskInStore = this._store.getById(result.recordId);
            if (!taskInStore) return;
            taskInStore.set(this._convertRecordToTask(this._dataProvider.getRecordsMap()[result.recordId]));
        }
    }

    //TODO: this could go wrong when adding multiple tasks at once
    //make sure that the order of tasks in the array is correct (parents before children) or implement a more robust way of adding tasks (e.g. by traversing the tree and adding nodes recursively)
    private _addTasksToStore(tasks: IRawRecord[] | null) {
        if (!tasks) {
            return;
        }
        for (const task of tasks) {
            const taskId = task[this._dataProvider.getMetadata().PrimaryIdAttribute];
            const record = this._dataProvider.getRecordsMap()[taskId];
            const parentId = record.getValue(this._dataProvider.getNativeColumns().parentId)?.[0].id.guid;
            if (parentId) {
                const taskInStore = this._store.getById(parentId);
                if (!taskInStore) {
                    throw new Error(`Parent task with id ${parentId} not found in the store`);
                }
                const children: any = taskInStore.children || [];
                taskInStore.insertChild(this._convertRecordToTask(record), children[0]);
            }
            else {
                this._store.insert(0, this._convertRecordToTask(record));
            }
        }
    }

    private _removeTasksFromStore(result: IDeleteTasksResult | null) {
        if (!result) return;
        this._store.remove(result.deletedTaskIds);
    }

    private _onTaskExpanded(taskId: string) {
        this._getGanttInstance().expand(taskId);
    }

    private _onTaskCollapsed(taskId: string) {
        this._getGanttInstance().collapse(taskId);
    }

    private _convertRecordToTask(record: IRecord): any {
        const node = this._dataProvider.getRecordTree().getNode(record.getRecordId());
        return {
            id: record.getRecordId(),
            name: record.getNamedReference().name,
            startDate: record.getValue(this._getStartDateColumn().name),
            endDate: record.getValue(this._getEndDateColumn().name),
            expanded: this.isNodeExpandedByDefault(record.getRecordId()),
            __dataProvider: this._dataProvider,
            ...(node?.directChildren?.length > 0 && {
                children: node.directChildren.map((child: IRecord) => this._convertRecordToTask(child))
            })
        };
    }

    private isNodeExpandedByDefault(recordId: string): boolean {
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
}