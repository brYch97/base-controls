import { useMemo } from 'react';
import { Callout, DirectionalHint, Icon, useTheme } from '@fluentui/react';
import { Task } from 'gantt-trial';
import { useTaskDataProvider } from '../../../../context';
import { getTaskTooltipStyles } from './styles';
import { Formatting } from '@talxis/client-libraries';
import { useGanttComponents } from '../../context';

export interface ITaskTooltipProps {
    task: Task;
    event: MouseEvent;
}

export const TaskTooltip = (props: ITaskTooltipProps) => {
    const { task, event } = props;
    const theme = useTheme();
    const components = useGanttComponents();
    const formatting = Formatting.Get();
    const taskDataProvider = useTaskDataProvider();
    const nativeColumns = taskDataProvider.getNativeColumns();
    const record = taskDataProvider.getRecordsMap()[task.id];
    const name = record.getValue(nativeColumns.subject);
    const startDate = record.getFormattedValue(nativeColumns.startDate!);
    const endDate = record.getFormattedValue(nativeColumns.endDate!);
    const durationDays = task.duration ?? 0;
    const durationFormatted = formatting.formatDuration(durationDays * 24 * 60);
    const target = {
        x: event.clientX + 10,
        y: event.clientY + 12,
    };

    const getStatusCodeColor = (): string => {
        let color = theme.palette.themePrimary; // Default color
        if (nativeColumns.statusCode) {
            const statusCode = record.getValue(nativeColumns.statusCode);
            const statusCodeColumn = taskDataProvider.getColumnsMap()[nativeColumns.statusCode];
            const options = statusCodeColumn.metadata?.OptionSet ?? [];
            color = options.find(option => option.Value == statusCode)?.Color ?? color;

        }
        return color;
    }

    const statusDotColor = getStatusCodeColor();

    const styles = useMemo(() => getTaskTooltipStyles(theme, statusDotColor), [theme, statusDotColor]);

    return components.onRenderTaskTooltipCallout({
        target,
        directionalHint: DirectionalHint.bottomLeftEdge,
        directionalHintFixed: false,
        isBeakVisible: false,
        gapSpace: 8,
        children: (
            <div className={styles.root}>
                <div className={styles.header}>
                    <div className={styles.statusDot} />
                    <span className={styles.title}>{name}</span>
                </div>
                <div className={styles.rows}>
                    <div className={styles.row}>
                        <Icon iconName="Calendar" className={styles.icon} />
                        <span className={styles.label}>Start</span>
                        <span className={styles.value}>{startDate}</span>
                    </div>
                    <div className={styles.row}>
                        <Icon iconName="CalendarReply" className={styles.icon} />
                        <span className={styles.label}>End</span>
                        <span className={styles.value}>{endDate}</span>
                    </div>
                    <div className={styles.row}>
                        <Icon iconName="Clock" className={styles.icon} />
                        <span className={styles.label}>Duration</span>
                        <span className={styles.durationBadge}>
                            {durationFormatted}
                        </span>
                    </div>
                </div>
            </div>
        )
    });
};
