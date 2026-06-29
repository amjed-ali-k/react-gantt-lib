import type { DraggableMarkerSnapPoint, DraggableMarker, TimelineRange } from '../types';
import { toDate } from './dates';
import { addScaleSteps, type ViewScale } from './scale';
import {
  dateToScalePixel,
  resolveTimelineWidth,
  scalePixelToDate,
  type TimelineBounds,
} from './zoom';

export interface DraggableMarkerInteractionFlags {
  /** Any drag lifecycle callback is registered. */
  dragEnabled: boolean;
  emitDragStart: boolean;
  emitDrag: boolean;
  emitDragEnd: boolean;
  emitDragToSnapPoint: boolean;
  /** `onGanttClick` registered — marker click targets are rendered. */
  clickEnabled: boolean;
  /** Resolve and apply custom snap points during drag. */
  useSnapPoints: boolean;
}

export function resolveDraggableMarkerInteractionFlags(options: {
  onDragStart?: unknown;
  onDrag?: unknown;
  onDragEnd?: unknown;
  onDragToSnapPoint?: unknown;
  onGanttClick?: unknown;
  hasSnapPoints?: boolean;
}): DraggableMarkerInteractionFlags {
  const emitDragStart = options.onDragStart != null;
  const emitDrag = options.onDrag != null;
  const emitDragEnd = options.onDragEnd != null;
  const emitDragToSnapPoint = options.onDragToSnapPoint != null;
  const dragEnabled = emitDragStart || emitDrag || emitDragEnd || emitDragToSnapPoint;
  const clickEnabled = options.onGanttClick != null;

  return {
    dragEnabled,
    emitDragStart,
    emitDrag,
    emitDragEnd,
    emitDragToSnapPoint,
    clickEnabled,
    useSnapPoints: !!(options.hasSnapPoints && dragEnabled),
  };
}

export interface ResolvedDraggableMarker {
  key: string;
  x: number;
  label?: string;
  color?: string;
  draggable: boolean;
  index: number;
  marker: DraggableMarker;
}

export interface ResolvedDraggableMarkerSnapPoint {
  snapPoint: DraggableMarkerSnapPoint;
  index: number;
  x: number;
  date: Date;
}

export interface ResolvedMarkerPosition {
  x: number;
  date: Date;
  stepIndex: number;
  snapPoint?: ResolvedDraggableMarkerSnapPoint;
}

/** Snap a timeline x coordinate to the nearest column boundary (matches vertical grid lines). */
export function snapMarkerX(
  x: number,
  columnWidth: number,
  timelineWidth?: number,
): number {
  const stepIndex = Math.round(Math.max(0, x) / columnWidth);
  let snappedX = stepIndex * columnWidth;
  if (timelineWidth != null) {
    const maxStep = Math.round(timelineWidth / columnWidth);
    snappedX = Math.min(snappedX, maxStep * columnWidth);
  }
  return snappedX;
}

export function resolveMarkerStepIndex(
  x: number,
  columnWidth: number,
  timelineWidth?: number,
): number {
  return Math.round(snapMarkerX(x, columnWidth, timelineWidth) / columnWidth);
}

export function computeDraggableMarkerSnapPoints(
  snapPoints: DraggableMarkerSnapPoint[] | undefined,
  range: TimelineRange,
  scale: ViewScale,
  columnWidth: number,
): ResolvedDraggableMarkerSnapPoint[] {
  if (!snapPoints?.length) return [];

  const timelineWidth = resolveTimelineWidth(range, columnWidth);
  const result: ResolvedDraggableMarkerSnapPoint[] = [];

  snapPoints.forEach((snapPoint, index) => {
    const date = toDate(snapPoint.date);
    if (date < range.start || date > range.end) return;

    const x = dateToScalePixel(date, range.start, scale, columnWidth);
    if (x < 0 || x > timelineWidth) return;

    result.push({ snapPoint, index, x, date });
  });

  return result;
}

export function resolveNearestSnapPoint(
  x: number,
  snapPoints: ResolvedDraggableMarkerSnapPoint[],
): ResolvedDraggableMarkerSnapPoint | null {
  if (snapPoints.length === 0) return null;

  let nearest = snapPoints[0];
  let minDistance = Math.abs(x - nearest.x);

  for (let i = 1; i < snapPoints.length; i++) {
    const candidate = snapPoints[i];
    const distance = Math.abs(x - candidate.x);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = candidate;
    }
  }

  return nearest;
}

function clampMarkerDate(
  date: Date,
  rangeStart: Date,
  scale: ViewScale,
  columnWidth: number,
  snapToGrid: boolean,
  timelineWidth: number | undefined,
  timelineBounds: TimelineBounds | undefined,
): ResolvedMarkerPosition {
  if (timelineBounds) {
    const ms = date.getTime();
    date = new Date(
      Math.max(timelineBounds.min.getTime(), Math.min(timelineBounds.max.getTime(), ms)),
    );
    const clampedX = dateToScalePixel(date, rangeStart, scale, columnWidth);
    return {
      x: snapToGrid ? snapMarkerX(clampedX, columnWidth, timelineWidth) : clampedX,
      date,
      stepIndex: resolveMarkerStepIndex(
        snapToGrid ? snapMarkerX(clampedX, columnWidth, timelineWidth) : clampedX,
        columnWidth,
        timelineWidth,
      ),
    };
  }

  const x = dateToScalePixel(date, rangeStart, scale, columnWidth);
  return {
    x,
    date,
    stepIndex: Math.round(x / columnWidth),
  };
}

export function resolveMarkerPositionFromX(
  x: number,
  rangeStart: Date,
  scale: ViewScale,
  columnWidth: number,
  snapToGrid: boolean,
  timelineWidth?: number,
  timelineBounds?: TimelineBounds,
  snapPoints?: ResolvedDraggableMarkerSnapPoint[],
): ResolvedMarkerPosition {
  if (snapPoints?.length) {
    const nearest = resolveNearestSnapPoint(x, snapPoints);
    if (nearest) {
      const clamped = clampMarkerDate(
        nearest.date,
        rangeStart,
        scale,
        columnWidth,
        false,
        timelineWidth,
        timelineBounds,
      );
      return { ...clamped, x: nearest.x, snapPoint: nearest };
    }
  }

  const snappedX = snapToGrid
    ? snapMarkerX(x, columnWidth, timelineWidth)
    : Math.max(0, x);

  let date = snapToGrid
    ? addScaleSteps(rangeStart, resolveMarkerStepIndex(x, columnWidth, timelineWidth), scale)
    : scalePixelToDate(snappedX, rangeStart, scale, columnWidth);

  if (timelineBounds) {
    const clamped = clampMarkerDate(
      date,
      rangeStart,
      scale,
      columnWidth,
      snapToGrid,
      timelineWidth,
      timelineBounds,
    );
    return clamped;
  }

  return {
    x: snappedX,
    date,
    stepIndex: Math.round(snappedX / columnWidth),
  };
}

export function computeDraggableMarkerPositions(
  markers: DraggableMarker[] | undefined,
  range: TimelineRange,
  scale: ViewScale,
  columnWidth: number,
): ResolvedDraggableMarker[] {
  if (!markers?.length) return [];

  const timelineWidth = resolveTimelineWidth(range, columnWidth);
  const result: ResolvedDraggableMarker[] = [];

  markers.forEach((marker, index) => {
    const date = toDate(marker.date);
    if (date < range.start || date > range.end) return;

    const x = dateToScalePixel(date, range.start, scale, columnWidth);
    if (x < 0 || x > timelineWidth) return;

    result.push({
      key: marker.id,
      x,
      label: marker.label,
      color: marker.color,
      draggable: marker.draggable !== false,
      index,
      marker,
    });
  });

  return result;
}

/** @deprecated Use resolveMarkerPositionFromX — kept for tests and direct date-only resolution. */
export function resolveMarkerDateFromX(
  x: number,
  rangeStart: Date,
  scale: ViewScale,
  columnWidth: number,
  snapToGrid: boolean,
  timelineBounds?: TimelineBounds,
  timelineWidth?: number,
): Date {
  return resolveMarkerPositionFromX(
    x,
    rangeStart,
    scale,
    columnWidth,
    snapToGrid,
    timelineWidth,
    timelineBounds,
  ).date;
}
