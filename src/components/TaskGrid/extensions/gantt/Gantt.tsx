import { getGanttStyles } from './styles';
import { ImperativePanelGroupHandle, Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useDatasetControl, useTaskDataProvider } from '../../context';
import { useContainerWidth } from './hooks/useContainerWidth';
import { Grid } from '../../components/grid';
import { GanttTimeline } from './gantt-timeline';
import { IGanttComponents } from './gantt-timeline/context';
import { useEffect, useMemo, useRef } from 'react';
import { GanttComponentsContext } from './context';
import { GanttComponents } from './gantt-timeline/components';

const DEFAULT_GRID_PANEL_WIDTH_PX = 350;

const MIN_GRID_PANEL_WIDTH_PX = 90;
const MIN_FLAT_LIST_GRID_PANEL_WIDTH_PX = 40;

export interface IGanttProps {
    components?: Partial<IGanttComponents>;
}

const getPercentageFromPx = (containerWidth: number, px: number): number | undefined => {
    if (containerWidth <= 0) {
        return undefined;
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
    const panelRef = useRef<ImperativePanelGroupHandle>(null);
    const provider = useTaskDataProvider();
    const styles = useMemo(() => getGanttStyles(), []);
    const components = useMemo(() => ({ ...GanttComponents, ...props.components }), []);
    const { ref: containerRef, width: containerWidth } = useContainerWidth();

    const isFlatList = provider.isFlatListEnabled();
    const minGridSizePx = isFlatList ? MIN_FLAT_LIST_GRID_PANEL_WIDTH_PX : MIN_GRID_PANEL_WIDTH_PX;
    const minGridPercentage = getPercentageFromPx(containerWidth, minGridSizePx);
    
    const gridWidthPx = datasetControl.getGridWidth() ?? DEFAULT_GRID_PANEL_WIDTH_PX;
    const gridPercentage = getPercentageFromPx(containerWidth, gridWidthPx);
    const ganttPercentage = gridPercentage !== undefined ? 100 - gridPercentage : undefined;

    const onLayout = (layout: number[]) => {
        if (containerWidth <= 0) return;
        const gridPaneSize = layout[0];
        const gridWidthPx = getPxFromPercentage(containerWidth, gridPaneSize);
        datasetControl.setGridWidth(gridWidthPx);
    };

    useEffect(() => {
        if(containerWidth <= 0) return;
        panelRef.current?.setLayout([gridPercentage ?? 0, ganttPercentage ?? 0]);
    }, [containerWidth])


    return (
        <GanttComponentsContext.Provider value={components}>
            <div ref={containerRef} className={styles.taskGridWithGanttRoot}>
                <PanelGroup ref={panelRef} direction="horizontal" onLayout={onLayout}>
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
