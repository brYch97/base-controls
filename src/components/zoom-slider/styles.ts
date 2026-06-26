import { ITheme, mergeStyleSets } from "@fluentui/react";

export const getZoomSliderStyles = (theme: ITheme) => {
    return mergeStyleSets({
        root: {
            minWidth: 220,
            paddingTop: 4,
            marginRight: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            '.ms-Slider': {
                marginBottom: 0,
            },
            '.ms-Slider-label': {
                color: theme.semanticColors.bodyText,
                fontWeight: 600,
            }
        },
        slider: {
            flexGrow: 1,
        },
        zoomButton: {
            width: 22,
            height: 22,
            'i': {
                fontSize: 12
            }
        },
        thumb: {
            borderRadius: '50%',
            width: 22,
            height: 22,
            top: -8,
            border: 'none !important',
            boxShadow: theme.effects.elevation16,
            backgroundColor: theme.palette.themePrimary,
            '::after': {
                content: '""',
                display: 'block',
                width: 13,
                height: 13,
                position: 'absolute',
                top: 11.5,
                left: 11.5,
                transform: 'translate(-50%, -50%)',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Ccircle cx='8' cy='8' r='5.5' stroke='white' stroke-width='2.5' fill='none'/%3E%3Cline x1='12.5' y1='12.5' x2='15.5' y2='15.5' stroke='white' stroke-width='2.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
            }
        },
        activeSection: {
            backgroundColor: `${theme.palette.themePrimary} !important`,
        }
    });
}