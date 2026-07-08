import { Gantt, GanttStatic, Task } from 'gantt-trial';
import debounce from 'debounce';
import { ITaskGridDatasetControl } from '../../../interfaces';
import { ITaskDataProvider } from '../../../providers';
import { EventEmitter, IEventEmitter } from '@talxis/client-libraries';
import { IGanttExtension } from '../GanttExtension';
import { GanttDragging, IGanttDragging } from './GanttDragging';
import { GanttDates, IGanttDates } from './GanttDates';
import { GanttInfiniteTimeline, IGanttInfiniteTimeline } from './GanttInfiniteTimeline';
import { GanttMarkers, IGanttMarkers } from './GanttMarkers';
import { GanttZooming, IGanttZooming } from './zooming';
import { GanttSelection, IGanttSelection } from './GanttSelection';
import { GanttData, IGanttData } from './GanttData';
import {
    GANTT_DATA_AREA_CLASS,
    GANTT_ROW_INACTIVE_CLASS,
    GANTT_SELECTED_ROW_CLASS,
    GANTT_TASK_SELECTED_CLASS,
    GANTT_TASK_SUMMARY_CLASS,
    WEEKEND_CLASS,
} from './classNames';


interface IInitParams {
    container: HTMLDivElement;
}

interface IGanttManagerParams {
    datasetControl: ITaskGridDatasetControl;
    ganttExtension: IGanttExtension;
}

export interface IGanttManagerEvents {
    onInit: () => void;
}

export interface IGanttManager {
    events: IEventEmitter<IGanttManagerEvents>;
    init: (params: IInitParams) => void;
    getDates: () => IGanttDates;
    getDragging: () => IGanttDragging;
    getMarkers: () => IGanttMarkers;
    getGanttInstance: () => GanttStatic;
    getTimeline: () => IGanttInfiniteTimeline;
    destroy: () => void;
}

export class GanttManager implements IGanttManager {
    private static readonly _taskClickDelayMs = 200;

    public events: IEventEmitter<IGanttManagerEvents> = new EventEmitter();
    private _datasetControl: ITaskGridDatasetControl;
    private _dataProvider: ITaskDataProvider;
    private _ganttExtension: IGanttExtension;
    private _expandedNodeSet: Set<string> = new Set();
    private _debouncedToggleTaskExpansion: debounce.DebouncedFunction<(taskId: string) => void>;
    private _dragging: IGanttDragging;
    private _zooming: IGanttZooming;
    private _timeline: IGanttInfiniteTimeline;
    private _markers: IGanttMarkers;
    private _selection: IGanttSelection;
    private _data: IGanttData;
    private _dates: IGanttDates;
    private _gantt: GanttStatic;

    constructor(params: IGanttManagerParams) {
        this._datasetControl = params.datasetControl;
        this._ganttExtension = params.ganttExtension;
        this._dataProvider = this._datasetControl.getDataProvider();
        this._gantt = Gantt.getGanttInstance();

        this._gantt.plugins({
            drag_timeline: true,
            marker: true
        });
        this._debouncedToggleTaskExpansion = debounce((taskId: string) => this._toggleTaskExpansion(taskId), GanttManager._taskClickDelayMs);

        this._dates = new GanttDates({ datasetControl: this._datasetControl });
        this._timeline = new GanttInfiniteTimeline({ gantt: this._gantt });
        this._dragging = new GanttDragging({ datasetControl: this._datasetControl, gantt: this._gantt, dates: this._dates });
        this._zooming = new GanttZooming({ datasetControl: this._datasetControl, gantt: this._gantt, ganttExtension: this._ganttExtension, dates: this._dates, timeline: this._timeline });
        this._data = new GanttData({
            datasetControl: this._datasetControl,
            gantt: this._gantt,
            dates: this._dates,
            expandedNodeSet: this._expandedNodeSet,
        });
        this._markers = new GanttMarkers({ datasetControl: this._datasetControl, gantt: this._gantt, dates: this._dates, ganttExtension: this._ganttExtension });
        this._selection = new GanttSelection({ gantt: this._gantt, dataProvider: this._dataProvider });
    }

    public init(params: IInitParams) {
        this._gantt.config.show_grid = false;
        this._gantt.config.select_task = false;
        this._gantt.config.task_scroll_offset = 200;
        this._gantt.config.details_on_dblclick = false;
        this._gantt.config.show_links = false;
        this._gantt.config.drag_links = false;
        this._gantt.config.static_background = true;
        this._gantt.config.scale_height = 43;
        this._gantt.config.scroll_size = 14;
        this._gantt.config.show_tasks_outside_timescale = true;
        this._gantt.config.row_height = this._datasetControl.getParameters().RowHeight?.raw ?? 42;
        this._setUpLayout();
        this._setUpClasses();
        this._setUpWeekendVisibility();
        this._gantt.init(params.container);
        this._registerEventListeners();
        this.events.dispatchEvent('onInit');
    }

    private _setUpLayout() {
        this._gantt.config.layout = {
            css: 'gantt_container',
            rows: [
                {
                    cols: [
                        { view: 'timeline', scrollX: 'scrollHor', scrollY: 'scrollVer' },
                        { view: 'scrollbar', id: 'scrollVer' },
                    ],
                },
                { view: 'scrollbar', id: 'scrollHor', height: 20 },
            ],
        };
    }

    public getGanttInstance() {
        return this._gantt;
    }

    public getMarkers() {
        return this._markers;
    }

    public getDragging() {
        return this._dragging;
    }

    public getDates() {
        return this._dates;
    }

    public getTimeline() {
        return this._timeline;
    }

    public destroy() {
        this._debouncedToggleTaskExpansion.clear();
        this._selection.destroy();
        this._zooming.destroy();
        this._gantt.destructor();
    }

    private _registerEventListeners() {
        this._ganttExtension.events.addEventListener('onShowWeekendsChanged', () => this._onShowWeekendsRequested());
        this._ganttExtension.events.addEventListener('onAgGridRowExpanded', (taskId) => this._setTaskExpanded(taskId, true));
        this._ganttExtension.events.addEventListener('onAgGridRowCollapsed', (taskId) => this._setTaskExpanded(taskId, false));
        this._ganttExtension.events.addEventListener('onAgGridScrolled', (scrollTop) => this._onAgGridScrolled(scrollTop));
        this._gantt.$scroll_ver.addEventListener('scroll', (event) => this._onGanttScrolled((event.target as Element).scrollTop));
        this._gantt.attachEvent('onTaskClick', (id: string, e?: MouseEvent) => this._onTaskClick(id, e));
        this._gantt.attachEvent('onTaskDblClick', (id: string, e?: MouseEvent) => this._onTaskDblClick(id, e));
    }

    private _setUpWeekendVisibility() {
        const showWeekends = this._ganttExtension.isWeekendVisible();
        this._gantt.ignore_time = (date) => {
            return !showWeekends && this._isWeekend(date) && this._zooming.isLevelWithDaysVisible();
        }
    }

    private _onShowWeekendsRequested() {
        this._setUpWeekendVisibility();
        this._gantt.render();
    }

    private _setUpClasses() {
        this._gantt.templates.timeline_cell_class = (task, date) => this._getWeekendClass(date);
        this._gantt.templates.task_row_class = (_start, _end, task) => this._getTaskRowClass(task);
        this._gantt.templates.task_class = (_start, _end, task) => this._getTaskClass(task);
        this._gantt.templates.task_text = (start, end, task) => this._getTaskInnerText(start, end, task);
        this._gantt.templates.leftside_text = (start, end, task) => this._getTaskOutsideLeftText(start, end, task);
    }


    private _getWeekendClass(date: Date): string | undefined {
        const showWeekends = this._ganttExtension.isWeekendVisible();
        return showWeekends && this._isWeekend(date) && this._zooming.isLevelWithDaysVisible() ? WEEKEND_CLASS : undefined;
    }

    private _isWeekend(date: Date) {
        return date.getDay() === 0 || date.getDay() === 6;
    }

    private _onTaskDblClick(taskId: string, event?: MouseEvent) {
        this._debouncedToggleTaskExpansion.clear();
        this._dataProvider.openTaskItems([taskId]);
        return false;
    }

    private _onTaskClick(taskId: string, event?: MouseEvent) {
        this._debouncedToggleTaskExpansion.clear();
        this._debouncedToggleTaskExpansion(taskId);

        return true;
    }

    private _setTaskExpanded(taskId: string, expanded: boolean) {
        if (expanded) {
            this._expandedNodeSet.add(taskId);
        } else {
            this._expandedNodeSet.delete(taskId);
        }

        if (!this._gantt.isTaskExists(taskId)) {
            return;
        }

        const task = this._gantt.getTask(taskId);
        if (expanded && !task.$open) {
            this._gantt.open(taskId);
        }
        if (!expanded && task.$open) {
            this._gantt.close(taskId);
        }
    }

    private _toggleTaskExpansion(taskId: string) {
        const isExpanded = !!this._gantt.getTask(taskId).$open;
        if (isExpanded) {
            this._setTaskExpanded(taskId, false);
            this._ganttExtension.events.dispatchEvent('onGanttTaskCollapsed', taskId);
            return;
        }

        this._setTaskExpanded(taskId, true);
        this._ganttExtension.events.dispatchEvent('onGanttTaskExpanded', taskId);
    }

    private _getTaskRowClass(task: Task) {
        const id = task.id as string;
        const classNames = [];
        if (!task.active) {
            classNames.push(GANTT_ROW_INACTIVE_CLASS);
        }
        if (this._dataProvider.getSelectedRecordIds().includes(id)) {
            classNames.push(GANTT_SELECTED_ROW_CLASS);
        }
        return classNames.join(' ');
    }

    private _getTaskClass(task: Task) {
        const id = task.id as string;
        const classNames = [];
        if (this._dataProvider.getRecordTree().hasChildren(id)) {
            classNames.push(GANTT_TASK_SUMMARY_CLASS);
        }
        if (this._dataProvider.getSelectedRecordIds().includes(id)) {
            classNames.push(GANTT_TASK_SELECTED_CLASS);
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
        this._gantt.$scroll_ver.scrollTop = scrollTop;
    }

    private _onGanttScrolled(scrollTop: number) {
        this._ganttExtension.events.dispatchEvent('onGanttScrolled', scrollTop);
    }
}