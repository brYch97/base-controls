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
import { useTopLeftOverlay } from './hooks/useTopLeftOverlay';

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
    const { tooltip } = useTooltip({ gantt });
    const { selectionBox } = useSelectionBox({ gantt, dataProvider: datasetControl.getDataProvider() });
    useTopLeftOverlay({ gantt });
    useMarkers({ gantt, components, markers: ganttManager.getMarkers()});

    useEffect(() => {
        if (!ref.current) {
            throw new Error("Gantt container ref is not assigned");
        }
        ganttManager.init({ container: ref.current });
        tooltip.init(ref.current);
        selectionBox.init(ref.current);
    }, []);

    return (
        <>
            <div ref={ref} className={styles.root} style={{ width: '100%', height: '100%' }}>
                {selectionBox.state && (
                    <div
                        className={styles.selectionBox}
                        style={{
                            left: selectionBox.state.left,
                            top: selectionBox.state.top,
                            width: selectionBox.state.width,
                            height: selectionBox.state.height,
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