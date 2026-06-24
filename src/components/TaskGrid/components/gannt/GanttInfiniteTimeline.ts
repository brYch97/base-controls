import { GanttStatic } from 'gantt-trial';

export interface IGanttInfiniteTimeline {
    destroy: () => void;
    reset: () => void;
}

interface IGanttInfiniteTimelineParams {
    gantt: GanttStatic;
}

export class GanttInfiniteTimeline implements IGanttInfiniteTimeline {
    private static readonly _renderDelay = 20;

    private _gantt: GanttStatic;
    private _onGanttScrollId: string | null = null;

    constructor(params: IGanttInfiniteTimelineParams) {
        this._gantt = params.gantt;
        this._registerEventListeners();
    }

    public reset() {
        this._gantt.config.start_date = undefined;
        this._gantt.config.end_date = undefined;
    }

    public destroy() {
        if (this._onGanttScrollId) {
            this._gantt.detachEvent(this._onGanttScrollId);
            this._onGanttScrollId = null;
        }
    }

    private _registerEventListeners() {
        this._onGanttScrollId = this._gantt.attachEvent('onGanttScroll', (left: number, _top: number) => {
            this._onHorizontalScroll(left);
        });
    }

    private _onHorizontalScroll(left: number) {
        if (!this._gantt.$task?.offsetWidth) {
            return;
        }

        const leftDate = this._gantt.dateFromPos(left);
        const rightDate = this._gantt.dateFromPos(left + this._gantt.$task.offsetWidth);
        if (!leftDate || !rightDate) {
            return;
        }

        this._gantt.config.start_date = this._gantt.config.start_date || this._gantt.getState().min_date;
        this._gantt.config.end_date = this._gantt.config.end_date || this._gantt.getState().max_date;

        const startDate = this._gantt.config.start_date;
        const endDate = this._gantt.config.end_date;
        if (!startDate || !endDate) {
            return;
        }

        const minAllowedDate = this._gantt.date.add(startDate, 1, 'day');
        const maxAllowedDate = this._gantt.date.add(endDate, -2, 'day');

        let repaint = false;
        if (+leftDate <= +minAllowedDate) {
            this._gantt.config.start_date = this._gantt.date.add(
                startDate,
                -2,
                'day'
            );
            repaint = true;
        }

        if (+rightDate >= +maxAllowedDate) {
            this._gantt.config.end_date = this._gantt.date.add(
                endDate,
                2,
                'day'
            );
            repaint = true;
        }

        if (repaint) {
            window.setTimeout(() => {
                this._gantt.render();
                this._gantt.showDate(leftDate);
            }, GanttInfiniteTimeline._renderDelay);
        }
    }
}
