import { Label, Toggle } from "@fluentui/react";
import { ICommandBarItemProps } from "@talxis/react-components";
import { IExtendedRibbonQuickFindWrapperProps } from "../../GanttDescriptor";
import { useDatasetControl, useLocalizationService, useRequiredGanttDescriptor } from "../../../../context";
import { ZoomSliderAdapter } from "../zoom-slider-adapter";
import { useEventEmitter } from "../../../../../../hooks";
import { IGanttDescriptorEvents } from "../../GanttDescriptor";
import { useRerender } from "@talxis/react-components";
import { SettingsCallout } from "../../../../components/header/settings-callout";


export interface IGanttRibbonQuickFindWrapper {
    ribbonWrapperProps: IExtendedRibbonQuickFindWrapperProps;
    defaultRender: (props: IExtendedRibbonQuickFindWrapperProps) => JSX.Element;
}

export const RibbonQuickFindWrapper = (props: IGanttRibbonQuickFindWrapper) => {
    const { defaultRender, ribbonWrapperProps } = props;
    const datasetControl = useDatasetControl();
    const ganttDescriptor = useRequiredGanttDescriptor();
    const provider = datasetControl.getDataProvider();
    const localizationService = useLocalizationService();
    const rerender = useRerender();
    const showWeekends = ganttDescriptor.isWeekendVisible();

    useEventEmitter<IGanttDescriptorEvents>(ganttDescriptor.events, 'onShowWeekendsChanged', rerender);


    const getCommandBarItems = (items: ICommandBarItemProps[]): ICommandBarItemProps[] => {
        return [
            ...items,
            {
                key: 'goToToday',
                disabled: provider.isLoading(),
                text: localizationService.getLocalizedString('goToToday'),
                iconProps: { iconName: 'CalendarDay' },
                onClick: () => ganttDescriptor.jumpToToday(),
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
                            ganttDescriptor.showWeekend(!showWeekends);
                        }} />
                </SettingsCallout>
            </>
        })
    );
};
