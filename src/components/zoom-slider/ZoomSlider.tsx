import { IconButton, Slider, useTheme } from "@fluentui/react";
import { useEffect, useMemo, useRef } from "react";
import { IZoomSliderComponents } from "./components";
import { getZoomSliderStyles } from "./styles";

const HOLD_DELAY = 300;
const HOLD_INTERVAL = 75;

export interface IZoomSliderProps {
    value: number;
    onChange: (value: number) => void;
    components?: Partial<IZoomSliderComponents>;
}

export const ZoomSlider = (props: IZoomSliderProps) => {
    const { onChange, value } = props;
    const theme = useTheme();
    const styles = useMemo(() => getZoomSliderStyles(theme), [theme]);
    const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const changeZoomLevel = (step: number) => {
        onChange(value + step);
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
                onChange={onChange}
            />
            <IconButton
                className={styles.zoomButton}
                iconProps={{ iconName: 'Add' }}
                onClick={() => changeZoomLevel(1)}
                onMouseDown={() => startHold(1)}
                onMouseUp={stopHold}
                onMouseLeave={stopHold}
            />
        </div>
    );
}