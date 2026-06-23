import { addScaleSteps, formatScaleSubHeader } from './scale';
import type { ViewScale } from './scale';
import type { DateMarkingRect, TimelineRange } from '../types';

/** @deprecated Use {@link DEFAULT_COLUMN_SCROLL_BUFFER_PERCENT} */
export const DEFAULT_COLUMN_OVERSCAN = 2;

/** Default horizontal buffer (% of viewport width) on each side of the virtual column window. */
export const DEFAULT_COLUMN_SCROLL_BUFFER_PERCENT = 10;

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

function toColumnRange(
  startIndex: number,
  endIndex: number,
  columnWidth: number,
): VisibleColumnRange {
  return {
    startIndex,
    endIndex,
    startX: startIndex * columnWidth,
    endX: (endIndex + 1) * columnWidth,
  };
}

/** Tight viewport column indices (no buffer). */
export function getViewportColumnRange(
  scrollLeft: number,
  viewportWidth: number,
  columnWidth: number,
  columnCount: number,
): VisibleColumnRange {
  if (columnCount <= 0 || columnWidth <= 0) {
    return { startIndex: 0, endIndex: -1, startX: 0, endX: 0 };
  }

  const startIndex = Math.max(0, Math.floor(scrollLeft / columnWidth));
  const endIndex = Math.min(
    columnCount - 1,
    Math.ceil((scrollLeft + viewportWidth) / columnWidth) - 1,
  );

  return toColumnRange(startIndex, endIndex, columnWidth);
}

/** Column indices needed for the viewport plus a horizontal buffer (% of viewport width). */
export function computeBufferedColumnIndices(
  scrollLeft: number,
  viewportWidth: number,
  columnWidth: number,
  columnCount: number,
  bufferPercent: number,
): { startIndex: number; endIndex: number } {
  if (columnCount <= 0 || columnWidth <= 0) {
    return { startIndex: 0, endIndex: -1 };
  }

  const bufferPx = viewportWidth * (bufferPercent / 100);
  const startIndex = Math.max(0, Math.floor((scrollLeft - bufferPx) / columnWidth));
  const endIndex = Math.min(
    columnCount - 1,
    Math.ceil((scrollLeft + viewportWidth + bufferPx) / columnWidth) - 1,
  );

  return { startIndex, endIndex };
}

/**
 * Maintain a sticky buffered column window for virtualization.
 * Expands when new columns enter the buffer; shrinks only after columns leave the buffer zone.
 * Returns the previous range object when indices are unchanged.
 */
export function maintainBufferedColumnRange(
  scrollLeft: number,
  viewportWidth: number,
  columnWidth: number,
  columnCount: number,
  bufferPercent: number,
  prev: VisibleColumnRange | null,
): VisibleColumnRange {
  const { startIndex: neededStart, endIndex: neededEnd } = computeBufferedColumnIndices(
    scrollLeft,
    viewportWidth,
    columnWidth,
    columnCount,
    bufferPercent,
  );

  if (neededEnd < neededStart) {
    return { startIndex: 0, endIndex: -1, startX: 0, endX: 0 };
  }

  if (!prev || prev.endIndex < prev.startIndex) {
    return toColumnRange(neededStart, neededEnd, columnWidth);
  }

  let startIndex = Math.min(prev.startIndex, neededStart);
  let endIndex = Math.max(prev.endIndex, neededEnd);

  const bufferPx = viewportWidth * (bufferPercent / 100);
  const releaseBeforeX = scrollLeft - bufferPx;
  const releaseAfterX = scrollLeft + viewportWidth + bufferPx;

  while (
    startIndex < neededStart &&
    (startIndex + 1) * columnWidth <= releaseBeforeX
  ) {
    startIndex++;
  }

  while (
    endIndex > neededEnd &&
    endIndex * columnWidth >= releaseAfterX
  ) {
    endIndex--;
  }

  if (startIndex === prev.startIndex && endIndex === prev.endIndex) {
    return prev;
  }

  return toColumnRange(startIndex, endIndex, columnWidth);
}

/**
 * Compute which column indices intersect the current horizontal viewport.
 * @deprecated Prefer {@link maintainBufferedColumnRange} with a percentage buffer.
 */
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

  const bufferPx = overscan * columnWidth;
  const startIndex = Math.max(0, Math.floor((scrollLeft - bufferPx) / columnWidth));
  const endIndex = Math.min(
    columnCount - 1,
    Math.ceil((scrollLeft + viewportWidth + bufferPx) / columnWidth) - 1,
  );

  return toColumnRange(startIndex, endIndex, columnWidth);
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
