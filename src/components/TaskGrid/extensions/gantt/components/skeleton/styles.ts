import { ITheme, keyframes, mergeStyleSets } from '@fluentui/react';

const HEADER_HEIGHT = 42;
const ROW_HEIGHT = 42;

export const getGanttSkeletonStyles = (theme: ITheme) => {
    const shimmerKeyframe = keyframes({
        '0%': { backgroundPosition: '-600px 0' },
        '100%': { backgroundPosition: '600px 0' },
    });

    const shimmerBase = {
        background: `linear-gradient(90deg, ${theme.semanticColors.disabledBackground} 25%, ${theme.palette.neutralLight} 50%, ${theme.semanticColors.disabledBackground} 75%)`,
        backgroundSize: '1200px 100%',
        animationName: shimmerKeyframe,
        animationDuration: '1.5s',
        animationTimingFunction: 'linear',
        animationIterationCount: 'infinite',
        borderRadius: 2,
    };

    return mergeStyleSets({
        root: {
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            backgroundColor: theme.semanticColors.bodyBackground,
            overflow: 'hidden',
        },
        header: {
            height: HEADER_HEIGHT,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            padding: '0 4px',
            borderBottom: `1px solid ${theme.semanticColors.bodyDivider}`,
            flexShrink: 0,
        },
        headerCell: {
            ...shimmerBase,
            height: 14,
            flex: 1,
            borderRadius: 2,
        },
        rows: {
            flexGrow: 1,
            overflow: 'hidden',
            height: 0,
            borderLeft: `1px solid ${theme.semanticColors.menuDivider}`,
            borderBottom: `1px solid ${theme.semanticColors.menuDivider}`,
        },
        row: {
            height: ROW_HEIGHT,
            display: 'flex',
            alignItems: 'center',
            borderBottom: `1px solid ${theme.semanticColors.bodyDivider}`,
            padding: '0 4px',
        },
        taskBar: {
            ...shimmerBase,
            height: 16,
            borderRadius: 4,
        },
    });
};
