import { useRerender } from "@talxis/react-components";
import { IGanttExtensionEvents } from "../../GanttExtension";
import { useEventEmitter } from "../../../../../../hooks";
import { useDatasetControl, useRequiredGanttExtension } from "../../../../context";
import { ZoomSlider } from "../../../../../zoom-slider";

export const ZoomSliderAdapter = () => {
    const datasetControl = useDatasetControl();
    const ganttExtension = useRequiredGanttExtension();
    const provider = datasetControl.getDataProvider();
    const value = ganttExtension.getZoomLevel();
    const rerender = useRerender();
    useEventEmitter<IGanttExtensionEvents>(ganttExtension.events, 'onZoomLevelChanged', rerender);

    return (
        <ZoomSlider
            value={value}
            disabled={provider.isLoading()}
            onChange={(nextValue: number) => {
                ganttExtension.setZoomLevel(nextValue)
            }}
        />
    );
}