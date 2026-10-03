/** Task and dependency selection. Plain click selects one item; ctrl/meta-click toggles it. */
export interface GanttSelection {
  taskIds: string[];
  dependencyIds: string[];
}

const EMPTY: string[] = [];

function toggle(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

/** Keeps the same empty array, so a no-op clear does not hand memoised children a new reference. */
function cleared(ids: string[]): string[] {
  return ids.length === 0 ? ids : EMPTY;
}

export function selectTask(current: GanttSelection, taskId: string, multi: boolean): GanttSelection {
  if (multi) return { taskIds: toggle(current.taskIds, taskId), dependencyIds: current.dependencyIds };
  return { taskIds: [taskId], dependencyIds: cleared(current.dependencyIds) };
}

export function selectDependency(
  current: GanttSelection,
  dependencyId: string,
  multi: boolean,
): GanttSelection {
  if (multi) {
    return { taskIds: current.taskIds, dependencyIds: toggle(current.dependencyIds, dependencyId) };
  }
  return { taskIds: cleared(current.taskIds), dependencyIds: [dependencyId] };
}
