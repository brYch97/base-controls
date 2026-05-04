import { BryntumGantt } from "@bryntum/gantt-react";
import "@bryntum/gantt/fontawesome/css/fontawesome.css";
import "@bryntum/gantt/fontawesome/css/solid.css";
import "@bryntum/gantt/gantt.css";
import "@bryntum/gantt/svalbard-light.css";
import { useEffect, useMemo, useRef } from "react";
import { useDatasetControl } from "../../context";
import { GanttManager } from "./GanttManager";
import { getGanttStyles } from "./styles";
import { useTheme } from "@fluentui/react";


export const GanttChart = () => {
    const datasetControl = useDatasetControl();
    const ganttManager = useMemo(() => new GanttManager({ datasetControl }), []);
    const theme = useTheme();
    const styles = useMemo(() => getGanttStyles(theme), []);
    const ref = useRef<BryntumGantt>(null);

    useEffect(() => {
        ganttManager.onRetrieveGanntInstance(ref.current!.instance);
    }, []);

    return <div className={styles.ganttContainer}>
        <BryntumGantt
            ref={ref}
            rowHeight={42}
            transitionDuration={0}
            taskEditFeature={false}
            rowExpanderFeature={false}
            taskStore={ganttManager.getStore()} />
    </div>
}