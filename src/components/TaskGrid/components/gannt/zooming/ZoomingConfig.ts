import { ZoomConfig } from "gantt-trial";
export class ZoomingConfig {
    public static readonly scrollZoomMinColumnWidth = 60;
    public static readonly scrollZoomMaxColumnWidth = 120;
    public static readonly scrollZoomWidthStep = 6;

    public static getScrollZoomConfig(gantt: any, locale: string): ZoomConfig {
        const shortMonth = (date: Date) =>
            new Intl.DateTimeFormat(locale, { month: "short" }).format(date);
        const longMonth = (date: Date) =>
            new Intl.DateTimeFormat(locale, { month: "long" }).format(date);
        const fmt = (pattern: string) => gantt.date.date_to_str(pattern);

        return {
            minColumnWidth: ZoomingConfig.scrollZoomMinColumnWidth,
            maxColumnWidth: ZoomingConfig.scrollZoomMaxColumnWidth,
            widthStep: ZoomingConfig.scrollZoomWidthStep,
            levels: [
                // L0: year | quarter (91 d) — most zoomed out
                // boundary → L1: 120/91 px/d → 60/30 px/d = 1.52×
                {
                    name: "year-quarter",
                    scale_height: 43,
                    scales: [
                        { unit: "year", step: 1, format: "%Y" },
                        {
                            unit: "quarter",
                            step: 1,
                            format: (date: Date) =>
                                `Q${Math.floor(date.getMonth() / 3) + 1}`,
                        },
                    ],
                },
                // L1: year | month (30 d)
                // boundary → L2: 120/30 → 60/14 = 1.07×
                {
                    name: "year-month",
                    scale_height: 43,
                    scales: [
                        { unit: "year", step: 1, format: "%Y" },
                        { unit: "month", step: 1, format: shortMonth },
                    ],
                },
                // L2: quarter | 2-week (14 d)
                // boundary → L3: 120/14 → 60/7 = 1.0×
                {
                    name: "quarter-biweek",
                    scale_height: 43,
                    scales: [
                        {
                            unit: "quarter",
                            step: 1,
                            format: (date: Date) =>
                                `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`,
                        },
                        {
                            unit: "week",
                            step: 2,
                            format: (date: Date) => {
                                const end = gantt.date.add(date, 13, "day");
                                return `${fmt("%d %M")(date)}–${fmt("%d %M")(end)}`;
                            },
                        },
                    ],
                },
                // L3: month | week (7 d)
                // boundary → L4: 120/7 → 60/3 = 1.17×
                {
                    name: "month-week",
                    scale_height: 43,
                    scales: [
                        { unit: "month", step: 1, format: longMonth },
                        {
                            unit: "week",
                            step: 1,
                            format: (date: Date) => {
                                const end = gantt.date.add(date, 6, "day");
                                return `${fmt("%d")(date)}–${fmt("%d")(end)}`;
                            },
                        },
                    ],
                },
                // L4: month | 3-day (3 d)
                // boundary → L5: 120/3 → 60/1 = 1.50×
                {
                    name: "month-3day",
                    scale_height: 43,
                    scales: [
                        { unit: "month", step: 1, format: "%F %Y" },
                        { unit: "day", step: 3, format: "%d" },
                    ],
                },
                // L5: week | day (1 d)
                // boundary → L6: 120 px/d → 5 px/hr (12h col @60px) = 1.0×
                {
                    name: "week-day",
                    scale_height: 43,
                    scales: [
                        {
                            unit: "week",
                            step: 1,
                            format: (date: Date) => {
                                const end = gantt.date.add(date, 6, "day");
                                return `${fmt("%d %M")(date)} – ${fmt("%d %M")(end)}`;
                            },
                        },
                        { unit: "day", step: 1, format: "%d %M" },
                    ],
                },
                // L6: day | 12 h  (5–10 px/hr)
                // boundary → L7: 10 px/hr → 10 px/hr = 1.0×
                {
                    name: "day-12h",
                    scale_height: 43,
                    scales: [
                        { unit: "day", step: 1, format: "%D %d/%m" },
                        { unit: "hour", step: 12, format: "%H:%i" },
                    ],
                },
                // L7: day | 6 h  (10–20 px/hr)
                // boundary → L8: 20 px/hr → 30 px/hr = 1.50×
                {
                    name: "day-6h",
                    scale_height: 43,
                    scales: [
                        { unit: "day", step: 1, format: "%D %d/%m" },
                        { unit: "hour", step: 6, format: "%H:%i" },
                    ],
                },
                // L8: day | 2 h  (30–60 px/hr)
                // boundary → L9: 60 px/hr → 60 px/hr = 1.0×
                {
                    name: "day-2h",
                    scale_height: 43,
                    scales: [
                        { unit: "day", step: 1, format: "%D %d/%m" },
                        { unit: "hour", step: 2, format: "%H:%i" },
                    ],
                },
                // L9: day | 1 h  (60–120 px/hr) — most zoomed in
                {
                    name: "day-hour",
                    scale_height: 43,
                    scales: [
                        { unit: "day", step: 1, format: "%D %d/%m" },
                        { unit: "hour", step: 1, format: "%H:%i" },
                    ],
                },
            ],
            useKey: "ctrlKey",
            trigger: "wheel",
            element: () => gantt.$root.querySelector(".gantt_task")!,
        };
    }
}
