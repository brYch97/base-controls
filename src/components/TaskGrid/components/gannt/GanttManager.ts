import { Gantt, GanttStatic, Task } from 'gantt-trial';
import { ITaskGridDatasetControl } from '../..';
import { ITaskDataProvider } from '../../providers';
import { IColumn, IRawRecord, IRecord } from '@talxis/client-libraries';
import { IGanttGridBridge } from "../../bridges/GanttGridBridge";
import dayjs from 'dayjs';
import { GanttDragging, IGanttDragging } from './GanttDragging';
import { GanttDates } from './GanttDates';
import { GanttInfiniteTimeline, IGanttInfiniteTimeline } from './GanttInfiniteTimeline';
import { GanttMarkers, IGanttMarkers } from './GanttMarkers';
import { GanttZooming, IGanttZooming } from './zooming';
import { GanttSelection, IGanttSelection } from './GanttSelection';


interface IInitParams {
    container: HTMLDivElement;
}

interface IGanttManagerParams {
    datasetControl: ITaskGridDatasetControl;
}

export interface IGanttManager {
    init: (params: IInitParams) => void;
    getMarkers: () => IGanttMarkers;
    getGanttInstance: () => GanttStatic;
    destroy: () => void;
}

export class GanttManager implements IGanttManager {
    private static readonly _outsideLabelWidthThreshold = 96;
    private _datasetControl: ITaskGridDatasetControl;
    private _dataProvider: ITaskDataProvider;
    private _bridge: IGanttGridBridge;
    private _dragging: IGanttDragging;
    private _zooming: IGanttZooming;
    private _timeline: IGanttInfiniteTimeline;
    private _markers: IGanttMarkers;
    private _selection: IGanttSelection;
    private _dates: GanttDates;
    private _gantt: GanttStatic;
    private _expandedNodeSet: Set<string> = new Set();

    constructor(params: IGanttManagerParams) {
        this._datasetControl = params.datasetControl;
        this._dataProvider = this._datasetControl.getDataProvider();
        this._gantt = Gantt.getGanttInstance();
        this._bridge = this._datasetControl.ganttGridBridge;

        this._gantt.plugins({
            drag_timeline: true,
            marker: true
        });

        this._dates = new GanttDates({ datasetControl: this._datasetControl });
        this._timeline = new GanttInfiniteTimeline({ gantt: this._gantt });
        this._dragging = new GanttDragging({ datasetControl: this._datasetControl, gantt: this._gantt, dates: this._dates });
        this._zooming = new GanttZooming({ datasetControl: this._datasetControl, gantt: this._gantt, dates: this._dates, timeline: this._timeline });
        this._markers = new GanttMarkers({ datasetControl: this._datasetControl, gantt: this._gantt, dates: this._dates });
        this._selection = new GanttSelection({ gantt: this._gantt, dataProvider: this._dataProvider });
    }

    public init(params: IInitParams) {
        this._gantt.config.show_grid = false;
        this._gantt.config.select_task = false;
        this._gantt.config.details_on_dblclick = false;
        this._gantt.config.show_links = false;
        this._gantt.config.drag_links = false;
        this._gantt.config.static_background = true;
        this._gantt.config.scale_height = 43;
        this._gantt.config.show_tasks_outside_timescale = true;
        this._gantt.config.row_height = this._datasetControl.getParameters().RowHeight?.raw ?? 42;
        this._setUpClasses();
        this._setUpWeekendVisibility();
        this._gantt.init(params.container);
        this._registerEventListeners();
    }

    public getGanttInstance() {
        return this._gantt;
    }

    public getMarkers() {
        return this._markers;
    }

    public destroy() {
        this._selection.destroy();
        this._zooming.destroy();
    }

    private _registerEventListeners() {
        this._dataProvider.addEventListener('onNewDataLoaded', () => this._loadTasksToGantt());
        this._dataProvider.addEventListener('onAfterRecordSaved', (result) => this._syncRecordChangeFromOutside(this._dataProvider.getRecordsMap()[result.recordId]));
        this._dataProvider.taskEvents.addEventListener('onTaskDataUpdated', (data) => this._syncRawDataChangeFromOutside(data));
        this._dataProvider.taskEvents.addEventListener('onAfterTaskMoved', () => this._loadTasksToGantt());
        this._dataProvider.taskEvents.addEventListener('onAfterTasksCreated', () => this._loadTasksToGantt());
        this._dataProvider.taskEvents.addEventListener('onAfterTasksDeleted', () => this._loadTasksToGantt());
        this._bridge.addEventListener('onShowWeekendsChanged', () => this._onShowWeekendsRequested());
        this._bridge.addEventListener('onAgGridRowExpanded', (taskId) => this._onAgGridTaskExpanded(taskId));
        this._bridge.addEventListener('onAgGridRowCollapsed', (taskId) => this._onAgGridTaskCollapsed(taskId));
        this._bridge.addEventListener('onAgGridScrolled', (scrollTop) => this._onAgGridScrolled(scrollTop));
        this._getScrollingContainer().addEventListener('scroll', (event) => this._bridge.dispatchEvent('onGanttScrolled', (event.target as Element).scrollTop));
        this._gantt.attachEvent('onTaskDblClick', (id: string, e?: MouseEvent) => this._onTaskDblClick(id, e));
    }

    private _setUpWeekendVisibility() {
        const showWeekends = this._datasetControl.getShowWeekends();
        //this._gantt.config.work_time = !showWeekends;
        //this._gantt.config.skip_off_time = !showWeekends;
        this._gantt.ignore_time = (date) => {
            return !showWeekends && this._isWeekend(date);
        }
    }

    private _onShowWeekendsRequested() {
        this._setUpWeekendVisibility();
        this._gantt.render();
    }

    private _setUpClasses() {
        //this._gantt.templates.scale_cell_class = (date) => this._getScaleCellClass(date);
        this._gantt.templates.timeline_cell_class = (task, date) => this._getTimelineCellClass(date);
        this._gantt.templates.task_row_class = (_start, _end, task) => this._getTaskRowClass(task);
        this._gantt.templates.task_class = (_start, _end, task) => this._getTaskClass(task);
        this._gantt.templates.task_text = (start, end, task) => this._getTaskInnerText(start, end, task);
        this._gantt.templates.leftside_text = (start, end, task) => this._getTaskOutsideLeftText(start, end, task);
    }


    private _getTimelineCellClass(date: Date): string | undefined {
        return this._isWeekend(date) && this._zooming.isLevelWithDaysVisible() ? 'weekend' : undefined;
    }


    private _isWeekend(date: Date) {
        return date.getDay() === 0 || date.getDay() === 6;
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
        if (this._dataProvider.getRecordTree().hasChildren(id)) {
            classNames.push('gantt_task_summary');
        }
        if (this._dataProvider.getSelectedRecordIds().includes(id)) {
            classNames.push('gantt_task_selected');
        }
        return classNames.join(' ');
    }

    private _getTaskInnerText(start: Date, end: Date, task: Task) {
        return '';
    }

    private _getTaskOutsideLeftText(start: Date, end: Date, task: Task) {
        return task.text;
    }


    private _onAgGridScrolled(scrollTop: number) {
        if (this._gantt.getScrollState()?.y === scrollTop) {
            return;
        }
        this._gantt.scrollTo(undefined, scrollTop);
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

    private _convertRecordToTask(record: IRecord): Task {
        const parentColumnName = this._datasetControl.getNativeColumns().parentId;
        const parent: ComponentFramework.EntityReference | null = record.getValue(parentColumnName)?.[0];
        let startDate = this._dates.getDateFromString(record.getValue(this._dates.getStartDateColumnName()));
        let endDate = this._dates.getDateFromString(record.getValue(this._dates.getEndDateColumnName()));
        const isMilestone = !endDate;

        if (!startDate) {
            startDate = new Date();
        }
        if (!endDate && !isMilestone) {
            endDate = dayjs(startDate).add(7, 'day').toDate();
        }
        endDate ??= startDate;

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