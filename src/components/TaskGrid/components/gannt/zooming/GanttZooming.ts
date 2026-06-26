import { Formatting } from '@talxis/client-libraries';
import debounce from 'debounce';
import { GanttStatic } from 'gantt-trial';
import { ITaskGridDatasetControl } from '../../../interfaces';
import { ITaskDataProvider } from '../../../providers';
import { IGanttDates } from '../GanttDates';
import { ZoomingConfig } from './ZoomingConfig';
import { IGanttInfiniteTimeline } from '../GanttInfiniteTimeline';

export interface IGanttZooming {
    destroy: () => void;
    isLevelWithDaysVisible: () => boolean;
}

interface IGanttZoomingParams {
    datasetControl: ITaskGridDatasetControl;
    gantt: GanttStatic;
    dates: IGanttDates;
    timeline: IGanttInfiniteTimeline;
}

export class GanttZooming implements IGanttZooming {
    private static readonly _zoomSessionResetDelay = 250;

    private _zoomTickStep = 1;
    private _pendingAnchorX: number | undefined;
    private _pendingAnchorDate: Date | undefined;
    private _debouncedResetZoomAnchor: debounce.DebouncedFunction<() => void>;
    private _datasetControl: ITaskGridDatasetControl;
    private _taskDataProvider: ITaskDataProvider;
    private _gantt: GanttStatic;
    private _dates: IGanttDates;
    private _timeline: IGanttInfiniteTimeline;
    private _formatting = Formatting.Get();


    constructor(params: IGanttZoomingParams) {
        this._datasetControl = params.datasetControl;
        this._gantt = params.gantt;
        this._timeline = params.timeline;
        //@ts-ignore
        window.GANTT = this._gantt;
        this._dates = params.dates;
        this._debouncedResetZoomAnchor = debounce(() => this._pendingAnchorDate = undefined, GanttZooming._zoomSessionResetDelay);
        this._gantt.ext.zoom.init(ZoomingConfig.getScrollZoomConfig(this._gantt, this._formatting.locale));
        this._initZoomTickStep();
        this._overrideWheelHandler();
        this._taskDataProvider = params.datasetControl.getDataProvider();
        this._registerEventListeners();
    }


    public isLevelWithDaysVisible(): boolean {
        return this._gantt.ext.zoom.getCurrentLevel() > 4;
    }

    private _initZoomTickStep() {
        const zoom = this._gantt.ext.zoom as any;
        const min: number = zoom._minColumnWidth ?? ZoomingConfig.scrollZoomMinColumnWidth;
        const max: number = zoom._maxColumnWidth ?? ZoomingConfig.scrollZoomMaxColumnWidth;
        const step: number | undefined = zoom._widthStep;
        const levelCount: number = zoom.getLevels().length;
        const widthSlots = step ? Math.round((max - min) / step) + 1 : 1;
        const totalStates = levelCount * widthSlots;
        this._zoomTickStep = totalStates > 1 ? 100 / (totalStates - 1) : 100;
    }

    private _overrideWheelHandler() {
        const zoom = this._gantt.ext.zoom as any;
        const bridge = this._datasetControl.ganttGridBridge;
        const gantt = this._gantt;
        const getTickStep = () => this._zoomTickStep;

        zoom._handler = (e: { clientX: number; deltaY: number; wheelDelta: number; preventDefault: () => void; stopPropagation: () => void; }) => {
            const zoomIn = (gantt.env.isFF ? -40 * e.deltaY : e.wheelDelta) > 0;
            const current = bridge.getZoomLevel();
            const next = Math.max(0, Math.min(100, current + (zoomIn ? getTickStep() : -getTickStep())));
            e.preventDefault();
            e.stopPropagation();
            const taskArea = gantt.$task;
            this._pendingAnchorX = taskArea ? e.clientX - taskArea.getBoundingClientRect().x : undefined;
            bridge.setZoomLevel(next);
        };
    }

    private _setZoomPercent(percent: number) {
        const anchorX = this._pendingAnchorX;
        this._pendingAnchorX = undefined;
        const zoom = this._gantt.ext.zoom as typeof this._gantt.ext.zoom & {
            _initialized: boolean;
            _exitFitMode: () => void;
            _setScaleDates: () => void;
            _setLevel: (levelIndex: number, anchorX: number) => void;
            _minColumnWidth: number;
            _maxColumnWidth: number;
            _widthStep: number | undefined;
        };

        if (!zoom?._initialized) {
            return;
        }

        const clamped = Math.max(0, Math.min(100, percent));
        const levels = zoom.getLevels();
        const levelCount = levels.length;
        if (!levelCount) {
            return;
        }

        const resolvedAnchorX = anchorX ?? (this._gantt.$task?.offsetWidth ?? 0) / 2;
        const anchorDate = this._getStableZoomAnchorDate(resolvedAnchorX);
        this._timeline.shrink({ anchorX: resolvedAnchorX, date: anchorDate });
        this._debouncedResetZoomAnchor();
        const min = zoom._minColumnWidth;
        const max = zoom._maxColumnWidth;
        const step = zoom._widthStep;

        if (!step) {
            const levelIndex = Math.round((clamped / 100) * (levelCount - 1));
            zoom._exitFitMode();
            zoom._setLevel(levelIndex, resolvedAnchorX);
            return;
        }

        const widthSlots = Math.round((max - min) / step) + 1;
        const totalStates = levelCount * widthSlots;
        const stateIndex = Math.round((clamped / 100) * (totalStates - 1));
        const levelIndex = Math.floor(stateIndex / widthSlots);
        const widthIndex = stateIndex % widthSlots;

        zoom._exitFitMode();
        zoom._setScaleDates();
        this._gantt.config.min_column_width = min + widthIndex * step;
        zoom._setLevel(levelIndex, resolvedAnchorX);
    }

    private _zoomToFit() {
        const selectedRecordIds = this._taskDataProvider.getSelectedRecordIds();
        const records = selectedRecordIds.length > 0
            ? selectedRecordIds.map(id => this._taskDataProvider.getRecordsMap()[id]).filter(Boolean)
            : this._taskDataProvider.getAllRecords();

        if (!records.length || !this._gantt.$task) {
            return;
        }

        const { startDate, endDate, startRecord } = this._dates.getStartEndDateFromRecords(records);
        if (!startDate || !endDate) {
            return;
        }
        const percent = this._findFitPercent(startDate, endDate);
        this._datasetControl.ganttGridBridge.setZoomLevel(percent);
        this._gantt.showTask(startRecord?.getRecordId()!);
    }

    private _findFitPercent(startDate: Date, endDate: Date): number {
        const zoom = this._gantt.ext.zoom as any;
        const levels = zoom.getLevels() as any[];
        const levelCount = levels.length;
        const min = zoom._minColumnWidth as number;
        const max = zoom._maxColumnWidth as number;
        const step = zoom._widthStep as number | undefined;
        const viewportWidth = this._gantt.$task?.offsetWidth ?? 0;

        if (!viewportWidth || !levelCount) return 0;

        const widthSlots = step ? Math.round((max - min) / step) + 1 : 1;
        const totalStates = levelCount * widthSlots;

        // Iterate from most zoomed in (high index) to most zoomed out (0)
        // Return the highest zoom level where all tasks still fit
        for (let stateIndex = totalStates - 1; stateIndex >= 0; stateIndex--) {
            const levelIndex = Math.floor(stateIndex / widthSlots);
            const widthIndex = stateIndex % widthSlots;
            const columnWidth = min + widthIndex * (step ?? 0);

            const level = levels[levelIndex];
            const finest = this._getFinestScale(level);
            if (!finest) continue;

            const columnCount = this._countColumnsInRange(startDate, endDate, finest.unit, finest.step);
            if (columnCount * columnWidth <= viewportWidth) {
                return totalStates > 1 ? (stateIndex / (totalStates - 1)) * 100 : 100;
            }
        }

        return 0; // fall back to fully zoomed out
    }

    private _getFinestScale(level: any): { unit: string; step: number } | null {
        if (!level?.scales?.length) return null;
        const unitOrder = ['hour', 'day', 'week', 'month', 'quarter', 'year'];
        let finest: { unit: string; step: number } | null = null;
        for (const scale of level.scales as Array<{ unit: string; step?: number }>) {
            if (!finest
                || unitOrder.indexOf(scale.unit) < unitOrder.indexOf(finest.unit)
                || (scale.unit === finest.unit && (scale.step ?? 1) < finest.step)) {
                finest = { unit: scale.unit, step: scale.step ?? 1 };
            }
        }
        return finest;
    }

    private _countColumnsInRange(start: Date, end: Date, unit: string, step: number): number {
        const MS: Record<string, number> = {
            minute: 60_000,
            hour: 3_600_000,
            day: 86_400_000,
            week: 604_800_000,
        };
        if (MS[unit]) {
            return Math.ceil((end.getTime() - start.getTime()) / (step * MS[unit]));
        }
        // month / quarter / year — use gantt date arithmetic
        let current = new Date(start);
        let count = 0;
        while (current < end && count < 10_000) {
            current = this._gantt.date.add(current, step, unit as any);
            count++;
        }
        return count;
    }


    private _jumpToToday() {
        const today = new Date();
        if (today > this._gantt.config.end_date! || today < this._gantt.config.start_date!) {
            this._timeline.setScrollBlock(true);
            this._timeline.shrink({
                date: today,
                skipWidthCheck: true
            });
            this._timeline.setScrollBlock(false);
        }
        this._gantt.showDate(today);
    }

    private _getStableZoomAnchorDate(anchorX: number): Date | undefined {
        if (this._pendingAnchorDate) {
            return this._pendingAnchorDate;
        }

        const scrollX = this._gantt.getScrollState().x;
        this._pendingAnchorDate = this._gantt.dateFromPos(scrollX + anchorX) ?? undefined;
        return this._pendingAnchorDate;
    }

    private _registerEventListeners() {
        this._taskDataProvider.addEventListener('onRecordsSelected', () => this._zoomToFit());
        this._datasetControl.ganttGridBridge.addEventListener('onJumpToTodayRequested', () => this._jumpToToday());
        this._datasetControl.ganttGridBridge.addEventListener('onZoomLevelChanged', (value) => this._setZoomPercent(value));
    }

    public destroy() {
        this._debouncedResetZoomAnchor.clear();
    }
}
