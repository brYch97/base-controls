import React from "react";
import { IGanttComponents } from "./gantt-timeline/context";

export const GanttComponentsContext = React.createContext<IGanttComponents>({} as IGanttComponents);
export const useGanttComponents = () => React.useContext(GanttComponentsContext);