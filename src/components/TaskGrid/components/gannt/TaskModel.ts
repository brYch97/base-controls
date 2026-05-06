import { TaskModel as TaskModelBase } from "@bryntum/gantt";
import { IRecordTree } from "../../data-providers/task-data-provider/record-tree/RecordTree";
import { IRecord } from "@talxis/client-libraries";

interface ITaskModelParams extends Partial<TaskModel> {
    taskTree: IRecordTree;
}

export class TaskModel extends TaskModelBase {
    private _taskTree: IRecordTree;
    constructor(params: ITaskModelParams) {
        super(params);
        this._taskTree = params?.taskTree!;
    }
/* 
    public setStartDate(date: Date, keepDuration?: boolean): Promise<void> {
        console.log(`Start date changed to ${date}`);
        return super.setStartDate(date, keepDuration);
    }
    public setEndDate(date: Date, keepDuration?: boolean): Promise<void> {
        console.log(`End date changed to ${date}`);
        return super.setEndDate(date, keepDuration);
    } */


    private _getRecord(): IRecord {
        return this._taskTree.getNode(this.id as string).record;
    }
}
