import { BodyScrollEvent, ColDef as ColDefBase, GridApi as GridApiBase, IRowNode, IsServerSideGroupOpenByDefaultParams, RowClassRules as RowClassRulesBase, RowGroupOpenedEvent } from "@ag-grid-community/core";
import { IMoveTaskParameters, ITaskDataProvider } from "../../../providers/task";
import { DatasetConstants, IColumn, IRawRecord, IRecord } from "@talxis/client-libraries";
import { GridDragHandler, IDragOperation } from "../grid-drag-handler";
import { GroupCell } from "../group-cell";
import { TreeExpandCollapseHeader } from "../cell-headers/tree-expand-collapse-header";
import { AddTaskButton } from "../cell-renderers/add-task-button";
import { ILocalizationService } from "../../../../../utils";
import { ITaskGridLabels } from "../../../labels";
import { PERCENT_COMPLETE_CONTROL_NAME, PercentComplete } from "../cell-renderers/percent-complete";
import { INativeColumns, ITaskGridDatasetControl } from "../../../interfaces";
import { IGanttGridBridge } from "../../../bridges/GanttGridBridge";

export const ADD_TASK_COLUMN_NAME = 'addTask';

export type ColDef = ColDefBase<IRecord>;
export type GridApi = GridApiBase<IRecord>;
export type RowClassRules = RowClassRulesBase<IRecord>;


/** Strategy interface for deep customization of the AG Grid instance inside TaskGrid. */
export interface IGridCustomizerStrategy {
    /** Called once after the grid is ready. Use to call `customizer.registerExpressionDecorator` or perform other one-time setup. */
    onInitialize: (customizer: IGridCustomizer) => void;
    /** Receives the computed column definitions and may return a modified array. */
    onGetColumnDefinitions?: (columnDefs: ColDef[]) => ColDef[];
    /** Receives the default row class rules map and may return an extended or overridden version. */
    onGetRowClassRules?: (rules: RowClassRules) => RowClassRules;
}

/** Provides access to the AG Grid instance and the TaskGrid control to code running inside `IGridCustomizerStrategy`. */
export interface IGridCustomizer {
    /** Returns the underlying AG Grid `GridApi`. */
    getGridApi(): GridApi;
    /** Returns the `ITaskDataProvider` that backs the grid data layer. */
    getTaskDataProvider(): ITaskDataProvider;
    /** Returns the `ITaskGridDatasetControl` runtime control interface. */
    getDatasetControl(): ITaskGridDatasetControl;
    /**
     * Registers a column-expression decorator only when the given column exists in the current columns map.
     * Prevents errors when registering decorators for columns that may not be present in all views.
     */
    registerExpressionDecorator(columnName: string, registrator: () => void): void;
}

export interface IGridCustomizerParameters {
    gridApi: GridApi;
    datasetControl: ITaskGridDatasetControl;
    strategy?: IGridCustomizerStrategy;
}

export class GridCustomizer implements IGridCustomizer {
    private _taskDataProvider: ITaskDataProvider;
    private _gridApi: GridApi;
    private _gridDragHandler: GridDragHandler;
    private _localizationService: ILocalizationService<ITaskGridLabels>;
    private _nativeColumns: INativeColumns;
    private _pcfContext: ComponentFramework.Context<any>;
    private _datasetControl: ITaskGridDatasetControl;
    private _bridge: IGanttGridBridge;
    private _strategy?: IGridCustomizerStrategy;

    constructor(parameters: IGridCustomizerParameters) {
        this._datasetControl = parameters.datasetControl;
        this._bridge = this._datasetControl.ganttGridBridge;
        this._taskDataProvider = this._datasetControl.getDataProvider();
        this._gridApi = parameters.gridApi;
        this._localizationService = this._datasetControl.getLocalizationService();
        this._nativeColumns = this._datasetControl.getNativeColumns();
        this._strategy = parameters.strategy;
        this._pcfContext = this._datasetControl.getPcfContext();

        this._gridDragHandler = new GridDragHandler({
            gridApi: this._gridApi,
            datasetControl: this._datasetControl
        });
        this._patchGridApi();
        this._registerEventListeners();
        this._gridApi.setGridOption('rowClassRules', this._getRowClassRules());
        this._strategy?.onInitialize?.(this);
    }

    public getDatasetControl(): ITaskGridDatasetControl {
        return this._datasetControl;
    }

    public getGridApi(): GridApi {
        return this._gridApi;
    }

    public getTaskDataProvider(): ITaskDataProvider {
        return this._taskDataProvider;
    }

    //makes sure we do not try to register an expression for a column that does not exist
    public registerExpressionDecorator(columnName: string, registrator: () => void) {
        if (columnName && this._taskDataProvider.getColumnsMap()[columnName]) {
            registrator();
        }
    }

    private _patchGridApi() {
        const originalSetGridOption = this._gridApi.setGridOption.bind(this._gridApi);
        this._gridApi.setGridOption = (key: any, value: any): void => {
            switch (key) {
                case 'columnDefs': {
                    const columnDefs = this._getColumnDefinitions(value);
                    originalSetGridOption(key, columnDefs);
                    break;
                }
                case 'isServerSideGroupOpenByDefault': {
                    originalSetGridOption(key, (params: IsServerSideGroupOpenByDefaultParams) => this._isServerSideGroupOpenByDefault(params, (params) => value(params)));
                    break;
                }
                default: {
                    originalSetGridOption(key, value);
                }
            }
        }
    }

    private _isServerSideGroupOpenByDefault(params: IsServerSideGroupOpenByDefaultParams, defaultAction: (params: IsServerSideGroupOpenByDefaultParams) => boolean): boolean {
        if (!params.data || this._taskDataProvider.isFlatListEnabled()) {
            return false
        }
        const matchingRecords = this._taskDataProvider.getRecordTree().getMatchingRecords();
        const result = !matchingRecords[params.data.getRecordId()];
        if (result) {
            return result;
        }
        return defaultAction(params);
    }

    private _injectAddTaskColumn(columnDefs: ColDef[]) {
        if (!this._taskDataProvider.isFlatListEnabled() && !columnDefs.find(colDef => colDef.colId === ADD_TASK_COLUMN_NAME)) {
            columnDefs.push({
                colId: ADD_TASK_COLUMN_NAME,
                headerName: '',
                pinned: 'left',
                width: 50,
                resizable: false,
                lockPinned: true,
                lockPosition: true,
                suppressMovable: true,
                suppressSizeToFit: true,
                cellRenderer: AddTaskButton,
                headerComponent: TreeExpandCollapseHeader
            })
        }
    }

    private _getColumnDefinitions(columnDefs: ColDef[]) {
        this._injectAddTaskColumn(columnDefs);
        for (const colDef of columnDefs) {
            const columnName = colDef.colId as string;
            const column = this._taskDataProvider.getColumnsMap()[columnName];
            const customCellRenderer = this._getCustomControlForColumn('renderer', column);
            const customCellEditor = this._getCustomControlForColumn('editor', column);
            switch (columnName) {
                case this._nativeColumns.subject: {
                    colDef.cellRenderer = GroupCell;
                    colDef.pinned = 'left';
                    //if gantt
                    if (true) {
                        colDef.pinned = undefined;
                    }
                    break;
                }
                case DatasetConstants.CHECKBOX_COLUMN_KEY: {
                    colDef.lockPosition = true;
                    break;
                }
            }
            switch (customCellRenderer) {
                case PERCENT_COMPLETE_CONTROL_NAME: {
                    colDef.cellRenderer = PercentComplete;
                    break;
                }
            }
            switch (customCellEditor) {
                case PERCENT_COMPLETE_CONTROL_NAME: {
                    colDef.cellEditor = PercentComplete;
                    break;
                }
            }
        }

        columnDefs.sort((a, b) => this._getColumnPriority(a) - this._getColumnPriority(b));
        columnDefs = this._strategy?.onGetColumnDefinitions?.(columnDefs) ?? columnDefs;
        //gantt
        if (true) {
            columnDefs.map(colDef => colDef.autoHeight = false)
        }
        return columnDefs;

    }

    private _getCustomControlForColumn(role: 'editor' | 'renderer', column?: IColumn): string | null {
        const control = column?.controls?.find(c => c.appliesTo === role || c.appliesTo === 'both');
        return control?.name ?? null;
    }

    private _getColumnPriority(col: ColDef): number {
        if (col.colId === DatasetConstants.CHECKBOX_COLUMN_KEY) return 0;
        if (col.colId === ADD_TASK_COLUMN_NAME) return 1;
        if (col.field === this._nativeColumns.subject) return 2;
        return 3;
    }

    private _getRowClassRules(): RowClassRules {
        const rules: RowClassRules = {
            'talxis_task-grid_row--drag-over-middle': (params) => {
                return !!params.data?.isActive() && this._getNodeDragOverSection(params.node) === 'middle'
            },
            'talxis_task-grid_row--drag-over-top': (params) => {
                return this._getNodeDragOverSection(params.node) === 'top'
            },
            'talxis_task-grid_row--drag-over-bottom': (params) => {
                return this._getNodeDragOverSection(params.node) === 'bottom'
            },
            'talxis_task-grid_row--inactive': (params) => {
                return !params.data?.isActive()
            },
            'talxis_task-grid_row--unmatched-parent': (params) => {
                if (params.data) {
                    const matchingRecordsMap = this._taskDataProvider.getRecordTree().getMatchingRecords();
                    return !matchingRecordsMap[params.data!.getRecordId()]
                }
                else {
                    return false;
                }
            }
        }
        return this._strategy?.onGetRowClassRules?.(rules) ?? rules;
    }

    private _getPathToParent(node: IRowNode<IRecord> | null): string[] {
        const path: string[] = [];
        let parent = node?.parent;
        while (parent) {
            path.push(parent.id!);
            parent = parent.parent;
        }
        return path.filter(id => id).reverse();
    }

    //undefined means we should target top level
    private _onRecordTreeUpdated = (affectedIds: (string | undefined)[]) => {
        for (const id of affectedIds) {
            if (!id) {
                this._gridApi.refreshServerSide();
            }
            else {
                const node = this._gridApi.getRowNode(id)!;
                this._gridApi.refreshServerSide({
                    route: this._getPathToParent(node)
                });
                this._gridApi.refreshServerSide({
                    route: [...this._getPathToParent(node), id]
                })
            }
        }
        this._gridApi.refreshCells({
            columns: [this._nativeColumns.subject],
            force: true
        });
        this._taskDataProvider.requestRender();
    }

    private _getNodeDragOverSection(node: IRowNode<IRecord>): IDragOperation['dragOverSection'] | null {
        const pendingDragOperation = this._gridDragHandler.getPendingDragOperation();
        if (!pendingDragOperation) {
            return null;
        }
        else {
            const isCurrentNode = pendingDragOperation.overNode === node;
            const isDraggedNode = pendingDragOperation.draggedNode === pendingDragOperation.overNode;
            if (isCurrentNode && !isDraggedNode) {
                return pendingDragOperation.dragOverSection;
            }
            else {
                return null;
            }
        }
    }

    private async _onDragEnd(dragOperation: IDragOperation) {
        if (this._isDragOperationAllowed(dragOperation)) {
            this._moveTask(dragOperation);
        }
    }

    private _isDragOperationAllowed(dragOperation: IDragOperation): boolean {
        const { draggedNode, overNode } = dragOperation;
        // Check if either node is null/undefined
        if (!draggedNode || !overNode) {
            return false;
        }
        if (draggedNode === overNode) {
            return false;
        }
        if (!overNode.data?.isActive() && dragOperation.dragOverSection === 'middle') {
            return false;
        }

        let parent = overNode.parent;
        while (parent) {
            if (parent === draggedNode) {
                return false;
            }
            parent = parent.parent;
        }
        return true;
    }

    private async _moveTask(dragOperation: IDragOperation) {
        this._taskDataProvider.moveTask(this._getMoveTaskParameters(dragOperation));
    }

    private _getMoveTaskParameters(dragOperation: IDragOperation): IMoveTaskParameters {
        const { draggedNode, overNode, dragOverSection } = dragOperation;
        const movingTaskId = draggedNode.id!;
        const recordTree = this._taskDataProvider.getRecordTree();

        if (dragOverSection === 'middle') {
            const directChildren = recordTree.getNode(overNode.id!).directChildren
                .map((record) => record.getRecordId())
                .filter((recordId) => recordId !== movingTaskId);

            return {
                movingTaskId,
                movingToTaskId: overNode.id!,
                parentId: overNode.id!,
                newNextSiblingTaskId: directChildren[0],
            };
        }

        const parentId = overNode.parent?.id;
        const siblingIds = recordTree.getNode(parentId ?? null).directChildren
            .map((record) => record.getRecordId())
            .filter((recordId) => recordId !== movingTaskId);
        const overIndex = siblingIds.indexOf(overNode.id!);

        if (overIndex < 0) {
            throw new Error(`Could not resolve target sibling placement for task ${overNode.id}`);
        }

        if (dragOverSection === 'top') {
            return {
                movingTaskId,
                movingToTaskId: overNode.id!,
                parentId,
                newPreviousSiblingTaskId: siblingIds[overIndex - 1],
                newNextSiblingTaskId: overNode.id!,
            };
        }

        return {
            movingTaskId,
            movingToTaskId: overNode.id!,
            parentId,
            newPreviousSiblingTaskId: overNode.id!,
            newNextSiblingTaskId: siblingIds[overIndex + 1],
        };
    }

    private _moveInto(parameters: IMoveTaskParameters) {
        const { movingTaskId, parentId } = parameters;
        const draggedRecordNode = this._taskDataProvider.getRecordTree().getNode(movingTaskId);
        const draggedRecord = this._taskDataProvider.getRecordsMap()[movingTaskId];
        const draggedNode = this._gridApi.getRowNode(movingTaskId)!;
        const parentNode = parentId ? this._gridApi.getRowNode(parentId) ?? null : null;

        if (parentId && !parentNode) {
            throw new Error(`Could not find parent grid node for task ${parentId}`);
        }

        let addIndex: number | null = draggedRecordNode.index;

        //first remove from old location
        this._gridApi.applyServerSideTransaction({
            route: this._getPathToParent(draggedNode),
            remove: [draggedRecord],
        });

        //update the store where dragged parent node is (so the arrow can disappear if needed)
        this._gridApi.applyServerSideTransaction({
            route: this._getPathToParent(draggedNode.parent),
            update: [draggedNode.data],
        });

        if (parentNode) {
            //update the store where new parent node is (so the arrow can appear if needed)
            this._gridApi.applyServerSideTransaction({
                route: this._getPathToParent(parentNode),
                update: [parentNode.data],
            });
        }
        //then add to new location
        this._gridApi.applyServerSideTransaction({
            route: parentId ? [...this._getPathToParent(parentNode), parentId] : [],
            add: [draggedRecord],
            addIndex: addIndex !== null ? addIndex : undefined,
        });

        if (parentNode) {
            setTimeout(() => {
                parentNode.setExpanded(true);
            }, 0);
        }
        this._gridApi.refreshCells({
            columns: [this._nativeColumns.subject],
            force: true
        });
        this._taskDataProvider.clearSelectedRecordIds();
    }


    private _onAfterTasksCreated = (records: IRawRecord[] | null, parentId?: string) => {
        if (!records || records.length === 0) return;
        if (parentId) {
            const parentNode = this._gridApi.getRowNode(parentId);
            if (parentNode && !parentNode.expanded) {
                parentNode.setExpanded(true);
            }
        }
        setTimeout(() => {
            const primaryIdAttribute = this._taskDataProvider.getMetadata().PrimaryIdAttribute;
            const recordId = records[0][primaryIdAttribute] as string;
            const node = this._gridApi.getRowNode(recordId);
            if (!node) return;
            this._gridApi.ensureNodeVisible(node!);
            this._gridApi.setFocusedCell(node!.rowIndex!, this._nativeColumns.subject);
            /*             if (records.length === 1 && this._datasetControl.isInlineCreateEnabled()) {
                            const rowIndex = node.rowIndex!;
                            this._gridApi.startEditingCell({
                                rowIndex: rowIndex,
                                colKey: this._nativeColumns.subject
                            });
                        }
                        else {
                            this._gridApi.setFocusedCell(node!.rowIndex!, this._nativeColumns.subject);
                            this._gridApi.ensureNodeVisible(node!);
                        } */
        }, 100);
    }


    private _onAfterTaskDataUpdated = (newData: IRawRecord[]) => {
        const recordIdsSet = new Set(newData.map(item => item[this._taskDataProvider.getMetadata().PrimaryIdAttribute]));
        const nodes = this._gridApi.getRenderedNodes().filter(node => recordIdsSet.has(node.id!));
        this._gridApi.refreshCells({
            rowNodes: nodes,
            force: true
        })
    }


    private _registerEventListeners() {
        this._taskDataProvider.taskEvents.addEventListener('onAfterTaskMoved', (parameters) => this._moveInto(parameters));
        this._taskDataProvider.taskEvents.addEventListener('onAfterTasksCreated', (records, parentId) => this._onAfterTasksCreated(records, parentId));
        this._taskDataProvider.taskEvents.addEventListener('onRecordTreeUpdated', (updatedParentIds) => this._onRecordTreeUpdated(updatedParentIds));
        this._taskDataProvider.taskEvents.addEventListener('onTaskDataUpdated', (newData) => this._onAfterTaskDataUpdated(newData));
        this._getAgGridVerticalViewport()?.addEventListener('scroll', (event) => this._onAgGridScrolled((event.target as Element).scrollTop));
        this._gridApi.addEventListener('rowGroupOpened', (event: RowGroupOpenedEvent) => this._onRowGroupOpened(event));
        this._gridDragHandler.addEventListener('onDragEnd', (dragOperation) => this._onDragEnd(dragOperation));
        this._bridge.addEventListener('onGanttScrolled', (scrollTop) => this._onGanttScrolled(scrollTop));
        this._bridge.addEventListener('onGanttTaskExpanded', (taskId) => this._onGanttRowExpanded(taskId));
        this._bridge.addEventListener('onGanttTaskCollapsed', (taskId) => this._onGanttRowCollapsed(taskId));
    }

    private _onGanttScrolled(scrollTop: number) {
        const viewport = this._getAgGridVerticalViewport();
        viewport.scrollTo({
            top: scrollTop,
            behavior: 'instant'
        });
    }

    private _onAgGridScrolled(scrollTop: number) {
        this._bridge.dispatchEvent('onAgGridScrolled', scrollTop);
    }

    private _onGanttRowExpanded(taskId: string) {
        const node = this._gridApi.getRowNode(taskId);
        // Only toggle when the state actually differs; setExpanded re-fires
        // rowGroupOpened, which would bounce back through the bridge.
        if (node && !node.expanded) {
            node.setExpanded(true);
        }
    }

    private _onGanttRowCollapsed(taskId: string) {
        const node = this._gridApi.getRowNode(taskId);
        if (node && node.expanded) {
            node.setExpanded(false);
        }
    }


    private _getAgGridVerticalViewport(): HTMLElement {
        const rootElement = document.getElementById(this._datasetControl.getControlId() + '-root');
        const viewPort = rootElement?.querySelector('.ag-body-viewport') ?? null;
        if (!viewPort) {
            throw new Error('AgGrid vertical viewport not found');
        }
        return viewPort as HTMLElement;
    }

    private _onRowGroupOpened(event: RowGroupOpenedEvent) {
        if (event.expanded) {
            this._bridge.dispatchEvent('onAgGridRowExpanded', event.node.id!);
        } else {
            this._bridge.dispatchEvent('onAgGridRowCollapsed', event.node.id!);
        }
    }
}