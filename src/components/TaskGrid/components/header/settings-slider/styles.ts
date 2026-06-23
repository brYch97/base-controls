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
        }
    })
}
