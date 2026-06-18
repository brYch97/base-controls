import React, { useMemo } from 'react';
import { useTheme } from '@fluentui/react';
import { getProjectMarkerStyles } from './styles';
import { IMarkerProps, Marker } from '../Marker';
import { MarkerComponents } from '../components';
import { getClassNames } from '@talxis/react-components';


export const ProjectMarker = (props: Omit<IMarkerProps, 'type'>) => {
    const theme = useTheme();
    const styles = useMemo(() => getProjectMarkerStyles(theme), [theme]);

    return <Marker {...props} type='project_start' color={theme.palette.yellow} />
};