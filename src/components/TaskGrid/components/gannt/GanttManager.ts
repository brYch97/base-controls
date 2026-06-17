import { Gantt, GanttStatic, Task } from 'dhtmlx-gantt';
import { ITaskGridDatasetControl } from '../..';
import { ITaskDataProvider } from '../../providers';
import { IColumn, IRawRecord, IRecord } from '@talxis/client-libraries';
import { IGanttGridBridge } from "../../bridges/GanttGridBridge";
import dayjs from 'dayjs';
import { GanttDragging, IGanttDragging } from './GanttDragging';
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
    private static readonly _outsideLabelWidthThreshold = 96;
    private _datasetControl: ITaskGridDatasetControl;
    private _dataProvider: ITaskDataProvider;
    private _bridge: IGanttGridBridge;
    private _dragging: IGanttDragging;
    private _zooming: IGanttZooming;
    private _dates: GanttDates;
    private _gantt: GanttStatic;
    private _expandedNodeSet: Set<string> = new Set();
    private _selectionAnchorTaskId: string | null = null;


    constructor(params: IGanttManagerParams) {
        this._gantt = Gantt.getGanttInstance();
        this._gantt.config.project_start_date = new Date(2000, 0, 1);
        this._gantt.config.project_end_date = new Date(2100, 11, 31);
        this._datasetControl = params.datasetControl;
        this._dataProvider = this._datasetControl.getDataProvider();
        this._bridge = this._datasetControl.ganttGridBridge;
        this._dates = new GanttDates({ datasetControl: this._datasetControl });
        this._dragging = new GanttDragging({ datasetControl: this._datasetControl, gantt: this._gantt, dates: this._dates });
        this._zooming = new GanttZooming({ datasetControl: this._datasetControl, gantt: this._gantt, dates: this._dates });
    }

    public init(params: IInitParams) {
        this._gantt.config.show_grid = false;
        this._gantt.config.select_task = false;
        this._gantt.config.details_on_dblclick = false;
        this._gantt.config.row_height = this._datasetControl.getParameters().RowHeight?.raw ?? 42;
        this._gantt.templates.task_row_class = (_start, _end, task) => this._getTaskRowClass(task);
        this._gantt.templates.task_class = (_start, _end, task) => this._getTaskClass(task);
        this._gantt.templates.task_text = (start, end, task) => this._getTaskInnerText(start, end, task);
        this._gantt.templates.leftside_text = (start, end, task) => this._getTaskOutsideLeftText(start, end, task);
        this._gantt.init(params.container);
        console.log(this._datasetControl.getProjectDataProvider());
        this._registerEventListeners();
    }

    public getGanttInstance() {
        return this._gantt;
    }

    private _registerEventListeners() {
        this._dataProvider.addEventListener('onNewDataLoaded', () => this._loadTasksToGantt());
        this._dataProvider.addEventListener('onAfterRecordSaved', (result) => this._syncRecordChangeFromOutside(this._dataProvider.getRecordsMap()[result.recordId]));
        this._dataProvider.taskEvents.addEventListener('onTaskDataUpdated', (data) => this._syncRawDataChangeFromOutside(data));
        this._dataProvider.taskEvents.addEventListener('onAfterTaskMoved', () => this._loadTasksToGantt());
        this._dataProvider.taskEvents.addEventListener('onAfterTasksCreated', () => this._loadTasksToGantt());
        this._dataProvider.taskEvents.addEventListener('onAfterTasksDeleted', () => this._loadTasksToGantt());
        this._bridge.addEventListener('onAgGridRowExpanded', (taskId) => this._onAgGridTaskExpanded(taskId));
        this._bridge.addEventListener('onAgGridRowCollapsed', (taskId) => this._onAgGridTaskCollapsed(taskId));
        this._bridge.addEventListener('onAgGridScrolled', (scrollTop) => this._onAgGridScrolled(scrollTop));
        this._getScrollingContainer().addEventListener('scroll', (event) => this._bridge.dispatchEvent('onGanttScrolled', (event.target as Element).scrollTop));
        this._gantt.attachEvent('onTaskMultiSelect', (id: string) => this._onRecordSelectedFromGantt(id));
        this._gantt.attachEvent('onTaskClick', (id: string, e?: MouseEvent) => {
            this._onRecordSelectedFromGantt(id, e);
            return true;
        });
        this._gantt.attachEvent('onTaskDblClick', (id: string, e?: MouseEvent) => this._onTaskDblClick(id, e));
    }

    private _onTaskDblClick(taskId: string, event?: MouseEvent) {
        this._dataProvider.openTaskItems([taskId]);
        return false;
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

    private _getTaskInnerText(start: Date, end: Date, task: Task) {
        return this._shouldRenderTaskLabelOutside(start, end) ? '' : task.text;
    }

    private _getTaskOutsideLeftText(start: Date, end: Date, task: Task) {
        return this._shouldRenderTaskLabelOutside(start, end) ? task.text : '';
    }

    private _shouldRenderTaskLabelOutside(start: Date, end: Date) {
        const width = this._gantt.posFromDate(end) - this._gantt.posFromDate(start);
        return width > 0 && width < GanttManager._outsideLabelWidthThreshold;
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

    private _onAgGridScrolled(scrollTop: number) {
        // Skip when already aligned. Setting the same scroll position would emit a
        // redundant scroll event that bounces back through the bridge, so this
        // short-circuit breaks any echo loop regardless of suppression timing.
        if (this._gantt.getScrollState()?.y === scrollTop) {
            return;
        }
        this._gantt.scrollTo(undefined, scrollTop);
    }

    private _loadTasksToGantt() {
        // The gantt's current open-state is what is actually in sync with the grid
        // (it is driven by the grid's live expand/collapse events). Snapshot it so a
        // reload preserves it instead of recomputing from defaults, which would
        // collapse groups the grid still shows expanded.
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

    private _convertRecordToTask(record: IRecord): Task {
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
            progress: this._getPercentComplete(record),
            parent: this._dataProvider.isFlatListEnabled() ? undefined : parent?.id?.guid,
            active: record.isActive(),
            open: this.isTaskExpandedByDefault(record.getRecordId()),
        };
    }

    private _getPercentComplete(record: IRecord): number {
        const percentCompleteColName = this._datasetControl.getNativeColumns().percentComplete;
        if (!percentCompleteColName) {
            return 0;
        }
        return (record.getValue(percentCompleteColName) ?? 0) / 100;
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
        // Persist intent even if the task is not currently rendered, so it opens
        // when it next loads. Only call open() when a state change is actually
        // needed to avoid redundant work and re-render churn.
        this._expandedNodeSet.add(taskId);
        if (this._gantt.isTaskExists(taskId) && !this._gantt.getTask(taskId).$open) {
            this._gantt.open(taskId);
        }
    }

    private _onAgGridTaskCollapsed(taskId: string) {
        this._expandedNodeSet.delete(taskId);
        if (this._gantt.isTaskExists(taskId) && this._gantt.getTask(taskId).$open) {
            this._gantt.close(taskId);
        }
    }

    private _getScrollingContainer(): Element {
        // Scope to this gantt instance's root so multiple TaskGrids on the same
        // page don't bind to or scroll each other's timeline container.
        const container = this._gantt.$root?.querySelector('.gantt_data_area');
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