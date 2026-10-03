import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { DependencyLayer } from '../src/components/Timeline/DependencyLayer';
import { DragPreviewStore } from '../src/hooks/useDragPreviewStore';
import type { ResolvedTask } from '../src/types';
import type { RowLayout } from '../src/core/rowLayout';
import { resolveScale } from '../src/core/scale';
import { computeTimelineRange } from '../src/core/zoom';

function makeTask(
  id: string,
  rowIndex: number,
  start: string,
  end: string,
  dependencies?: string[],
): ResolvedTask {
  return {
    id,
    name: id,
    start,
    end,
    _start: new Date(start),
    _end: new Date(end),
    _rowIndex: rowIndex,
    _level: 0,
    _visible: true,
    dependencies,
  };
}

describe('DependencyLayer drag preview', () => {
  const scale = resolveScale('week');
  const range = computeTimelineRange(
    [makeTask('t1', 0, '2026-01-01', '2026-01-05')],
    scale,
    2,
    { minDate: new Date('2026-01-01'), maxDate: new Date('2026-01-31') },
  );
  const rowLayouts: RowLayout[] = [
    { y: 0, height: 36 },
    { y: 36, height: 36 },
  ];
  const tasks = [
    makeTask('t1', 0, '2026-01-01', '2026-01-05'),
    makeTask('t2', 1, '2026-01-06', '2026-01-10', ['t1']),
  ];

  it('recomputes arrow path when drag preview store updates', () => {
    const store = new DragPreviewStore();
    const { container } = render(
      <DependencyLayer
        tasks={tasks}
        range={range}
        scale={scale}
        columnWidth={80}
        rowLayouts={rowLayouts}
        showBaseline={true}
        dragPreviewStore={store}
      />,
    );

    const pathBefore = container.querySelector('.rg-dependency-arrow')?.getAttribute('d');
    expect(pathBefore).toBeTruthy();

    act(() => {
      store.setPreview('t1', new Date('2026-01-03'), new Date('2026-01-07'));
    });

    const pathDuring = container.querySelector('.rg-dependency-arrow')?.getAttribute('d');
    expect(pathDuring).not.toBe(pathBefore);
  });

  it('does not notify subscribers when preview dates are unchanged', () => {
    const store = new DragPreviewStore();
    const listener = vi.fn();
    store.subscribe(listener);

    render(
      <DependencyLayer
        tasks={tasks}
        range={range}
        scale={scale}
        columnWidth={80}
        rowLayouts={rowLayouts}
        showBaseline={true}
        dragPreviewStore={store}
      />,
    );

    listener.mockClear();
    const start = new Date('2026-01-03');
    const end = new Date('2026-01-07');
    act(() => {
      store.setPreview('t1', start, end);
    });
    expect(listener).toHaveBeenCalledTimes(1);

    act(() => {
      store.setPreview('t1', new Date(start.getTime()), new Date(end.getTime()));
    });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
