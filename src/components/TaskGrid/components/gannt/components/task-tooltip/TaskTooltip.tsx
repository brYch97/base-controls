import { Callout } from "@fluentui/react";
import { useTaskDataProvider } from "../../../../context";
import { ITaskGridDatasetControl } from "../../../..";
import { Task } from "dhtmlx-gantt";

export interface ITaskTooltipProps {
    task: Task;
    event: MouseEvent;
    datasetControl: ITaskGridDatasetControl;
}

export const TaskTooltip = (props: ITaskTooltipProps) => {
    const { task, event, datasetControl } = props;
    const taskDataProvider = datasetControl.getDataProvider();
    const nativeColumns = taskDataProvider.getNativeColumns();
    const record = taskDataProvider.getRecordsMap()[task.id];
    const name = record.getNamedReference().name;
    const startDate = record.getFormattedValue(nativeColumns.startDate!);
    const endDate = record.getFormattedValue(nativeColumns.endDate!);
    const duration = task.duration;

    return <Callout target={event}>
        {record.getNamedReference().name}
    </Callout>
}