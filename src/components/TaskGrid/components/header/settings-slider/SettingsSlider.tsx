import { IconButton, Slider, useTheme } from "@fluentui/react";
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
            <IconButton
                className={styles.zoomButton}
                iconProps={{ iconName: 'Remove' }}
                ariaLabel="Zoom out"
                onClick={() => datasetControl.ganttGridBridge.setZoomLevel(value - 1)}
            />
            <Slider
                className={styles.slider}
                min={0}
                max={100}
                value={value}
                showValue={false}
                styles={{
                    thumb: styles.thumb,
                    activeSection: styles.activeSection
                }}
                onChange={(nextValue) => {
                    datasetControl.ganttGridBridge.setZoomLevel(nextValue);
                }} />
            <IconButton
                className={styles.zoomButton}
                iconProps={{ iconName: 'Add' }}
                ariaLabel="Zoom in"
                onClick={() => datasetControl.ganttGridBridge.setZoomLevel(value + 1)}
            />
        </div>
    );
}
