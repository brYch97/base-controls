import { GanttStatic } from 'gantt-trial';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';

const TOP_LEFT_OVERLAY_ATTR = 'data-gantt-top-left-overlay';

interface IUseTopLeftOverlayParams {
    gantt: GanttStatic;
}

export const useTopLeftOverlay = (params: IUseTopLeftOverlayParams) => {
    const { gantt } = params;

    const getOrCreateContainer = (): HTMLElement | null => {
        const taskEl = (gantt as any).$task as HTMLElement | null | undefined;
        const layoutContent = taskEl?.closest('.gantt_layout_content') as HTMLElement | null | undefined;
        if (!layoutContent) return null;

        let container = layoutContent.querySelector(`[${TOP_LEFT_OVERLAY_ATTR}]`) as HTMLElement | null;
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
        ReactDOM.render(React.createElement('div', null, 'overlay'), container);
    };

    useEffect(() => {
        const eventId = gantt.attachEvent('onGanttRender', renderContent);
        renderContent();

        return () => {
            const taskEl = (gantt as any).$task as HTMLElement | null | undefined;
            const layoutContent = taskEl?.closest('.gantt_layout_content') as HTMLElement | null | undefined;
            const container = layoutContent?.querySelector(`[${TOP_LEFT_OVERLAY_ATTR}]`) as HTMLElement | null | undefined;
            if (container) {
                ReactDOM.unmountComponentAtNode(container);
                container.remove();
            }
            gantt.detachEvent(eventId);
        };
    }, [gantt]);
};
