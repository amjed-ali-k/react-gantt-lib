import type { DependencyType } from '../../types';

const STUB = 14;
const MIN_HEAD_RUN = 10;
const BYPASS_CLEARANCE = 8;
const CORNER_RADIUS = 4;
const HEAD_LENGTH = 8;
const HEAD_HALF_WIDTH = 4;

export interface Point {
  x: number;
  y: number;
}

/** Which bar edge a link leaves (`from`) and arrives at (`to`). */
export type DependencyEdge = 'start' | 'end';

export const DEPENDENCY_EDGES: Record<DependencyType, { from: DependencyEdge; to: DependencyEdge }> = {
  FS: { from: 'end', to: 'start' },
  SS: { from: 'start', to: 'start' },
  FF: { from: 'end', to: 'end' },
  SF: { from: 'start', to: 'end' },
};

/**
 * Horizontal travel direction away from an edge: right (+1) from an end edge, left (-1) from a
 * start edge. A path arrives travelling the opposite way, i.e. `-outward(to)`.
 */
function outward(edge: DependencyEdge): 1 | -1 {
  return edge === 'end' ? 1 : -1;
}

function channelY(fromY: number, toY: number): number {
  if (Math.abs(toY - fromY) < CORNER_RADIUS * 2) {
    return fromY + (toY >= fromY ? STUB : -STUB);
  }
  return (fromY + toY) / 2;
}

function roundedOrthogonalPath(points: Point[], radius: number): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 2; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const p2 = points[i + 2];

    const dx1 = p1.x - p0.x;
    const dy1 = p1.y - p0.y;
    const dx2 = p2.x - p1.x;
    const dy2 = p2.y - p1.y;
    const len1 = Math.hypot(dx1, dy1);
    const len2 = Math.hypot(dx2, dy2);

    if (len1 === 0 || len2 === 0) {
      d += ` L ${p1.x} ${p1.y}`;
      continue;
    }

    const r = Math.min(radius, len1 / 2, len2 / 2);
    const x1 = p1.x - (dx1 / len1) * r;
    const y1 = p1.y - (dy1 / len1) * r;
    const x2 = p1.x + (dx2 / len2) * r;
    const y2 = p1.y + (dy2 / len2) * r;

    d += ` L ${x1} ${y1} Q ${p1.x} ${p1.y} ${x2} ${y2}`;
  }

  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

/**
 * Orthogonal route (corner points) for a link of `type` from the predecessor's connector
 * `(fromX, fromY)` to the successor's `(toX, toY)`. The connectors are the bar edges named by
 * `DEPENDENCY_EDGES[type]`; the route leaves and arrives horizontally and always ends with at
 * least `MIN_HEAD_RUN` px of straight line before the arrowhead.
 *
 * - **Same side** (SS, FF): one C-shaped run around whichever edge sticks out further.
 * - **Opposite sides** (FS, SF): a Z when the successor's edge is far enough ahead; otherwise the
 *   path doubles back through the row gutter (the "backwards" case).
 */
export function routeDependency(
  type: DependencyType,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): Point[] {
  const edges = DEPENDENCY_EDGES[type];
  const out = outward(edges.from);
  const entry = -outward(edges.to);
  const exitX = fromX + out * STUB;
  const approachX = toX - entry * (MIN_HEAD_RUN + CORNER_RADIUS);

  if (out !== entry) {
    const x = out > 0 ? Math.max(exitX, approachX) : Math.min(exitX, approachX);
    return [
      { x: fromX, y: fromY },
      { x, y: fromY },
      { x, y: toY },
      { x: toX, y: toY },
    ];
  }

  if ((approachX - exitX) * out >= 0) {
    return [
      { x: fromX, y: fromY },
      { x: approachX, y: fromY },
      { x: approachX, y: toY },
      { x: toX, y: toY },
    ];
  }

  const backX =
    out > 0
      ? Math.min(approachX - BYPASS_CLEARANCE, fromX - BYPASS_CLEARANCE)
      : Math.max(approachX + BYPASS_CLEARANCE, fromX + BYPASS_CLEARANCE);
  const gutterY = channelY(fromY, toY);

  return [
    { x: fromX, y: fromY },
    { x: exitX, y: fromY },
    { x: exitX, y: gutterY },
    { x: backX, y: gutterY },
    { x: backX, y: toY },
    { x: toX, y: toY },
  ];
}

/** SVG path data for a route, with rounded corners. */
export function routeToPath(points: Point[]): string {
  return roundedOrthogonalPath(points, CORNER_RADIUS);
}

/** SVG path data for a link of `type` — see `routeDependency`. */
export function buildDependencyPath(
  type: DependencyType,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): string {
  return routeToPath(routeDependency(type, fromX, fromY, toX, toY));
}

/**
 * Finish-to-start dependency arrow with ApexCharts-style orthogonal routing.
 * Exits the predecessor right edge, routes to the successor left edge.
 * When tasks overlap horizontally, loops through the row gutter.
 */
export function buildFinishToStartPath(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): string {
  return buildDependencyPath('FS', fromX, fromY, toX, toY);
}

/**
 * Arrowhead polygon (`points` attribute) with its tip on the route's last point, pointing along
 * the final segment — rightwards into a start edge, leftwards into an end edge.
 */
export function arrowHeadPoints(points: Point[]): string {
  const tip = points[points.length - 1];
  const prev = points[points.length - 2] ?? tip;
  const dir = tip.x >= prev.x ? 1 : -1;
  const baseX = tip.x - dir * HEAD_LENGTH;
  return `${tip.x},${tip.y} ${baseX},${tip.y - HEAD_HALF_WIDTH} ${baseX},${tip.y + HEAD_HALF_WIDTH}`;
}

/**
 * Where a lag label sits: the middle of the route's longest vertical run, or of its first segment
 * when the route is flat.
 */
export function labelAnchor(points: Point[]): Point {
  let best: Point | null = null;
  let bestLength = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const length = Math.abs(b.y - a.y);
    if (a.x === b.x && length > bestLength) {
      bestLength = length;
      best = { x: a.x, y: (a.y + b.y) / 2 };
    }
  }
  if (best) return best;
  const [a, b = a] = points;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export const dependencyPathConstants = {
  STUB,
  MIN_HEAD_RUN,
  BYPASS_CLEARANCE,
  CORNER_RADIUS,
  HEAD_LENGTH,
  HEAD_HALF_WIDTH,
} as const;
