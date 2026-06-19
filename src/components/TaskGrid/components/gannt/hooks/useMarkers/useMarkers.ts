import { GanttStatic } from 'gantt-trial';
import { useEffect, useMemo } from 'react';
import { IGanttComponents } from '../../context';
import ReactDOM from 'react-dom';
import { getMarkerStyles } from './styles';
import {
    CUSTOM_MARKER_CLASS,
    IGanttMarkers,
    IGanttMarkersEvents,
    LABEL_OVERLAY_ATTR,
    MILESTONE_MARKER_CLASS,
    PROJECT_END_MARKER_CLASS,
    PROJECT_START_MARKER_CLASS,
    SCALE_LABEL_ATTR,
    TODAY_MARKER_CLASS,
} from '../../GanttMarkers';
import { MarkerType } from '../../components/marker';
import { useEventEmitter } from '../../../../../../hooks';

interface IUseMarkersParams {
    gantt: GanttStatic;
    markers: IGanttMarkers;
    components: IGanttComponents;
}


const getMarkerType = (css: string): MarkerType => {
    switch (css) {
        case MILESTONE_MARKER_CLASS:
            return 'milestone';
        case PROJECT_START_MARKER_CLASS:
            return 'project_start';
        case PROJECT_END_MARKER_CLASS:
            return 'project_end';
        case TODAY_MARKER_CLASS:
            return 'today';
        case CUSTOM_MARKER_CLASS:
        default:
            return 'custom';
    }
};

export const useMarkers = (params: IUseMarkersParams) => {
    const { gantt, markers, components } = params;
    const styles = useMemo(() => getMarkerStyles(), []);
    useEventEmitter<IGanttMarkersEvents>(markers.events, 'onMarkersUpdated', () => {
        renderScaleLabels();
    })

    const renderScaleLabels = () => {
        // Overlay lives as a sibling of $task_scale inside $task so the library
        // never replaces it on zoom re-renders (it only owns $task_scale and $task_data).
        const taskEl = (gantt as any).$task as HTMLElement | null | undefined;
        if (!taskEl) return;

        let overlay = taskEl.querySelector<HTMLElement>(`[${LABEL_OVERLAY_ATTR}]`);
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.setAttribute(LABEL_OVERLAY_ATTR, '');
            overlay.className = styles.overlay;
            taskEl.appendChild(overlay);
        }

        overlay.querySelectorAll<HTMLElement>(`[${SCALE_LABEL_ATTR}]`).forEach((el) => el.remove());

        const scaleHeight = gantt.config.scale_height ?? 44;
        overlay.style.height = `${scaleHeight}px`;

        const markers: any[] = (gantt as any)._getMarkers?.() ?? [];
        for (const marker of markers) {
            const left = gantt.posFromDate(marker.start_date);
            if (!left && left !== 0) continue;

            const chip = document.createElement('div');
            ReactDOM.render(components.onRenderMarker({
                ...marker,
                type: getMarkerType(marker.css),
                innerProps: {

                    className: styles.chip,
                    style: { left: `${left - 1}px` }
                },
            }), chip);
            chip.setAttribute(SCALE_LABEL_ATTR, String(marker.id));
            overlay.appendChild(chip);
        }
    };

    useEffect(() => {
        const eventId = gantt.attachEvent('onGanttRender', renderScaleLabels);
        renderScaleLabels();

        return () => {
            const taskEl = (gantt as any).$task as HTMLElement | null | undefined;
            taskEl?.querySelector<HTMLElement>(`[${LABEL_OVERLAY_ATTR}]`)?.remove();
            gantt.detachEvent(eventId);
        };
    }, [gantt]);
};