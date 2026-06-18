import React, { useMemo } from 'react';
import { useTheme } from '@fluentui/react';
import { getMarkerStyles } from './styles';

export interface IMarkerProps {
    type: 'milestone' | 'project-start' | 'project-end' | 'custom';
    id: number;
    start_date: Date;
    text: string;
    end_date?: Date;
}

export const Marker = (props: IMarkerProps) => {
    const theme = useTheme();
    const styles = useMemo(() => getMarkerStyles(theme), [theme]);

    return <div className={styles.root}>{props.text}</div>;
};
