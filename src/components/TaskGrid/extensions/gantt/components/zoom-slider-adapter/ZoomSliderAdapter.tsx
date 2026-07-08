import { useRerender } from "@talxis/react-components";
import { IGanttDescriptorEvents } from "../../GanttDescriptor";
import { useEventEmitter } from "../../../../../../hooks";
import { useDatasetControl, useRequiredGanttDescriptor } from "../../../../context";
import { ZoomSlider } from "../../../../../zoom-slider";

export const ZoomSliderAdapter = () => {
    const datasetControl = useDatasetControl();
    const ganttDescriptor = useRequiredGanttDescriptor();
    const provider = datasetControl.getDataProvider();
    const value = ganttDescriptor.getZoomLevel();
    const rerender = useRerender();
    useEventEmitter<IGanttDescriptorEvents>(ganttDescriptor.events, 'onZoomLevelChanged', rerender);

    return (
        <ZoomSlider
            value={value}
            disabled={provider.isLoading()}
            onChange={(nextValue: number) => {
                ganttDescriptor.setZoomLevel(nextValue)
            }}
        />
    );
}