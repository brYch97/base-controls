import { ITheme, mergeStyleSets } from '@fluentui/react';

export const getTimelineTaskCreateLineStyles = (theme: ITheme) => {
    return mergeStyleSets({
        root: {
            position: 'absolute',
            height: 2,
            transform: 'translateY(-50%)',
            backgroundColor: theme.palette.themePrimary,
            boxShadow: theme.effects.elevation4,
            pointerEvents: 'none',
            zIndex: 3,
        },
    });
};
