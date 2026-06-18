import { ITooltipHostProps, TooltipHost } from "@fluentui/react";

export interface IMarkerComponents {
    onRenderTooltipHost: (props: ITooltipHostProps) => JSX.Element;
    onRenderContent: (props: React.HtmlHTMLAttributes<HTMLDivElement>) => JSX.Element;
}

export const MarkerComponents: IMarkerComponents = {
    onRenderTooltipHost: (props: ITooltipHostProps) => <TooltipHost {...props} />,
    onRenderContent: (props: React.HtmlHTMLAttributes<HTMLDivElement>) => <div {...props} />
};