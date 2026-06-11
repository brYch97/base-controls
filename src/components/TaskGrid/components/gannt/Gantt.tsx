import { gantt } from 'dhtmlx-gantt';
import { useEffect, useMemo, useRef } from 'react';
import { GanttManager2 } from './GanttManager2';
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';

export const Gantt = () => {
    const ref = useRef<HTMLDivElement>(null);
    const ganttManager = useMemo(() => new GanttManager2(), []);

    useEffect(() => {
        if(!ref.current) {
            throw new Error("Gantt container ref is not assigned");
        }
        ganttManager.onInit({ container: ref.current });
    }, []);

    return <div ref={ref} style={{width: '100%', height: '100%'}} />
}