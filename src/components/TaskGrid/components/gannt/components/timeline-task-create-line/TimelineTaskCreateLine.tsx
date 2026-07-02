import { useMemo } from 'react';
import { useTheme } from '@fluentui/react';
import { getTimelineTaskCreateLineStyles } from './styles';

export interface ITimelineTaskCreateLineProps {
    left: number;
    top: number;
    width: number;
}

export const TimelineTaskCreateLine = (props: ITimelineTaskCreateLineProps) => {
    const theme = useTheme();
    const styles = useMemo(() => getTimelineTaskCreateLineStyles(theme), [theme]);

    return (
        <div
            className={styles.root}
            style={{ left: props.left, top: props.top, width: props.width }}
        />
    );
};
