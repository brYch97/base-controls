import { useEventEmitter } from "../../hooks/useEventEmitter"
import { IDatasetControlEvents } from "../../utils/dataset-control";
import { useRef } from "react";
import * as React from "react";
import { AgGridLicenseKeyContext, DatasetControlContext, LocalizationServiceContext, PcfContext, RootElementIdContext, TaskDataProviderContext, TaskGridComponentsContext, TaskGridDescriptorContext, usePcfContext } from "./context";
import { DatasetControl as DatasetControlRenderer } from "../DatasetControl";
import { Callout, IconButton, useTheme } from "@fluentui/react";
import { getDatasetControlStyles } from "./styles";
import { Grid } from "./components/grid";
import { ITaskDataProvider } from "./providers/task";
import { ITaskGridLabels } from "./labels";
import { TASK_GRID_LABELS } from "./labels";
import { ITaskGridState, TaskGridDatasetControlFactory } from "./TaskGridDatasetControlFactory";
import { Header } from "./components/header/Header";
import { ITaskGridComponents, TaskGridComponents } from "./components/components";
import { ITaskGridDescriptor, ITaskGridDatasetControl } from "./interfaces";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
//offset of the checkbox control button in ag-grid, used for calculating default grid pane size
import { LocalizationService } from "../../utils";
import { Gantt } from "./components/gannt/Gantt";

const CHECKBOX_CONTROL_BTN_OFFSET = 80;
const DEFAULT_GANTT_PANE_SIZE = 65;

interface ITaskGridProps {
    //should be replaced by Context API in future
    pcfContext: ComponentFramework.Context<any, any>;
    taskGridDescriptor: ITaskGridDescriptor;
    labels?: Partial<ITaskGridLabels>;
    components?: Partial<ITaskGridComponents>;
}

interface IInternalTaskGridProps extends ITaskGridProps {
    datasetControl: ITaskGridDatasetControl;
    onRemountRequested: () => void;
}

//serves for keeping track of lifecycle
export const TaskGrid = (props: ITaskGridProps) => {
    const { taskGridDescriptor } = props;
    const stateRef = useRef<ITaskGridState>({});
    const components = { ...TaskGridComponents, ...props.components };
    const pcfContextRef = useRef(props.pcfContext);
    pcfContextRef.current = props.pcfContext;
    const localizationService = React.useMemo(() => new LocalizationService({ ...TASK_GRID_LABELS, ...props.labels }), []);

    const [instanceState, setInstanceState] = React.useState<{
        instance: ITaskGridDatasetControl;
        remountKey: number;
    } | null>(null);

    const createDatasetControlInstance = async () => {
        setInstanceState(null);
        const instance = await TaskGridDatasetControlFactory.createInstance({
            taskGridDescriptor,
            localizationService,
            state: stateRef.current,
            onGetPcfContext: () => pcfContextRef.current!,
        });
        setInstanceState(prev => ({ instance, remountKey: (prev?.remountKey ?? 0) + 1 }));
    };

    React.useEffect(() => {
        createDatasetControlInstance();
    }, []);

    if (!instanceState) {
        return components.onRenderSkeleton({
            height: taskGridDescriptor.onGetHeight?.() ?? '400px'
        })
    }

    return (
        <PcfContext.Provider value={pcfContextRef.current}>
            <LocalizationServiceContext.Provider value={localizationService}>
                <AgGridLicenseKeyContext.Provider value={taskGridDescriptor.onGetGridParameters?.()?.agGridLicenseKey ?? null}>
                    <TaskGridComponentsContext.Provider value={components}>
                        <InternalTaskGridDatasetControl
                            key={instanceState.remountKey}
                            {...props}
                            datasetControl={instanceState.instance}
                            onRemountRequested={createDatasetControlInstance}
                        />
                    </TaskGridComponentsContext.Provider>
                </AgGridLicenseKeyContext.Provider>
            </LocalizationServiceContext.Provider>
        </PcfContext.Provider>
    );
}

const InternalTaskGridDatasetControl = (props: IInternalTaskGridProps) => {
    const { datasetControl, onRemountRequested, taskGridDescriptor } = props;
    const theme = useTheme();
    const styles = React.useMemo(() => getDatasetControlStyles(theme, '100%'), [theme]);
    const provider = datasetControl.getDataset().getDataProvider() as ITaskDataProvider;
    const rootElementId = `${datasetControl.getControlId()}-root`;
    const ganttComponent = taskGridDescriptor.extensions?.gantt?.onGetGanttComponent({
        components: {}
    });
    const defaultGanttPaneSize = datasetControl.getGanttWidth() ?? DEFAULT_GANTT_PANE_SIZE;
    const defaultGridPaneSize = 100 - defaultGanttPaneSize;

    const onLayout = (layout: number[]) => {
        const ganttPaneSize = layout[1];
        if (ganttPaneSize == undefined) {
            return;
        }
        datasetControl.setGanttWidth(ganttPaneSize);
    };

    useEventEmitter<IDatasetControlEvents>(datasetControl, 'onRemountRequested', onRemountRequested);

    React.useEffect(() => {
        datasetControl.getDataset().refresh();
    }, []);

    return <>
        <DatasetControlContext.Provider value={datasetControl}>
            <TaskDataProviderContext.Provider value={provider}>
                <TaskGridDescriptorContext.Provider value={taskGridDescriptor}>
                    <RootElementIdContext.Provider value={rootElementId}>
                        <DatasetControlRenderer
                            onGetDatasetControlInstance={() => datasetControl}
                            onGetControlComponent={(props) => {
                                return (
                                    <div className={styles.container}>
                                        {ganttComponent ? (
                                            <PanelGroup direction="horizontal" onLayout={onLayout}>
                                                <Panel defaultSize={defaultGridPaneSize}>
                                                    <Grid {...props} />
                                                </Panel>
                                                <PanelResizeHandle className={styles.divider} />
                                                <Panel className={styles.ganttPanel} defaultSize={defaultGanttPaneSize}>
                                                    {ganttComponent}
                                                </Panel>
                                            </PanelGroup>
                                        ) : (
                                            <Grid {...props} />
                                        )}
                                    </div>
                                );
                            }}
                            onOverrideComponentProps={(props) => {
                                return {
                                    ...props,
                                    onRender: (props, defaultRender) => {
                                        return defaultRender({
                                            ...props,
                                            container: {
                                                ...props.container,
                                                id: rootElementId,
                                                className: `${props.container.className} ${styles.datasetControlRoot}`
                                            },
                                            onRenderHeader: (props, defaultRender) => <Header headerProps={props} defaultRender={defaultRender} />
                                        })
                                    }
                                }
                            }} />

                    </RootElementIdContext.Provider>
                </TaskGridDescriptorContext.Provider>
            </TaskDataProviderContext.Provider>
        </DatasetControlContext.Provider >
    </>
}