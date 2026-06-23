import { Formatting } from '@talxis/client-libraries';
import dayjs from 'dayjs';
import { GanttStatic } from 'gantt-trial';
import { ITaskGridDatasetControl } from '../../../interfaces';
import { ITaskDataProvider } from '../../../providers';
import { ZoomLevel } from '../components/zoom-switcher';
import { IGanttDates } from '../GanttDates';
import { ZoomingConfig } from './ZoomingConfig';

export interface IGanttZooming {
    destroy: () => void;
}

type SnapUnit = 'year' | 'quarter' | 'month' | 'week' | 'day' | 'hour' | 'minute';

interface IGanttZoomingParams {
    datasetControl: ITaskGridDatasetControl;
    gantt: GanttStatic;
    dates: IGanttDates;
}

export class GanttZooming implements IGanttZooming {
    private _lastSliderValue = 0;
    private _datasetControl: ITaskGridDatasetControl;
    private _taskDataProvider: ITaskDataProvider;
    private _gantt: GanttStatic;
    private _dates: IGanttDates;
    private _formatting = Formatting.Get();

    private readonly _levelSpans: Array<{ value: number; unit: SnapUnit; snap: SnapUnit }> = [
        { value: 50, unit: 'year', snap: 'year' },
        { value: 25, unit: 'year', snap: 'year' },
        { value: 10, unit: 'year', snap: 'year' },
        { value: 3, unit: 'year', snap: 'month' },
        { value: 6, unit: 'month', snap: 'day' },
        { value: 1, unit: 'month', snap: 'day' },
        { value: 10, unit: 'day', snap: 'hour' },
    ];

    private _isFitting = false;

    constructor(params: IGanttZoomingParams) {
        this._datasetControl = params.datasetControl;
        this._gantt = params.gantt;
        //@ts-ignore
        window.GANTT = this._gantt;
        this._dates = params.dates;
        this._gantt.config.scale_height = 43;
        this._gantt.ext.zoom.init(ZoomingConfig.getScrollZoomConfig(this._gantt, this._formatting.locale));
        this._applyDateRangeForLevel(this._gantt.ext.zoom.getCurrentLevel(), new Date());
        this._taskDataProvider = params.datasetControl.getDataProvider();
        this._registerEventListeners();
    }

    private _getCenterDate(): Date {
        try {
            const scroll = this._gantt.getScrollState();
            const taskWidth = this._gantt.$task?.offsetWidth ?? 0;
            if (scroll && typeof scroll.x === 'number' && taskWidth > 0) {
                return this._gantt.dateFromPos(scroll.x + taskWidth / 2);
            }
        }
        catch {
            return new Date();
        }

        return new Date();
    }

    private _applyDateRangeForLevel(levelIndex: number, centerDate: Date) {
        const span = this._levelSpans[levelIndex] ?? this._levelSpans[0];
        let rawStart = this._gantt.date.add(centerDate, -span.value, span.unit);
        let rawEnd = this._gantt.date.add(centerDate, span.value, span.unit);

        const taskStart = this._dates.getStartDate();
        const taskEnd = this._dates.getEndDate();
        if (taskStart && taskStart.getTime() < rawStart.getTime()) {
            rawStart = taskStart;
        }
        if (taskEnd && taskEnd.getTime() > rawEnd.getTime()) {
            rawEnd = taskEnd;
        }

        this._gantt.config.start_date = this._snapDown(rawStart, span.snap);
        this._gantt.config.end_date = this._snapUp(rawEnd, span.snap);
    }

    private _snapDown(date: Date, unit: SnapUnit): Date {
        return this._gantt.date[`${unit}_start`](new Date(date));
    }

    private _snapUp(date: Date, unit: SnapUnit): Date {
        const floored = this._gantt.date[`${unit}_start`](new Date(date));
        return floored.getTime() === date.getTime() ? floored : this._gantt.date.add(floored, 1, unit);
    }

    private _zoomToFit() {
        const selectedRecordIds = this._taskDataProvider.getSelectedRecordIds();
        let startDate: Date;
        let endDate: Date;

        if (selectedRecordIds.length === 0) {
            startDate = this._dates.getStartDate();
            endDate = this._dates.getEndDate();
        }
        else {
            const selectedRecords = selectedRecordIds.map(id => this._taskDataProvider.getRecordsMap()[id]);
            const range = this._dates.getStartEndDateFromRecords(selectedRecords);
            startDate = range.startDate;
            endDate = range.endDate;
        }

        this._fitToRange(startDate, endDate);
    }

    private _fitToRange(startDate: Date, endDate: Date) {
        if (!startDate || !endDate) {
            return;
        }

        let start = new Date(Math.min(startDate.getTime(), endDate.getTime()));
        let end = new Date(Math.max(startDate.getTime(), endDate.getTime()));
        if (start.getTime() === end.getTime()) {
            end = this._gantt.date.add(end, 1, 'day');
        }

        const padding = Math.max((end.getTime() - start.getTime()) * 0.05, 0);
        start = new Date(start.getTime() - padding);
        end = new Date(end.getTime() + padding);

        this._isFitting = true;
        try {
            const viewport = this._gantt.$task?.offsetWidth ?? 0;
            let chosen = 0;
            for (let level = 0; level < this._levelSpans.length; level++) {
                try {
                    this._applyFittedRange(level, start, end);
                    this._gantt.ext.zoom.setLevel(level);
                    this._gantt.render();
                    const width = this._gantt.posFromDate(end) - this._gantt.posFromDate(start);
                    if (viewport > 0 && width > viewport) {
                        break;
                    }
                    chosen = level;
                }
                catch {
                    break;
                }
            }

            this._applyFittedRange(chosen, start, end);
            this._gantt.ext.zoom.setLevel(chosen);
            this._gantt.render();
            this._gantt.showDate(start);
        }
        finally {
            this._isFitting = false;
        }
    }

    private _applyFittedRange(level: number, start: Date, end: Date) {
        const span = this._levelSpans[level] ?? this._levelSpans[0];
        let rangeStart = start;
        let rangeEnd = end;
        const taskStart = this._dates.getStartDate();
        const taskEnd = this._dates.getEndDate();
        if (taskStart && taskStart.getTime() < rangeStart.getTime()) {
            rangeStart = taskStart;
        }
        if (taskEnd && taskEnd.getTime() > rangeEnd.getTime()) {
            rangeEnd = taskEnd;
        }

        this._gantt.config.start_date = this._snapDown(rangeStart, span.snap);
        this._gantt.config.end_date = this._snapUp(rangeEnd, span.snap);
    }

    private _jumpToToday() {
        const today = new Date();
        const level = Number(this._gantt.ext.zoom.getCurrentLevel());
        this._applyDateRangeForLevel(level, today);
        const position = this._gantt.posFromDate(today);
        this._gantt.scrollTo(position - (this._gantt.$task?.offsetWidth ?? 0) / 2, null);
    }

    private _onSettingsSliderMoved(value: number) {
        const zoom = this._gantt.ext.zoom as typeof this._gantt.ext.zoom & {
            _handler?: (event: { clientX: number; deltaY: number; wheelDelta: number; preventDefault: () => void; stopPropagation: () => void; }) => void;
        };
        const taskArea = this._gantt.$task;
        if (!zoom?._handler || !taskArea || value === this._lastSliderValue) {
            this._lastSliderValue = value;
            return;
        }

        const sliderDelta = value - this._lastSliderValue;
        this._lastSliderValue = value;

        const maxWheelSteps = Math.max(1, (this._levelSpans.length - 2) * 5 + 4);
        const currentLevel = Number(this._gantt.ext.zoom.getCurrentLevel());
        const clampedValue = Math.max(0, Math.min(100, value));
        const targetWheelStep = Math.round((clampedValue / 100) * maxWheelSteps);
        const currentWheelStep = this._getCurrentWheelStep(currentLevel);
        const wheelStepDelta = targetWheelStep - currentWheelStep;

        if (wheelStepDelta === 0 || sliderDelta === 0) {
            return;
        }

        const centerX = taskArea.getBoundingClientRect().x + taskArea.clientWidth / 2;
        const zoomDirection = wheelStepDelta > 0 ? 1 : -1;
        const steps = Math.abs(wheelStepDelta);

        for (let step = 0; step < steps; step++) {
            zoom._handler({
                clientX: centerX,
                deltaY: zoomDirection > 0 ? -120 : 120,
                wheelDelta: zoomDirection > 0 ? 120 : -120,
                preventDefault() { },
                stopPropagation() { },
            });
        }
    }

    private _getCurrentWheelStep(currentLevel: number) {
        if (currentLevel <= 0) {
            return 0;
        }

        const minColumnWidth = this._gantt.config.min_column_width ?? 0;
        const normalizedWidth = Math.max(80, Math.min(200, minColumnWidth));
        const widthStepOffset = Math.max(0, Math.round((normalizedWidth - 80) / 30));

        return Math.max(0, (currentLevel - 1) * 5 + widthStepOffset);
    }

    private _registerEventListeners() {
        this._taskDataProvider.addEventListener('onRecordsSelected', () => this._zoomToFit());
        this._taskDataProvider.addEventListener('onNewDataLoaded', () => this._zoomToFit());
        this._datasetControl.events.addEventListener('onJumpToTodayRequested', () => this._jumpToToday());
        this._datasetControl.events.addEventListener('onSettingsSliderMoved', (value) => this._onSettingsSliderMoved(value));
        /*         this._gantt.ext.zoom.attachEvent('onAfterZoom', (level: string | number) => {
                    if (this._isFitting) {
                        return;
                    }
                    const center = this._getCenterDate();
                    this._applyDateRangeForLevel(Number(level), center);
                    this._gantt.render();
                    const pos = this._gantt.posFromDate(center);
                    this._gantt.scrollTo(pos - (this._gantt.$task?.offsetWidth ?? 0) / 2, null);
                }); */
    }

    public destroy() {
    }
}
