import { useLayoutEffect, useRef, useState } from 'react';

export const useContainerWidth = () => {
    const ref = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;

        const resizeHandles = Array.from(el.querySelectorAll<HTMLElement>('[data-panel-resize-handle-id]'));
        const updateWidth = (containerWidth: number) => {
            const resizeHandleWidth = resizeHandles.reduce((totalWidth, resizeHandle) => totalWidth + resizeHandle.offsetWidth, 0);
            setWidth(Math.max(containerWidth - resizeHandleWidth, 0));
        };

        const observer = new ResizeObserver(entries => {
            updateWidth(entries[0].contentRect.width);
        });

        observer.observe(el);

        resizeHandles.forEach(resizeHandle => {
            observer.observe(resizeHandle);
        });

        updateWidth(el.getBoundingClientRect().width);

        return () => observer.disconnect();
    }, []);

    return { ref, width };
};
