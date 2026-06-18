import { useEffect, useMemo, useRef } from 'react';
import 'gantt-trial/codebase/dhtmlxgantt.css';
import { useDatasetControl } from '../..';
import { getGanttStyles } from './styles';
import { useTheme } from '@fluentui/react';
import { GanttComponents } from './components/components';
import { GanttComponentsContext, IGanttComponents } from './context';
import { GanttManager } from './GanttManager';
import { useTooltip } from './hooks/useTooltip';
import { useSelectionBox } from './hooks/useSelectionBox';
import { useMarkers } from './hooks/useMarkers/useMarkers';

export interface IGanttProps {
    components?: Partial<IGanttComponents>;
}

export const Gantt = (props: IGanttProps) => {
    const components = useMemo(() => ({ ...GanttComponents, ...props.components }), [props.components]);
    const ref = useRef<HTMLDivElement>(null);
    const datasetControl = useDatasetControl();
    const ganttManager = useMemo(() => new GanttManager({ datasetControl }), []);
    const gantt = ganttManager.getGanttInstance();
    const theme = useTheme();
    const styles = useMemo(() => getGanttStyles(theme), []);
    const {tooltip} = useTooltip({ gantt });
    const selectionBox = useSelectionBox({ container: ref.current, gantt, dataProvider: datasetControl.getDataProvider() });
    useMarkers({ gantt, components });

    useEffect(() => {
        if (!ref.current) {
            throw new Error("Gantt container ref is not assigned");
        }
        tooltip.init(ref.current);
        ganttManager.init({ container: ref.current });
    }, []);

    return (
        <>
            <div ref={ref} className={styles.root} style={{ width: '100%', height: '100%' }}>
                {selectionBox && (
                    <div
                        className={styles.selectionBox}
                        style={{
                            left: selectionBox.left,
                            top: selectionBox.top,
                            width: selectionBox.width,
                            height: selectionBox.height,
                        }}
                    />
                )}
            </div>
            <GanttComponentsContext.Provider value={components}>
                {tooltip.state && components.onRenderTaskTooltip({ task: tooltip.state.task, event: tooltip.state.event })}
            </GanttComponentsContext.Provider>
        </>
    );
}