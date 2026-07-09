import { Formatting, IRecord } from '@talxis/client-libraries';
import debounce from 'debounce';
import { GanttStatic } from 'gantt-trial';
import { ITaskGridDatasetControl } from '../../../../interfaces';
import { ITaskDataProvider } from '../../../../providers';
import { IGanttDates } from '../GanttDates';
import { IGanttInfiniteTimeline } from '../GanttInfiniteTimeline';
import { IGanttExtension } from '../../GanttExtension';
import { ZoomingConfig } from './ZoomingConfig';
import { IGanttData } from '../GanttData';

export interface IGanttZooming {
    zoomToFit: () => void;
    isLevelWithDaysVisible: () => boolean;
}

interface IGanttZoomingParams {
    datasetControl: ITaskGridDatasetControl;
    gantt: GanttStatic;
    ganttData: IGanttData;
    ganttExtension: IGanttExtension;
    dates: IGanttDates;
    timeline: IGanttInfiniteTimeline;
}

interface IGanttScaleDefinition {
    unit: string;
    step?: number;
}

interface IGanttZoomLevelDefinition {
    scales?: IGanttScaleDefinition[];
}

interface IGanttZoomApi {
    _initialized: boolean;
    _exitFitMode: () => void;
    _setScaleDates: () => void;
    _setLevel: (levelIndex: number, anchorX: number) => void;
    _minColumnWidth: number;
    _maxColumnWidth: number;
    _widthStep: number | undefined;
    _handler: (event: IZoomWheelEvent) => void;
    getLevels: () => IGanttZoomLevelDefinition[];
    getCurrentLevel: () => number;
}

interface IZoomWheelEvent {
    clientX: number;
    deltaY: number;
    wheelDelta: number;
    preventDefault: () => void;
    stopPropagation: () => void;
}

export class GanttZooming implements IGanttZooming {
    private _zoomTickStep = 1;
    private __pendingAnchorDate: Date | undefined;
    private _scrollClearBlock = false;
    private _taskDataProvider: ITaskDataProvider;
    private _gantt: GanttStatic;
    private _ganttExtension: IGanttExtension;
    private _dates: IGanttDates;
    private _timeline: IGanttInfiniteTimeline;
    private _isMouseWheelZoom = false;
    private _formatting = Formatting.Get();
    private _ganttData: IGanttData;
    private _debouncedDisableScrollClearBlock: debounce.DebouncedFunction<() => void>;

    constructor(params: IGanttZoomingParams) {
        this._gantt = params.gantt;
        this._ganttExtension = params.ganttExtension;
        this._dates = params.dates;
        this._timeline = params.timeline;
        this._taskDataProvider = params.datasetControl.getDataProvider();
        this._ganttData = params.ganttData;
        this._debouncedDisableScrollClearBlock = debounce(this._disableScrollClearBlock, 100);

        this._gantt.ext.zoom.init(ZoomingConfig.getScrollZoomConfig(this._gantt, this._formatting.locale));
        this._initZoomTickStep();
        this._overrideWheelHandler();
        this._registerEventListeners();
    }

    public isLevelWithDaysVisible(): boolean {
        return this._gantt.ext.zoom.getCurrentLevel() > 4;
    }

    public zoomToFit() {
        const records = this._getZoomToFitRecords();
        if (!records.length || !this._gantt.$task) {
            return;
        }

        const { startDate, endDate } = this._dates.getStartEndDateFromRecords(records);
        if (!startDate || !endDate) {
            return;
        }

        const percent = this._findFitPercent(startDate, endDate);
        this._pendingAnchorDate = new Date(+startDate + (+endDate - +startDate) / 2);
        this._ganttExtension.setZoomLevel(percent);
        //this is not a typo, it really needs to be called twice to work properly, dont ask why, I have no idea
        this._setZoomPercent(percent);
        this._setZoomPercent(percent);
    }

    private _getZoomToFitRecords(): IRecord[] {
        const selectedRecordIds = this._taskDataProvider.getSelectedRecordIds();
        if (selectedRecordIds.length > 0) {
            return selectedRecordIds.map(recordId => this._taskDataProvider.getRecordsMap()[recordId])
        }
        else {
            return this._taskDataProvider.getRecordTree().getNode(null).allChildren;
        }
    }

    private get _pendingAnchorDate(): Date | undefined {
        return this.__pendingAnchorDate;
    }

    private set _pendingAnchorDate(date: Date | undefined) {
        if (date) {
            this._ganttExtension.setAnchorDate(date);
        }
        this.__pendingAnchorDate = date;
    }

    private _onDataParsed = (isFirstLoad: boolean) => {
        if (!isFirstLoad) return;
        const zoomLevel = this._ganttExtension.getZoomLevel();
        if (zoomLevel === undefined) {
            this.zoomToFit();
        }
        else {
            this._pendingAnchorDate = this._ganttExtension.getAnchorDate();
            this._ganttExtension.setZoomLevel(zoomLevel);
        }
    }

    private _initZoomTickStep() {
        const zoom = this._getZoomApi();
        const min = zoom._minColumnWidth ?? ZoomingConfig.scrollZoomMinColumnWidth;
        const max = zoom._maxColumnWidth ?? ZoomingConfig.scrollZoomMaxColumnWidth;
        const step = zoom._widthStep;
        const widthSlots = step ? Math.round((max - min) / step) + 1 : 1;
        const totalStates = zoom.getLevels().length * widthSlots;

        this._zoomTickStep = totalStates > 1 ? 100 / (totalStates - 1) : 100;
    }

    private _overrideWheelHandler() {
        const zoom = this._getZoomApi();
        zoom._handler = (event: IZoomWheelEvent) => {
            const zoomIn = (this._gantt.env.isFF ? -40 * event.deltaY : event.wheelDelta) > 0;
            const current = this._ganttExtension.getZoomLevel() ?? 0;
            const next = Math.max(0, Math.min(100, current + (zoomIn ? this._zoomTickStep : -this._zoomTickStep)));

            event.preventDefault();
            event.stopPropagation();

            this._pendingAnchorDate = this._getWheelAnchorDate(event.clientX);
            this._isMouseWheelZoom = true;
            this._ganttExtension.setZoomLevel(next);
            this._isMouseWheelZoom = false;
        };
    }

    private _getWheelAnchorDate(clientX: number): Date {
        const taskArea = this._gantt.$task;
        if (!taskArea) {
            return this._getStableZoomAnchorDate(this._getDefaultAnchorX());
        }

        const anchorX = clientX - taskArea.getBoundingClientRect().x;
        const scrollX = this._gantt.getScrollState().x;
        return this._gantt.dateFromPos(scrollX + anchorX);
    }

    private _setZoomPercent(percent: number) {
        const zoom = this._getZoomApi();
        if (!zoom._initialized) {
            return;
        }

        const levels = zoom.getLevels();
        if (!levels.length) {
            return;
        }

        const clampedPercent = Math.max(0, Math.min(100, percent));
        const anchorX = this._getZoomAnchorX();
        const anchorDate = this._getStableZoomAnchorDate(anchorX);
        const minColumnWidth = zoom._minColumnWidth;
        const maxColumnWidth = zoom._maxColumnWidth;
        const widthStep = zoom._widthStep;

        this._setScrollClearBlock();
        this._timeline.shrink({ date: anchorDate });

        if (!widthStep) {
            const levelIndex = Math.round((clampedPercent / 100) * (levels.length - 1));
            zoom._exitFitMode();
            zoom._setLevel(levelIndex, anchorX);
            return;
        }

        const widthSlots = Math.round((maxColumnWidth - minColumnWidth) / widthStep) + 1;
        const totalStates = levels.length * widthSlots;
        const stateIndex = Math.round((clampedPercent / 100) * (totalStates - 1));
        const levelIndex = Math.floor(stateIndex / widthSlots);
        const widthIndex = stateIndex % widthSlots;

        zoom._exitFitMode();
        zoom._setScaleDates();
        this._gantt.config.min_column_width = minColumnWidth + widthIndex * widthStep;
        zoom._setLevel(levelIndex, anchorX);

        if (!this._isMouseWheelZoom) {
            const scrollState = this._gantt.getScrollState();
            const viewportWidth = this._gantt.$task?.offsetWidth ?? 0;
            const nextLeft = Math.max(0, this._gantt.posFromDate(anchorDate) - viewportWidth / 2);
            this._gantt.scrollTo(nextLeft, scrollState.y);
        }
    }

    private _findFitPercent(startDate: Date, endDate: Date): number {
        const zoom = this._getZoomApi();
        const levels = zoom.getLevels();
        const viewportWidth = this._gantt.$task?.offsetWidth ?? 0;
        const offset = 5;

        if (!viewportWidth || !levels.length) {
            return 0;
        }

        const widthSlots = zoom._widthStep ? Math.round((zoom._maxColumnWidth - zoom._minColumnWidth) / zoom._widthStep) + 1 : 1;
        const totalStates = levels.length * widthSlots;

        for (let stateIndex = totalStates - 1; stateIndex >= 0; stateIndex--) {
            const levelIndex = Math.floor(stateIndex / widthSlots);
            const widthIndex = stateIndex % widthSlots;
            const columnWidth = zoom._minColumnWidth + widthIndex * (zoom._widthStep ?? 0);
            const finestScale = this._getFinestScale(levels[levelIndex]);

            if (!finestScale) {
                continue;
            }

            const columnCount = this._countColumnsInRange(startDate, endDate, finestScale.unit, finestScale.step);
            if (columnCount * columnWidth <= viewportWidth) {
                const percent = totalStates > 1 ? (stateIndex / (totalStates - 1)) * 100 : 100;
                return Math.max(0, percent - offset);
            }
        }

        return 0;
    }

    private _getFinestScale(level: IGanttZoomLevelDefinition): { unit: string; step: number } | null {
        if (!level.scales?.length) {
            return null;
        }

        const unitOrder = ['hour', 'day', 'week', 'month', 'quarter', 'year'];
        let finestScale: { unit: string; step: number } | null = null;

        for (const scale of level.scales) {
            if (!finestScale
                || unitOrder.indexOf(scale.unit) < unitOrder.indexOf(finestScale.unit)
                || (scale.unit === finestScale.unit && (scale.step ?? 1) < finestScale.step)) {
                finestScale = { unit: scale.unit, step: scale.step ?? 1 };
            }
        }

        return finestScale;
    }

    private _countColumnsInRange(start: Date, end: Date, unit: string, step: number): number {
        const millisecondsPerUnit: Record<string, number> = {
            minute: 60_000,
            hour: 3_600_000,
            day: 86_400_000,
            week: 604_800_000,
        };

        if (millisecondsPerUnit[unit]) {
            return Math.ceil((end.getTime() - start.getTime()) / (step * millisecondsPerUnit[unit]));
        }

        let current = new Date(start);
        let count = 0;
        while (current < end && count < 10_000) {
            current = this._gantt.date.add(current, step, unit as never);
            count++;
        }

        return count;
    }

    private _jumpToToday() {
        const today = new Date();
        if (today > this._gantt.config.end_date! || today < this._gantt.config.start_date!) {
            this._timeline.shrink({ date: today });
        }

        this._gantt.showDate(today);
    }

    private _onHorizontalScroll(left: number) {
        if (this._scrollClearBlock) return;
        this._clearZoomAnchors();
    }

    private _setScrollClearBlock() {
        this._scrollClearBlock = true;
        this._debouncedDisableScrollClearBlock.clear();
        this._debouncedDisableScrollClearBlock();
    }

    private _disableScrollClearBlock = () => {
        this._scrollClearBlock = false;
    }

    private _getZoomAnchorX(): number {
        const anchorDate = this._pendingAnchorDate;
        if (!anchorDate) {
            return this._getDefaultAnchorX();
        }

        const scrollX = this._gantt.getScrollState().x;
        const viewportWidth = this._gantt.$task?.offsetWidth ?? 0;
        const anchorX = this._gantt.posFromDate(anchorDate) - scrollX;

        return Math.max(0, Math.min(viewportWidth, anchorX));
    }

    private _getDefaultAnchorX(): number {
        return (this._gantt.$task?.offsetWidth ?? 0) / 2;
    }

    private _getStableZoomAnchorDate(anchorX: number): Date {
        const anchorDate = this._pendingAnchorDate;
        if (anchorDate) {
            return anchorDate;
        }

        const scrollX = this._gantt.getScrollState().x;
        const nextAnchorDate = this._gantt.dateFromPos(scrollX + anchorX);
        this._pendingAnchorDate = nextAnchorDate;
        return nextAnchorDate;
    }

    private _clearZoomAnchors() {
        this._pendingAnchorDate = undefined;
    }


    private _onMouseMove = (event: MouseEvent) => {
        //if mouse is moved with ctrl key held, clear the zoom anchords
        if (event.ctrlKey) {
            this._clearZoomAnchors();
        }
    }

    private _onKeyDown = (event: KeyboardEvent) => {
        //if ctrl key is pressed, clear the zoom anchors
        if (event.ctrlKey) {
            this._clearZoomAnchors();
        }
    }

    private _onDestroy() {
        this._debouncedDisableScrollClearBlock.clear();
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('mousemove', this._onMouseMove);
    }


    private _getZoomApi(): typeof this._gantt.ext.zoom & IGanttZoomApi {
        return this._gantt.ext.zoom as typeof this._gantt.ext.zoom & IGanttZoomApi;
    }
    private _registerEventListeners() {
        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('mousemove', this._onMouseMove);
        this._ganttData.events.addEventListener('onDataParsed', (isFirstLoad) => this._onDataParsed(isFirstLoad));
        this._ganttExtension.events.addEventListener('onJumpToTodayRequested', () => this._jumpToToday());
        this._ganttExtension.events.addEventListener('onZoomToFitRequested', () => this.zoomToFit());
        this._ganttExtension.events.addEventListener('onZoomLevelChanged', (value) => this._setZoomPercent(value));
        this._taskDataProvider.addEventListener('onDestroyed', () => this._onDestroy());
        this._gantt.attachEvent('onGanttScroll', (left: number) => {
            this._onHorizontalScroll(left);
            return true;
        });
    }
}
