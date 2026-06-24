import type { CustomRowDefinition, ResolvedTask } from '../types';
import { getCustomRowHeight, totalCustomRowsHeight } from '../components/CustomRows/customRowMetrics';
import { computeRowLayouts, totalRowLayoutHeight, type RowLayout } from './rowLayout';

export type StickyPosition = 'top' | 'bottom';

export interface StickyTaskPartitions {
  top: ResolvedTask[];
  scroll: ResolvedTask[];
  bottom: ResolvedTask[];
}

export interface StickyCustomRowPartitions {
  top: CustomRowDefinition[];
  inline: CustomRowDefinition[];
  bottom: CustomRowDefinition[];
}

export function partitionTasksBySticky(tasks: ResolvedTask[]): StickyTaskPartitions {
  const top: ResolvedTask[] = [];
  const scroll: ResolvedTask[] = [];
  const bottom: ResolvedTask[] = [];

  for (const task of tasks) {
    if (task.sticky === 'top') top.push(task);
    else if (task.sticky === 'bottom') bottom.push(task);
    else scroll.push(task);
  }

  return { top, scroll, bottom };
}

export function partitionCustomRowsBySticky(
  rows: CustomRowDefinition[],
): StickyCustomRowPartitions {
  const top: CustomRowDefinition[] = [];
  const inline: CustomRowDefinition[] = [];
  const bottom: CustomRowDefinition[] = [];

  for (const row of rows) {
    if (row.sticky === 'top') top.push(row);
    else if (row.sticky === 'bottom') bottom.push(row);
    else inline.push(row);
  }

  return { top, inline, bottom };
}

export function computeStickyTopOffsets(heights: number[], headerHeight: number): number[] {
  const offsets: number[] = [];
  let acc = headerHeight;
  for (const height of heights) {
    offsets.push(acc);
    acc += height;
  }
  return offsets;
}

export function computeStickyBottomOffsets(heights: number[]): number[] {
  const offsets = new Array<number>(heights.length);
  let acc = 0;
  for (let i = heights.length - 1; i >= 0; i--) {
    offsets[i] = acc;
    acc += heights[i]!;
  }
  return offsets;
}

export function taskSectionHeights(
  tasks: ResolvedTask[],
  baseRowHeight: number,
  showBaseline: boolean,
): number[] {
  const layouts = computeRowLayouts(tasks, baseRowHeight, showBaseline);
  return layouts.map((layout) => layout.height);
}

export function customRowHeights(
  rows: CustomRowDefinition[],
  defaultRowHeight: number,
): number[] {
  return rows.map((row) => getCustomRowHeight(row, defaultRowHeight));
}

export function totalStickyTimelineBodyHeight(
  topTasks: ResolvedTask[],
  scrollTasks: ResolvedTask[],
  bottomTasks: ResolvedTask[],
  topCustomRows: CustomRowDefinition[],
  inlineCustomRows: CustomRowDefinition[],
  bottomCustomRows: CustomRowDefinition[],
  rowHeight: number,
  showBaseline: boolean,
): number {
  const topTaskH = totalRowLayoutHeight(computeRowLayouts(topTasks, rowHeight, showBaseline));
  const scrollH = totalRowLayoutHeight(computeRowLayouts(scrollTasks, rowHeight, showBaseline));
  const bottomTaskH = totalRowLayoutHeight(computeRowLayouts(bottomTasks, rowHeight, showBaseline));
  const topCustomH = totalCustomRowsHeight(topCustomRows, rowHeight);
  const inlineCustomH = totalCustomRowsHeight(inlineCustomRows, rowHeight);
  const bottomCustomH = totalCustomRowsHeight(bottomCustomRows, rowHeight);
  return topTaskH + topCustomH + scrollH + inlineCustomH + bottomCustomH + bottomTaskH;
}

export function rowLayoutsForTasks(
  tasks: ResolvedTask[],
  baseRowHeight: number,
  showBaseline: boolean,
): RowLayout[] {
  return computeRowLayouts(tasks, baseRowHeight, showBaseline);
}
