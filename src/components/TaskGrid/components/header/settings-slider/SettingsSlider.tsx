import { Slider } from "@fluentui/react";
import { useDatasetControl } from "../../../context";
import { useEventEmitter } from "../../../../../hooks";
import { IGanttGridBridgeEvents } from "../../../bridges";
import { useRerender } from "@talxis/react-components";

export const SettingsSlider = () => {
    const datasetControl = useDatasetControl();
    const value = datasetControl.ganttGridBridge.getZoomLevel();
    const rerender = useRerender();
    useEventEmitter<IGanttGridBridgeEvents>(datasetControl.ganttGridBridge, 'onZoomLevelChanged', rerender);
    
    return (
        <Slider
            min={0}
            max={100}
            value={value}
            showValue
            onChange={(nextValue) => {
                datasetControl.ganttGridBridge.setZoomLevel(nextValue);
            }} />
    );
}
