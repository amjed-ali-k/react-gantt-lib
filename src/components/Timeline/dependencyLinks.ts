import type {
  DependencyType,
  GanttDependency,
  GanttDependencyTarget,
  GanttTask,
  ResolvedTask,
} from '../../types';
import type { ViewScale } from '../../core/scale';
import { getTaskBarCenterY, type RowLayout } from '../../core/rowLayout';
import { taskConnectorX } from './milestoneGeometry';
import {
  DEPENDENCY_EDGES,
  arrowHeadPoints,
  labelAnchor,
  routeDependency,
  routeToPath,
  type Point,
} from './dependencyPaths';
import type { DragPreviewDates } from '../../hooks/useDragPreviewStore';

type NormalizedDependency = GanttDependencyTarget['dependency'];

/** Stable id of the link from `fromId` (predecessor) to `toId` (successor). */
export function dependencyId(fromId: string, toId: string): string {
  return `${fromId}->${toId}`;
}

const KNOWN_TYPES = new Set<string>(['FS', 'SS', 'FF', 'SF']);

/** Fills in `type` and `lag`. A missing or unknown type (e.g. from untyped JSON) reads as FS. */
export function normalizeDependency(dep: GanttDependency | string): NormalizedDependency {
  if (typeof dep === 'string') return { id: dep, type: 'FS', lag: 0 };
  const type = dep.type && KNOWN_TYPES.has(dep.type) ? dep.type : 'FS';
  return { ...dep, type, lag: dep.lag ?? 0 };
}

/** Every link declared on `tasks`, as targets — whether or not both ends are rendered. */
export function collectDependencyTargets<T extends GanttTask>(
  tasks: readonly T[],
  ids?: ReadonlySet<string>,
): (GanttDependencyTarget & { from: T; to: T })[] {
  const byId = new Map<string, T>();
  for (const task of tasks) byId.set(task.id, task);
  const result: (GanttDependencyTarget & { from: T; to: T })[] = [];
  for (const to of tasks) {
    for (const raw of to.dependencies ?? []) {
      const dependency = normalizeDependency(raw);
      const id = dependencyId(dependency.id, to.id);
      if (ids && !ids.has(id)) continue;
      const from = byId.get(dependency.id);
      if (!from) continue;
      result.push({ type: 'dependency', id, from, to, dependency });
    }
  }
  return result;
}

/** A rendered link: its target plus the geometry every dependency layer draws from. */
export interface DependencyLink {
  target: GanttDependencyTarget & { from: ResolvedTask; to: ResolvedTask };
  id: string;
  type: DependencyType;
  lag: number;
  /** Corner points of the orthogonal route, predecessor connector first. */
  points: Point[];
  /** SVG path data for the line. */
  d: string;
  /** Arrowhead polygon `points`. */
  head: string;
  /** Where the lag label is drawn. */
  label: Point;
}

export interface DependencyLinkInput {
  /** The tasks of one timeline section, in row order; `rowLayouts[i]` is `tasks[i]`'s row. */
  tasks: ResolvedTask[];
  rowLayouts: RowLayout[];
  rangeStart: Date;
  scale: ViewScale;
  columnWidth: number;
  showBaseline: boolean;
  /** In-flight drag dates, so links follow a bar before the drop is committed. */
  preview?: { taskId: string | null; dates: DragPreviewDates | null };
}

function connectorTask(
  task: ResolvedTask,
  preview: DependencyLinkInput['preview'],
): { type?: string; _start: Date; _end: Date } {
  if (!preview?.dates || preview.taskId !== task.id) return task;
  return { ...task, _start: preview.dates.start, _end: preview.dates.end };
}

/**
 * Geometry for every link whose both ends are in `tasks`. Pure — the layers memoise it. Rows are
 * looked up by position in `tasks`, not `_rowIndex` (which counts sticky rows too), so a section
 * of the chart only draws links between its own rows.
 */
export function computeDependencyLinks({
  tasks,
  rowLayouts,
  rangeStart,
  scale,
  columnWidth,
  showBaseline,
  preview,
}: DependencyLinkInput): DependencyLink[] {
  const position = new Map<string, number>();
  tasks.forEach((task, i) => position.set(task.id, i));
  const links: DependencyLink[] = [];

  for (const target of collectDependencyTargets(tasks)) {
    const { from, to, dependency } = target;
    const fromRow = rowLayouts[position.get(from.id) ?? -1];
    const toRow = rowLayouts[position.get(to.id) ?? -1];
    if (!fromRow || !toRow) continue;

    const edges = DEPENDENCY_EDGES[dependency.type];
    const fromX = taskConnectorX(connectorTask(from, preview), edges.from, rangeStart, scale, columnWidth);
    const toX = taskConnectorX(connectorTask(to, preview), edges.to, rangeStart, scale, columnWidth);
    const fromY = getTaskBarCenterY(from, fromRow, showBaseline);
    const toY = getTaskBarCenterY(to, toRow, showBaseline);
    const points = routeDependency(dependency.type, fromX, fromY, toX, toY);

    links.push({
      target,
      id: target.id,
      type: dependency.type,
      lag: dependency.lag,
      points,
      d: routeToPath(points),
      head: arrowHeadPoints(points),
      label: labelAnchor(points),
    });
  }

  return links;
}

/** Default lag label: the lag read as days, signed (`+2d`, `-1d`). */
export function defaultDependencyLagLabel(lag: number): string {
  return `${lag > 0 ? '+' : '-'}${Math.abs(lag)}d`;
}

/** Spoken name of each link type. */
export const DEPENDENCY_TYPE_NAMES: Record<DependencyType, string> = {
  FS: 'finish to start',
  SS: 'start to start',
  FF: 'finish to finish',
  SF: 'start to finish',
};

/** Accessible name for a link, e.g. "Dependency: Design finish to start Build, lag +2d". */
export function dependencyAccessibleName(link: DependencyLink, lagLabel: string): string {
  const { from, to } = link.target;
  const lag = lagLabel ? `, lag ${lagLabel}` : '';
  return `Dependency: ${from.name} ${DEPENDENCY_TYPE_NAMES[link.type]} ${to.name}${lag}`;
}
