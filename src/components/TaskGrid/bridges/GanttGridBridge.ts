import { EventEmitter, IEventEmitter } from "@talxis/client-libraries";

export interface IGanttGridBridgeEvents {
    onAgGridScrolled: (scrollTop: number) => void;
    onAgGridRowExpanded: (taskId: string) => void;
    onAgGridRowCollapsed: (taskId: string) => void;
    onGanttScrolled: (scrollTop: number) => void;
    onGanttTaskExpanded: (taskId: string) => void;
    onGanttTaskCollapsed: (taskId: string) => void;
}

export interface IGanttGridBridge extends IEventEmitter<IGanttGridBridgeEvents> {}

export class GanttGridBridge extends EventEmitter<IGanttGridBridgeEvents> implements IGanttGridBridge {}
