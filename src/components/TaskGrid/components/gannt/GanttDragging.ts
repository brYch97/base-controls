import { GanttStatic } from 'dhtmlx-gantt';
import { ITaskGridDatasetControl } from '../..';
import { ITaskDataProvider } from '../../providers';
import { IGanttDates } from './GanttDates';

export interface IGanttDragging {
}

interface IGanttDraggingParams {
	datasetControl: ITaskGridDatasetControl;
	gantt: GanttStatic;
	dates: IGanttDates;
}

export class GanttDragging implements IGanttDragging {
	private _datasetControl: ITaskGridDatasetControl;
	private _taskDataProvider: ITaskDataProvider;
	private _gantt: GanttStatic;
	private _dates: IGanttDates;
	private _ancestorOriginalStartDates = new Map<string, Date>();
	private _ancestorOriginalEndDates = new Map<string, Date>();

	constructor(params: IGanttDraggingParams) {
		this._datasetControl = params.datasetControl;
		this._taskDataProvider = params.datasetControl.getDataProvider();
		this._gantt = params.gantt;
		this._dates = params.dates;
		this._registerEventListeners();
	}

	private _registerEventListeners() {
		this._gantt.attachEvent('onBeforeTaskDrag', (id: string) => this._onBeforeTaskDrag(id));
		this._gantt.attachEvent('onTaskDrag', (id: string, mode: string) => this._onTaskDrag(id, mode));
		this._gantt.attachEvent('onAfterTaskDrag', () => this._onAfterTaskDrag());
	}

	private _onBeforeTaskDrag(taskId: string) {
		const task = this._gantt.getTask(taskId);
		if (!task?.active) return false;
		this._ancestorOriginalStartDates.clear();
		this._ancestorOriginalEndDates.clear();
		const startColumnName = this._dates.getStartDateColumnName();
		const endColumnName = this._dates.getEndDateColumnName();
		let parentId: string | undefined = task.parent ? String(task.parent) : undefined;
		while (parentId && this._gantt.isTaskExists(parentId)) {
			if (this._ancestorOriginalEndDates.has(parentId)) break;
			const parentRecord = this._taskDataProvider.getRecordsMap()[parentId];
			const startDate = parentRecord && this._dates.getDateFromString(parentRecord.getValue(startColumnName));
			const endDate = parentRecord && this._dates.getDateFromString(parentRecord.getValue(endColumnName));
			if (startDate) this._ancestorOriginalStartDates.set(parentId, startDate);
			if (endDate) this._ancestorOriginalEndDates.set(parentId, endDate);
			const parentTask = this._gantt.getTask(parentId);
			parentId = parentTask?.parent ? String(parentTask.parent) : undefined;
		}
		return true;
	}

	private _onTaskDrag(taskId: string, mode: string) {
		const draggedTask = this._gantt.getTask(taskId);
		const startColumnName = this._dates.getStartDateColumnName();
		const endColumnName = this._dates.getEndDateColumnName();
		const selectedRecordIds = this._taskDataProvider.getSelectedRecordIds();

		if (mode === 'resize') {
			const record = this._taskDataProvider.getRecordsMap()[taskId];
			record.setValue(startColumnName, draggedTask.start_date);
			record.setValue(endColumnName, draggedTask.end_date);
			this._propagateBoundsToAncestors(taskId, true);
		}
		else {
			const selectedTaskIds = new Set<string>(
				(selectedRecordIds.includes(taskId) ? selectedRecordIds : [taskId])
					.filter(selectedTaskId => this._gantt.getTask(selectedTaskId)?.active)
			);
			const draggedRecord = this._taskDataProvider.getRecordsMap()[taskId];
			const originalDraggedStartDate = draggedRecord.getValue(startColumnName);
			const originalDraggedStartTime = this._dates.getDateFromString(originalDraggedStartDate)?.getTime();
			const draggedTaskStartTime = draggedTask.start_date?.getTime();

				if (originalDraggedStartTime === undefined || draggedTaskStartTime === undefined) {
				return;
			}

			const draggedOffset = draggedTaskStartTime - originalDraggedStartTime;

			// Expand the move set: for each selected task include all its descendants
			// so that dragging a parent also moves its children.
			const recordTree = this._taskDataProvider.getRecordTree();
			const tasksToMove = new Set<string>(selectedTaskIds);
			for (const selectedTaskId of selectedTaskIds) {
				for (const descendant of recordTree.getNode(selectedTaskId)?.allChildren ?? []) {
					tasksToMove.add(descendant.getRecordId());
				}
			}

			for (const taskIdToMove of tasksToMove) {
				const taskToMove = this._gantt.getTask(taskIdToMove);
				const recordToMove = this._taskDataProvider.getRecordsMap()[taskIdToMove];
				const originalStartDate = this._dates.getDateFromString(recordToMove.getValue(startColumnName));
				const originalEndDate = this._dates.getDateFromString(recordToMove.getValue(endColumnName));

				if (!originalStartDate || !originalEndDate) {
					continue;
				}

				taskToMove.start_date = new Date(originalStartDate.getTime() + draggedOffset);
				taskToMove.end_date = new Date(originalEndDate.getTime() + draggedOffset);

				recordToMove.setValue(startColumnName, taskToMove.start_date);
				recordToMove.setValue(endColumnName, taskToMove.end_date);
			}
			this._propagateBoundsToAncestors(taskId, true);
		}

		if (selectedRecordIds.length > 1) {
			this._gantt.render();
		}
	}

	private _propagateBoundsToAncestors(childTaskId: string, includeStart: boolean) {
		let parentId: string | undefined = this._gantt.getTask(childTaskId)?.parent
			? String(this._gantt.getTask(childTaskId).parent)
			: undefined;

		while (parentId && this._gantt.isTaskExists(parentId)) {
			const parentTask = this._gantt.getTask(parentId);
			const originalStartDate = this._ancestorOriginalStartDates.get(parentId);
			const originalEndDate = this._ancestorOriginalEndDates.get(parentId);
			if (!parentTask || !originalEndDate) break;

			let maxChildEnd = originalEndDate.getTime();
			for (const childId of this._gantt.getChildren(parentId)) {
				const childTask = this._gantt.getTask(String(childId));
				const childEnd = childTask?.end_date;
				if (childEnd && childEnd.getTime() > maxChildEnd) {
					maxChildEnd = childEnd.getTime();
				}
			}
			const newEnd = new Date(maxChildEnd);
			if (parentTask.end_date?.getTime() !== newEnd.getTime()) {
				parentTask.end_date = newEnd;
			}

			if (includeStart && originalStartDate) {
				let minChildStart = originalStartDate.getTime();
				for (const childId of this._gantt.getChildren(parentId)) {
					const childTask = this._gantt.getTask(String(childId));
					const childStart = childTask?.start_date;
					if (childStart && childStart.getTime() < minChildStart) {
						minChildStart = childStart.getTime();
					}
				}
				const newStart = new Date(minChildStart);
				if (parentTask.start_date?.getTime() !== newStart.getTime()) {
					parentTask.start_date = newStart;
				}
			}

			parentId = parentTask.parent ? String(parentTask.parent) : undefined;
		}

		this._gantt.render();
	}

	private _onAfterTaskDrag() {
		this._ancestorOriginalStartDates.clear();
		this._ancestorOriginalEndDates.clear();
		this._taskDataProvider.save();
	}
}