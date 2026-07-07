import { useMemo } from "react";
import { IMarkerProps, Marker } from "../Marker";
import { getMilestoneMarkerStyles } from "./styles";
import { TooltipHost, useTheme } from "@fluentui/react";

export const MilestoneMarker = (props: Omit<IMarkerProps, 'type'>) => {
    const theme = useTheme();
    const styles = useMemo(() => getMilestoneMarkerStyles(theme), [theme]);
    return <Marker {...props} type='milestone' components={{
        onRenderContainer: (props) => <div {...props} style={{
            ...props.style,
            left: `calc(${props.style?.left} - 12px)`,
            bottom: 5
        }} />,
        onRenderTooltipHost: (tooltipHostProps) => <TooltipHost
            {...tooltipHostProps}
            content={<div>
                <div>Milestones on this date</div>
                <div>Dummy milestone A</div>
                <div>Dummy milestone B</div>
            </div>} />,
        onRenderContent: (props) => <div className={styles.root} />
    }} />
}