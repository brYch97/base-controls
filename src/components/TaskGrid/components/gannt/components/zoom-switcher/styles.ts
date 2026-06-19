import { ITheme, mergeStyleSets } from '@fluentui/react';

export const getZoomSwitcherStyles = (theme: ITheme) => {
    return mergeStyleSets({
        root: {
            width: 130,
            selectors: {
                '.ms-Dropdown-title': {
                    height: 43,
                    lineHeight: 43,
                    display: 'flex',
                    alignItems: 'center',
                },
                '.ms-Dropdown-caretDownWrapper': {
                    height: 43,
                    lineHeight: 43,
                },
            },
        },
        option: {
            display: 'flex',
            alignItems: 'center',
            gap: 8,
        },
    });
};
