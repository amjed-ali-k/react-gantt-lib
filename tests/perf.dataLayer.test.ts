import { describe, it, expect, vi } from 'vitest';
import { DragPreviewStore } from '../src/hooks/useDragPreviewStore';
import {
  computeRowLayouts,
  totalRowLayoutHeight,
  getEffectiveRowHeight,
  getTaskBarHeight,
  getTaskBarPad,
  BASELINE_ROW_EXTRA,
} from '../src/core/rowLayout';
import {
  computeGroupSummaryRollup,
  buildTaskMap,
  collectRollupDescendants,
  rollUpGroupDates,
  rollUpGroupProgress,
} from '../src/core/groupTasks';
import type { GanttTask, ResolvedTask } from '../src/types';

/**
 * Performance contract tests for the data layer:
 *   • DragPreviewStore — idempotent rapid-fire updates, snapshot stability
 *   • Row layout       — correct y-accumulation at 1k–5k row scale, timing
 *   • Group rollup     — O(n) correctness across 50-child hierarchies
 */

// ── helpers ───────────────────────────────────────────────────────────────────

function makeResolved(
  id: string,
  opts: Partial<ResolvedTask> = {},
): ResolvedTask {
  return {
    id,
    name: id,
    start: '2026-01-01',
    end: '2026-01-10',
    _start: new Date('2026-01-01'),
    _end: new Date('2026-01-10'),
    _rowIndex: 0,
    _level: 0,
    _visible: true,
    ...opts,
  } as ResolvedTask;
}

function makeGroupTask(id: string, extras?: Partial<GanttTask>): GanttTask {
  return { id, name: id, type: 'group', start: '2026-01-01', end: '2026-12-31', ...extras };
}

function makeChild(id: string, parentId: string, start: string, end: string, progress = 0): GanttTask {
  return { id, name: id, parentId, start, end, progress };
}

// ── DragPreviewStore — rapid-fire idempotency ─────────────────────────────────

describe('DragPreviewStore — rapid-fire idempotency', () => {
  it('100 identical setPreview calls trigger exactly 1 notification', () => {
    const store = new DragPreviewStore();
    const listener = vi.fn();
    store.subscribe(listener);

    const start = new Date('2026-01-05');
    const end = new Date('2026-01-10');
    for (let i = 0; i < 100; i++) {
      store.setPreview('t1', new Date(start.getTime()), new Date(end.getTime()));
    }

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getVersion()).toBe(1);
  });

  it('100 unique setPreview date shifts trigger 100 notifications', () => {
    const store = new DragPreviewStore();
    const listener = vi.fn();
    store.subscribe(listener);

    const BASE = new Date('2026-01-01').getTime();
    const DAY_MS = 86_400_000;
    for (let i = 0; i < 100; i++) {
      store.setPreview('t1', new Date(BASE + i * DAY_MS), new Date(BASE + (i + 5) * DAY_MS));
    }

    expect(listener).toHaveBeenCalledTimes(100);
    expect(store.getVersion()).toBe(100);
  });

  it('snapshot object reference is stable after a no-op setPreview', () => {
    const store = new DragPreviewStore();
    const start = new Date('2026-01-05');
    const end = new Date('2026-01-10');
    store.setPreview('t1', start, end);
    const before = store.getSnapshot();

    // Same milliseconds, new Date objects — must be a no-op
    store.setPreview('t1', new Date(start.getTime()), new Date(end.getTime()));

    expect(store.getSnapshot()).toBe(before);
  });

  it('switching task ID always notifies even with identical dates', () => {
    const store = new DragPreviewStore();
    const listener = vi.fn();
    store.subscribe(listener);

    const s = new Date('2026-01-05');
    const e = new Date('2026-01-10');
    store.setPreview('t1', s, e);  // 1
    store.setPreview('t2', s, e);  // 2 — different task
    store.setPreview('t1', s, e);  // 3 — back to t1

    expect(listener).toHaveBeenCalledTimes(3);
    expect(store.getVersion()).toBe(3);
  });

  it('clear after 50 setPreview calls produces exactly 51 notifications total', () => {
    const store = new DragPreviewStore();
    const listener = vi.fn();
    store.subscribe(listener);

    const BASE = new Date('2026-01-01').getTime();
    for (let i = 0; i < 50; i++) {
      store.setPreview('t1', new Date(BASE + i * 86_400_000), new Date(BASE + (i + 3) * 86_400_000));
    }
    store.clear('t1');

    expect(listener).toHaveBeenCalledTimes(51);
    expect(store.getPreview('t1')).toBeNull();
  });

  it('clear on wrong task ID is a no-op', () => {
    const store = new DragPreviewStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.setPreview('t1', new Date('2026-01-05'), new Date('2026-01-10'));
    listener.mockClear();

    store.clear('t999'); // wrong id
    expect(listener).not.toHaveBeenCalled();
    expect(store.getPreview('t1')).not.toBeNull();
  });

  it('unsubscribed listener receives no notifications after removal', () => {
    const store = new DragPreviewStore();
    const listener = vi.fn();
    const unsub = store.subscribe(listener);

    store.setPreview('t1', new Date('2026-01-05'), new Date('2026-01-10'));
    unsub();

    for (let i = 0; i < 20; i++) {
      store.setPreview('t1', new Date('2026-01-05'), new Date(`2026-01-${i + 11}`));
    }

    expect(listener).toHaveBeenCalledTimes(1);
  });
});

// ── computeRowLayouts — correctness at scale ──────────────────────────────────

describe('computeRowLayouts — y-accumulation and height correctness', () => {
  const ROW_H = 40;

  it('first row starts at y=0', () => {
    const tasks = [makeResolved('t0')];
    const layouts = computeRowLayouts(tasks, ROW_H, false);
    expect(layouts[0].y).toBe(0);
    expect(layouts[0].height).toBe(ROW_H);
  });

  it('each consecutive row y equals sum of previous row heights', () => {
    const N = 20;
    const tasks = Array.from({ length: N }, (_, i) => makeResolved(`t${i}`));
    const layouts = computeRowLayouts(tasks, ROW_H, false);

    for (let i = 1; i < N; i++) {
      expect(layouts[i].y).toBe(i * ROW_H);
    }
  });

  it('1000 uniform rows accumulate y correctly', () => {
    const tasks = Array.from({ length: 1000 }, (_, i) => makeResolved(`t${i}`));
    const layouts = computeRowLayouts(tasks, ROW_H, false);

    expect(layouts[0].y).toBe(0);
    expect(layouts[999].y).toBe(999 * ROW_H);
  });

  it('totalRowLayoutHeight equals count × rowHeight for uniform rows', () => {
    const tasks = Array.from({ length: 500 }, (_, i) => makeResolved(`t${i}`));
    const layouts = computeRowLayouts(tasks, ROW_H, false);
    expect(totalRowLayoutHeight(layouts)).toBe(500 * ROW_H);
  });

  it('totalRowLayoutHeight equals last-row y + last-row height', () => {
    const tasks = Array.from({ length: 30 }, (_, i) => makeResolved(`t${i}`));
    const layouts = computeRowLayouts(tasks, 36, false);
    const last = layouts[layouts.length - 1];
    expect(totalRowLayoutHeight(layouts)).toBe(last.y + last.height);
  });

  it('baseline rows are BASELINE_ROW_EXTRA px taller than non-baseline rows', () => {
    const plain = makeResolved('plain');
    const withBaseline = makeResolved('wb', {
      _baselineStart: new Date('2025-12-15'),
      _baselineEnd: new Date('2025-12-31'),
    });
    const normalH = getEffectiveRowHeight(plain, ROW_H, true);
    const baselineH = getEffectiveRowHeight(withBaseline, ROW_H, true);
    expect(baselineH - normalH).toBe(BASELINE_ROW_EXTRA);
  });

  it('milestone rows are NOT taller even if they carry a baseline', () => {
    const ms = makeResolved('ms', {
      type: 'milestone',
      _baselineStart: new Date('2026-01-05'),
      _baselineEnd: new Date('2026-01-06'),
    });
    expect(getEffectiveRowHeight(ms, ROW_H, true)).toBe(ROW_H);
  });

  it('mixed baseline/non-baseline rows produce correct cumulative totals', () => {
    const tasks = Array.from({ length: 100 }, (_, i) => {
      if (i % 5 === 0) {
        return makeResolved(`t${i}`, {
          _baselineStart: new Date('2025-12-01'),
          _baselineEnd: new Date('2025-12-31'),
        });
      }
      return makeResolved(`t${i}`);
    });
    const layouts = computeRowLayouts(tasks, ROW_H, true);
    const expectedTotal =
      80 * ROW_H +       // 80 non-baseline rows
      20 * (ROW_H + BASELINE_ROW_EXTRA); // 20 baseline rows

    expect(totalRowLayoutHeight(layouts)).toBe(expectedTotal);
  });

  it('getTaskBarHeight respects custom width field over default formula', () => {
    const task = makeResolved('t', { width: 28 });
    const height = getTaskBarHeight(task, 40, false);
    expect(height).toBe(28);
  });

  it('getTaskBarPad baseline mode returns fixed pad of 6', () => {
    const task = makeResolved('t');
    const pad = getTaskBarPad(task, 40, 20, true);
    expect(pad).toBe(6);
  });

  it('getTaskBarPad non-baseline mode centers the bar vertically', () => {
    const task = makeResolved('t');
    const barH = 28;
    const rowH = 40;
    const pad = getTaskBarPad(task, rowH, barH, false);
    expect(pad).toBe((rowH - barH) / 2);
  });

  it('completes computeRowLayouts on 5000 tasks in < 100 ms', () => {
    const tasks = Array.from({ length: 5000 }, (_, i) => makeResolved(`t${i}`));
    const t0 = performance.now();
    computeRowLayouts(tasks, ROW_H, false);
    expect(performance.now() - t0).toBeLessThan(100);
  });
});

// ── computeGroupSummaryRollup — correctness ────────────────────────────────────

describe('computeGroupSummaryRollup — hierarchical correctness', () => {
  it('returns null dates when group has no children', () => {
    const group = makeGroupTask('g');
    const rollup = computeGroupSummaryRollup(group, [group], buildTaskMap([group]));
    expect(rollup.dates).toBeNull();
    expect(rollup.progress).toBeNull();
    expect(rollup.baseline).toBeNull();
  });

  it('date rollup spans earliest start to latest end across 50 children', () => {
    const group = makeGroupTask('g');
    // Generate 50 children spread one-week apart using Date arithmetic so every
    // ISO string is valid (no month-overflow).
    const BASE_MS = new Date('2026-01-01').getTime();
    const WEEK_MS = 7 * 86_400_000;
    const children = Array.from({ length: 50 }, (_, i) => {
      const startDate = new Date(BASE_MS + i * WEEK_MS);
      const endDate = new Date(BASE_MS + (i + 1) * WEEK_MS);
      return makeChild(
        `c${i}`,
        'g',
        startDate.toISOString().slice(0, 10),
        endDate.toISOString().slice(0, 10),
      );
    });
    const tasks = [group, ...children];
    const rollup = computeGroupSummaryRollup(group, tasks, buildTaskMap(tasks));

    expect(rollup.dates).not.toBeNull();
    // Earliest start = 2026-01-01
    expect(rollup.dates!.start.getFullYear()).toBe(2026);
    expect(rollup.dates!.start.getMonth()).toBe(0); // January
    expect(rollup.dates!.start.getDate()).toBe(1);
    // Latest end is 51 weeks after Jan 1 — strictly later than the earliest start
    expect(rollup.dates!.end.getTime()).toBeGreaterThan(rollup.dates!.start.getTime());
  });

  it('date rollup correctly finds min start and max end', () => {
    const group = makeGroupTask('g');
    const children: GanttTask[] = [
      makeChild('early', 'g', '2026-01-05', '2026-01-15'),
      makeChild('middle', 'g', '2026-02-01', '2026-02-28'),
      makeChild('late', 'g', '2026-03-10', '2026-06-30'),
    ];
    const tasks = [group, ...children];
    const rollup = computeGroupSummaryRollup(group, tasks, buildTaskMap(tasks));

    expect(rollup.dates).not.toBeNull();
    // earliest start = Jan 5
    expect(rollup.dates!.start.getMonth()).toBe(0);
    expect(rollup.dates!.start.getDate()).toBe(5);
    // latest end = Jun 30
    expect(rollup.dates!.end.getMonth()).toBe(5); // June
    expect(rollup.dates!.end.getDate()).toBe(30);
  });

  it('progress rollup is a duration-weighted average', () => {
    const group = makeGroupTask('g');
    // Two tasks with equal duration: one at 0%, one at 100% → weighted avg = 50
    const children: GanttTask[] = [
      makeChild('c1', 'g', '2026-01-01', '2026-01-11', 0),
      makeChild('c2', 'g', '2026-01-01', '2026-01-11', 100),
    ];
    const tasks = [group, ...children];
    const rollup = computeGroupSummaryRollup(group, tasks, buildTaskMap(tasks));

    expect(rollup.progress).toBe(50);
  });

  it('progress rollup clamps result to [0, 100]', () => {
    const group = makeGroupTask('g');
    const children: GanttTask[] = [
      makeChild('c1', 'g', '2026-01-01', '2026-01-10', 0),
      makeChild('c2', 'g', '2026-01-01', '2026-01-10', 100),
    ];
    const tasks = [group, ...children];
    const rollup = computeGroupSummaryRollup(group, tasks, buildTaskMap(tasks));

    expect(rollup.progress).toBeGreaterThanOrEqual(0);
    expect(rollup.progress).toBeLessThanOrEqual(100);
  });

  it('rollUpGroupDates convenience wrapper returns same result as computeGroupSummaryRollup', () => {
    const group = makeGroupTask('g');
    const children: GanttTask[] = [
      makeChild('c1', 'g', '2026-02-01', '2026-02-15'),
      makeChild('c2', 'g', '2026-03-01', '2026-03-31'),
    ];
    const tasks = [group, ...children];
    const map = buildTaskMap(tasks);

    const full = computeGroupSummaryRollup(group, tasks, map);
    const convenience = rollUpGroupDates(group, tasks, map);

    expect(convenience).not.toBeNull();
    expect(convenience!.start.getTime()).toBe(full.dates!.start.getTime());
    expect(convenience!.end.getTime()).toBe(full.dates!.end.getTime());
  });

  it('rollUpGroupProgress convenience wrapper returns same result', () => {
    const group = makeGroupTask('g');
    const children: GanttTask[] = [
      makeChild('c1', 'g', '2026-01-01', '2026-01-10', 25),
      makeChild('c2', 'g', '2026-01-01', '2026-01-10', 75),
    ];
    const tasks = [group, ...children];
    const map = buildTaskMap(tasks);

    const full = computeGroupSummaryRollup(group, tasks, map);
    const convenience = rollUpGroupProgress(group, tasks, map);

    expect(convenience).toBe(full.progress);
  });

  it('collectRollupDescendants gathers all direct children', () => {
    const group = makeGroupTask('g');
    const children = Array.from({ length: 20 }, (_, i) =>
      makeChild(`c${i}`, 'g', '2026-01-01', '2026-01-10'),
    );
    const tasks = [group, ...children];
    const map = buildTaskMap(tasks);

    const descendants = collectRollupDescendants(group, tasks, map);
    expect(descendants).toHaveLength(20);
  });

  it('buildTaskMap produces a map with correct size and O(1) lookup', () => {
    const tasks = Array.from({ length: 200 }, (_, i) => ({
      id: `t${i}`,
      name: `Task ${i}`,
      start: '2026-01-01',
      end: '2026-01-10',
    }));
    const map = buildTaskMap(tasks);

    expect(map.size).toBe(200);
    expect(map.get('t0')?.id).toBe('t0');
    expect(map.get('t199')?.id).toBe('t199');
    expect(map.get('t200')).toBeUndefined();
  });

  it('nested two-level hierarchy rolls up to grandparent span', () => {
    const grandparent = makeGroupTask('gp');
    const parent = makeGroupTask('p', { parentId: 'gp' });
    const children: GanttTask[] = [
      makeChild('c1', 'p', '2026-01-01', '2026-02-01'),
      makeChild('c2', 'p', '2026-03-01', '2026-04-01'),
    ];
    const tasks = [grandparent, parent, ...children];
    const map = buildTaskMap(tasks);

    const rollup = computeGroupSummaryRollup(grandparent, tasks, map);

    expect(rollup.dates).not.toBeNull();
    expect(rollup.dates!.start.getMonth()).toBe(0); // January
    expect(rollup.dates!.end.getMonth()).toBe(3);   // April
  });
});
