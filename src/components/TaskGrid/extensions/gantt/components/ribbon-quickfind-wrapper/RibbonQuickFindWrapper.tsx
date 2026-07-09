import { Label, Toggle } from "@fluentui/react";
import { ICommandBarItemProps } from "@talxis/react-components";
import { IExtendedRibbonQuickFindWrapperProps } from "../../GanttExtension";
import { useDatasetControl, useLocalizationService, useRequiredGanttExtension } from "../../../../context";
import { ZoomSliderAdapter } from "../zoom-slider-adapter";
import { useEventEmitter } from "../../../../../../hooks";
import { IGanttExtensionEvents } from "../../GanttExtension";
import { useRerender } from "@talxis/react-components";
import { SettingsCallout } from "../../../../components/header/settings-callout";


export interface IGanttRibbonQuickFindWrapper {
    ribbonWrapperProps: IExtendedRibbonQuickFindWrapperProps;
    defaultRender: (props: IExtendedRibbonQuickFindWrapperProps) => JSX.Element;
}

export const RibbonQuickFindWrapper = (props: IGanttRibbonQuickFindWrapper) => {
    const { defaultRender, ribbonWrapperProps } = props;
    const datasetControl = useDatasetControl();
    const ganttExtension = useRequiredGanttExtension();
    const provider = datasetControl.getDataProvider();
    const localizationService = useLocalizationService();
    const rerender = useRerender();
    const showWeekends = ganttExtension.isWeekendVisible();

    useEventEmitter<IGanttExtensionEvents>(ganttExtension.events, 'onShowWeekendsChanged', rerender);


    const getCommandBarItems = (items: ICommandBarItemProps[]): ICommandBarItemProps[] => {
        return [
            ...items,
            {
                key: 'zoomToFit',
                disabled: provider.isLoading(),
                text: localizationService.getLocalizedString('zoomToFit'),
                iconProps: { iconName: 'ZoomToFit' },
                onClick: () => ganttExtension.zoomToFit(),
            },
            {
                key: 'goToToday',
                disabled: provider.isLoading(),
                text: localizationService.getLocalizedString('goToToday'),
                iconProps: { iconName: 'CalendarDay' },
                onClick: () => ganttExtension.jumpToToday(),
            }
        ];
    }

    return (
        defaultRender({
            ...ribbonWrapperProps,
            onRenderZoomSlider: () => <ZoomSliderAdapter />,
            onGetCommandBarItems: getCommandBarItems,
            onRenderSettingsCallout: () => <>
                <SettingsCallout>
                    <Label>
                        {localizationService.getLocalizedString('hideWeekends')}
                    </Label>
                    <Toggle
                        checked={!showWeekends}
                        onClick={() => {
                            ganttExtension.showWeekend(!showWeekends);
                        }} />
                </SettingsCallout>
            </>
        })
    );
};
