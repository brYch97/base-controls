import { gantt } from 'dhtmlx-gantt';
import { useEffect, useMemo, useRef } from 'react';
import { GanttManager2 } from './GanttManager2';
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';
import { useDatasetControl } from '../..';

export const Gantt = () => {
    const ref = useRef<HTMLDivElement>(null);
    const datasetControl = useDatasetControl();
    const ganttManager = useMemo(() => new GanttManager2({ datasetControl }), []);
    const styles = useMemo(() => get)

    useEffect(() => {
        if(!ref.current) {
            throw new Error("Gantt container ref is not assigned");
        }
        ganttManager.onInit({ container: ref.current });
    }, []);

    return <div ref={ref} style={{width: '100%', height: '100%'}} />
}