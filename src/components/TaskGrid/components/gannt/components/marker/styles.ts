import { ITheme, mergeStyleSets } from '@fluentui/react';

export const getMarkerStyles = (theme: ITheme) => {
    return mergeStyleSets({
        root: {
            padding: '4px 10px',
            fontSize: 12,
            lineHeight: '14px',
            fontWeight: 600,
            color: theme.palette.white,
            backgroundColor: theme.palette.themePrimary,
            boxShadow: theme.effects.elevation8,
        }
    });
};
