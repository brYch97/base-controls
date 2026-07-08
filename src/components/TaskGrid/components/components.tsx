import { Skeleton } from "./skeleton";
import { ICommandBarProps } from "@talxis/react-components";
import { CommandBar } from "./header/command-bar";

export interface ITaskGridComponents {
    onRenderSkeleton: () => JSX.Element;
    onRenderCommandBar: (props: ICommandBarProps) => JSX.Element;
}

export const TaskGridComponents: ITaskGridComponents = {
    onRenderSkeleton: () => <Skeleton />,
    onRenderCommandBar: (props) => <CommandBar {...props} />
}