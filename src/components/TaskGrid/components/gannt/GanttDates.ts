import { IRecord } from "@talxis/client-libraries";
import { ITaskGridDatasetControl } from "../../interfaces";
import { ITaskDataProvider } from "../../providers";

export interface IGanttDates {
    getStartDate: (records?: IRecord[]) => Date | null;
    getEndDate: (records?: IRecord[]) => Date | null;
    getStartEndDateFromRecords: (records: IRecord[]) => { startDate: Date | null, endDate: Date | null, startRecord: IRecord | null, endRecord: IRecord | null };
    getStartDateColumnName: () => string;
    getEndDateColumnName: () => string;
    getDateFromString: (dateStr: string) => Date | null;
}

export interface IGanttDateHelperParams {
    datasetControl: ITaskGridDatasetControl;
}

export class GanttDates implements IGanttDates {
    private _datasetControl: ITaskGridDatasetControl;
    private _provider: ITaskDataProvider;
    private _startDate: Date | null = null;
    private _endDate: Date | null = null;

    constructor(params: IGanttDateHelperParams) {
        this._datasetControl = params.datasetControl;
        this._provider = params.datasetControl.getDataProvider();
        this._registerEventListeners();
    }

    public getStartDateColumnName(): string {
        const colName = this._datasetControl.getNativeColumns().startDate;
        if (!colName) {
            throw new Error('Start date column is not defined in field mapping!');
        }
        return colName;
    }

    public getEndDateColumnName(): string {
        const colName = this._datasetControl.getNativeColumns().endDate;
        if (!colName) {
            throw new Error('End date column is not defined in field mapping!');
        }
        return colName;
    }

    public getDateFromString(date: string | null): Date | null {
        if (!date) return null;
        return new Date(date);
    }

    public getStartDate(): Date | null {
        return this._startDate;
    }

    public getEndDate(): Date | null {
        return this._endDate;
    }

    public getStartEndDateFromRecords(records: IRecord[]): { startDate: Date | null, endDate: Date | null, startRecord: IRecord | null, endRecord: IRecord | null } {
        const startDateColumnName = this.getStartDateColumnName();
        const endDateColumnName = this.getEndDateColumnName();
        let minDate: Date | null = null;
        let maxDate: Date | null = null;
        let startRecord: IRecord | null = null;
        let endRecord: IRecord | null = null;

        for (const record of records) {
            const startDate = this.getDateFromString(record.getValue(startDateColumnName));
            const endDate = this.getDateFromString(record.getValue(endDateColumnName));

            if (startDate && (!minDate || startDate.getTime() < minDate.getTime())) {
                minDate = startDate;
                startRecord = record;
            }

            if (endDate && (!maxDate || endDate.getTime() > maxDate.getTime())) {
                maxDate = endDate;
                endRecord = record;
            }
        }
        return {
            startDate: minDate,
            endDate: maxDate,
            startRecord,
            endRecord,
        }
    }

    private _registerEventListeners() {
        this._provider.addEventListener(('onFirstDataLoaded'), () => {
            const { startDate, endDate } = this.getStartEndDateFromRecords(this._provider.getAllRecords());
            this._startDate = startDate;
            this._endDate = endDate;
        });
    }

}