import { ITheme, mergeStyleSets } from "@fluentui/react";


export const getGanttStyles = (theme: ITheme) => {
    return mergeStyleSets({
        root: {
            // ── Typography ────────────────────────────────────────────────
            '--dhx-gantt-font-family': theme.fonts.medium.fontFamily,
            '--dhx-gantt-font-size': theme.fonts.medium.fontSize,

            // ── Base colors ───────────────────────────────────────────────
            '--dhx-gantt-base-colors-white': theme.palette.white,
            '--dhx-gantt-base-colors-background': theme.semanticColors.bodyBackground,
            '--dhx-gantt-base-colors-background-alt': theme.semanticColors.bodyBackgroundChecked,
            '--dhx-gantt-base-colors-text-base': theme.semanticColors.bodyText,
            '--dhx-gantt-base-colors-text-light': theme.semanticColors.bodySubtext,
            '--dhx-gantt-base-colors-text-on-fill': theme.semanticColors.primaryButtonText,
            '--dhx-gantt-base-colors-border': theme.semanticColors.variantBorder,
            '--dhx-gantt-base-colors-border-light': theme.semanticColors.bodyFrameDivider,
            '--dhx-gantt-base-colors-icons': theme.semanticColors.bodySubtext,
            '--dhx-gantt-base-colors-icons-active': theme.palette.neutralSecondary,
            '--dhx-gantt-base-colors-icons-hover': theme.palette.neutralPrimaryAlt,
            '--dhx-gantt-base-colors-disabled': theme.semanticColors.disabledBackground,
            '--dhx-gantt-base-colors-readonly': theme.semanticColors.disabledText,
            '--dhx-gantt-base-colors-hover-color': theme.semanticColors.menuItemBackgroundHovered,
            '--dhx-gantt-base-colors-select': theme.palette.themeLighterAlt,
            // Primary shades
            '--dhx-gantt-base-colors-primary': theme.palette.themePrimary,
            '--dhx-gantt-base-colors-primary-hover': theme.palette.themeDarkAlt,
            '--dhx-gantt-base-colors-primary-active': theme.palette.themeDark,
            '--dhx-gantt-base-colors-primary-lighter': theme.palette.themeLighter,
            // Error shades
            '--dhx-gantt-base-colors-error': theme.semanticColors.errorText,
            '--dhx-gantt-base-colors-error-lighter': theme.semanticColors.errorBackground,

            // ── Off-time / scale ──────────────────────────────────────────
            '--dhx-gantt-offtime-background': theme.semanticColors.bodyBackgroundChecked,

            // ── Task bars ────────────────────────────────────────────────
            '--dhx-gantt-task-background': theme.palette.themePrimary,
            '--dhx-gantt-task-color': theme.semanticColors.primaryButtonText,
            '--dhx-gantt-task-line-text': theme.semanticColors.bodyText,
            '--dhx-gantt-project-background': theme.palette.themeSecondary,
            '--dhx-gantt-project-color': theme.semanticColors.primaryButtonText,
            '--dhx-gantt-task-row-background': theme.semanticColors.bodyBackground,
            '--dhx-gantt-task-row-background--odd': theme.semanticColors.bodyBackground,
            '--dhx-gantt-task-row-border': `1px solid ${theme.semanticColors.variantBorder}`,

            // ── Links ────────────────────────────────────────────────────
            '--dhx-gantt-link-background': theme.semanticColors.bodySubtext,
            '--dhx-gantt-link-background-hover': theme.palette.themePrimary,
            '--dhx-gantt-link-critical-background': theme.semanticColors.errorText,
            '--dhx-gantt-link-handle-border': theme.semanticColors.variantBorder,
            '--dhx-gantt-link-handle-border-hover': theme.semanticColors.bodyFrameDivider,
            '--dhx-gantt-link-handle-background': theme.palette.neutralLight,
            '--dhx-gantt-link-handle-background-hover': theme.semanticColors.bodySubtext,
            '--dhx-gantt-progress-handle-border': theme.semanticColors.variantBorder,
            '--dhx-gantt-progress-handle-background': theme.semanticColors.bodySubtext,

            // ── Popup / tooltip ───────────────────────────────────────────
            '--dhx-gantt-popup-background': theme.semanticColors.bodyBackground,
            '--dhx-gantt-popup-color': theme.semanticColors.bodyText,
            '--dhx-gantt-popup-border': `1px solid ${theme.semanticColors.variantBorder}`,
            '--dhx-gantt-tooltip-background': theme.semanticColors.bodyText,
            '--dhx-gantt-tooltip-color': theme.semanticColors.bodyBackground,
            '--dhx-gantt-tooltip-border': 'none',

            // ── Lightbox ─────────────────────────────────────────────────
            '--dhx-gantt-lightbox-background': theme.semanticColors.bodyBackground,
            '--dhx-gantt-lightbox-color': theme.semanticColors.bodyText,
            '--dhx-gantt-lightbox-control-border': `1px solid ${theme.semanticColors.variantBorder}`,
            '--dhx-gantt-lightbox-title-background': theme.palette.neutralLighterAlt,
            '--dhx-gantt-lightbox-title-color': theme.semanticColors.bodyText,

            // ── Buttons ───────────────────────────────────────────────────
            '--dhx-gantt-btn-background': theme.palette.themePrimary,
            '--dhx-gantt-btn-color': theme.semanticColors.primaryButtonText,
            '--dhx-gantt-btn-border-color': theme.palette.themePrimary,
            '--dhx-gantt-btn-color-hover': theme.semanticColors.primaryButtonText,
            '--dhx-gantt-btn-background-hover': theme.palette.themeDarkAlt,
            '--dhx-gantt-btn-border-hover': theme.palette.themeDarkAlt,
            '--dhx-gantt-btn-color-active': theme.semanticColors.primaryButtonText,
            '--dhx-gantt-btn-background-active': theme.palette.themeDark,
            '--dhx-gantt-btn-border-active': theme.palette.themeDark,
            '--dhx-gantt-btn-background-disabled': theme.semanticColors.disabledBackground,
            '--dhx-gantt-btn-color-disabled': theme.semanticColors.disabledText,
            '--dhx-gantt-btn-border-color-disabled': theme.semanticColors.disabledBackground,
            // Outline button variants
            '--dhx-gantt-btn-outline-background': 'transparent',
            '--dhx-gantt-btn-outline-color': theme.palette.themePrimary,
            '--dhx-gantt-btn-outline-border-color': theme.palette.themePrimary,
            '--dhx-gantt-btn-outline-background-hover': theme.palette.themeLighter,
            '--dhx-gantt-btn-outline-color-hover': theme.palette.themeDarkAlt,
            '--dhx-gantt-btn-outline-border-hover': theme.palette.themeDarkAlt,
            '--dhx-gantt-btn-outline-background-active': theme.palette.themeDark,
            '--dhx-gantt-btn-outline-color-active': theme.semanticColors.primaryButtonText,
            '--dhx-gantt-btn-outline-border-active': theme.palette.themeDark,
            '--dhx-gantt-btn-outline-background-disabled': 'transparent',
            '--dhx-gantt-btn-outline-color-disabled': theme.semanticColors.disabledText,
            '--dhx-gantt-btn-outline-border-color-disabled': theme.semanticColors.disabledText,

            // ── Info / modal ──────────────────────────────────────────────
            '--dhx-gantt-info-background': theme.semanticColors.bodyBackground,
            '--dhx-gantt-info-color': theme.semanticColors.bodyText,
            '--dhx-gantt-info-border': `1px solid ${theme.semanticColors.variantBorder}`,
            '--dhx-gantt-modal-background': theme.semanticColors.bodyBackground,
            '--dhx-gantt-modal-color': theme.semanticColors.bodyText,
            '--dhx-gantt-modal-border': `1px solid ${theme.semanticColors.variantBorder}`,

            // ── Undo / delete toast ────────────────────────────────────────
            '--dhx-gantt-undo-delete-background': theme.semanticColors.bodyText,
            '--dhx-gantt-undo-delete-color': theme.semanticColors.primaryButtonText,
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
            '.gantt_task_line.gantt_task_selected, .gantt_task_line.gantt_selection_preview': {
                filter: 'brightness(1.06) saturate(1.08)',
                transition: 'outline-color 120ms ease, filter 120ms ease',
                zIndex: 2,
            },
            position: 'relative',
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
        selectionBox: {
            position: 'absolute',
            border: `1px solid ${theme.palette.themePrimary}`,
            backgroundColor: theme.palette.themeLighterAlt,
            opacity: 0.35,
            pointerEvents: 'none',
            zIndex: 10,
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