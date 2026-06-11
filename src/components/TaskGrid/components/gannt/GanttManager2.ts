import { gantt } from 'dhtmlx-gantt';


interface IInitParams {
    container: HTMLDivElement;
}

export interface IGanttManager {
    onInit: (params: IInitParams) => void;
}

export class GanttManager2 implements IGanttManager {
    constructor() {

    }
    public onInit(params: IInitParams) {
        gantt.init(params.container);
    }
}