import type { GanttTask, GroupSummaryRollup, ResolvedTask, TimelineRange, TimelineRangeBounds } from '../types';
import { endOfDay } from 'date-fns';
import { toDate } from './dates';
import {
  buildTaskMap,
  computeGroupSummaryRollup,
  groupShowsSummaryBar,
  isGroupTask,
  shouldRollupGroupBaseline,
  shouldRollupGroupDates,
  shouldRollupGroupProgress,
} from './groupTasks';
import {
  resolveScale,
  startOfScaleUnit,
  endOfScaleUnit,
  addScaleSteps,
  diffScaleSteps,
  getScaleMsPerPixel,
  nextScaleInList,
  DEFAULT_ZOOM_ORDER,
  type ViewScale,
} from './scale';

export type { ViewScale };
export { resolveScale, PRESET_SCALES, DEFAULT_ZOOM_ORDER } from './scale';

export const ZOOM_LEVELS = [...DEFAULT_ZOOM_ORDER];

export const DEFAULT_COLUMN_WIDTH: Record<string, number> = {
  month: 120,
  week: 140,
  day: 48,
  '2day': 64,
  '6hour': 56,
  '3hour': 48,
  '1hour': 40,
  hour: 64,
  minute: 40,
};

function asScale(scaleOrId: ViewScale | string): ViewScale {
  return typeof scaleOrId === 'string' ? resolveScale(scaleOrId) : scaleOrId;
}

export function getColumnWidth(scaleOrId: ViewScale | string, override?: number): number {
  const scale = asScale(scaleOrId);
  return override ?? scale.columnWidth;
}

/** Pixel width from range start through end of maxDate — avoids extra scroll past the chart end. */
export function computeFixedTimelinePixelWidth(
  start: Date,
  maxDate: Date | string,
  scale: ViewScale,
  columnWidth: number,
): number {
  const end = endOfDay(toDate(maxDate));
  const msPerPixel = getMsPerPixel(scale, columnWidth);
  const spanMs = Math.max(0, end.getTime() - start.getTime());
  return Math.max(columnWidth, Math.ceil(spanMs / msPerPixel));
}

export function resolveTimelineWidth(
  range: TimelineRange,
  columnWidth: number,
): number {
  return range.pixelWidth ?? range.columnCount * columnWidth;
}

export function computeTimelineRange(
  tasks: GanttTask[],
  scaleOrId: ViewScale | string,
  paddingUnits = 2,
  bounds?: TimelineRangeBounds,
): TimelineRange {
  const scale = asScale(scaleOrId);

  if (bounds?.minDate != null && bounds?.maxDate != null) {
    const start = startOfScaleUnit(toDate(bounds.minDate), scale);
    const max = toDate(bounds.maxDate);
    const end = endOfDay(max);
    const cw = scale.columnWidth;
    const pixelWidth = computeFixedTimelinePixelWidth(start, max, scale, cw);
    const columnCount = Math.max(1, Math.ceil(pixelWidth / cw));
    return { start, end, columnCount, pixelWidth, fixed: true };
  }

  if (tasks.length === 0) {
    const now = startOfScaleUnit(new Date(), scale);
    const end = addScaleSteps(now, 10, scale);
    return { start: now, end, columnCount: 10 + paddingUnits * 2 };
  }

  let min = toDate(tasks[0].start);
  let max = toDate(tasks[0].end);

  for (const t of tasks) {
    const s = toDate(t.start);
    const e = toDate(t.end);
    if (s < min) min = s;
    if (e > max) max = e;
  }

  const start = addScaleSteps(startOfScaleUnit(min, scale), -paddingUnits, scale);
  const end = addScaleSteps(endOfScaleUnit(max, scale), paddingUnits, scale);
  const columnCount = Math.max(1, diffScaleSteps(end, start, scale) + 1);

  return { start, end, columnCount };
}

export function getMsPerPixel(scaleOrId: ViewScale | string, columnWidthOverride?: number): number {
  const scale = asScale(scaleOrId);
  if (columnWidthOverride != null && columnWidthOverride !== scale.columnWidth) {
    const msPerCol = getScaleMsPerPixel(scale);
    return msPerCol * (scale.columnWidth / columnWidthOverride);
  }
  return getScaleMsPerPixel(scale);
}

export function dateToPixel(date: Date, rangeStart: Date, msPerPixel: number): number {
  return (date.getTime() - rangeStart.getTime()) / msPerPixel;
}

export function durationToPixel(start: Date, end: Date, msPerPixel: number): number {
  return Math.max(6, (end.getTime() - start.getTime()) / msPerPixel);
}

export function computeBarXExact(
  start: Date,
  rangeStart: Date,
  scaleOrId: ViewScale | string,
  columnWidth?: number,
): number {
  return dateToPixel(start, rangeStart, getMsPerPixel(scaleOrId, columnWidth));
}

export function computeBarWidthExact(
  start: Date,
  end: Date,
  scaleOrId: ViewScale | string,
  columnWidth?: number,
): number {
  const msPerPixel = getMsPerPixel(scaleOrId, columnWidth);
  return durationToPixel(start, end, msPerPixel);
}

export function pixelDeltaToDates(
  mode: 'move' | 'resize-start' | 'resize-end',
  originStart: Date,
  originEnd: Date,
  deltaPx: number,
  msPerPixel: number,
): { start: Date; end: Date } {
  const deltaMs = deltaPx * msPerPixel;
  const minMs = msPerPixel;

  if (mode === 'move') {
    return {
      start: new Date(originStart.getTime() + deltaMs),
      end: new Date(originEnd.getTime() + deltaMs),
    };
  }
  if (mode === 'resize-start') {
    const start = new Date(originStart.getTime() + deltaMs);
    const maxStart = originEnd.getTime() - minMs;
    return {
      start: new Date(Math.min(start.getTime(), maxStart)),
      end: originEnd,
    };
  }
  const end = new Date(originEnd.getTime() + deltaMs);
  const minEnd = originStart.getTime() + minMs;
  return {
    start: originStart,
    end: new Date(Math.max(end.getTime(), minEnd)),
  };
}

export function finalizeDragDates(
  start: Date,
  end: Date,
  scaleOrId: ViewScale | string,
  snapToGrid: boolean,
  rangeStart: Date,
): { start: Date; end: Date } {
  if (!snapToGrid) return { start, end };
  const scale = asScale(scaleOrId);
  const anchor = startOfScaleUnit(rangeStart, scale);
  const snappedStart = addScaleSteps(anchor, diffScaleSteps(start, anchor, scale), scale);
  let snappedEnd = addScaleSteps(anchor, diffScaleSteps(end, anchor, scale), scale);
  if (snappedEnd.getTime() <= snappedStart.getTime()) {
    snappedEnd = addScaleSteps(snappedStart, 1, scale);
  }
  return { start: snappedStart, end: snappedEnd };
}

export interface TimelineBounds {
  min: Date;
  max: Date;
}

export function clampTaskDates(
  start: Date,
  end: Date,
  bounds: TimelineBounds,
  mode: 'move' | 'resize-start' | 'resize-end' = 'move',
): { start: Date; end: Date } {
  const minMs = bounds.min.getTime();
  const maxMs = bounds.max.getTime();
  const minDuration = 60_000;

  let s = start.getTime();
  let e = end.getTime();

  if (mode === 'move') {
    if (e - s > maxMs - minMs) {
      s = minMs;
      e = maxMs;
    } else {
      if (s < minMs) {
        e += minMs - s;
        s = minMs;
      }
      if (e > maxMs) {
        s -= e - maxMs;
        e = maxMs;
      }
    }
  } else if (mode === 'resize-start') {
    s = Math.max(minMs, Math.min(s, e - minDuration));
  } else if (mode === 'resize-end') {
    e = Math.min(maxMs, Math.max(e, s + minDuration));
  }

  return { start: new Date(s), end: new Date(e) };
}

export function resolveTasks(
  tasks: GanttTask[],
  options?: { groupSummaryRollup?: GroupSummaryRollup },
): ResolvedTask[] {
  const rollupDefaults = options?.groupSummaryRollup;
  const taskMap = buildTaskMap(tasks);
  const collapsedParents = new Set<string>();
  for (const t of tasks) {
    if (t.collapsed) collapsedParents.add(t.id);
  }

  function isHidden(task: GanttTask): boolean {
    let pid = task.parentId;
    while (pid) {
      if (collapsedParents.has(pid)) return true;
      const parent = tasks.find((t) => t.id === pid);
      pid = parent?.parentId;
    }
    return false;
  }

  function level(task: GanttTask): number {
    let l = 0;
    let pid = task.parentId;
    while (pid) {
      l++;
      const parent = tasks.find((t) => t.id === pid);
      pid = parent?.parentId;
    }
    return l;
  }

  return tasks
    .filter((t) => !isHidden(t))
    .map((task, rowIndex) => {
      let start = toDate(task.start);
      let end = toDate(task.end);
      let progress = task.progress ?? 0;
      let baselineStart = task.baseline ? toDate(task.baseline.start) : undefined;
      let baselineEnd = task.baseline ? toDate(task.baseline.end) : undefined;

      if (isGroupTask(task) && groupShowsSummaryBar(task)) {
        const rollupValues = computeGroupSummaryRollup(task, tasks, taskMap);

        if (shouldRollupGroupDates(task, rollupDefaults) && rollupValues.dates) {
          start = rollupValues.dates.start;
          end = rollupValues.dates.end;
        }
        if (shouldRollupGroupProgress(task, rollupDefaults) && rollupValues.progress != null) {
          progress = rollupValues.progress;
        }
        if (shouldRollupGroupBaseline(task, rollupDefaults)) {
          if (rollupValues.baseline) {
            baselineStart = rollupValues.baseline.start;
            baselineEnd = rollupValues.baseline.end;
          } else {
            baselineStart = undefined;
            baselineEnd = undefined;
          }
        }
      }

      return {
        ...task,
        _start: start,
        _end: end,
        _baselineStart: baselineStart,
        _baselineEnd: baselineEnd,
        _rowIndex: rowIndex,
        _level: level(task),
        _visible: true,
        progress,
      };
    });
}

export function updateTaskInList(
  tasks: GanttTask[],
  taskId: string,
  patch: Partial<GanttTask>,
): GanttTask[] {
  return tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t));
}

export function nextZoomLevel(
  current: string,
  direction: 'in' | 'out',
  availableIds?: string[],
): string {
  const ids = availableIds?.length ? availableIds : [...ZOOM_LEVELS];
  const scales = ids.map((id) => resolveScale(id));
  return nextScaleInList(current, scales, direction);
}
