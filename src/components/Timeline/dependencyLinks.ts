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

export type NormalizedDependency = GanttDependencyTarget['dependency'];

/** Stable id of the link from `fromId` (predecessor) to `toId` (successor). */
export function dependencyId(fromId: string, toId: string): string {
  return `${fromId}->${toId}`;
}

export function normalizeDependency(dep: GanttDependency | string): NormalizedDependency {
  if (typeof dep === 'string') return { id: dep, type: 'FS', lag: 0 };
  return { ...dep, type: dep.type ?? 'FS', lag: dep.lag ?? 0 };
}

/** Every link declared on `tasks`, as targets — whether or not both ends are rendered. */
export function collectDependencyTargets<T extends GanttTask>(
  tasks: readonly T[],
  ids?: ReadonlySet<string>,
): GanttDependencyTarget[] {
  const byId = new Map<string, T>();
  for (const task of tasks) byId.set(task.id, task);
  const result: GanttDependencyTarget[] = [];
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
  tasks: ResolvedTask[];
  taskIndexMap: Map<string, number>;
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

/** Geometry for every link whose both ends are in `tasks`. Pure — the layers memoise it. */
export function computeDependencyLinks({
  tasks,
  taskIndexMap,
  rowLayouts,
  rangeStart,
  scale,
  columnWidth,
  showBaseline,
  preview,
}: DependencyLinkInput): DependencyLink[] {
  const links: DependencyLink[] = [];

  for (const to of tasks) {
    if (!to.dependencies) continue;
    for (const raw of to.dependencies) {
      const dependency = normalizeDependency(raw);
      const fromIndex = taskIndexMap.get(dependency.id);
      if (fromIndex === undefined) continue;
      const from = tasks[fromIndex];
      const fromRow = rowLayouts[fromIndex];
      const toRow = rowLayouts[to._rowIndex];
      if (!from || !fromRow || !toRow) continue;

      const edges = DEPENDENCY_EDGES[dependency.type];
      const fromX = taskConnectorX(connectorTask(from, preview), edges.from, rangeStart, scale, columnWidth);
      const toX = taskConnectorX(connectorTask(to, preview), edges.to, rangeStart, scale, columnWidth);
      const fromY = getTaskBarCenterY(from, fromRow, showBaseline);
      const toY = getTaskBarCenterY(to, toRow, showBaseline);
      const points = routeDependency(dependency.type, fromX, fromY, toX, toY);
      const id = dependencyId(from.id, to.id);

      links.push({
        target: { type: 'dependency', id, from, to, dependency },
        id,
        type: dependency.type,
        lag: dependency.lag,
        points,
        d: routeToPath(points),
        head: arrowHeadPoints(points),
        label: labelAnchor(points),
      });
    }
  }

  return links;
}

/** Default lag label: the lag read as days, signed (`+2d`, `-1d`). */
export function defaultDependencyLagLabel(lag: number): string {
  return `${lag > 0 ? '+' : '-'}${Math.abs(lag)}d`;
}

const DEPENDENCY_TYPE_NAMES: Record<DependencyType, string> = {
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
