import { Callout } from "@fluentui/react";
import { useTaskDataProvider } from "../../../../context";
import { ITaskGridDatasetControl } from "../../../..";

export interface ITaskTooltipProps {
    taskId: string;
    event: MouseEvent;
    datasetControl: ITaskGridDatasetControl;
}

export const TaskTooltip = (props: ITaskTooltipProps) => {
    const { taskId, event, datasetControl } = props;
    const taskDataProvider = datasetControl.getDataProvider();
    const nativeColumns = taskDataProvider.getNativeColumns();
    const record = taskDataProvider.getRecordsMap()[taskId];

    return <Callout target={event}>
        {record.getNamedReference().name}
    </Callout>
}