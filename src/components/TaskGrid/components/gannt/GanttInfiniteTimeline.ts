import { GanttStatic } from 'gantt-trial';

export interface IGanttInfiniteTimeline {
    destroy: () => void;
    shrinkToCurrentView: () => void;
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

    public destroy() {
        if (this._onGanttScrollId) {
            this._gantt.detachEvent(this._onGanttScrollId);
            this._onGanttScrollId = null;
        }
    }

    public shrinkToCurrentView() {
        const leftPos = this._gantt.getScrollState().x;
        const left_date = this._gantt.dateFromPos(leftPos)
        const right_date = this._gantt.dateFromPos(leftPos + this._gantt.$task.offsetWidth);
        
        this._gantt.config.start_date = left_date;
        this._gantt.config.end_date = right_date;
    }


    private _registerEventListeners() {
        this._onGanttScrollId = this._gantt.attachEvent('onGanttScroll', (left: number, _top: number) => {
            this._onHorizontalScroll(left);
        });
    }

    private _onHorizontalScroll(left: number) {
        const unit = this._gantt.getScale().unit;
        const leftPos = this._gantt.getScrollState().x;
        const left_date = this._gantt.dateFromPos(leftPos)
        const right_date = this._gantt.dateFromPos(leftPos + this._gantt.$task.offsetWidth);

        this._gantt.config.start_date = this._gantt.config.start_date || this._gantt.getState().min_date;
        this._gantt.config.end_date = this._gantt.config.end_date || this._gantt.getState().max_date;

        const max_allowed_date = this._gantt.date.add(this._gantt.config.end_date, -2, unit);

        let repaint = false;
        if (!leftPos) {
            this._gantt.config.start_date = this._gantt.date.add(this._gantt.config.start_date, -2, unit);
            repaint = true;
        }
        if ((+right_date >= +max_allowed_date) || !right_date) {
            this._gantt.config.end_date = this._gantt.date.add(this._gantt.config.end_date, 2, unit);
            repaint = true;
        }

        if (repaint) {
            setTimeout(() => {
                this._gantt.render()
                this._gantt.showDate(left_date)
            }, 20)
        }
    }
}
