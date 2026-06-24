import { ITheme, mergeStyleSets } from "@fluentui/react";

export const getSettingsSliderStyles = (theme: ITheme) => {
    return mergeStyleSets({
        root: {
            minWidth: 220,
            paddingTop: 4,
            marginRight: 12,
            '.ms-Slider': {
                marginBottom: 0,
            },
            '.ms-Slider-label': {
                color: theme.semanticColors.bodyText,
                fontWeight: 600,
            }
        },
        thumb: {
            borderRadius: '50%',
            width: 20,
            height: 20,
            top: -8,
            border: 'none !important',
            boxShadow: theme.effects.elevation8,
            backgroundColor: theme.palette.themePrimary,
            '::after': {
                content: '"\\E721"',
                fontFamily: 'FabricMDL2Icons',
                display: 'block',
                fontWeight: 600,
                fontSize: 12,
                position: 'relative',
                top: -4,
                left: 5,
                transform: 'scaleX(-1)',
                color: theme.palette.white
            }
        },
        activeSection: {
            backgroundColor: `${theme.palette.themePrimary} !important`,
        }
    })
}
