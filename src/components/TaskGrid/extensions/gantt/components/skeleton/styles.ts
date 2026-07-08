import { ITheme, keyframes, mergeStyleSets } from '@fluentui/react';

export const getGanttSkeletonStyles = (theme: ITheme) => {
    const pulse = keyframes({
        '0%, 100%': { opacity: 0.3 },
        '50%': { opacity: 0.8 },
    });

    return mergeStyleSets({
        root: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderLeft: `1px solid ${theme.semanticColors.bodyDivider}`,
            borderBottom: `1px solid ${theme.semanticColors.bodyDivider}`,
            height: '100%',
            backgroundColor: theme.semanticColors.bodyBackground,
        },
        icon: {
            animationName: pulse,
            animationDuration: '1.8s',
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
            color: theme.palette.neutralTertiary,
        },
    });
};
