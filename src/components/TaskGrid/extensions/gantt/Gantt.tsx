import { getGanttStyles } from './styles';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useDatasetControl, useTaskDataProvider } from '../../context';
import { Grid } from '../../components/grid';
import { GanttTimeline } from './gantt-timeline';
import { IGanttComponents } from './gantt-timeline/context';
import { useMemo } from 'react';
import { GanttComponentsContext } from './context';
import { GanttComponents } from './gantt-timeline/components';

const DEFAULT_GANTT_WIDTH_PERCENTAGE = 70;
const MIN_GRID_WIDTH_PERCENTAGE = 10;
const MIN_FLAT_LIST_GRID_WIDTH_PERCENTAGE = 5;

export interface IGanttProps {
    components?: Partial<IGanttComponents>;
}

//props should be the components, labels in future
export const Gantt = (props: IGanttProps) => {
    const datasetControl = useDatasetControl();
    const provider = useTaskDataProvider();
    const styles = useMemo(() => getGanttStyles(), []);
    const components = useMemo(() => ({ ...GanttComponents, ...props.components }), []);

    const isFlatList = provider.isFlatListEnabled();
    const minGridWidthPercentage = isFlatList ? MIN_FLAT_LIST_GRID_WIDTH_PERCENTAGE : MIN_GRID_WIDTH_PERCENTAGE;
    const ganttWidthPercentage = datasetControl.getGanttWidth() ?? DEFAULT_GANTT_WIDTH_PERCENTAGE;
    const gridWidthPercentage = 100 - ganttWidthPercentage;

    const onLayout = (layout: number[]) => {
        datasetControl.setGanttWidth(layout[1]);
    };


    return (
        <GanttComponentsContext.Provider value={components}>
            <div className={styles.taskGridWithGanttRoot}>
                <PanelGroup direction="horizontal" onLayout={onLayout}>
                    <Panel defaultSize={gridWidthPercentage} minSize={minGridWidthPercentage}>
                        <Grid
                            context={datasetControl.getPcfContext()}
                            parameters={datasetControl.getParameters()}
                            state={datasetControl.getState()}
                        />
                    </Panel>
                    <PanelResizeHandle />
                    <Panel defaultSize={ganttWidthPercentage}>
                        <GanttTimeline />
                    </Panel>
                </PanelGroup>
            </div>
        </GanttComponentsContext.Provider>
    );
};
