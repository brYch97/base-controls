import { mergeStyleSets } from "@fluentui/react";

export const getGanttStyles = () => {
    return mergeStyleSets({
        taskGridWithGanttRoot: {
            height: '100%',
            '.ag-body-horizontal-scroll': {
                position: 'relative !important'
            },
            '.ag-body-vertical-scroll': {
                //we use gantt for vertical scrolling, so we hide the ag-grid scrollbar and sync scroll positions
                width: '0px !important',
                minWidth: '0px !important',
            },
        }
    });
};