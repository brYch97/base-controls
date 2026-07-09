import { Formatting } from '@talxis/client-libraries';
import { TaskTooltip } from '../task-tooltip';
import { useTaskDataProvider } from '../../../../../context';
import { IGanttTaskTooltipProps } from '../../context';
import { TaskTooltipAdapterComponents, ITaskTooltipAdapterComponents } from './components';

export interface ITaskTooltipAdapterProps extends IGanttTaskTooltipProps {
    components?: Partial<ITaskTooltipAdapterComponents>;
}

export const TaskTooltipAdapter = (props: ITaskTooltipAdapterProps) => {
    const { task, event } = props;
    const components = { ...TaskTooltipAdapterComponents, ...props.components };
    const taskDataProvider = useTaskDataProvider();
    const formatting = Formatting.Get();
    const nativeColumns = taskDataProvider.getNativeColumns();
    const record = taskDataProvider.getRecordsMap()[task.id];
    const startDate = nativeColumns.startDate ? record?.getFormattedValue(nativeColumns.startDate) ?? undefined : undefined;
    const endDate = nativeColumns.endDate && record?.getValue(nativeColumns.endDate)
        ? record.getFormattedValue(nativeColumns.endDate) ?? undefined
        : undefined;
    const duration = endDate ? formatting.formatDuration((task.duration ?? 0) * 24 * 60) : undefined;
    let statusColor: string | undefined;
    if (nativeColumns.statusCode) {
        const statusCode = record?.getValue(nativeColumns.statusCode);
        const statusCodeColumn = taskDataProvider.getColumnsMap()[nativeColumns.statusCode];
        const options = statusCodeColumn?.metadata?.OptionSet ?? [];
        statusColor = options.find(option => option.Value == statusCode)?.Color;
    }


    return components.onRenderCallout({
        target: {
            x: event.clientX + 10,
            y: event.clientY + 12,
        },
        children: (
            <TaskTooltip
                taskName={record?.getValue(nativeColumns.subject)}
                startDate={startDate}
                endDate={endDate}
                duration={duration}
                statusColor={statusColor}
            />
        )
    });
};
