import { describe, it, expect, vi } from 'vitest';
import { TaskStore } from '../src/hooks/useTaskStore';

/**
 * The TaskStore is the mechanism that lets a single task move without
 * re-rendering every other TaskBar: each TaskBar subscribes to its own task
 * version via `useTaskVersion`, and `TaskBar`'s memo comparator bails out when
 * that version is unchanged. These tests pin the version-bumping contract that
 * makes that optimisation correct.
 */
describe('TaskStore granular update contract', () => {
  const initial = [
    { id: 't1', name: 'One', start: '2026-01-01', end: '2026-01-10' },
    { id: 't2', name: 'Two', start: '2026-01-11', end: '2026-01-20' },
    { id: 't3', name: 'Three', start: '2026-01-21', end: '2026-01-30' },
  ];

  it('only bumps the version of the updated task', () => {
    const store = new TaskStore(initial.map((t) => ({ ...t })));

    store.updateTask('t2', { start: '2026-01-12' });

    expect(store.getTaskVersion('t1')).toBe(0);
    expect(store.getTaskVersion('t2')).toBe(1);
    expect(store.getTaskVersion('t3')).toBe(0);
  });

  it('replaceTasks only bumps tasks whose content actually changed', () => {
    const store = new TaskStore(initial.map((t) => ({ ...t })));

    const next = initial.map((t) =>
      t.id === 't3' ? { ...t, end: '2026-02-05' } : { ...t },
    );
    store.replaceTasks(next);

    expect(store.getTaskVersion('t1')).toBe(0);
    expect(store.getTaskVersion('t2')).toBe(0);
    expect(store.getTaskVersion('t3')).toBe(1);
  });

  it('replaceTasks with deep-equal content is a no-op (no notify)', () => {
    const store = new TaskStore(initial.map((t) => ({ ...t })));
    const listener = vi.fn();
    store.subscribe(listener);

    store.replaceTasks(initial.map((t) => ({ ...t })));

    expect(listener).not.toHaveBeenCalled();
    expect(store.getVersion()).toBe(0);
  });

  it('keeps the snapshot reference stable when nothing changed', () => {
    const store = new TaskStore(initial.map((t) => ({ ...t })));
    const before = store.getSnapshot();

    store.replaceTasks(initial.map((t) => ({ ...t })));

    expect(store.getSnapshot()).toBe(before);
  });

  it('notifies exactly once per update', () => {
    const store = new TaskStore(initial.map((t) => ({ ...t })));
    const listener = vi.fn();
    store.subscribe(listener);

    store.updateTask('t1', { progress: 50 });
    store.updateTask('t1', { progress: 75 });

    expect(listener).toHaveBeenCalledTimes(2);
  });
});
