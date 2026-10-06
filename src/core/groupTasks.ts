import type { GanttTask, GroupSummaryRollup } from '../types';
import { toDate } from './dates';

export function isGroupTask(task: GanttTask): boolean {
  return task.type === 'group';
}

export function taskHasChildren(taskId: string, tasks: GanttTask[]): boolean {
  return tasks.some((task) => task.parentId === taskId);
}

/** Rows that can expand/collapse descendants in the sidebar. */
export function taskSupportsCollapse(task: GanttTask, tasks: GanttTask[]): boolean {
  return isGroupTask(task) || taskHasChildren(task.id, tasks);
}

/** Group rows show a summary bar unless explicitly disabled. */
export function groupShowsSummaryBar(task: GanttTask): boolean {
  if (!isGroupTask(task)) return false;
  return task.showSummaryBar !== false;
}

export function buildTaskMap(tasks: GanttTask[]): Map<string, GanttTask> {
  return new Map(tasks.map((task) => [task.id, task]));
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

/** Leaf descendants that contribute to a summary group's roll-up. */
export function collectRollupDescendants(
  group: GanttTask,
  tasks: GanttTask[],
  taskMap: Map<string, GanttTask> = buildTaskMap(tasks),
): GanttTask[] {
  const descendants: GanttTask[] = [];
  for (const id of collectDescendantIds(group.id, tasks)) {
    const descendant = taskMap.get(id);
    if (!descendant) continue;
    // A group's own dates and progress are not its tasks': its children are walked anyway, so a
    // folder row (no summary bar) or a heading with nothing under it adds nothing to the roll-up.
    if (isGroupTask(descendant)) continue;
    descendants.push(descendant);
  }
  return descendants;
}

export function resolveGroupRollupFlag(
  task: GanttTask,
  key: keyof GroupSummaryRollup,
  defaults?: GroupSummaryRollup,
): boolean {
  const taskValue = task.rollup?.[key];
  if (taskValue !== undefined) return taskValue;
  const defaultValue = defaults?.[key];
  if (defaultValue !== undefined) return defaultValue;
  return true;
}

export function shouldRollupGroupDates(
  task: GanttTask,
  defaults?: GroupSummaryRollup,
): boolean {
  return isGroupTask(task) && groupShowsSummaryBar(task) && resolveGroupRollupFlag(task, 'dates', defaults);
}

export function shouldRollupGroupProgress(
  task: GanttTask,
  defaults?: GroupSummaryRollup,
): boolean {
  if (!isGroupTask(task) || !groupShowsSummaryBar(task)) return false;
  if (task.rollup?.progress !== undefined) return task.rollup.progress;
  if (defaults?.progress !== undefined) return defaults.progress;
  // Explicit progress on the group row overrides roll-up unless rollup.progress: true.
  if (task.progress !== undefined) return false;
  return true;
}

export function shouldRollupGroupBaseline(
  task: GanttTask,
  defaults?: GroupSummaryRollup,
): boolean {
  if (!isGroupTask(task) || !groupShowsSummaryBar(task)) return false;
  if (task.rollup?.baseline !== undefined) return task.rollup.baseline;
  if (defaults?.baseline !== undefined) return defaults.baseline;
  // Explicit baseline on the group row overrides roll-up unless rollup.baseline: true.
  if (task.baseline !== undefined) return false;
  return true;
}

export function isBarHiddenByGroupAncestor(_task: GanttTask, _tasks: GanttTask[]): boolean {
  // Child rows stay visible when a summary group is expanded; collapsed descendants are
  // already removed by resolveTasks, so summary and child bars can render together.
  return false;
}

export function shouldRenderTaskBar(task: GanttTask, tasks: GanttTask[]): boolean {
  if (isGroupTask(task) && !groupShowsSummaryBar(task)) return false;
  if (isBarHiddenByGroupAncestor(task, tasks)) return false;
  return true;
}

export interface GroupSummaryRollupValues {
  dates: { start: Date; end: Date } | null;
  progress: number | null;
  baseline: { start: Date; end: Date } | null;
}

/** Compute all summary roll-up values from descendants in a single pass. */
export function computeGroupSummaryRollup(
  task: GanttTask,
  tasks: GanttTask[],
  taskMap: Map<string, GanttTask>,
): GroupSummaryRollupValues {
  const descendants = collectRollupDescendants(task, tasks, taskMap);
  if (descendants.length === 0) {
    return { dates: null, progress: null, baseline: null };
  }

  let minMs = Infinity;
  let maxMs = -Infinity;
  let totalWeight = 0;
  let weightedProgress = 0;
  let baselineMinMs = Infinity;
  let baselineMaxMs = -Infinity;

  for (const descendant of descendants) {
    const start = toDate(descendant.start).getTime();
    const end = toDate(descendant.end).getTime();
    minMs = Math.min(minMs, start);
    maxMs = Math.max(maxMs, end);

    const weight = Math.max(end - start, 1);
    weightedProgress += (descendant.progress ?? 0) * weight;
    totalWeight += weight;

    if (descendant.baseline) {
      const baselineStart = toDate(descendant.baseline.start).getTime();
      const baselineEnd = toDate(descendant.baseline.end).getTime();
      baselineMinMs = Math.min(baselineMinMs, baselineStart);
      baselineMaxMs = Math.max(baselineMaxMs, baselineEnd);
    }
  }

  return {
    dates: minMs === Infinity ? null : { start: new Date(minMs), end: new Date(maxMs) },
    progress: totalWeight === 0 ? 0 : Math.round(weightedProgress / totalWeight),
    baseline:
      baselineMinMs === Infinity
        ? null
        : { start: new Date(baselineMinMs), end: new Date(baselineMaxMs) },
  };
}

export function rollUpGroupDates(
  task: GanttTask,
  tasks: GanttTask[],
  taskMap?: Map<string, GanttTask>,
): { start: Date; end: Date } | null {
  return computeGroupSummaryRollup(task, tasks, taskMap ?? buildTaskMap(tasks)).dates;
}

export function rollUpGroupProgress(
  task: GanttTask,
  tasks: GanttTask[],
  taskMap?: Map<string, GanttTask>,
): number | null {
  return computeGroupSummaryRollup(task, tasks, taskMap ?? buildTaskMap(tasks)).progress;
}

export function rollUpGroupBaseline(
  task: GanttTask,
  tasks: GanttTask[],
  taskMap?: Map<string, GanttTask>,
): { start: Date; end: Date } | null {
  return computeGroupSummaryRollup(task, tasks, taskMap ?? buildTaskMap(tasks)).baseline;
}

export function resolveTaskInteractionFlags(
  task: GanttTask,
  defaults: {
    enableDrag: boolean;
    enableResize: boolean;
    enableProgressDrag: boolean;
    enableDependencyCreate?: boolean;
    groupSummaryRollup?: GroupSummaryRollup;
  },
): { enableDrag: boolean; enableResize: boolean; enableProgressDrag: boolean; enableDependencyCreate: boolean } {
  if (task.readOnly) {
    return { enableDrag: false, enableResize: false, enableProgressDrag: false, enableDependencyCreate: false };
  }

  let enableDrag = task.enableDrag ?? defaults.enableDrag;
  let enableResize = task.enableResize ?? defaults.enableResize;
  let enableProgressDrag = task.enableProgressDrag ?? defaults.enableProgressDrag;
  const enableDependencyCreate = task.enableDependencyCreate ?? defaults.enableDependencyCreate ?? false;

  if (shouldRollupGroupDates(task, defaults.groupSummaryRollup)) {
    enableDrag = false;
    enableResize = false;
  }
  if (shouldRollupGroupProgress(task, defaults.groupSummaryRollup)) {
    enableProgressDrag = false;
  }

  return { enableDrag, enableResize, enableProgressDrag, enableDependencyCreate };
}
