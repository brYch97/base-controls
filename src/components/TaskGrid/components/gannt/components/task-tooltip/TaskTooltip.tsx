import { useMemo } from 'react';
import { Callout, DirectionalHint, Icon, useTheme } from '@fluentui/react';
import { Task } from 'dhtmlx-gantt';
import { ITaskGridDatasetControl, useTaskDataProvider } from '../../../..';
import { getTaskTooltipStyles } from './styles';
import { Formatting } from '@talxis/client-libraries';
import { useGanttComponents } from '../../context';

export interface ITaskTooltipProps {
    task: Task;
    event: MouseEvent;
}

export const TaskTooltip = (props: ITaskTooltipProps) => {
    const { task, event} = props;
    const theme = useTheme();
    const styles = useMemo(() => getTaskTooltipStyles(theme), [theme]);
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

    return components.onRenderTaskTooltipCallout({
        target: event,
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
                        <span className={styles.value}>{        endDate}</span>
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
}
