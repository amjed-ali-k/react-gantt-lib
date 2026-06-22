import type { ResolvedTask } from '../types';

export const BASELINE_ROW_EXTRA = 10;
export const BASELINE_BOTTOM_PAD = 6;
export const BASELINE_BAR_GAP = 4;
export const BASELINE_LINE_HEIGHT = 3;
export const MILESTONE_BASELINE_TOP_OFFSET = 2;

export interface RowLayout {
  y: number;
  height: number;
}

export function taskHasBarBaseline(task: ResolvedTask, showBaseline: boolean): boolean {
  return showBaseline && task._baselineStart != null && task.type !== 'milestone';
}

export function getEffectiveRowHeight(
  task: ResolvedTask,
  baseRowHeight: number,
  showBaseline: boolean,
): number {
  if (!taskHasBarBaseline(task, showBaseline)) return baseRowHeight;
  return baseRowHeight + BASELINE_ROW_EXTRA;
}

export function computeRowLayouts(
  tasks: ResolvedTask[],
  baseRowHeight: number,
  showBaseline: boolean,
): RowLayout[] {
  let y = 0;
  return tasks.map((task) => {
    const height = getEffectiveRowHeight(task, baseRowHeight, showBaseline);
    const layout = { y, height };
    y += height;
    return layout;
  });
}

export function totalRowLayoutHeight(layouts: RowLayout[]): number {
  return layouts.reduce((sum, row) => sum + row.height, 0);
}

export function getTaskBarHeight(
  task: ResolvedTask,
  rowHeight: number,
  hasBarBaseline: boolean,
): number {
  if (task.width != null) return task.width;
  if (hasBarBaseline) {
    return Math.max(
      14,
      rowHeight - 12 - BASELINE_BOTTOM_PAD - BASELINE_LINE_HEIGHT - BASELINE_BAR_GAP,
    );
  }
  return Math.max(16, rowHeight - 12);
}

export function getTaskBarPad(
  _task: ResolvedTask,
  rowHeight: number,
  barHeight: number,
  hasBarBaseline: boolean,
): number {
  if (hasBarBaseline) return 6;
  return (rowHeight - barHeight) / 2;
}

export function getTaskBarCenterY(
  task: ResolvedTask,
  row: RowLayout,
  showBaseline: boolean,
): number {
  const hasBarBaseline = taskHasBarBaseline(task, showBaseline);
  const barHeight = getTaskBarHeight(task, row.height, hasBarBaseline);
  const barPad = getTaskBarPad(task, row.height, barHeight, hasBarBaseline);
  return row.y + barPad + barHeight / 2;
}
