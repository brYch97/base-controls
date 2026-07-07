import { GanttStatic } from 'gantt-trial';

export interface IGanttInfiniteTimeline {
    destroy: () => void;
    setScrollBlock: (block: boolean) => void;
    shrink: (params: {
        anchorX?: number;
        date?: Date;

    }) => void;

}

interface IGanttInfiniteTimelineParams {
    gantt: GanttStatic;
}

export class GanttInfiniteTimeline implements IGanttInfiniteTimeline {
    private static readonly _maxTimelineWidth = 100000;
    private static readonly _targetTimelineWidth = 5000;

    private _gantt: GanttStatic;
    private _onGanttScrollId: string | null = null;
    private _onGanttLayoutReadyId: string | null = null;
    private _blockScrollHandler = false;
    private _isLayoutReady = false;

    constructor(params: IGanttInfiniteTimelineParams) {
        this._gantt = params.gantt;
        this._registerEventListeners();
    }

    public destroy() {
        if (this._onGanttScrollId) {
            this._gantt.detachEvent(this._onGanttScrollId);
            this._onGanttScrollId = null;
        }

        if (this._onGanttLayoutReadyId) {
            this._gantt.detachEvent(this._onGanttLayoutReadyId);
            this._onGanttLayoutReadyId = null;
        }
    }

    public setScrollBlock(block: boolean) {
        this._blockScrollHandler = block;
    }

    public shrink(params: { anchorX?: number; date?: Date }) {
        const { anchorX, date } = params;
        //@ts-ignore - not in types
        const width = this._gantt.getScrollState().width;
        console.log('Shrinking timeline to current view');
        const scrollState = this._gantt.getScrollState();
        const viewportWidth = this._gantt.$task?.offsetWidth ?? 0;
        const leftPos = scrollState.x;
        const currentLeftDate = this._gantt.dateFromPos(leftPos);
        const currentRightDate = this._gantt.dateFromPos(leftPos + viewportWidth);

        if (!currentLeftDate || !currentRightDate || !viewportWidth) {
            return;
        }

        const resolvedAnchorX = anchorX ?? viewportWidth / 2;
        const anchorOffset = Math.max(0, Math.min(viewportWidth, resolvedAnchorX));
        const anchorDate = date ?? this._gantt.dateFromPos(leftPos + anchorOffset);
        const visibleDuration = +currentRightDate - +currentLeftDate;

        if (!anchorDate) {
            return;
        }

        const left_date = date ? new Date(+anchorDate - visibleDuration / 2) : currentLeftDate;
        const right_date = date ? new Date(+anchorDate + visibleDuration / 2) : currentRightDate;
        const targetDuration = visibleDuration * (GanttInfiniteTimeline._targetTimelineWidth / viewportWidth);
        const start_date = new Date(+left_date - ((targetDuration - visibleDuration) / 2));
        start_date.setHours(0, 0, 0, 0);
        const end_date = new Date(+right_date + ((targetDuration - visibleDuration) / 2));

        this._gantt.config.start_date = start_date;
        this._gantt.config.end_date = end_date;
        this._gantt.render();

        if (anchorX) {
            this._gantt.showDate(anchorDate);
            const nextLeft = Math.max(0, this._gantt.posFromDate(anchorDate) - anchorOffset);
            this._gantt.scrollTo(nextLeft, scrollState.y);
        }
    }


    private _registerEventListeners() {
        this._onGanttScrollId = this._gantt.attachEvent('onGanttScroll', (left: number, _top: number) => {
            if (this._blockScrollHandler || !this._isLayoutReady) return;
            this._onHorizontalScroll();
        });
        this._onGanttLayoutReadyId = this._gantt.attachEvent('onGanttReady', () => {
            setTimeout(() => {
                this._isLayoutReady = true;
            }, 1000);
            return true;
        });
    }

    private _onHorizontalScroll() {
        const unit = this._gantt.getScale().unit;
        const leftPos = this._gantt.getScrollState().x;
        const left_date = this._gantt.dateFromPos(leftPos)
        const right_date = this._gantt.dateFromPos(leftPos + this._gantt.$task.offsetWidth);

        this._gantt.config.start_date = this._gantt.config.start_date || this._gantt.getState().min_date;
        this._gantt.config.end_date = this._gantt.config.end_date || this._gantt.getState().max_date;

        const max_allowed_date = this._gantt.date.add(this._gantt.config.end_date, -2, unit);

        let repaint = false;
        if (!leftPos) {
            const startDate = this._gantt.date.add(this._gantt.config.start_date, -2, unit);
            startDate.setHours(0, 0, 0, 0);
            this._gantt.config.start_date = startDate;
            repaint = true;
        }
        if ((+right_date >= +max_allowed_date) || !right_date) {
            this._gantt.config.end_date = this._gantt.date.add(this._gantt.config.end_date, 2, unit);
            repaint = true;
        }
        if (repaint) {
            setTimeout(() => {
                this._gantt.render();
                this._gantt.showDate(left_date);
            }, 20)
        }
    }
}
