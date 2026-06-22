import { describe, it, expect } from 'vitest';
import {
  groupShowsSummaryBar,
  isBarHiddenByGroupAncestor,
  rollUpGroupDates,
  shouldRenderTaskBar,
  resolveTaskInteractionFlags,
} from '../src/core/groupTasks';
import { toDate } from '../src/core/dates';
import type { GanttTask } from '../src/types';

describe('groupTasks', () => {
  const tasks: GanttTask[] = [
    { id: 'g1', name: 'Phase', start: '2026-01-01', end: '2026-01-01', type: 'group' },
    { id: 'c1', name: 'Child A', start: '2026-01-02', end: '2026-01-10', parentId: 'g1' },
    { id: 'c2', name: 'Child B', start: '2026-01-12', end: '2026-01-20', parentId: 'g1' },
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

  it('hides child bars under summary groups', () => {
    expect(shouldRenderTaskBar(tasks[1], tasks)).toBe(false);
    expect(isBarHiddenByGroupAncestor(tasks[1], tasks)).toBe(true);
  });

  it('shows sidebar-only group without a bar but keeps child bars', () => {
    expect(groupShowsSummaryBar(tasks[3])).toBe(false);
    expect(shouldRenderTaskBar(tasks[3], tasks)).toBe(false);
    expect(shouldRenderTaskBar(tasks[4], tasks)).toBe(true);
  });

  it('resolves per-task read-only interaction flags', () => {
    expect(
      resolveTaskInteractionFlags(
        { id: 'x', name: 'X', start: '2026-01-01', end: '2026-01-02', readOnly: true },
        { enableDrag: true, enableResize: true, enableProgressDrag: true },
      ),
    ).toEqual({ enableDrag: false, enableResize: false, enableProgressDrag: false });

    expect(
      resolveTaskInteractionFlags(
        { id: 'x', name: 'X', start: '2026-01-01', end: '2026-01-02', enableDrag: false },
        { enableDrag: true, enableResize: true, enableProgressDrag: true },
      ).enableDrag,
    ).toBe(false);
  });
});
