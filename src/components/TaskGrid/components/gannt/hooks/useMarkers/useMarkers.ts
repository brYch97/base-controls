import { GanttStatic } from 'gantt-trial';
import { useEffect, useMemo } from 'react';
import { IGanttComponents } from '../../context';
import ReactDOM from 'react-dom';
import { getMarkerStyles } from './styles';

interface IUseMarkersParams {
    gantt: GanttStatic;
    components: IGanttComponents;
}

const SCALE_LABEL_ATTR = 'data-gantt-marker-label';
const LABEL_OVERLAY_ATTR = 'data-gantt-marker-overlay';

export const useMarkers = (params: IUseMarkersParams) => {
    const { gantt, components } = params;
    const styles = useMemo(() => getMarkerStyles(), []);

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
            ReactDOM.render(components.onRenderMarker(marker), chip);
            chip.setAttribute(SCALE_LABEL_ATTR, String(marker.id));
            chip.className = `gantt_marker_scale_label${marker.css ? ` ${marker.css}` : ''}`;
            chip.style.left = `${left - 7}px`;
            overlay.appendChild(chip);
        }
    };

    useEffect(() => {
        const eventId = gantt.attachEvent('onGanttRender', renderScaleLabels);
        renderScaleLabels();

        return () => {
            gantt.detachEvent(eventId);
            const taskEl = (gantt as any).$task as HTMLElement | null | undefined;
            taskEl?.querySelector<HTMLElement>(`[${LABEL_OVERLAY_ATTR}]`)?.remove();
        };
    }, [gantt]);
};