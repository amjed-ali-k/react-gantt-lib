import type { GanttTask } from '../types';
import { toDate } from './dates';

export function isGroupTask(task: GanttTask): boolean {
  return task.type === 'group';
}

/** Group rows show a summary bar unless explicitly disabled. */
export function groupShowsSummaryBar(task: GanttTask): boolean {
  if (!isGroupTask(task)) return false;
  return task.showSummaryBar !== false;
}

function collectDescendantIds(parentId: string, tasks: GanttTask[]): string[] {
  const ids: string[] = [];
  for (const task of tasks) {
    if (task.parentId !== parentId) continue;
    ids.push(task.id);
    ids.push(...collectDescendantIds(task.id, tasks));
  }
  return ids;
}

export function isBarHiddenByGroupAncestor(task: GanttTask, tasks: GanttTask[]): boolean {
  let parentId = task.parentId;
  while (parentId) {
    const parent = tasks.find((t) => t.id === parentId);
    if (!parent) break;
    if (groupShowsSummaryBar(parent)) return true;
    parentId = parent.parentId;
  }
  return false;
}

export function shouldRenderTaskBar(task: GanttTask, tasks: GanttTask[]): boolean {
  if (isGroupTask(task) && !groupShowsSummaryBar(task)) return false;
  if (isBarHiddenByGroupAncestor(task, tasks)) return false;
  return true;
}

export function rollUpGroupDates(
  task: GanttTask,
  tasks: GanttTask[],
): { start: Date; end: Date } | null {
  const descendantIds = collectDescendantIds(task.id, tasks);
  let minMs = Infinity;
  let maxMs = -Infinity;

  for (const id of descendantIds) {
    const descendant = tasks.find((t) => t.id === id);
    if (!descendant) continue;
    if (isGroupTask(descendant) && groupShowsSummaryBar(descendant)) continue;
    const start = toDate(descendant.start).getTime();
    const end = toDate(descendant.end).getTime();
    minMs = Math.min(minMs, start);
    maxMs = Math.max(maxMs, end);
  }

  if (minMs === Infinity) return null;
  return { start: new Date(minMs), end: new Date(maxMs) };
}

export function resolveTaskInteractionFlags(
  task: GanttTask,
  defaults: {
    enableDrag: boolean;
    enableResize: boolean;
    enableProgressDrag: boolean;
  },
): { enableDrag: boolean; enableResize: boolean; enableProgressDrag: boolean } {
  if (task.readOnly) {
    return { enableDrag: false, enableResize: false, enableProgressDrag: false };
  }
  return {
    enableDrag: task.enableDrag ?? defaults.enableDrag,
    enableResize: task.enableResize ?? defaults.enableResize,
    enableProgressDrag: task.enableProgressDrag ?? defaults.enableProgressDrag,
  };
}
