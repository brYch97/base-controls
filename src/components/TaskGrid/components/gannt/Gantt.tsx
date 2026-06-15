import { useEffect, useMemo, useRef } from 'react';
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';
import { useDatasetControl } from '../..';
import { getGanttStyles } from './styles';
import { useTheme } from '@fluentui/react';
import { GanttComponents } from './components/components';
import { GanttComponentsContext, IGanttComponents } from './context';
import { GanttManager } from './GanttManager';
import { useTooltip } from './hooks/useTooltip';
import { useSelectionBox } from './hooks/useSelectionBox';

interface IGanttProps {
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
    const tooltip = useTooltip({ container: ref.current, gantt });
    const selectionBox = useSelectionBox({ container: ref.current, gantt, dataProvider: datasetControl.getDataProvider() });

    useEffect(() => {
        if (!ref.current) {
            throw new Error("Gantt container ref is not assigned");
        }
        ganttManager.init({ container: ref.current });
    }, []);

    return (
        <>
            <div ref={ref} className={styles.root} style={{ width: '100%', height: '100%', position: 'relative' }}>
                {selectionBox && (
                    <div
                        style={{
                            position: 'absolute',
                            left: selectionBox.left,
                            top: selectionBox.top,
                            width: selectionBox.width,
                            height: selectionBox.height,
                            border: `1px solid ${theme.palette.themePrimary}`,
                            backgroundColor: theme.palette.themeLighterAlt,
                            opacity: 0.35,
                            pointerEvents: 'none',
                            zIndex: 10,
                        }}
                    />
                )}
            </div>
            <GanttComponentsContext.Provider value={components}>
                {tooltip && components.onRenderTaskTooltip({ task: tooltip.task, event: tooltip.event })}
            </GanttComponentsContext.Provider>
        </>
    );
}