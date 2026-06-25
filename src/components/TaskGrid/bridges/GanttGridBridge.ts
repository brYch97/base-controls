import { EventEmitter, IEventEmitter } from "@talxis/client-libraries";
import debounce from "debounce";

export interface IGanttGridBridgeEvents {
    onAgGridScrolled: (scrollTop: number) => void;
    onAgGridRowExpanded: (taskId: string) => void;
    onAgGridRowCollapsed: (taskId: string) => void;
    onGanttScrolled: (scrollTop: number) => void;
    onGanttTaskExpanded: (taskId: string) => void;
    onGanttTaskCollapsed: (taskId: string) => void;
    onJumpToTodayRequested: () => void;
    onShowWeekendsChanged: (showWeekends: boolean) => void;
    onZoomLevelChanged: (level: number) => void;
}

export interface IGanttGridBridge extends IEventEmitter<IGanttGridBridgeEvents> { }

type BridgeEventName = keyof IGanttGridBridgeEvents;

const MIRROR_EVENTS: Partial<Record<BridgeEventName, BridgeEventName>> = {
    onAgGridScrolled: 'onGanttScrolled',
    onGanttScrolled: 'onAgGridScrolled',
    onAgGridRowExpanded: 'onGanttTaskExpanded',
    onGanttTaskExpanded: 'onAgGridRowExpanded',
    onAgGridRowCollapsed: 'onGanttTaskCollapsed',
    onGanttTaskCollapsed: 'onAgGridRowCollapsed',
};

export class GanttGridBridge extends EventEmitter<IGanttGridBridgeEvents> implements IGanttGridBridge {
    private _suppressedEvents = new Set<BridgeEventName>();
    private _debouncedClean: debounce.DebouncedFunction<() => void>;
    private _zoomLevel: number = 0;

    constructor() {
        super();
        this._debouncedClean = debounce(() => this._suppressedEvents.clear(), 0);
    }

    public setZoomLevel(zoomLevel: number) {
        if (this._zoomLevel !== zoomLevel) {
            this._zoomLevel = zoomLevel;
            this.dispatchEvent('onZoomLevelChanged', zoomLevel);
        }
    }

    public requestJumpToToday() {
        this.dispatchEvent('onJumpToTodayRequested');
    }

    public setShowWeekends(showWeekends: boolean) {
        this.dispatchEvent('onShowWeekendsChanged', showWeekends);
    }

    public getZoomLevel(): number {
        return this._zoomLevel;
    }

    public dispatchEvent<K extends BridgeEventName>(event: K, ...args: Parameters<IGanttGridBridgeEvents[K]>): boolean {
        if (this._suppressedEvents.has(event)) {
            return false;
        }
        const mirror = MIRROR_EVENTS[event];
        if (mirror) {
            this._suppressedEvents.add(mirror);
            this._debouncedClean();
        }
        //console.log(`Event dispatched: ${event} with args:`, args);
        return super.dispatchEvent(event, ...args);
    }
}
