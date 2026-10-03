import type { DependencyType } from '../types';
import { DEPENDENCY_EDGES, type DependencyEdge } from '../components/Timeline/dependencyPaths';

/** A connector handle: one edge of one task. */
export interface LinkEndpoint {
  taskId: string;
  edge: DependencyEdge;
}

/** The link type a drag from `from` to `to` draws — the inverse of `DEPENDENCY_EDGES`. */
export function dependencyTypeForEdges(from: DependencyEdge, to: DependencyEdge): DependencyType {
  const types = Object.keys(DEPENDENCY_EDGES) as DependencyType[];
  return types.find((t) => DEPENDENCY_EDGES[t].from === from && DEPENDENCY_EDGES[t].to === to)!;
}

/** Width of the band inside each viewport edge that scrolls while a link is dragged. */
export const AUTO_SCROLL_ZONE = 40;
/** Fastest auto-scroll, in px per frame, reached at (and past) the viewport edge. */
export const AUTO_SCROLL_MAX_SPEED = 18;

/**
 * Auto-scroll speed along one axis for a pointer at `pos` in a viewport spanning `[min, max]`:
 * negative inside the leading `AUTO_SCROLL_ZONE`, positive inside the trailing one, growing
 * linearly to `AUTO_SCROLL_MAX_SPEED` at the edge and beyond it; 0 elsewhere.
 */
export function autoScrollSpeed(pos: number, min: number, max: number): number {
  const zone = Math.min(AUTO_SCROLL_ZONE, (max - min) / 3);
  if (zone <= 0) return 0;
  const ramp = (depth: number) => Math.ceil(AUTO_SCROLL_MAX_SPEED * Math.min(1, depth / zone));
  if (pos < min + zone) return -ramp(min + zone - pos);
  if (pos > max - zone) return ramp(pos - (max - zone));
  return 0;
}
