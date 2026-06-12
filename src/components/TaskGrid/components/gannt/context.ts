import React from "react";
import { GanttComponents, IGanttComponents } from "./components/components";

export const GanttComponentsContext = React.createContext<IGanttComponents>(GanttComponents);

export const useGanttComponents = () => {
    return React.useContext(GanttComponentsContext);
}