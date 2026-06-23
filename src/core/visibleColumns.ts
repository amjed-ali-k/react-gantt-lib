import { addScaleSteps, formatScaleSubHeader } from './scale';
import type { ViewScale } from './scale';
import type { DateMarkingRect, TimelineRange } from '../types';

export const DEFAULT_COLUMN_OVERSCAN = 2;

export interface VisibleColumnRange {
  startIndex: number;
  endIndex: number;
  startX: number;
  endX: number;
}

export interface HeaderBand {
  label: string;
  x: number;
  width: number;
}

/** Compute which column indices intersect the current horizontal viewport. */
export function getVisibleColumnRange(
  scrollLeft: number,
  viewportWidth: number,
  columnWidth: number,
  columnCount: number,
  overscan = DEFAULT_COLUMN_OVERSCAN,
): VisibleColumnRange {
  if (columnCount <= 0 || columnWidth <= 0) {
    return { startIndex: 0, endIndex: -1, startX: 0, endX: 0 };
  }

  const startIndex = Math.max(0, Math.floor(scrollLeft / columnWidth) - overscan);
  const endIndex = Math.min(
    columnCount - 1,
    Math.ceil((scrollLeft + viewportWidth) / columnWidth) + overscan,
  );

  return {
    startIndex,
    endIndex,
    startX: startIndex * columnWidth,
    endX: (endIndex + 1) * columnWidth,
  };
}

/** Keep only rects that overlap a horizontal pixel range. */
export function filterRectsInXRange(
  rects: DateMarkingRect[],
  startX: number,
  endX: number,
): DateMarkingRect[] {
  if (rects.length === 0 || endX <= startX) return [];
  return rects.filter((rect) => rect.x + rect.width >= startX && rect.x <= endX);
}

/**
 * Build upper header bands for the visible column window.
 * Walks backward from the first visible column so spanning labels (e.g. month) stay aligned.
 */
export function buildUpperHeaderBandsForVisibleRange(
  range: TimelineRange,
  scale: ViewScale,
  columnWidth: number,
  visible: VisibleColumnRange,
): HeaderBand[] {
  const { startIndex, endIndex } = visible;
  if (endIndex < startIndex) return [];

  let bandStartIdx = startIndex;
  const firstLabel = formatScaleSubHeader(addScaleSteps(range.start, startIndex, scale), scale);
  while (bandStartIdx > 0) {
    const prevLabel = formatScaleSubHeader(
      addScaleSteps(range.start, bandStartIdx - 1, scale),
      scale,
    );
    if (prevLabel !== firstLabel) break;
    bandStartIdx--;
  }

  const bands: HeaderBand[] = [];
  let bandStartX = bandStartIdx * columnWidth;
  let bandLabel = formatScaleSubHeader(addScaleSteps(range.start, bandStartIdx, scale), scale);

  for (let i = bandStartIdx + 1; i <= endIndex + 1; i++) {
    const atEnd = i > endIndex;
    const nextLabel = atEnd
      ? null
      : formatScaleSubHeader(addScaleSteps(range.start, i, scale), scale);

    if (atEnd || nextLabel !== bandLabel) {
      const endX = atEnd ? (endIndex + 1) * columnWidth : i * columnWidth;
      bands.push({
        label: bandLabel,
        x: bandStartX,
        width: endX - bandStartX,
      });
      if (!atEnd) {
        bandLabel = nextLabel!;
        bandStartX = i * columnWidth;
      }
    }
  }

  return bands;
}

/** Vertical grid line x-positions for the visible column window. */
export function getVisibleVerticalLines(
  visible: VisibleColumnRange,
  columnWidth: number,
  timelineWidth: number,
): number[] {
  const { startIndex, endIndex } = visible;
  if (endIndex < startIndex) return [];

  const lines: number[] = [];
  for (let i = startIndex; i <= endIndex + 1; i++) {
    const x = i * columnWidth;
    if (x <= timelineWidth) lines.push(x);
  }
  if (lines.length === 0 || lines[lines.length - 1] !== timelineWidth) {
    if (visible.endX >= timelineWidth - columnWidth) {
      lines.push(timelineWidth);
    }
  }
  return lines;
}
