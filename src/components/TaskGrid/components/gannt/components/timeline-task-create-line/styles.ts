import { ITheme, mergeStyleSets } from '@fluentui/react';

export const getTimelineTaskCreateLineStyles = (theme: ITheme) => {
    return mergeStyleSets({
        root: {
            position: 'absolute',
            height: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            transform: 'translateY(-50%)',
            backgroundColor: theme.palette.themePrimary,
            boxShadow: theme.effects.elevation4,
            pointerEvents: 'none',
            zIndex: 3,
        },
        icon: {
            marginLeft: -22,
            color: theme.palette.themePrimary,
            fontSize: 14,
            backgroundColor: theme.palette.white,
            borderRadius: '50%',
        },
    });
};
