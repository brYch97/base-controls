import * as React from 'react';
import { Icon, useTheme } from '@fluentui/react';
import { getGanttSkeletonStyles } from './styles';

export const GanttSkeleton = () => {
    const theme = useTheme();
    const styles = React.useMemo(() => getGanttSkeletonStyles(theme), [theme]);

    return (
        <div className={styles.root}>
            <Icon iconName="BarChartHorizontal" className={styles.icon} styles={{ root: { fontSize: 48 } }} />
        </div>
    );
};
