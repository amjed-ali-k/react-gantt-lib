import { describe, it, expect, vi } from 'vitest';
import { TaskStore } from '../src/hooks/useTaskStore';

/**
 * Performance contract tests for TaskStore at realistic production scale.
 *
 * These tests verify the core invariant that makes the Gantt chart performant:
 * when a single task changes, only that task's version counter increments. Every
 * other TaskBar stays memoised because its version is unchanged.
 *
 * All assertions are O(1) per task with respect to side-effects, so these tests
 * also act as regression guards against accidentally introducing O(n) work per
 * single-task update.
 */

function makeTasks(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `t${i}`,
    name: `Task ${i}`,
    start: '2026-01-01',
    end: '2026-03-31',
    progress: 0,
  }));
}

// ── Version isolation ────────────────────────────────────────────────────────

describe('TaskStore — version isolation at scale', () => {
  it('updateTask on one task leaves all other 999 versions unchanged', () => {
    const tasks = makeTasks(1000);
    const store = new TaskStore(tasks);

    const versionsBefore = tasks.map((t) => store.getTaskVersion(t.id));

    store.updateTask('t500', { progress: 75 });

    for (let i = 0; i < 1000; i++) {
      const expected = i === 500 ? versionsBefore[i] + 1 : versionsBefore[i];
      expect(store.getTaskVersion(`t${i}`), `task t${i} version`).toBe(expected);
    }
  });

  it('replaceTasks bumps exactly the one changed task out of 1000', () => {
    const tasks = makeTasks(1000);
    const store = new TaskStore(tasks);

    const next = tasks.map((t, i) =>
      i === 200 ? { ...t, end: '2026-04-30' } : { ...t },
    );
    store.replaceTasks(next);

    for (let i = 0; i < 1000; i++) {
      const expected = i === 200 ? 1 : 0;
      expect(store.getTaskVersion(`t${i}`), `task t${i} version`).toBe(expected);
    }
  });

  it('replaceTasks bumps exactly N changed tasks when N tasks are modified', () => {
    const tasks = makeTasks(100);
    const store = new TaskStore(tasks);

    const CHANGED = new Set(['t10', 't20', 't30', 't40', 't50']);
    const next = tasks.map((t) =>
      CHANGED.has(t.id) ? { ...t, progress: 99 } : { ...t },
    );
    store.replaceTasks(next);

    let bumpCount = 0;
    for (const t of tasks) {
      const v = store.getTaskVersion(t.id);
      if (CHANGED.has(t.id)) {
        expect(v, `${t.id} should have version 1`).toBe(1);
        bumpCount++;
      } else {
        expect(v, `${t.id} should remain version 0`).toBe(0);
      }
    }
    expect(bumpCount).toBe(CHANGED.size);
  });

  it('sequential updateTask calls accumulate versions on the same task', () => {
    const tasks = makeTasks(10);
    const store = new TaskStore(tasks);

    store.updateTask('t3', { progress: 10 });
    store.updateTask('t3', { progress: 20 });
    store.updateTask('t3', { progress: 30 });

    expect(store.getTaskVersion('t3')).toBe(3);
    // siblings remain untouched
    for (let i = 0; i < 10; i++) {
      if (i !== 3) expect(store.getTaskVersion(`t${i}`)).toBe(0);
    }
  });
});

// ── No-op detection ──────────────────────────────────────────────────────────

describe('TaskStore — no-op detection', () => {
  it('replaceTasks with identical data fires no listeners', () => {
    const tasks = makeTasks(100);
    const store = new TaskStore(tasks);
    const listener = vi.fn();
    store.subscribe(listener);

    store.replaceTasks(tasks.map((t) => ({ ...t })));

    expect(listener).not.toHaveBeenCalled();
    expect(store.getVersion()).toBe(0);
  });

  it('snapshot reference is stable when replaceTasks finds no changes', () => {
    const tasks = makeTasks(50);
    const store = new TaskStore(tasks);
    const before = store.getSnapshot();

    store.replaceTasks(tasks.map((t) => ({ ...t })));

    expect(store.getSnapshot()).toBe(before);
  });

  it('replaceTasks with no changes leaves store version at 0', () => {
    const tasks = makeTasks(200);
    const store = new TaskStore(tasks);

    store.replaceTasks(tasks.map((t) => ({ ...t })));
    store.replaceTasks(tasks.map((t) => ({ ...t })));
    store.replaceTasks(tasks.map((t) => ({ ...t })));

    expect(store.getVersion()).toBe(0);
  });
});

// ── Notification contract ────────────────────────────────────────────────────

describe('TaskStore — notification contract', () => {
  it('fires listener exactly once per updateTask call', () => {
    const tasks = makeTasks(1000);
    const store = new TaskStore(tasks);
    const listener = vi.fn();
    store.subscribe(listener);

    store.updateTask('t0', { progress: 10 });
    store.updateTask('t999', { progress: 20 });
    store.updateTask('t500', { name: 'Updated' });

    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('fires all registered listeners when a task is updated', () => {
    const tasks = makeTasks(5);
    const store = new TaskStore(tasks);
    const l1 = vi.fn();
    const l2 = vi.fn();
    const l3 = vi.fn();
    store.subscribe(l1);
    store.subscribe(l2);
    store.subscribe(l3);

    store.updateTask('t0', { progress: 50 });

    expect(l1).toHaveBeenCalledTimes(1);
    expect(l2).toHaveBeenCalledTimes(1);
    expect(l3).toHaveBeenCalledTimes(1);
  });

  it('unsubscribed listener receives no further notifications', () => {
    const tasks = makeTasks(10);
    const store = new TaskStore(tasks);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.updateTask('t0', { progress: 50 });
    unsubscribe();
    store.updateTask('t1', { progress: 60 });
    store.updateTask('t2', { progress: 70 });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('global version counter increments monotonically with each mutation', () => {
    const tasks = makeTasks(10);
    const store = new TaskStore(tasks);

    expect(store.getVersion()).toBe(0);
    store.updateTask('t0', { progress: 10 });
    expect(store.getVersion()).toBe(1);
    store.updateTask('t1', { progress: 20 });
    expect(store.getVersion()).toBe(2);
    store.replaceTasks(tasks.map((t, i) => (i === 2 ? { ...t, name: 'Changed' } : { ...t })));
    expect(store.getVersion()).toBe(3);
  });

  it('does not fire listener when replaceTasks is a no-op', () => {
    const tasks = makeTasks(20);
    const store = new TaskStore(tasks);
    const listener = vi.fn();
    store.subscribe(listener);

    store.replaceTasks(tasks.map((t) => ({ ...t })));
    store.replaceTasks(tasks.map((t) => ({ ...t })));

    expect(listener).not.toHaveBeenCalled();
  });
});

// ── Timing ───────────────────────────────────────────────────────────────────

describe('TaskStore — timing budgets', () => {
  it('single updateTask on 1000 tasks completes in < 50 ms', () => {
    const tasks = makeTasks(1000);
    const store = new TaskStore(tasks);

    const t0 = performance.now();
    store.updateTask('t500', { progress: 50 });
    const elapsed = performance.now() - t0;

    expect(elapsed).toBeLessThan(50);
  });

  it('replaceTasks with 1 change across 1000 tasks completes in < 500 ms', () => {
    const tasks = makeTasks(1000);
    const store = new TaskStore(tasks);
    const next = tasks.map((t, i) => (i === 0 ? { ...t, progress: 99 } : { ...t }));

    const t0 = performance.now();
    store.replaceTasks(next);
    const elapsed = performance.now() - t0;

    expect(elapsed).toBeLessThan(500);
  });

  it('100 rapid updateTask calls on different tasks stay under 200 ms total', () => {
    const tasks = makeTasks(1000);
    const store = new TaskStore(tasks);

    const t0 = performance.now();
    for (let i = 0; i < 100; i++) {
      store.updateTask(`t${i}`, { progress: i });
    }
    const elapsed = performance.now() - t0;

    expect(elapsed).toBeLessThan(200);
    // Verify versions are correct
    for (let i = 0; i < 100; i++) {
      expect(store.getTaskVersion(`t${i}`)).toBe(1);
    }
  });
});
