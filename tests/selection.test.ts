import { describe, it, expect } from 'vitest';
import { selectDependency, selectTask } from '../src/core/selection';

describe('selection', () => {
  const both = { taskIds: ['t1'], dependencyIds: ['a->b'] };

  it('a plain click selects only the clicked item', () => {
    expect(selectTask(both, 't2', false)).toEqual({ taskIds: ['t2'], dependencyIds: [] });
    expect(selectDependency(both, 'b->c', false)).toEqual({ taskIds: [], dependencyIds: ['b->c'] });
  });

  it('ctrl/meta toggles within its own kind and keeps the other', () => {
    expect(selectTask(both, 't2', true)).toEqual({ taskIds: ['t1', 't2'], dependencyIds: ['a->b'] });
    expect(selectDependency(both, 'a->b', true)).toEqual({ taskIds: ['t1'], dependencyIds: [] });
  });

  it('keeps an already-empty list by reference', () => {
    const none = { taskIds: [], dependencyIds: [] as string[] };
    expect(selectTask(none, 't1', false).dependencyIds).toBe(none.dependencyIds);
  });
});
