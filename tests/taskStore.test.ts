import { describe, it, expect } from 'vitest';
import { TaskStore } from '../src/hooks/useTaskStore';

describe('TaskStore performance contract', () => {
  it('only increments version for the mutated task', () => {
    const store = new TaskStore([
      { id: 'a', name: 'A', start: '2026-01-01', end: '2026-01-05' },
      { id: 'b', name: 'B', start: '2026-01-02', end: '2026-01-06' },
      { id: 'c', name: 'C', start: '2026-01-03', end: '2026-01-07' },
    ]);

    const versionsBefore = {
      a: store.getTaskVersion('a'),
      b: store.getTaskVersion('b'),
      c: store.getTaskVersion('c'),
    };

    store.updateTask('b', { progress: 50 });

    expect(store.getTaskVersion('a')).toBe(versionsBefore.a);
    expect(store.getTaskVersion('b')).toBe(versionsBefore.b + 1);
    expect(store.getTaskVersion('c')).toBe(versionsBefore.c);
  });

  it('does not bump unrelated tasks on external replace with identical data', () => {
    const initial = [
      { id: 'a', name: 'A', start: '2026-01-01', end: '2026-01-05' },
      { id: 'b', name: 'B', start: '2026-01-02', end: '2026-01-06' },
    ];
    const store = new TaskStore(initial);
    const vA = store.getTaskVersion('a');
    const vB = store.getTaskVersion('b');
    store.replaceTasks([...initial]);
    expect(store.getTaskVersion('a')).toBe(vA);
    expect(store.getTaskVersion('b')).toBe(vB);
  });
});
