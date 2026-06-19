import { GanttStatic } from 'gantt-trial';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';

const TOP_LEFT_OVERLAY_ATTR = 'data-gantt-top-left-overlay';

interface IUseTopLeftOverlayParams {
    gantt: GanttStatic;
    render: () => React.ReactElement;
}

export const useTopLeftOverlay = (params: IUseTopLeftOverlayParams) => {
    const { gantt, render } = params;

    const getOrCreateContainer = (): HTMLElement | null => {
        const layoutContent = (gantt as any).$task?.closest<HTMLElement>('.gantt_layout_content');
        if (!layoutContent) return null;

        let container = layoutContent.querySelector<HTMLElement>(`[${TOP_LEFT_OVERLAY_ATTR}]`);
        if (!container) {
            container = document.createElement('div');
            container.setAttribute(TOP_LEFT_OVERLAY_ATTR, '');
            container.style.position = 'absolute';
            container.style.top = '0';
            container.style.left = '0';
            container.style.zIndex = '10';
            layoutContent.appendChild(container);
        }

        return container;
    };

    const renderContent = () => {
        const container = getOrCreateContainer();
        if (!container) return;
        ReactDOM.render(render(), container);
    };

    useEffect(() => {
        const eventId = gantt.attachEvent('onGanttRender', renderContent);
        renderContent();

        return () => {
            const layoutContent = (gantt as any).$task?.closest<HTMLElement>('.gantt_layout_content');
            const container = layoutContent?.querySelector<HTMLElement>(`[${TOP_LEFT_OVERLAY_ATTR}]`);
            if (container) {
                ReactDOM.unmountComponentAtNode(container);
                container.remove();
            }
            gantt.detachEvent(eventId);
        };
    }, [gantt]);
};
