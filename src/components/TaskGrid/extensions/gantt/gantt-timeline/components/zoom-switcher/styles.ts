import { ITheme, mergeStyleSets } from '@fluentui/react';

export const getZoomSwitcherStyles = (theme: ITheme) => {
    return mergeStyleSets({
        root: {
            width: 130
        },
        option: {
        },
    });
};
