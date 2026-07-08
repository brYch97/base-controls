import { useRerender } from "@talxis/react-components";
import { IGanttGridBridgeEvents } from "../../../../bridges";
import { useEventEmitter } from "../../../../../../hooks";
import { useDatasetControl } from "../../../../context";
import { ZoomSlider } from "../../../../../zoom-slider";

export const ZoomSliderAdapter = () => {
    const datasetControl = useDatasetControl();
    const provider = datasetControl.getDataProvider();
    const value = datasetControl.ganttGridBridge.getZoomLevel();
    const rerender = useRerender();
    useEventEmitter<IGanttGridBridgeEvents>(datasetControl.ganttGridBridge, 'onZoomLevelChanged', rerender);

    return (
        <ZoomSlider
            value={value}
            disabled={provider.isLoading()}
            onChange={(nextValue: number) => {
                datasetControl.ganttGridBridge.setZoomLevel(nextValue)
            }}
        />
    );
}