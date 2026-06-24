import { Scale, ZoomConfig } from "gantt-trial";
import { ZoomLevel } from "../components/zoom-switcher";
export class ZoomingConfig {
    public static readonly scrollZoomMinColumnWidth = 80;
    public static readonly scrollZoomMaxColumnWidth = 140;
    public static readonly scrollZoomWidthStep = 3;

    public static getScrollZoomConfig(gantt: any, locale: string): ZoomConfig {
        return {
            minColumnWidth: ZoomingConfig.scrollZoomMinColumnWidth,
            maxColumnWidth: ZoomingConfig.scrollZoomMaxColumnWidth,
            widthStep: ZoomingConfig.scrollZoomWidthStep,
            levels: [
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
                    name: "week-hours",
                    scale_height: 43,
                    scales: [
                        { unit: "week", step: 1, format: "Week %W" },
                        { unit: "day", step: 1, format: "%D %d/%m" },
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
    * Duration-to-level mapping used by range fitting.
    */
   private static readonly _rangeZoomLevels: Array<{ maxDurationMs: number; level: number }> = [
       { maxDurationMs: 2 * 24 * 60 * 60 * 1000, level: 5 },        // ≤ 2 days   → hour grid
       { maxDurationMs: 21 * 24 * 60 * 60 * 1000, level: 4 },       // ≤ 3 weeks  → day grid (week header)
       { maxDurationMs: 90 * 24 * 60 * 60 * 1000, level: 3 },       // ≤ 3 months → day grid (month header)
       { maxDurationMs: 180 * 24 * 60 * 60 * 1000, level: 2 },      // ≤ 6 months → week grid
       { maxDurationMs: 2 * 365 * 24 * 60 * 60 * 1000, level: 1 },  // ≤ 2 years  → month grid
   ];

   /**
    * Returns the zoom level index for the given date range based only on its duration.
    */
   public static getZoomLevelForRange(start: Date, end: Date): number {
       const durationMs = Math.max(Math.abs(end.getTime() - start.getTime()), 24 * 60 * 60 * 1000);

       for (const zoomLevel of ZoomingConfig._rangeZoomLevels) {
           if (durationMs <= zoomLevel.maxDurationMs) {
               return zoomLevel.level;
           }
       }

       return 0;
   }

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
