import { Scale, ZoomConfig } from "gantt-trial";
import { ZoomLevel } from "../components/zoom-switcher";
export class ZoomingConfig {
    public static getScrollZoomConfig(gantt: any, locale: string): ZoomConfig {
        return {
            minColumnWidth: 40,
            maxColumnWidth: 200,
            levels: [
                {
                    name: "multiple-years",
                    scale_height: 43,
                    scales: [
                        {
                            unit: "year",
                            step: 4,
                            format: (date: Date) => {
                                const end = gantt.date.add(date, 3, "year");
                                return `${date.getFullYear()} – ${end.getFullYear()}`;
                            },
                        },
                        { unit: "year", step: 1, format: "%Y" },
                    ],
                },
                {
                    name: "years",
                    scale_height: 43,
                    scales: [
                        { unit: "year", step: 1, format: "%Y" },
                        {
                            unit: "quarter",
                            step: 1,
                            format: (date: Date) => `Q${Math.floor(date.getMonth() / 3) + 1}`,
                        },
                    ],
                },
                {
                    name: "months",
                    scale_height: 43,
                    scales: [
                        { unit: "year", step: 1, format: "%Y" },
                        {
                            unit: "month",
                            step: 1,
                            format: (date: Date) =>
                                new Intl.DateTimeFormat(locale, { month: "long" }).format(date),
                        },
                    ],
                },
                {
                    name: "months-weeks",
                    scale_height: 43,
                    scales: [
                        { unit: "month", step: 1, format: "%F %Y" },
                        {
                            unit: "week",
                            step: 1,
                            format: (date: Date) => {
                                const dateToStr = gantt.date.date_to_str("%d");
                                const endDate = gantt.date.add(date, 6, "day");
                                return `${dateToStr(date)}–${dateToStr(endDate)}`;
                            },
                        },
                    ],
                },
                {
                    name: "week",
                    scale_height: 43,
                    scales: [
                        { unit: "month", step: 1, format: "%F %Y" },
                        { unit: "day", step: 1, format: "%d %M" },
                    ],
                },
                {
                    name: "day",
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
    /**
   * Column width config for each manual zoom level.
   * Apply with: gantt.config.min_column_width = ZoomingConfig.getManualZoomColumnWidth(level)
   */
    public static getManualZoomColumnWidth(level: ZoomLevel): number {
        switch (level) {
            case 'hour':
            case 'day':
                return 40;   // 40px per hour — enough to label HH:MM
            case 'week':
                return 30;   // 30px per day — shows all 7 days clearly
            case 'month':
                return 24;   // 24px per day — shows all ~30 days in a month
            case 'year':
                return 60;   // 60px per month — shows all 12 months
        }
    }

    public static getManualZoomLevelScales(level: ZoomLevel): Scale[] {
        switch (level) {
            case 'hour':
            case 'day':
                return [
                    { unit: 'day', step: 1, format: '%D %d/%m' },
                    { unit: 'hour', step: 1, format: '%H:%i' },
                ];
            case 'week':
                return [
                    { unit: 'week', step: 1, format: 'Week %W' },
                    { unit: 'day', step: 1, format: '%D %d/%m' },
                ];
            case 'month':
                return [
                    { unit: 'month', step: 1, format: '%F %Y' },
                    { unit: 'day', step: 1, format: '%d' },
                ] as Scale[];
            case 'year':
                return [
                    { unit: 'year', step: 1, format: '%Y' },
                    { unit: 'month', step: 1, format: '%M' },
                ];
        }
    }
}
