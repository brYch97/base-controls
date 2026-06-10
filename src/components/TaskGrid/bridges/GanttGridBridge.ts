import { EventEmitter } from "@talxis/client-libraries";

export interface IGanttGridBridgeEvents {
    onAgGridScrolled: (scrollTop: number) => void;
    onGanttScrolled: (scrollTop: number) => void;
    onAgGridRowExpanded: (taskId: string) => void;
    onAgGridRowCollapsed: (taskId: string) => void;
}

export class GanttGridBridge extends EventEmitter<IGanttGridBridgeEvents> {}
