import { describe, it, expect } from 'vitest';
import {
  groupShowsSummaryBar,
  isBarHiddenByGroupAncestor,
  rollUpGroupBaseline,
  rollUpGroupDates,
  rollUpGroupProgress,
  resolveGroupRollupFlag,
  shouldRollupGroupDates,
  shouldRenderTaskBar,
  resolveTaskInteractionFlags,
  taskHasChildren,
  taskSupportsCollapse,
} from '../src/core/groupTasks';
import { resolveTasks } from '../src/core/zoom';
import { toDate } from '../src/core/dates';
import type { GanttTask } from '../src/types';

describe('groupTasks', () => {
  const tasks: GanttTask[] = [
    { id: 'g1', name: 'Phase', start: '2026-01-01', end: '2026-01-01', type: 'group' },
    { id: 'c1', name: 'Child A', start: '2026-01-02', end: '2026-01-10', parentId: 'g1', progress: 100 },
    { id: 'c2', name: 'Child B', start: '2026-01-12', end: '2026-01-20', parentId: 'g1', progress: 0 },
    {
      id: 'g2',
      name: 'Sidebar only',
      start: '2026-02-01',
      end: '2026-02-01',
      type: 'group',
      showSummaryBar: false,
    },
    { id: 'c3', name: 'Nested', start: '2026-02-02', end: '2026-02-08', parentId: 'g2' },
  ];

  it('rolls up group dates from visible child bars', () => {
    const rollup = rollUpGroupDates(tasks[0], tasks);
    expect(rollup?.start.getTime()).toBe(toDate('2026-01-02').getTime());
    expect(rollup?.end.getTime()).toBe(toDate('2026-01-20').getTime());
  });

  it('rolls up group progress as duration-weighted average', () => {
    const progress = rollUpGroupProgress(tasks[0], tasks);
    // Child A: 8 days @ 100%, Child B: 8 days @ 0% => 50%
    expect(progress).toBe(50);
  });

  it('rolls up group baseline from child baselines', () => {
    const withBaselines: GanttTask[] = [
      { id: 'g1', name: 'Phase', start: '2026-01-01', end: '2026-01-01', type: 'group' },
      {
        id: 'c1',
        name: 'Child A',
        start: '2026-01-02',
        end: '2026-01-10',
        parentId: 'g1',
        baseline: { start: '2026-01-01', end: '2026-01-08' },
      },
      {
        id: 'c2',
        name: 'Child B',
        start: '2026-01-12',
        end: '2026-01-20',
        parentId: 'g1',
        baseline: { start: '2026-01-10', end: '2026-01-22' },
      },
    ];
    const rollup = rollUpGroupBaseline(withBaselines[0], withBaselines);
    expect(rollup?.start.getTime()).toBe(toDate('2026-01-01').getTime());
    expect(rollup?.end.getTime()).toBe(toDate('2026-01-22').getTime());
  });

  it('shows child bars alongside the parent summary bar', () => {
    expect(shouldRenderTaskBar(tasks[1], tasks)).toBe(true);
    expect(isBarHiddenByGroupAncestor(tasks[1], tasks)).toBe(false);
  });

  it('shows sidebar-only group without a bar but keeps child bars', () => {
    expect(groupShowsSummaryBar(tasks[3])).toBe(false);
    expect(shouldRenderTaskBar(tasks[3], tasks)).toBe(false);
    expect(shouldRenderTaskBar(tasks[4], tasks)).toBe(true);
  });

  it('detects collapsible parent rows', () => {
    expect(taskHasChildren('g1', tasks)).toBe(true);
    expect(taskSupportsCollapse(tasks[0], tasks)).toBe(true);
    expect(taskSupportsCollapse(tasks[4], tasks)).toBe(false);
  });

  it('resolves rollup flags with task and chart defaults', () => {
    const task: GanttTask = {
      id: 'g',
      name: 'Group',
      start: '2026-01-01',
      end: '2026-01-02',
      type: 'group',
      rollup: { dates: false },
    };
    expect(resolveGroupRollupFlag(task, 'dates', { dates: true })).toBe(false);
    expect(resolveGroupRollupFlag(task, 'progress', { progress: false })).toBe(false);
    expect(shouldRollupGroupDates(task)).toBe(false);
  });

  it('resolves per-task read-only interaction flags', () => {
    expect(
      resolveTaskInteractionFlags(
        { id: 'x', name: 'X', start: '2026-01-01', end: '2026-01-02', readOnly: true },
        { enableDrag: true, enableResize: true, enableProgressDrag: true },
      ),
    ).toEqual({ enableDrag: false, enableResize: false, enableProgressDrag: false, enableDependencyCreate: false });

    expect(
      resolveTaskInteractionFlags(
        { id: 'x', name: 'X', start: '2026-01-01', end: '2026-01-02', enableDrag: false },
        { enableDrag: true, enableResize: true, enableProgressDrag: true },
      ).enableDrag,
    ).toBe(false);
  });

  it('disables date and progress edits when summary values are rolled up', () => {
    const group: GanttTask = {
      id: 'g1',
      name: 'Phase',
      start: '2026-01-01',
      end: '2026-01-01',
      type: 'group',
    };
    expect(
      resolveTaskInteractionFlags(group, {
        enableDrag: true,
        enableResize: true,
        enableProgressDrag: true,
      }),
    ).toEqual({ enableDrag: false, enableResize: false, enableProgressDrag: false, enableDependencyCreate: false });

    expect(
      resolveTaskInteractionFlags(
        { ...group, rollup: { dates: false, progress: false }, progress: 25 },
        { enableDrag: true, enableResize: true, enableProgressDrag: true },
      ),
    ).toEqual({ enableDrag: true, enableResize: true, enableProgressDrag: true, enableDependencyCreate: false });

    expect(
      resolveTaskInteractionFlags(
        { ...group, progress: 25 },
        { enableDrag: true, enableResize: true, enableProgressDrag: true },
      ),
    ).toEqual({ enableDrag: false, enableResize: false, enableProgressDrag: true, enableDependencyCreate: false });
  });
});

describe('resolveTasks group summary', () => {
  const hierarchical: GanttTask[] = [
    {
      id: 'g1',
      name: 'Envelope',
      type: 'group',
      start: '2026-04-01',
      end: '2026-04-01',
      collapsed: true,
    },
    {
      id: 'c1',
      name: 'Roof',
      parentId: 'g1',
      start: '2026-04-10',
      end: '2026-04-12',
      progress: 30,
      baseline: { start: '2026-04-08', end: '2026-04-11' },
    },
    {
      id: 'c2',
      name: 'Seal',
      parentId: 'g1',
      start: '2026-04-14',
      end: '2026-04-16',
      progress: 90,
      baseline: { start: '2026-04-12', end: '2026-04-15' },
    },
  ];

  it('keeps rolled-up summary bar when group is collapsed', () => {
    const resolved = resolveTasks(hierarchical);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].id).toBe('g1');
    expect(resolved[0]._start.getTime()).toBe(toDate('2026-04-10').getTime());
    expect(resolved[0]._end.getTime()).toBe(toDate('2026-04-16').getTime());
    expect(resolved[0].progress).toBe(60);
    expect(resolved[0]._baselineStart?.getTime()).toBe(toDate('2026-04-08').getTime());
    expect(resolved[0]._baselineEnd?.getTime()).toBe(toDate('2026-04-15').getTime());
  });

  it('uses explicit group dates when rollup.dates is false', () => {
    const resolved = resolveTasks([
      {
        id: 'g1',
        name: 'Phase',
        type: 'group',
        start: '2026-03-01',
        end: '2026-03-31',
        rollup: { dates: false },
      },
      { id: 'c1', name: 'Child', parentId: 'g1', start: '2026-01-05', end: '2026-01-10' },
    ]);
    expect(resolved[0]._start.getTime()).toBe(toDate('2026-03-01').getTime());
    expect(resolved[0]._end.getTime()).toBe(toDate('2026-03-31').getTime());
  });

  it('uses explicit group progress when rollup.progress is false', () => {
    const resolved = resolveTasks([
      {
        id: 'g1',
        name: 'Phase',
        type: 'group',
        start: '2026-01-01',
        end: '2026-01-30',
        progress: 12,
        rollup: { progress: false },
      },
      { id: 'c1', name: 'Child', parentId: 'g1', start: '2026-01-05', end: '2026-01-10', progress: 100 },
    ]);
    expect(resolved[0].progress).toBe(12);
  });

  it('uses explicit group progress without rollup flag', () => {
    const resolved = resolveTasks([
      {
        id: 'g1',
        name: 'Phase',
        type: 'group',
        start: '2026-01-01',
        end: '2026-01-30',
        progress: 12,
      },
      { id: 'c1', name: 'Child', parentId: 'g1', start: '2026-01-05', end: '2026-01-10', progress: 100 },
    ]);
    expect(resolved[0].progress).toBe(12);
  });

  it('forces progress roll-up when rollup.progress is true', () => {
    const resolved = resolveTasks([
      {
        id: 'g1',
        name: 'Phase',
        type: 'group',
        start: '2026-01-01',
        end: '2026-01-30',
        progress: 12,
        rollup: { progress: true },
      },
      { id: 'c1', name: 'Child', parentId: 'g1', start: '2026-01-05', end: '2026-01-10', progress: 100 },
    ]);
    expect(resolved[0].progress).toBe(100);
  });
});
