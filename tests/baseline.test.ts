import { describe, it, expect } from 'vitest';
import { computeBaselineGeometry, resolveBaselineColor } from '../src/components/Timeline/baselineGeometry';
import { MILESTONE_DIAMOND_SIZE, computeMilestoneGeometry } from '../src/components/Timeline/milestoneGeometry';
import {
  BASELINE_BOTTOM_PAD,
  BASELINE_LINE_HEIGHT,
  BASELINE_ROW_EXTRA,
  MILESTONE_BASELINE_TOP_OFFSET,
  computeRowLayouts,
  getEffectiveRowHeight,
} from '../src/core/rowLayout';
import { resolveScale } from '../src/core/scale';
import { resolveTasks } from '../src/core/zoom';
import type { GanttTask } from '../src/types';

const scale = resolveScale('day');
const rangeStart = new Date('2026-04-01');

describe('computeBaselineGeometry', () => {
  it('renders a line above bottom padding for bar tasks', () => {
    const tasks = resolveTasks([
      {
        id: 't1',
        name: 'Task',
        start: '2026-04-06',
        end: '2026-04-12',
        baseline: { start: '2026-04-04', end: '2026-04-10' },
      },
    ] as GanttTask[]);

    const rowLayouts = computeRowLayouts(tasks, 36, true);
    const barGeom = { x: 100, y: 20, width: 80, height: 18 };

    const baseline = computeBaselineGeometry(
      tasks[0],
      barGeom,
      rowLayouts[0].y,
      rowLayouts[0].height,
      rangeStart,
      scale,
      scale.columnWidth,
      true,
    );
    expect(baseline?.kind).toBe('bar');
    expect(baseline!.y).toBe(
      rowLayouts[0].y + rowLayouts[0].height - BASELINE_BOTTOM_PAD - BASELINE_LINE_HEIGHT,
    );
    expect(baseline!.width).toBeGreaterThan(0);
  });

  it('renders milestone baseline aligned with +2px offset and same size', () => {
    const tasks = resolveTasks([
      {
        id: 'm1',
        name: 'Launch',
        start: '2026-04-22T14:00:00',
        end: '2026-04-22T14:00:00',
        type: 'milestone',
        baseline: { start: '2026-04-20T14:00:00', end: '2026-04-20T14:00:00', color: '#ff9900' },
      },
    ] as GanttTask[]);

    const rowLayouts = computeRowLayouts(tasks, 36, true);
    const barGeom = computeMilestoneGeometry(
      tasks[0]._start,
      rowLayouts[0].y,
      rowLayouts[0].height,
      rangeStart,
      scale,
      scale.columnWidth,
    );

    const baseline = computeBaselineGeometry(
      tasks[0],
      barGeom,
      rowLayouts[0].y,
      rowLayouts[0].height,
      rangeStart,
      scale,
      scale.columnWidth,
      true,
    );
    expect(baseline?.kind).toBe('milestone');
    expect(baseline!.width).toBe(MILESTONE_DIAMOND_SIZE);
    expect(baseline!.height).toBe(MILESTONE_DIAMOND_SIZE);
    expect(baseline!.y).toBe(barGeom.y + MILESTONE_BASELINE_TOP_OFFSET);
    expect(baseline!.color).toBe('#ff9900');
  });

  it('uses default amber baseline color', () => {
    const tasks = resolveTasks([
      {
        id: 't1',
        name: 'Task',
        start: '2026-04-06',
        end: '2026-04-12',
        baseline: { start: '2026-04-04', end: '2026-04-10' },
      },
    ] as GanttTask[]);
    expect(resolveBaselineColor(tasks[0])).toBe('#e6a23c');
  });

  it('returns null when task has no baseline', () => {
    const tasks = resolveTasks([
      { id: 't1', name: 'Task', start: '2026-04-06', end: '2026-04-12' },
    ] as GanttTask[]);

    const baseline = computeBaselineGeometry(
      tasks[0],
      { x: 0, y: 0, width: 10, height: 10 },
      0,
      36,
      rangeStart,
      scale,
      scale.columnWidth,
      true,
    );
    expect(baseline).toBeNull();
  });
});

describe('row layouts with baseline', () => {
  it('increases row height for bar tasks with baseline', () => {
    const tasks = resolveTasks([
      {
        id: 't1',
        name: 'Task',
        start: '2026-04-06',
        end: '2026-04-12',
        baseline: { start: '2026-04-04', end: '2026-04-10' },
      },
    ] as GanttTask[]);
    expect(getEffectiveRowHeight(tasks[0], 36, true)).toBe(36 + BASELINE_ROW_EXTRA);
  });

  it('keeps milestone row height unchanged when baseline is set', () => {
    const tasks = resolveTasks([
      {
        id: 'm1',
        name: 'Launch',
        start: '2026-04-22',
        end: '2026-04-22',
        type: 'milestone',
        baseline: { start: '2026-04-20', end: '2026-04-20' },
      },
    ] as GanttTask[]);
    expect(getEffectiveRowHeight(tasks[0], 36, true)).toBe(36);
  });
});
