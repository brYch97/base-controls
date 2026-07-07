import { useTheme } from '@fluentui/react';
import { getGanttStyles } from './styles';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useDatasetControl, useTaskDataProvider, useTaskGridDescriptor } from '../../context';
import { useContainerWidth } from './hooks/useContainerWidth';
import { Grid } from '../../components/grid';
import { GanttTimeline } from './gantt-timeline';
import { IGanttComponents } from './gantt-timeline/context';
import { useMemo } from 'react';
import { GanttComponentsContext } from './context';
import { GanttComponents } from './gantt-timeline/components';

const DEFAULT_GRID_PANEL_SIZE_PX = 300;

const MIN_GRID_PANEL_WIDTH_PX = 90;
const MIN_FLAT_LIST_GRID_PANEL_WIDTH_PX = 40;

export interface IGanttProps {
    components?: Partial<IGanttComponents>;
}

const getPercentageFromPx = (containerWidth: number, px: number) => {
    if (containerWidth <= 0) {
        return 0;
    }
    return (px / containerWidth) * 100;
}

const getPxFromPercentage = (containerWidth: number, percentage: number) => {
    if (containerWidth <= 0) {
        return 0;
    }
    return (percentage / 100) * containerWidth;
}

//props should be the components, labels in future
export const Gantt = (props: IGanttProps) => {
    const datasetControl = useDatasetControl();
    const provider = useTaskDataProvider();
    const styles = useMemo(() => getGanttStyles(), []);
    const components = useMemo(() => ({ ...GanttComponents, ...props.components }), []);
    const { ref: containerRef, width: containerWidth } = useContainerWidth();

    const isFlatList = provider.isFlatListEnabled();
    const minGridSizePx = isFlatList ? MIN_FLAT_LIST_GRID_PANEL_WIDTH_PX : MIN_GRID_PANEL_WIDTH_PX;
    const minGridPercentage = getPercentageFromPx(containerWidth, minGridSizePx);
    
    const ganttWidthPx = datasetControl.getGanttWidth() ?? DEFAULT_GANTT_PANE_SIZE_PX;
    const ganttPercentage = getPercentageFromPx(containerWidth, ganttWidthPx);
    const gridPercentage = 100 - ganttPercentage;

    const onLayout = (layout: number[]) => {
        if (containerWidth <= 0) return;
        const ganttPaneSize = layout[1];
        const ganttWidthPx = getPxFromPercentage(containerWidth, ganttPaneSize);
        datasetControl.setGanttWidth(ganttWidthPx);
    };


    return (
        <GanttComponentsContext.Provider value={components}>
            <div ref={containerRef} className={styles.taskGridWithGanttRoot}>
                <PanelGroup direction="horizontal" onLayout={onLayout}>
                    <Panel defaultSize={gridPercentage} minSize={minGridPercentage}>
                        <Grid
                            context={datasetControl.getPcfContext()}
                            parameters={datasetControl.getParameters()}
                            state={datasetControl.getState()}
                        />
                    </Panel>
                    <PanelResizeHandle />
                    <Panel defaultSize={ganttPercentage}>
                        <GanttTimeline />
                    </Panel>
                </PanelGroup>
            </div>
        </GanttComponentsContext.Provider>
    );
};
