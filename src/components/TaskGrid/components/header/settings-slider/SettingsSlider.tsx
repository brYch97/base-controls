import { Slider, useTheme } from "@fluentui/react";
import * as React from "react";
import { useDatasetControl, useLocalizationService } from "../../../context";
import { getSettingsSliderStyles } from "./styles";

export const SettingsSlider = () => {
    const datasetControl = useDatasetControl();
    const localizationService = useLocalizationService();
    const theme = useTheme();
    const styles = React.useMemo(() => getSettingsSliderStyles(theme), [theme]);
    const [value, setValue] = React.useState(0);

    return (
        <div className={styles.root}>
            <Slider
                min={0}
                max={100}
                value={value}
                showValue
                label={localizationService.getLocalizedString('settingsSlider')}
                onChange={(nextValue) => {
                    setValue(nextValue);
                    datasetControl.requestSettingsSliderValue(nextValue);
                }} />
        </div>
    );
}
