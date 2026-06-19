import React, { useMemo, useState } from 'react';
import { Dropdown, Icon, IDropdownOption, useTheme } from '@fluentui/react';
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

    const onRenderTitle = (options?: IDropdownOption[]) => (
        <div className={styles.option}>
            <Icon iconName="Calendar" />
            <span>{options?.[0]?.text}</span>
        </div>
    );

    return (
        <Dropdown
            className={styles.root}
            options={ZOOM_OPTIONS}
            selectedKey={selected}
            onRenderTitle={onRenderTitle}
            onChange={(_e, option) => {
                if (!option) return;
                const level = option.key as ZoomLevel;
                setInternalSelected(level);
                onChange?.(level);
            }}
        />
    );
};
