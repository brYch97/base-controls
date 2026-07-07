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

const DEFAULT_GANTT_PANE_SIZE = 65;
const MIN_GRID_PANEL_WIDTH_PX = 200;
const MIN_FLAT_LIST_GRID_PANEL_WIDTH_PX = 100;

export interface IGanttProps {
    components?: Partial<IGanttComponents>;
}

//props should be the components, labels in future
export const Gantt = (props: IGanttProps) => {
    const datasetControl = useDatasetControl();
    const provider = useTaskDataProvider();
    const styles = useMemo(() => getGanttStyles(), []);
    const components = useMemo(() => ({ ...GanttComponents, ...props.components }), []);
    const { ref: containerRef, width: containerWidth } = useContainerWidth();

    const isFlatList = provider.isFlatListEnabled();
    const minPx = isFlatList ? MIN_FLAT_LIST_GRID_PANEL_WIDTH_PX : MIN_GRID_PANEL_WIDTH_PX;
    const minGridPaneSize = containerWidth > 0 ? (minPx / containerWidth) * 100 : 0;

    const defaultGanttPaneSize = datasetControl.getGanttWidth() ?? DEFAULT_GANTT_PANE_SIZE;
    const defaultGridPaneSize = 100 - defaultGanttPaneSize;

    const onLayout = (layout: number[]) => {
        const ganttPaneSize = layout[1];
        datasetControl.setGanttWidth(ganttPaneSize);
    };

    return (
        <GanttComponentsContext.Provider value={components}>
            <div ref={containerRef} className={styles.taskGridWithGanttRoot}>
                <PanelGroup direction="horizontal" onLayout={onLayout}>
                    <Panel defaultSize={defaultGridPaneSize} minSize={minGridPaneSize}>
                        <Grid
                            context={datasetControl.getPcfContext()}
                            parameters={datasetControl.getParameters()}
                            state={datasetControl.getState()}
                        />
                    </Panel>
                    <PanelResizeHandle />
                    <Panel defaultSize={defaultGanttPaneSize}>
                        <GanttTimeline />
                    </Panel>
                </PanelGroup>
            </div>
        </GanttComponentsContext.Provider>
    );
};
