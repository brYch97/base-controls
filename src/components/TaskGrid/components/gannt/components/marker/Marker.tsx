import { useMemo } from 'react';
import { TooltipHost, useTheme } from '@fluentui/react';
import { getMarkerStyles } from './styles';
import { getClassNames } from '@talxis/react-components';
import { Formatting } from '@talxis/client-libraries';
import { IMarkerComponents, MarkerComponents } from './components';

export type MarkerType = 'today' | 'project_start' | 'project_end' | 'milestone' | 'custom';

export interface IMarkerProps {
    id: number
    text: string;
    type: MarkerType;
    start_date: Date;
    end_date?: Date;
    components?: Partial<IMarkerComponents>;
}

export const Marker = (props: IMarkerProps) => {
    const { text, start_date } = props;
    const theme = useTheme();
    const styles = useMemo(() => getMarkerStyles(theme), [theme]);
    const components = { ...MarkerComponents, ...props.components };
    const formatting = Formatting.Get();
    const id = useMemo(() => `gantt_marker_${props.id}`, [props.id]);
    const tooltipContent = formatting.formatDateShort(start_date) ?? '';

    return components.onRenderTooltipHost({
        id: id,
        content: tooltipContent,
        children: components.onRenderContent({ className: styles.root, children: text })
    });
};
