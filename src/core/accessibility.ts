import type { GanttTask } from '../types';
import { normalizeDependency } from '../components/Timeline/dependencyLinks';

/**
 * A bar's accessible name: "Pour slab, Mar 3, 2026 to Mar 6, 2026, 40%, depends on Rebar, critical".
 * Milestones read "Handover, milestone, Mar 15, 2026".
 */
export function taskAccessibleName(
  task: GanttTask & { _start: Date; _end: Date },
  formatDate: (date: Date) => string,
  nameOf: (taskId: string) => string | undefined,
): string {
  const parts =
    task.type === 'milestone'
      ? [task.name, 'milestone', formatDate(task._start)]
      : [
          task.name,
          `${formatDate(task._start)} to ${formatDate(task._end)}`,
          `${Math.round(Math.max(0, Math.min(100, task.progress ?? 0)))}%`,
        ];
  const predecessors = (task.dependencies ?? []).map((dep) => {
    const { id } = normalizeDependency(dep);
    return nameOf(id) ?? id;
  });
  if (predecessors.length > 0) parts.push(`depends on ${predecessors.join(', ')}`);
  if (task.critical) parts.push('critical');
  return parts.join(', ');
}

/** "Moved Rebar inspection to Oct 12, 2026 – Oct 14, 2026" (a milestone names one date). */
export function taskChangeAnnouncement(
  verb: 'Moved' | 'Resized',
  task: GanttTask,
  start: Date,
  end: Date,
  formatDate: (date: Date) => string,
): string {
  const when =
    task.type === 'milestone' ? formatDate(start) : `${formatDate(start)} – ${formatDate(end)}`;
  return `${verb} ${task.name} to ${when}`;
}
