import * as React from 'react';
import { useTheme } from '@fluentui/react';
import { getGanttSkeletonStyles } from './styles';

const HEADER_CELL_COUNT = 8;
const ROW_COUNT = 20;

const TASK_PATTERNS = [
    { left: '5%', width: '35%' },
    { left: '15%', width: '50%' },
    { left: '0%', width: '25%' },
    { left: '30%', width: '40%' },
    { left: '10%', width: '60%' },
    { left: '45%', width: '30%' },
    { left: '20%', width: '45%' },
    { left: '0%', width: '55%' },
    { left: '35%', width: '25%' },
    { left: '60%', width: '30%' },
];

export const GanttSkeleton = () => {
    const theme = useTheme();
    const styles = React.useMemo(() => getGanttSkeletonStyles(theme), [theme]);

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                {Array.from({ length: HEADER_CELL_COUNT }, (_, i) => (
                    <div key={i} className={styles.headerCell} />
                ))}
            </div>
            <div className={styles.rows}>
                {Array.from({ length: ROW_COUNT }, (_, rowIdx) => {
                    const pattern = TASK_PATTERNS[rowIdx % TASK_PATTERNS.length];
                    return (
                        <div key={rowIdx} className={styles.row}>
                            <div
                                className={styles.taskBar}
                                style={{ marginLeft: pattern.left, width: pattern.width }}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
