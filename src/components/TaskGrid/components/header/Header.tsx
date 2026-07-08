import { IHeaderProps } from "../../../DatasetControl/interfaces"
import { ICommandBarItemProps } from "@talxis/react-components";
import * as React from "react"
import { CommandBarButton, ContextualMenuItemType } from "@fluentui/react";
import { getHeaderStyles } from "./styles";
import { SettingsCallout } from "./settings-callout";
import { useDatasetControl, useGanttExtension, useLocalizationService, usePcfContext, useTaskDataProvider, useTaskGridComponents } from "../../context";
import { RecordSelector } from "../grid/record-selector";
import { ViewSwitcher } from "./view-switcher";
import { EditColumns } from "./edit-columns/EditColumns";
import { IExtendedRibbonQuickFindWrapperProps } from "../../extensions/gantt";

interface ITaskGridHeaderProps {
    headerProps: IHeaderProps;
    defaultRender: (props: IHeaderProps) => React.ReactElement;
}

export const Header = (props: ITaskGridHeaderProps) => {
    const localizationService = useLocalizationService();
    const datasetControl = useDatasetControl();
    const styles = React.useMemo(() => getHeaderStyles(), []);
    const provider = useTaskDataProvider();
    const [editColumnsOpen, setEditColumnsOpen] = React.useState(false);
    const pcfContext = usePcfContext();
    const components = useTaskGridComponents();
    const ganttExtension = useGanttExtension();
    const onRenderRibbonQuickFindWrapper = ganttExtension?.onRenderDatasetControlRibbonQuickFindWrapper ?? ((props, defaultRender) => defaultRender(props));

    const hasContent = () => {
        const isGanttEnabled = !!datasetControl.extensions.gantt;
        return datasetControl.isViewSwitcherEnabled() ||
            datasetControl.isTaskCreatingEnabled() ||
            datasetControl.isTemplatingEnabled() ||
            datasetControl.isTaskEditingEnabled() ||
            datasetControl.isTaskDeletingEnabled() ||
            datasetControl.isEditColumnsVisible() ||
            datasetControl.isShowHierarchyToggleVisible() ||
            datasetControl.isHideInactiveTasksToggleVisible() ||
            isGanttEnabled;
    }

    const createTaskFromTemplate = (templateId: string) => {
        provider.createTasksFromTemplate(templateId);
    }

    const getNewSubMenuItems = (
        isTemplatingEnabled: boolean,
        isTaskAddingEnabled: boolean,
        selectedIds: string[],
        isLoading: boolean,
    ): ICommandBarItemProps[] => {
        return [
            ...(isTaskAddingEnabled ? [{
                key: 'addTopLevelTask',
                disabled: isLoading,
                iconProps: { iconName: 'AddToShoppingList' },
                text: localizationService.getLocalizedString('topLevel'),
                onClick: () => {
                    provider.createTask({
                        nextTaskId: provider.getRecordTree().getNode(null).directChildren[0]?.getRecordId()
                    });
                }
            }] : []),
            ...(isTemplatingEnabled ? [
                ...(isTaskAddingEnabled ? [{ key: 'divider', itemType: ContextualMenuItemType.Divider }] : []),
                ...(selectedIds.length === 1 ? [{
                    key: 'templateFromTask',
                    iconProps: { iconName: 'PageList' },
                    text: localizationService.getLocalizedString('templateFromTask'),
                    disabled: isLoading,
                    onClick: () => { provider.createTemplateFromTask(selectedIds[0]); }
                }] : []),
                ...(isTaskAddingEnabled ? [{
                    key: 'taskFromTemplate',
                    iconProps: { iconName: 'AddToShoppingList' },
                    text: localizationService.getLocalizedString('taskFromTemplate'),
                    disabled: isLoading,
                    subMenuProps: {
                        items: [{ key: 'dummy' }],
                        focusZoneProps: {
                            shouldInputLoseFocusOnArrowKey: () => true
                        },
                        onRenderMenuList: () => isLoading ? <></> : (
                            <RecordSelector
                                provider={datasetControl.getTemplateDataProvider()}
                                onRenderRecord={(props, defaultRender) => defaultRender({
                                    ...props,
                                    iconProps: { iconName: 'AddToShoppingList' }
                                })}
                                onRecordSelected={createTaskFromTemplate} />
                        )
                    }
                }] : [])
            ] : [])
        ];
    }

    const getCommandBarItems = (items: ICommandBarItemProps[], ribbonProps: IExtendedRibbonQuickFindWrapperProps): ICommandBarItemProps[] => {
        const isTemplatingEnabled = datasetControl.isTemplatingEnabled();
        const isEditColumnsEnabled = datasetControl.isEditColumnsVisible();
        const isTaskAddingEnabled = datasetControl.isTaskCreatingEnabled();
        const isTaskEditingEnabled = datasetControl.isTaskEditingEnabled();
        const isTaskDeletingEnabled = datasetControl.isTaskDeletingEnabled();
        const isShowHierarchyToggleVisible = datasetControl.isShowHierarchyToggleVisible();
        const isHideInactiveTasksToggleVisible = datasetControl.isHideInactiveTasksToggleVisible();
        const selectedIds = provider.getSelectedRecordIds();
        const isLoading = provider.isLoading();

        return [
            ...((getNewSubMenuItems(isTemplatingEnabled, isTaskAddingEnabled, selectedIds, isLoading).length > 0) ? [{
                key: 'new',
                text: localizationService.getLocalizedString('new'),
                disabled: isLoading,
                iconProps: { iconName: 'Add' },
                onClick: (isTaskAddingEnabled && !isTemplatingEnabled) ? () => {
                    provider.createTask({
                        nextTaskId: provider.getRecordTree().getNode(null).directChildren[0]?.getRecordId()
                    });
                } : undefined,
                subMenuProps: (isTaskAddingEnabled && !isTemplatingEnabled) ? undefined : { items: getNewSubMenuItems(isTemplatingEnabled, isTaskAddingEnabled, selectedIds, isLoading) }
            }] : []),
            ...(selectedIds.length !== 0 ? [
                ...(isTaskEditingEnabled ? [{
                    key: 'edit',
                    text: localizationService.getLocalizedString('bulkEdit'),
                    disabled: isLoading,
                    iconProps: { iconName: 'Edit' },
                    onClick: () => { provider.openTaskItems(selectedIds); }
                }] : []),
                ...(isTaskDeletingEnabled ? [{
                    key: 'delete',
                    text: localizationService.getLocalizedString('deleteSelected'),
                    disabled: isLoading,
                    iconProps: { iconName: 'Delete' },
                    onClick: async () => {
                        const result = await pcfContext.navigation.openConfirmDialog({
                            text: localizationService.getLocalizedString("confirmDialog.deleteSelectedRows.text"),
                        });
                        if (result.confirmed) {
                            provider.deleteTasks(selectedIds);
                        }
                    }
                }] : []),
            ] : []),
            ...items,
            ...(isEditColumnsEnabled ? [{
                key: 'editColumns',
                disabled: isLoading,
                text: localizationService.getLocalizedString('editColumns'),
                iconProps: { iconName: 'ColumnOptions' },
                onRender: (item) => <CommandBarButton {...item} onClick={() => setEditColumnsOpen(true)} />
            } as ICommandBarItemProps,
            ] : []),
            ...(isShowHierarchyToggleVisible || isHideInactiveTasksToggleVisible ? [{
                key: 'settings',
                id: 'taskGridSettingsButton',
                disabled: isLoading,
                text: localizationService.getLocalizedString('settings'),
                subMenuProps: {
                    items: [{ key: 'dummy' }],
                    onRenderMenuList: ribbonProps.onRenderSettingsCallout ?? (() => <SettingsCallout />)
                },
                iconProps: { iconName: 'Settings' },
            }] : [])
        ];
    }

    if (!hasContent()) return <></>

    return <>
        {
            props.defaultRender({
                ...props.headerProps,
                onRenderRibbonQuickFindWrapper: (ribbonProps, _defaultRender) => {
                    return onRenderRibbonQuickFindWrapper(ribbonProps, (ribbonProps) => {
                        return <div className={styles.root}>
                            <div className={styles.headerLeftContainer}>
                                {datasetControl.isViewSwitcherEnabled() &&
                                    <ViewSwitcher />
                                }
                                {ribbonProps.onRenderZoomSlider?.()}
                            </div>
                            {_defaultRender({
                                ...ribbonProps,
                                ribbonQuickFindContainerProps: {
                                    ...ribbonProps.ribbonQuickFindContainerProps,
                                    className: `${ribbonProps.ribbonQuickFindContainerProps.className} ${styles.ribbonQuickFindContainer}`,
                                },
                                onRenderRibbon: (props, defaultRender) => {
                                    return defaultRender({
                                        ...props,
                                        onRenderCommandBar: (props, defaultRender) => {
                                            const items = getCommandBarItems(props.items as ICommandBarItemProps[], ribbonProps);
                                            return components.onRenderCommandBar({
                                                ...props as any,
                                                items: ribbonProps.onGetCommandBarItems?.(items) ?? items
                                            })
                                        }
                                    })
                                },

                            })}
                        </div>
                    });
                }
            })
        }
        {editColumnsOpen &&
            <EditColumns onDismiss={() => setEditColumnsOpen(false)} />
        }
    </>

}