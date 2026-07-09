import { IGanttComponents, IGanttTaskTooltipProps } from "../context";
import { TaskText } from "./task-text";
import { Marker, ProjectMarker } from "./marker";
import { MilestoneMarker } from "./marker/milestone-marker/";
import { TaskTooltipAdapter } from "./task-tooltip-adapter";

export const GanttComponents: IGanttComponents = {
    //onRenderTaskText: (props) => <TaskText {...props} />,
    onRenderTaskTooltip: (props: IGanttTaskTooltipProps) => <TaskTooltipAdapter {...props} />,
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