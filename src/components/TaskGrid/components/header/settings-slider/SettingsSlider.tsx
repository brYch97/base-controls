import { IconButton, Slider, useTheme } from "@fluentui/react";
import { useDatasetControl } from "../../../context";
import { useEventEmitter } from "../../../../../hooks";
import { IGanttGridBridgeEvents } from "../../../bridges";
import { useRerender } from "@talxis/react-components";
import { getSettingsSliderStyles } from "./styles";
import { useEffect, useMemo, useRef } from "react";

const HOLD_DELAY = 300;
const HOLD_INTERVAL = 75;

export const SettingsSlider = () => {
    const datasetControl = useDatasetControl();
    const value = datasetControl.ganttGridBridge.getZoomLevel();
    const theme = useTheme();
    const styles = useMemo(() => getSettingsSliderStyles(theme), [theme]);
    const rerender = useRerender();
    const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    useEventEmitter<IGanttGridBridgeEvents>(datasetControl.ganttGridBridge, 'onZoomLevelChanged', rerender);

    const changeZoomLevel = (step: number) => {
        datasetControl.ganttGridBridge.setZoomLevel(datasetControl.ganttGridBridge.getZoomLevel() + step);
    };

    const stopHold = () => {
        if (holdTimeoutRef.current) {
            clearTimeout(holdTimeoutRef.current);
            holdTimeoutRef.current = null;
        }
        if (holdIntervalRef.current) {
            clearInterval(holdIntervalRef.current);
            holdIntervalRef.current = null;
        }
    };

    const startHold = (step: number) => {
        stopHold();
        holdTimeoutRef.current = setTimeout(() => {
            holdIntervalRef.current = setInterval(() => {
                changeZoomLevel(step);
            }, HOLD_INTERVAL);
        }, HOLD_DELAY);
    };

    useEffect(() => {
        return () => {
            stopHold();
        };
    }, []);

    return (
        <div className={styles.root}>
            <IconButton
                className={styles.zoomButton}
                iconProps={{ iconName: 'Remove' }}
                ariaLabel="Zoom out"
                onClick={() => changeZoomLevel(-1)}
                onMouseDown={() => startHold(-1)}
                onMouseUp={stopHold}
                onMouseLeave={stopHold}
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
                onClick={() => changeZoomLevel(1)}
                onMouseDown={() => startHold(1)}
                onMouseUp={stopHold}
                onMouseLeave={stopHold}
            />
        </div>
    );
}
