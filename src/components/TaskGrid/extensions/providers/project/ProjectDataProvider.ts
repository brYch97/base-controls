export interface IProjectDataProvider {
    getProjectStartDate: () => Date | null;
    getProjectEndDate: () => Date | null;
    getProjectNamedReferece: () => ComponentFramework.EntityReference;
    changeDates: (startDate: Date | null, endDate: Date | null) => Promise<void>;
}

export interface IInternalProjectDataProvider extends IProjectDataProvider {
    load: () => Promise<void>;
}

interface IProjectData {
    entityReference: ComponentFramework.EntityReference;
    startDate: Date | null;
    endDate: Date | null;
}

export interface IProjectStrategy {
    onLoadProjectData: () => Promise<IProjectData>;
    //default to true if not defined
    onAllowStartDateEditing?: () => boolean;
    //default to true if not defined
    onAllowEndDateEditing?: () => boolean;
    onChangeDates?: (startDate: Date | null, endDate: Date | null) => Promise<void>;
}

export class ProjectDataProvider implements IProjectDataProvider {
    private _strategy: IProjectStrategy;
    //if null, calculate from tasks and extend?
    private _startDate: Date | null = null;
    //if null calculate from tasks and extend?
    private _endDate: Date | null = null;
    private _namedReference!: ComponentFramework.EntityReference;


    constructor(strategy: IProjectStrategy) {
        this._strategy = strategy;
    }
    public getProjectStartDate(): Date | null {
        return null;
        return this._startDate;
    }
    public getProjectEndDate(): Date | null {
        return null;
        return this._endDate;
    }
    public getProjectNamedReferece(): ComponentFramework.EntityReference {
        return this._namedReference;
    }

    public async changeDates(startDate: Date | null, endDate: Date | null): Promise<void> {
        if (!this._strategy.onChangeDates) {
            throw new Error('Change dates operation is not supported by the current strategy!');
        }
        return this._strategy.onChangeDates(startDate, endDate);
    }

    public async load(): Promise<void> {
        const projectData = await this._strategy.onLoadProjectData();
        this._startDate = projectData.startDate;
        this._endDate = projectData.endDate;
        this._namedReference = projectData.entityReference;
    }
}