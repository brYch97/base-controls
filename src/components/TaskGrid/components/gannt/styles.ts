import { ITheme, mergeStyleSets } from "@fluentui/react";


export const getGanttStyles = (theme: ITheme) => {
    return mergeStyleSets({
        root: {
            '.gantt_task_inactive': {
                background: 'red'
            }
        },
        ganttContainer: {
            height: '100%',
            flex: 1,
            width: 0,
            '> .b-widget': {
                borderBottom: `1px solid ${theme.semanticColors.menuDivider}`
            },
            '.b-grid-header-scroller': {
                height: 44
            }
        }
    })
}