import { GanttStatic } from 'dhtmlx-gantt';
import { useEffect, useRef } from 'react';

export interface IGanttMarker {
    date: Date;
    label: string;
    css?: string;
}

interface IUseMarkersParams {
    container: HTMLDivElement | null;
    gantt: GanttStatic;
    markers: IGanttMarker[];
}

const MARKER_ATTR = 'data-gantt-marker';

/**
 * Injects marker overlay elements directly into gantt.$task_data (the scrollable
 * timeline canvas). Because the elements live inside the canvas they scroll
 * naturally with the content – no viewport-offset maths required.
 *
 * posFromDate returns an absolute canvas-relative pixel position; that is exactly
 * what we need for elements positioned with `position:absolute` inside $task_data.
 */
export const useMarkers = (params: IUseMarkersParams) => {
    const markersRef = useRef(params.markers);
    markersRef.current = params.markers;

    const renderMarkers = () => {
        const { gantt } = params;
        const canvas = (gantt as any).$task_data as HTMLElement | null | undefined;
        if (!canvas) return;

        // Remove stale marker elements from a previous render pass.
        canvas.querySelectorAll<HTMLElement>(`[${MARKER_ATTR}]`).forEach(el => el.remove());

        for (const marker of markersRef.current) {
            const left = gantt.posFromDate(marker.date);
            // posFromDate returns 0 when the scale is not yet initialised – skip.
            if (!left && left !== 0) continue;

            const el = document.createElement('div');
            el.setAttribute(MARKER_ATTR, marker.label);
            el.className = `gantt_marker${marker.css ? ` ${marker.css}` : ''}`;
            el.style.cssText = [
                'position:absolute',
                `left:${left}px`,
                'top:0',
                'bottom:0',
                'width:2px',
                'pointer-events:none',
                'z-index:5',
            ].join(';');

            const labelEl = document.createElement('span');
            labelEl.className = 'gantt_marker_content';
            labelEl.textContent = marker.label;
            labelEl.style.cssText = 'position:absolute;top:0;left:4px;white-space:nowrap;font-size:11px;';
            el.appendChild(labelEl);

            canvas.appendChild(el);
        }
    };

    useEffect(() => {
        if (!params.container) return;

        // onGanttRender fires after every gantt.render() call (zoom, data load,
        // resize…). At that point the scale is always initialised so posFromDate
        // is reliable.
        const eventId = params.gantt.attachEvent('onGanttRender', renderMarkers);

        // Attempt an initial render in case the gantt has already rendered once.
        renderMarkers();

        return () => {
            params.gantt.detachEvent(eventId);
            // Clean up any injected elements when the hook unmounts.
            const canvas = (params.gantt as any).$task_data as HTMLElement | null | undefined;
            canvas?.querySelectorAll<HTMLElement>(`[${MARKER_ATTR}]`).forEach(el => el.remove());
        };
    }, [params.container]);

    // Re-render markers whenever the marker list changes.
    useEffect(() => {
        renderMarkers();
    }, [params.markers]);
};