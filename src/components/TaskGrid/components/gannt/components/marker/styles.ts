import { ITheme, mergeStyleSets } from '@fluentui/react';

export const getMarkerStyles = (theme: ITheme) => {
    return mergeStyleSets({
        root: {},
        overlay: {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            pointerEvents: 'none',
            zIndex: 5,
            overflow: 'visible',
        }
    });
};
