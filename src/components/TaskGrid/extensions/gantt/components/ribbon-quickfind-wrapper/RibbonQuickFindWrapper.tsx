import { ICommandBarItemProps } from "@talxis/react-components";
import { IExtendedRibbonQuickFindWrapperProps } from "../../GanttDescriptor";
import { useDatasetControl, useLocalizationService } from "../../../../context";
import { ZoomSliderAdapter } from "../zoom-slider-adapter";


export interface IGanttRibbonQuickFindWrapper {
    ribbonWrapperProps: IExtendedRibbonQuickFindWrapperProps;
    defaultRender: (props: IExtendedRibbonQuickFindWrapperProps) => JSX.Element;
}

export const RibbonQuickFindWrapper = (props: IGanttRibbonQuickFindWrapper) => {
    const { defaultRender, ribbonWrapperProps } = props;
    const datasetControl = useDatasetControl();
    const provider = datasetControl.getDataProvider();
    const localizationService = useLocalizationService();


    const getCommandBarItems = (items: ICommandBarItemProps[]): ICommandBarItemProps[] => {
        return [
            ...items,
            {
                key: 'goToToday',
                disabled: provider.isLoading(),
                text: localizationService.getLocalizedString('goToToday'),
                iconProps: { iconName: 'CalendarDay' },
                onClick: () => datasetControl.ganttGridBridge.requestJumpToToday(),
            }
        ];
    }

    return (        
        <>
        {defaultRender({
            ...ribbonWrapperProps,
            onRenderZoomSlider: () => <ZoomSliderAdapter />,
            onGetCommandBarItems: getCommandBarItems
        })}
        </>
    );
};
    