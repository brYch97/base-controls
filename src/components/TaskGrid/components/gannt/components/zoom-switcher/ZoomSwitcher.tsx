import React, { useMemo, useState } from 'react';
import { ComboBox, Dropdown, Icon, IDropdownOption, useTheme } from '@fluentui/react';
import { getZoomSwitcherStyles } from './styles';

export type ZoomLevel = 'hour' | 'day' | 'week' | 'month' | 'year';

const ZOOM_OPTIONS: IDropdownOption[] = [
    { key: 'hour', text: 'Hour' },
    { key: 'day', text: 'Day' },
    { key: 'week', text: 'Week' },
    { key: 'month', text: 'Month' },
    { key: 'year', text: 'Year' },
];

export interface IZoomSwitcherProps {
    selected?: ZoomLevel;
    onChange?: (level: ZoomLevel) => void;
}

export const ZoomSwitcher = (props: IZoomSwitcherProps) => {
    const { onChange } = props;
    const [internalSelected, setInternalSelected] = useState<ZoomLevel>(props.selected ?? 'day');
    const selected = props.selected ?? internalSelected;
    const theme = useTheme();
    const styles = useMemo(() => getZoomSwitcherStyles(theme), [theme]);

    return (
        <ComboBox
            className={styles.root}
            options={ZOOM_OPTIONS}
            selectedKey={selected}
            onChange={(_e, option) => {
                if (!option) return;
                const level = option.key as ZoomLevel;
                setInternalSelected(level);
                onChange?.(level);
            }}
        />
    );
};
