import { Task } from 'dhtmlx-gantt';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GanttManager2 } from './GanttManager2';
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';
import { useDatasetControl } from '../..';
import { getGanttStyles } from './styles';
import { useTheme } from '@fluentui/react';
import { GanttComponents } from './components/components';
import { TaskTooltip } from './components/task-tooltip';
import { GanttComponentsContext, IGanttComponents } from './context';

interface IGanttProps {
    components?: IGanttComponents;
}

export const Gantt = (props: IGanttProps) => {
    const components = useMemo(() => ({ ...GanttComponents, ...props.components }), [props.components]);
    const ref = useRef<HTMLDivElement>(null);
    const datasetControl = useDatasetControl();
    const ganttManager = useMemo(() => new GanttManager2({ datasetControl }), []);
    const gantt = ganttManager.getGanttInstance();
    const theme = useTheme();
    const styles = useMemo(() => getGanttStyles(theme), []);
    const [tooltip, setTooltip] = useState<{ task: Task; event: MouseEvent } | null>(null);

    const onMouseMove = useCallback((event: MouseEvent) => {
        const taskAttr = gantt.config.task_attribute;
        const taskNode = (event.target as HTMLElement).closest<HTMLElement>(`[${taskAttr}]:not(.gantt_task_row)`);
        if (!taskNode) {
            setTooltip(null);
            return;
        }
        const taskId = taskNode.getAttribute(taskAttr);
        if (!taskId || !gantt.isTaskExists(taskId)) {
            setTooltip(null);
            return;
        }
        setTooltip({ task: gantt.getTask(taskId), event });
    }, []);

    const onMouseOut = useCallback((event: MouseEvent) => {
        const taskAttr = gantt.config.task_attribute;
        const related = event.relatedTarget as HTMLElement | null;
        if (!related?.closest(`[${taskAttr}]:not(.gantt_task_row)`)) {
            setTooltip(null);
        }
    }, []);

    useEffect(() => {
        if (!ref.current) {
            throw new Error("Gantt container ref is not assigned");
        }
        ganttManager.onInit({ container: ref.current });
        ref.current.addEventListener('mousemove', onMouseMove);
        ref.current.addEventListener('mouseout', onMouseOut);

        return () => {
            ref.current?.removeEventListener('mousemove', onMouseMove);
            ref.current?.removeEventListener('mouseout', onMouseOut);
        };
    }, []);

    return (
        <>
            <div ref={ref} className={styles.root} style={{ width: '100%', height: '100%' }} />
            <GanttComponentsContext.Provider value={components}>
                {tooltip && components.onRenderTaskTooltip({ task: tooltip.task, event: tooltip.event })}
            </GanttComponentsContext.Provider>
        </>
    );
}