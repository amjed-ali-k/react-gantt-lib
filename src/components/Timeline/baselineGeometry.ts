import type { BarGeometry, ResolvedTask } from '../../types';
import type { ViewScale } from '../../core/scale';
import {
  BASELINE_BOTTOM_PAD,
  BASELINE_LINE_HEIGHT,
  MILESTONE_BASELINE_TOP_OFFSET,
  taskHasBarBaseline,
} from '../../core/rowLayout';
import { computeBarXExact, computeBarWidthExact } from '../../core/zoom';
import { MILESTONE_DIAMOND_SIZE, milestoneDiamondPoints } from './milestoneGeometry';

export const DEFAULT_BASELINE_COLOR = '#e6a23c';

export interface BaselineGeometry {
  taskId: string;
  kind: 'bar' | 'milestone';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export function resolveBaselineColor(task: ResolvedTask): string {
  return task.baseline?.color ?? DEFAULT_BASELINE_COLOR;
}

export function computeBaselineGeometry(
  task: ResolvedTask,
  barGeometry: BarGeometry,
  rowY: number,
  rowHeight: number,
  rangeStart: Date,
  scale: ViewScale,
  columnWidth: number,
  showBaseline: boolean,
): BaselineGeometry | null {
  if (!showBaseline || task._baselineStart == null || task._baselineEnd == null) return null;

  const color = resolveBaselineColor(task);

  if (task.type === 'milestone') {
    const size = MILESTONE_DIAMOND_SIZE;
    const centerX = computeBarXExact(task._baselineStart, rangeStart, scale, columnWidth);
    return {
      taskId: task.id,
      kind: 'milestone',
      x: centerX - size / 2,
      y: barGeometry.y + MILESTONE_BASELINE_TOP_OFFSET,
      width: size,
      height: size,
      color,
    };
  }

  if (!taskHasBarBaseline(task, showBaseline)) return null;

  const x = computeBarXExact(task._baselineStart, rangeStart, scale, columnWidth);
  const width = computeBarWidthExact(
    task._baselineStart,
    task._baselineEnd,
    scale,
    columnWidth,
    rangeStart,
  );
  const y = rowY + rowHeight - BASELINE_BOTTOM_PAD - BASELINE_LINE_HEIGHT;

  return {
    taskId: task.id,
    kind: 'bar',
    x,
    y,
    width,
    height: BASELINE_LINE_HEIGHT,
    color,
  };
}

export { milestoneDiamondPoints };
