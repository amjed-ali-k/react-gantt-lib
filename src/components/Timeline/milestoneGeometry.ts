import type { BarGeometry } from '../../types';
import type { ViewScale } from '../../core/scale';
import { computeBarXExact, computeBarWidthExact } from '../../core/zoom';

/** Square diamond side length in px — width and height are always equal. */
export const MILESTONE_DIAMOND_SIZE = 14;

export function computeMilestoneGeometry(
  start: Date,
  rowY: number,
  rowHeight: number,
  rangeStart: Date,
  scale: ViewScale,
  columnWidth: number,
  barHeight?: number,
): BarGeometry {
  const h = barHeight ?? Math.max(16, rowHeight - 12);
  const barPad = (rowHeight - h) / 2;
  const size = MILESTONE_DIAMOND_SIZE;
  const centerX = computeBarXExact(start, rangeStart, scale, columnWidth);

  return {
    x: centerX - size / 2,
    y: rowY + barPad + (h - size) / 2,
    width: size,
    height: size,
  };
}

export function milestoneCenterX(
  start: Date,
  rangeStart: Date,
  scale: ViewScale,
  columnWidth: number,
): number {
  return computeBarXExact(start, rangeStart, scale, columnWidth);
}

/** X coordinate for dependency arrow attachment on a task bar edge. */
export function taskConnectorX(
  task: { type?: string; _start: Date; _end: Date },
  edge: 'start' | 'end',
  rangeStart: Date,
  scale: ViewScale,
  columnWidth: number,
): number {
  if (task.type === 'milestone') {
    const cx = milestoneCenterX(task._start, rangeStart, scale, columnWidth);
    return edge === 'start' ? cx - MILESTONE_DIAMOND_SIZE / 2 : cx + MILESTONE_DIAMOND_SIZE / 2;
  }
  const x = computeBarXExact(task._start, rangeStart, scale, columnWidth);
  if (edge === 'end') {
    return x + computeBarWidthExact(task._start, task._end, scale, columnWidth, rangeStart);
  }
  return x;
}

export function milestoneDiamondPoints(width: number, height: number): string {
  return `${width / 2},0 ${width},${height / 2} ${width / 2},${height} 0,${height / 2}`;
}
