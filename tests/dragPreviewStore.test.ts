import { describe, it, expect, vi } from 'vitest';
import { DragPreviewStore } from '../src/hooks/useDragPreviewStore';

describe('DragPreviewStore performance contract', () => {
  it('does not notify when preview dates are unchanged', () => {
    const store = new DragPreviewStore();
    const listener = vi.fn();
    store.subscribe(listener);

    const start = new Date('2026-01-05');
    const end = new Date('2026-01-10');
    store.setPreview('t1', start, end);
    expect(listener).toHaveBeenCalledTimes(1);

    store.setPreview('t1', new Date(start.getTime()), new Date(end.getTime()));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getVersion()).toBe(1);
  });

  it('notifies when preview dates change for the same task', () => {
    const store = new DragPreviewStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.setPreview('t1', new Date('2026-01-05'), new Date('2026-01-10'));
    store.setPreview('t1', new Date('2026-01-06'), new Date('2026-01-11'));
    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.getVersion()).toBe(2);
  });

  it('clear is a no-op when preview is already empty', () => {
    const store = new DragPreviewStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.clear();
    expect(listener).not.toHaveBeenCalled();
    expect(store.getVersion()).toBe(0);
  });

  it('clear ignores mismatched task id', () => {
    const store = new DragPreviewStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.setPreview('t1', new Date('2026-01-05'), new Date('2026-01-10'));
    listener.mockClear();
    store.clear('t2');
    expect(listener).not.toHaveBeenCalled();
    expect(store.getPreview('t1')).not.toBeNull();
  });

  it('clear removes preview for matching task id', () => {
    const store = new DragPreviewStore();
    store.setPreview('t1', new Date('2026-01-05'), new Date('2026-01-10'));
    store.clear('t1');
    expect(store.getPreview('t1')).toBeNull();
    expect(store.getSnapshot().taskId).toBeNull();
  });
});
