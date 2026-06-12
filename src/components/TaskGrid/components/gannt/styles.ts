import { ITheme, mergeStyleSets } from "@fluentui/react";


export const getGanttStyles = (theme: ITheme) => {
    return mergeStyleSets({
        root: {
            // Map Fluent UI theme to dhtmlx-gantt CSS variables
            '--dhx-gantt-base-colors-background': theme.semanticColors.bodyBackground,
            '--dhx-gantt-base-colors-background-alt': theme.semanticColors.bodyBackgroundChecked,
            '--dhx-gantt-base-colors-text-base': theme.semanticColors.bodyText,
            '--dhx-gantt-base-colors-text-light': theme.semanticColors.bodySubtext,
            '--dhx-gantt-base-colors-text-on-fill': theme.semanticColors.buttonTextChecked,
            '--dhx-gantt-base-colors-border': theme.semanticColors.variantBorder,
            '--dhx-gantt-base-colors-border-light': theme.semanticColors.bodyFrameDivider,
            '--dhx-gantt-base-colors-primary': theme.palette.themePrimary,
            '--dhx-gantt-base-colors-hover-color': theme.semanticColors.menuItemBackgroundHovered,
            '--dhx-gantt-base-colors-select': 'transparent',
            //'--dhx-gantt-task-row-border': theme.semanticColors.menuDivider,
            '--dhx-gantt-base-colors-disabled': theme.semanticColors.disabledBackground,
            '--dhx-gantt-base-colors-icons': theme.semanticColors.bodySubtext,
            '--dhx-gantt-base-colors-error': theme.semanticColors.errorText,
            '--dhx-gantt-task-background': theme.palette.themePrimary,
            '--dhx-gantt-task-color': theme.semanticColors.primaryButtonText,
            '--dhx-gantt-project-background': theme.palette.themeSecondary,
            '--dhx-gantt-link-background': theme.semanticColors.bodySubtext,
            '--dhx-gantt-link-background-hover': theme.palette.themePrimary,
            '--dhx-gantt-popup-background': theme.semanticColors.bodyBackground,
            '--dhx-gantt-popup-color': theme.semanticColors.bodyText,
            '--dhx-gantt-tooltip-background': theme.semanticColors.bodyText,
            '--dhx-gantt-tooltip-color': theme.semanticColors.bodyBackground,
            '.gantt_row_inactive': {
                position: 'relative',
                '::after': {
                    content: '""',
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: theme.semanticColors.disabledBackground,
                    opacity: 0.5,
                    zIndex: 1,
                    pointerEvents: 'all',
                    cursor: 'not-allowed',
                },
            },
                '.gantt_task_row.gantt_selected': {
                    backgroundColor: 'transparent !important',
                    position: 'relative',
                    '::after': {
                        content: '""',
                        opacity: 0.2,
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: theme.palette.themePrimary,
                        pointerEvents: 'none',
                        zIndex: 0,
                    },
                },
            '.gantt_task_content': {
                textOverflow: 'ellipsis',
                paddingLeft: 5,
                paddingRight: 5,
                fontWeight: 600
            },
            '.gantt_task_scale': {
                fontWeight: 600
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