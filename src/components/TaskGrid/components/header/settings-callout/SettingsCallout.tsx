import { Label, Toggle } from "@fluentui/react";
import * as React from "react"
import { getSettingsCalloutStyles } from "./styles";
import { useDatasetControl, useLocalizationService, useTaskDataProvider } from "../../../context";

export const SettingsCallout = () => {
    const localizationService = useLocalizationService();
    const datasetControl = useDatasetControl();
    const taskDataProvider = useTaskDataProvider();
    const styles = React.useMemo(() => getSettingsCalloutStyles(), []);
    const inactiveTasksVisibility = datasetControl.getInactiveTasksVisibility();
    const isFlatListEnabled = taskDataProvider.isFlatListEnabled();
    const isHierarchyToggleVisible = datasetControl.isShowHierarchyToggleVisible();
    const isHideInactiveTasksToggleVisible = datasetControl.isHideInactiveTasksToggleVisible();
    const isGanttEnabled = Boolean(datasetControl.extensions.gantt);
    const [showWeekends, setShowWeekends] = React.useState(false);


    return (<div className={styles.settingsCallout}>
        {isHierarchyToggleVisible && <>
            <Label>
                {localizationService.getLocalizedString('showHierarchy')}
            </Label>
            <Toggle
                checked={!isFlatListEnabled}
                onClick={() => {
                    datasetControl.toggleFlatList(!isFlatListEnabled);
                }} />
        </>}
        {isHideInactiveTasksToggleVisible && <>
            <Label>
                {localizationService.getLocalizedString('hideInactiveTasks')}
            </Label>
            <Toggle checked={!inactiveTasksVisibility} onClick={() => {
                datasetControl.toggleHideInactiveTasks(inactiveTasksVisibility);
            }} />
        </>}
        {isGanttEnabled && <>
            <Label>
                {localizationService.getLocalizedString('showWeekends')}
            </Label>
            <Toggle
                checked={showWeekends}
                onClick={() => {
                    const nextValue = !showWeekends;
                    setShowWeekends(nextValue);
                    datasetControl.requestWeekendVisibility(nextValue);
                }} />
        </>}
    </div>);
}