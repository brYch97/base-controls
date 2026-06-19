import { EventEmitter, IEventEmitter, IRecord } from "@talxis/client-libraries";


export interface IProjectDataProvider {
    events: IEventEmitter<IProjectDataProviderEvents>;
    getProjectStartDate: () => Date | null;
    getProjectEndDate: () => Date | null;
    getProjectNamedReference: () => ComponentFramework.EntityReference;
    refreshStartEndDates: (tasks: IRecord[]) => Promise<void>;
}

export interface IInternalProjectDataProvider extends IProjectDataProvider {
    load: () => Promise<void>;
}

export interface IProjectStrategy {
    onLoad: () => Promise<{
        startDate: Date | null,
        endDate: Date | null,
        entityReference: ComponentFramework.EntityReference
    }>
    //used to fetch project dates with the server
    onGetLatestDates: (tasks: IRecord[]) => Promise<{ startDate: Date | null, endDate: Date | null }>;
}

export interface IProjectDataProviderEvents {
    onDatesChanged: (dates: { startDate: Date | null, endDate: Date | null }) => void;
}

export interface IProjectDataProviderParameters {
    strategy: IProjectStrategy;
}

export class ProjectDataProvider implements IProjectDataProvider {
    private _strategy: IProjectStrategy;
    //if null, calculate from tasks and extend?
    private _startDate: Date | null = null;
    //if null calculate from tasks and extend?
    private _endDate: Date | null = null;
    private _namedReference!: ComponentFramework.EntityReference;
    public readonly events: IEventEmitter<IProjectDataProviderEvents> = new EventEmitter();


    constructor(params: IProjectDataProviderParameters) {
        this._strategy = params.strategy;
    }
    public getProjectStartDate(): Date | null {
        return this._startDate;
    }
    public getProjectEndDate(): Date | null {
        return this._endDate;
    }
    public getProjectNamedReference(): ComponentFramework.EntityReference {
        return this._namedReference;
    }

    public async load(): Promise<void> {
        const { startDate, endDate, entityReference } = await this._strategy.onLoad();
        this._startDate = startDate;
        this._endDate = endDate;
        this._namedReference = entityReference;
    }

    public async refreshStartEndDates(updatedTasks: IRecord[]): Promise<void> {
        const { startDate, endDate } = await this._strategy.onGetLatestDates(updatedTasks);
        if(this._startDate !== startDate || this._endDate !== endDate) {
            this._startDate = startDate;
            this._endDate = endDate;
            this.events.dispatchEvent('onDatesChanged', { startDate, endDate });
        }
    }
}