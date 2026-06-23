import { ITheme, mergeStyleSets } from "@fluentui/react";
import {
    CUSTOM_MARKER_CLASS,
    MILESTONE_MARKER_CLASS,
    PROJECT_END_MARKER_CLASS,
    PROJECT_START_MARKER_CLASS,
    TODAY_MARKER_CLASS,
} from "./GanttMarkers";


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
            '--dhx-gantt-task-background': '#9BCB96',
            '--dhx-gantt-task-color': theme.semanticColors.bodyText,
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
                    pointerEvents: 'none',
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
            '.gantt_task_line.gantt_task_summary': {
                backgroundColor: '#8DB7E8 !important',
                borderColor: 'transparent !important',
                boxShadow: 'none',
            },
            '.gantt_task_line.gantt_task_summary .gantt_task_progress': {
                backgroundColor: '#6A9AD6 !important',
            },
            '.gantt_task_line.gantt_task_summary .gantt_task_content': {
                color: `${theme.palette.neutralPrimary} !important`,
            },
            '.gantt_task_line:not(.gantt_task_summary)': {
                backgroundColor: '#9BCB96 !important',
                borderColor: 'transparent !important',
                boxShadow: 'none',
            },
            '.gantt_task_line:not(.gantt_task_summary) .gantt_task_progress': {
                backgroundColor: '#69A96B !important',
            },
            '.gantt_data_area': {
                cursor: 'grab',
            },
            '.gantt_data_area:active': {
                cursor: 'grabbing',
            },
            '&.gantt_shift_held .gantt_task_bg, &.gantt_shift_held .gantt_task_cell, &.gantt_shift_held .gantt_data_area': {
                cursor: 'default',
            },
            position: 'relative',
            '.gantt_task_content': {
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                paddingLeft: 5,
                paddingRight: 5,
                fontWeight: 600,
                color: 'contrast-color(#9BCB96)'
            },
            '.gantt_left': {
                marginLeft: 8,
                color: theme.semanticColors.bodyText,
                fontSize: 14,
            },
            '.gantt_task_scale': {
                fontWeight: 600
            },
            '.gantt_scale_cell.weekend, .gantt_task_cell.weekend': {
                backgroundColor: theme.palette.themeLighterAlt,
            },
            '.gantt_scale_cell.weekend': {
                color: theme.semanticColors.bodySubtext,
            },
            // ── Marker vertical lines ─────────────────────────────────────
            '.gantt_marker': {
                width: 2,
                marginLeft: -1,
                opacity: 1,
                pointerEvents: 'none',
            },
            [`.gantt_marker.${TODAY_MARKER_CLASS}`]: {
                backgroundColor: 'var(--today-marker-color)',
            },
            [`.gantt_marker.${PROJECT_START_MARKER_CLASS}, .gantt_marker.${PROJECT_END_MARKER_CLASS}`]: {
                backgroundColor: 'var(--project_start-marker-color)',
            },
            [`.gantt_marker.${MILESTONE_MARKER_CLASS}`]: {
                backgroundColor: 'var(--milestone-marker-color)',
            },
            [`.gantt_marker.${CUSTOM_MARKER_CLASS}`]: {
                backgroundColor: 'var(--custom-marker-color)',
            },
            // Hide the library-rendered chip — labels are injected into the scale header instead
            '.gantt_marker .gantt_marker_content': {
                display: 'none',
            },
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