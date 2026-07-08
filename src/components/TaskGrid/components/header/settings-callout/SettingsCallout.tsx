import { Label, Toggle } from "@fluentui/react";
import { useRerender } from "@talxis/react-components";
import * as React from "react"
import { getSettingsCalloutStyles } from "./styles";
import { useDatasetControl, useLocalizationService, useTaskDataProvider } from "../../../context";

export interface ISettingsCalloutProps {
    children?: React.ReactNode;
}

export const SettingsCallout = (props: ISettingsCalloutProps) => {
    const { children } = props;
    const localizationService = useLocalizationService();
    const datasetControl = useDatasetControl();
    const taskDataProvider = useTaskDataProvider();
    const styles = React.useMemo(() => getSettingsCalloutStyles(), []);
    const inactiveTasksVisibility = datasetControl.getInactiveTasksVisibility();
    const isFlatListEnabled = taskDataProvider.isFlatListEnabled();
    const isHierarchyToggleVisible = datasetControl.isShowHierarchyToggleVisible();
    const isHideInactiveTasksToggleVisible = datasetControl.isHideInactiveTasksToggleVisible();


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
        {children}
    </div>);
}