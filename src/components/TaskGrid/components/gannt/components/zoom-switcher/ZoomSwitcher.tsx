import React, { useMemo } from 'react';
import { useTheme } from '@fluentui/react';
import { getZoomSwitcherStyles } from './styles';

export type ZoomLevel = 'hour' | 'day' | 'week' | 'month' | 'year';

const ZOOM_LEVELS: { key: ZoomLevel; label: string }[] = [
    { key: 'hour', label: 'Hour' },
    { key: 'day', label: 'Day' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'year', label: 'Year' },
];

export interface IZoomSwitcherProps {
    selected: ZoomLevel;
    onChange: (level: ZoomLevel) => void;
}

export const ZoomSwitcher = (props: IZoomSwitcherProps) => {
    const { selected, onChange } = props;
    const theme = useTheme();
    const styles = useMemo(() => getZoomSwitcherStyles(theme), [theme]);

    return (
        <div className={styles.root}>
            {ZOOM_LEVELS.map((level, index) => (
                <button
                    key={level.key}
                    className={`${styles.button} ${selected === level.key ? styles.buttonSelected : ''} ${index === 0 ? styles.buttonFirst : ''} ${index === ZOOM_LEVELS.length - 1 ? styles.buttonLast : ''}`}
                    onClick={() => onChange(level.key)}
                >
                    {level.label}
                </button>
            ))}
        </div>
    );
};
