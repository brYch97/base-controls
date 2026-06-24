import { Slider, useTheme } from "@fluentui/react";
import { useDatasetControl } from "../../../context";
import { useEventEmitter } from "../../../../../hooks";
import { IGanttGridBridgeEvents } from "../../../bridges";
import { useRerender } from "@talxis/react-components";
import { getSettingsSliderStyles } from "./styles";
import { useMemo } from "react";

export const SettingsSlider = () => {
    const datasetControl = useDatasetControl();
    const value = datasetControl.ganttGridBridge.getZoomLevel();
    const theme = useTheme();
    const styles = useMemo(() => getSettingsSliderStyles(theme), [theme]);
    const rerender = useRerender();
    useEventEmitter<IGanttGridBridgeEvents>(datasetControl.ganttGridBridge, 'onZoomLevelChanged', rerender);

    return (
        <div className={styles.root}>
            <Slider
                min={0}
                max={100}
                value={value}
                showValue
                onChange={(nextValue) => {
                    datasetControl.ganttGridBridge.setZoomLevel(nextValue);
                }} />
        </div>
    );
}
