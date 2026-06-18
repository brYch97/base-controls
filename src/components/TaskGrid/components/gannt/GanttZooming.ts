import { GanttStatic, ZoomConfig } from 'gantt-trial';
import { ITaskGridDatasetControl } from '../../interfaces';
import { ITaskDataProvider } from '../../providers';
import { IGanttDates } from './GanttDates';
import { Formatting } from '@talxis/client-libraries';
import dayjs from 'dayjs';

export interface IGanttZooming {
}

type SnapUnit = 'year' | 'quarter' | 'month' | 'week' | 'day' | 'hour' | 'minute';

interface IGanttZoomingParams {
    datasetControl: ITaskGridDatasetControl;
    gantt: GanttStatic;
    dates: IGanttDates;
}

export class GanttZooming implements IGanttZooming {
    private _datasetControl: ITaskGridDatasetControl;
    private _taskDataProvider: ITaskDataProvider;
    private _gantt: GanttStatic;
    private _dates: IGanttDates;
    private _formatting = Formatting.Get();

    // Half-width of the visible timeline window per zoom level (centered on the
    // currently visible date) plus the unit its boundaries snap to. Coarse levels
    // use a wide window, fine levels a narrow one. This keeps the number of
    // rendered columns bounded — without it, fine levels (hours/minutes) over a
    // multi-decade range generate millions of columns and dhtmlx throws
    // "Too many properties to enumerate". Snapping to a clean unit boundary keeps
    // the scale labels aligned (e.g. 30-min slots land on :00/:30, quarters on Q1).
    private readonly _levelSpans: Array<{ value: number; unit: SnapUnit; snap: SnapUnit }> = [
        { value: 50, unit: 'year', snap: 'year' },    // multiple-years
        { value: 25, unit: 'year', snap: 'year' },    // years / quarters
        { value: 10, unit: 'year', snap: 'year' },    // months
        { value: 3, unit: 'year', snap: 'month' },    // months / weeks
        { value: 6, unit: 'month', snap: 'day' },     // week / days
        { value: 1, unit: 'month', snap: 'day' },     // day / hours
        { value: 10, unit: 'day', snap: 'hour' },     // minutes
    ];

    // While a fit-to-range is in progress the onAfterZoom handler must not
    // re-apply the centered per-level window (that would clobber the fitted range).
    private _isFitting = false;

    constructor(params: IGanttZoomingParams) {
        this._datasetControl = params.datasetControl;
        this._gantt = params.gantt;
        //@ts-ignore
        window.GANTT = this._gantt;
        this._dates = params.dates;
        this._gantt.config.scale_height = 43;
        this._gantt.config.min_column_width = 80;
        this._gantt.ext.zoom.init(this._getZoomConfig());
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
        } catch {
            // fall through to default
        }
        return new Date();
    }

    private _applyDateRangeForLevel(levelIndex: number, centerDate: Date) {
        const span = this._levelSpans[levelIndex] ?? this._levelSpans[0];
        let rawStart = this._gantt.date.add(centerDate, -span.value, span.unit);
        let rawEnd = this._gantt.date.add(centerDate, span.value, span.unit);

        // Always keep every task inside the rendered window so tasks that fall
        // outside the centered span are never clipped from the timeline.
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


    private _getZoomConfig(): ZoomConfig {
        return {
            minColumnWidth: 40,
            maxColumnWidth: 200,
            levels: [
                // "Multiple years" — 5-year spans / individual years
                {
                    name: 'multiple-years',
                    scale_height: 43,
                    scales: [
                        {
                            unit: 'year',
                            step: 4,
                            format: (date: Date) => {
                                const end = this._gantt.date.add(date, 3, 'year');
                                return `${date.getFullYear()} – ${end.getFullYear()}`;
                            },
                        },
                        { unit: 'year', step: 1, format: '%Y' },
                    ],
                },
                // "Years" — year / quarters
                {
                    name: 'years',
                    scale_height: 43,
                    scales: [
                        { unit: 'year', step: 1, format: '%Y' },
                        {
                            unit: 'quarter',
                            step: 1,
                            format: (date: Date) => `Q${Math.floor(date.getMonth() / 3) + 1}`,
                        },
                    ],
                },
                // "Months" — year / months
                {
                    name: 'months',
                    scale_height: 43,
                    scales: [
                        { unit: 'year', step: 1, format: '%Y' },
                        {
                            unit: 'month', step: 1, format: (date) => {
                                return new Intl.DateTimeFormat(this._formatting.locale, { month: 'long' }).format(date);
                            }
                        },
                    ],
                },
                // "Months/weeks" — month / week start days
                {
                    name: 'months-weeks',
                    scale_height: 43,
                    scales: [
                        { unit: 'month', step: 1, format: '%F %Y' },
                        {
                            unit: 'week',
                            step: 1,
                            format: (date: Date) => {
                                const dateToStr = this._gantt.date.date_to_str('%d');
                                const endDate = this._gantt.date.add(date, 6, 'day');
                                return `${dateToStr(date)}–${dateToStr(endDate)}`;
                            },
                        },
                    ],
                },
                // "Week" — couple of weeks in view, wide day columns
                {
                    name: 'week',
                    scale_height: 43,
                    scales: [
                        { unit: 'month', step: 1, format: '%F %Y' },
                        { unit: 'day', step: 1, format: '%d %M' },
                    ],
                },
                // "Day" — day / hours
                {
                    name: 'day',
                    scale_height: 43,
                    scales: [
                        { unit: 'day', step: 1, format: '%D %d/%m' },
                        { unit: 'hour', step: 1, format: '%H:%i' },
                    ],
                },
            ],
            useKey: 'ctrlKey',
            trigger: 'wheel',
            element: () => {
                return this._gantt.$root.querySelector('.gantt_task')!;
            },
        };
    }

    private _zoomToFit() {
        const selectedRecordIds = this._taskDataProvider.getSelectedRecordIds();
        let startDate: Date;
        let endDate: Date;

        if (selectedRecordIds.length === 0) {
            // No selection — fit to every task currently loaded.
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
        // Guarantee a positive duration even when a single instantaneous task is selected.
        let start = new Date(Math.min(startDate.getTime(), endDate.getTime()));
        let end = new Date(Math.max(startDate.getTime(), endDate.getTime()));
        if (start.getTime() === end.getTime()) {
            end = this._gantt.date.add(end, 1, 'day');
        }

        // Pad the range by 5% on each side so the first/last task aren't flush
        // against the timeline edges.
        const padding = Math.max((end.getTime() - start.getTime()) * 0.05, 0);
        start = new Date(start.getTime() - padding);
        end = new Date(end.getTime() + padding);

        this._isFitting = true;
        try {
            // Pick the finest zoom level whose rendered range still fits inside the
            // viewport, so every task is visible in its entirety without scrolling.
            // Walk from coarsest to finest and keep the last level that fits.
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
                } catch {
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

        // The zoom level and scroll target are derived from the fitted range, but
        // the rendered window must still contain every task — dhtmlx drops any
        // task whose dates fall outside config.start_date/end_date, which would
        // make non-selected tasks disappear from the timeline entirely.
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


    private _registerEventListeners() {
        this._taskDataProvider.addEventListener('onRecordsSelected', () => this._zoomToFit());
        this._taskDataProvider.addEventListener('onNewDataLoaded', () => this._zoomToFit());
        this._gantt.ext.zoom.attachEvent('onAfterZoom', (level: string | number) => {
            // A fit-to-range sets the window explicitly; don't override it.
            if (this._isFitting) {
                return;
            }
            // Keep the date that was in the middle of the viewport before the zoom
            // centered after it, and resize the rendered window to the new level so
            // the number of columns stays bounded.
            const center = this._getCenterDate();
            this._applyDateRangeForLevel(Number(level), center);
            this._gantt.render();
            const pos = this._gantt.posFromDate(center);
            this._gantt.scrollTo(pos - (this._gantt.$task?.offsetWidth ?? 0) / 2, null);
        });
    }
}