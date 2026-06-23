import { Label, Toggle } from "@fluentui/react";
import { useRerender } from "@talxis/react-components";
import * as React from "react"
import { getSettingsCalloutStyles } from "./styles";
import { useDatasetControl, useLocalizationService, useTaskDataProvider } from "../../../context";
import { useEventEmitter } from "../../../../../hooks";

export const SettingsCallout = () => {
    const localizationService = useLocalizationService();
    const datasetControl = useDatasetControl();
    const taskDataProvider = useTaskDataProvider();
    const styles = React.useMemo(() => getSettingsCalloutStyles(), []);
    const rerender = useRerender();
    const inactiveTasksVisibility = datasetControl.getInactiveTasksVisibility();
    const isFlatListEnabled = taskDataProvider.isFlatListEnabled();
    const showWeekends = datasetControl.getShowWeekends();
    const isHierarchyToggleVisible = datasetControl.isShowHierarchyToggleVisible();
    const isHideInactiveTasksToggleVisible = datasetControl.isHideInactiveTasksToggleVisible();
    const isGanttEnabled = Boolean(datasetControl.extensions.gantt);

    useEventEmitter(datasetControl.events, 'onShowWeekendsRequested', rerender);


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
                {localizationService.getLocalizedString('hideWeekends')}
            </Label>
            <Toggle
                checked={!showWeekends}
                onClick={() => {
                    datasetControl.toggleShowWeekends(!showWeekends);
                }} />
        </>}
    </div>);
}