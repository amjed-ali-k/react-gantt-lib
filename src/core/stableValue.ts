import type { TimelineRange } from '../types';
import type { VisibleColumnRange } from './visibleColumns';

/** Return the previous object when timeline range values are unchanged. */
export function stableTimelineRange(
  next: TimelineRange,
  prev: TimelineRange | undefined,
): TimelineRange {
  if (
    prev &&
    prev.start.getTime() === next.start.getTime() &&
    prev.end.getTime() === next.end.getTime() &&
    prev.columnCount === next.columnCount &&
    prev.pixelWidth === next.pixelWidth &&
    prev.fixed === next.fixed
  ) {
    return prev;
  }
  return next;
}

/** Return the previous object when visible column indices are unchanged. */
export function stableVisibleColumnRange(
  next: VisibleColumnRange,
  prev: VisibleColumnRange | undefined,
): VisibleColumnRange {
  if (
    prev &&
    prev.startIndex === next.startIndex &&
    prev.endIndex === next.endIndex &&
    prev.startX === next.startX &&
    prev.endX === next.endX
  ) {
    return prev;
  }
  return next;
}
