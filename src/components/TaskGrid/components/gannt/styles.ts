import { ITheme, mergeStyleSets } from "@fluentui/react";


export const getGanttStyles = (theme: ITheme) => {
    return mergeStyleSets({
        root: {
            '.gantt_task_inactive': {
                opacity: 0.4,
                filter: 'grayscale(60%)',
                '.gantt_task_content': {
                    color: theme.semanticColors.disabledText,
                },
                '.gantt_task_progress': {
                    background: theme.semanticColors.disabledBackground,
                },
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