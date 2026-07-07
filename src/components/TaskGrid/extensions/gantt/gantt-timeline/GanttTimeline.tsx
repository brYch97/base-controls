import { useEffect, useMemo, useRef } from 'react';
import 'gantt-trial/codebase/dhtmlxgantt.css';
import { useDatasetControl } from '../../../context';
import { getGanttStyles } from './styles';
import { useTheme } from '@fluentui/react';
import { TimelineTaskCreateLine, TimelineTaskCreateRowOverlay } from './components';
import { GanttManager } from './GanttManager';
import { useTimelineTaskCreate } from './hooks/useTimelineTaskCreate';
import { useTooltip } from './hooks/useTooltip';
import { useMarkers } from './hooks/useMarkers/useMarkers';
import { useSelectionBox } from './hooks/useSelectionBox';
import { useGanttComponents } from '../context';

export const GanttTimeline = () => {
    const components = useGanttComponents()
    const ref = useRef<HTMLDivElement>(null);
    const datasetControl = useDatasetControl();
    const ganttManager = useMemo(() => new GanttManager({ datasetControl }), []);
    const gantt = ganttManager.getGanttInstance();
    const theme = useTheme();
    const styles = useMemo(() => getGanttStyles(theme), []);
    const { tooltip } = useTooltip({ gantt });
    const { linePreview, rowOverlay } = useTimelineTaskCreate(ganttManager);
    useSelectionBox(ganttManager);
    useMarkers({ gantt, components, markers: ganttManager.getMarkers() });

    useEffect(() => {
        if (!ref.current) {
            throw new Error("Gantt container ref is not assigned");
        }
        ganttManager.init({ container: ref.current });
        tooltip.init(ref.current);

        return () => {
            ganttManager.destroy();
        };
    }, []);

    return (
        <>
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                <div ref={ref} className={styles.root} style={{ width: '100%', height: '100%' }} />
                {rowOverlay && <TimelineTaskCreateRowOverlay {...rowOverlay} />}
                {linePreview && <TimelineTaskCreateLine {...linePreview} />}
            </div>
            {tooltip.state && components.onRenderTaskTooltip({ task: tooltip.state.task, event: tooltip.state.event })}
        </>
    );
}