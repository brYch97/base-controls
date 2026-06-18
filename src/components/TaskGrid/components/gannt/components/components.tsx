import { Callout, ICalloutProps } from "@fluentui/react";
import { TaskTooltip } from "./task-tooltip";
import { IGanttComponents, ITaskTooltipProps } from "../context";
import { TaskText } from "./task-text";
import { Marker, ProjectMarker } from "./marker";
import { MilestoneMarker } from "./marker/milestone-marker/";

export const GanttComponents: IGanttComponents = {
    //onRenderTaskText: (props) => <TaskText {...props} />,
    onRenderTaskTooltip: (props: ITaskTooltipProps) => <TaskTooltip {...props} />,
    onRenderTaskTooltipCallout: (props: ICalloutProps) => <Callout {...props} />,
    onRenderMarker: (props) => {
        switch (props.type) {
            case 'milestone': {
                return <MilestoneMarker {...props} />
            }
            case 'today': {
                return <Marker {...props} />
            }
            case 'project_start':
            case 'project_end': {
                return <ProjectMarker {...props} />
            }
            default: {
                return <Marker {...props} />
            }
        }
    }
};