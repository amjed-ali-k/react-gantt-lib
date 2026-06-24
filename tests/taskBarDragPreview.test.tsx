import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { TaskBar } from '../src/components/Timeline/TaskBar';
import { DragPreviewStore } from '../src/hooks/useDragPreviewStore';
import { DragPreviewProvider } from '../src/context/DragPreviewContext';
import { TaskStore } from '../src/hooks/useTaskStore';
import type { ResolvedTask } from '../src/types';
import { resolveScale } from '../src/core/scale';

function renderTaskBar(onTaskDrag = vi.fn()) {
  const store = new TaskStore([
    { id: 't1', name: 'Task', start: '2026-01-01', end: '2026-01-10' },
  ]);
  const dragPreviewStore = new DragPreviewStore();
  const emit = vi.fn((event: string, payload: unknown) => {
    if (event === 'taskDrag') onTaskDrag(payload);
  });
  const task: ResolvedTask = {
    id: 't1',
    name: 'Task',
    start: '2026-01-01',
    end: '2026-01-10',
    _start: new Date('2026-01-01'),
    _end: new Date('2026-01-10'),
    _rowIndex: 0,
    _level: 0,
    _visible: true,
  };

  const utils = render(
    <DragPreviewProvider store={dragPreviewStore}>
      <svg>
        <TaskBar
          task={task}
          geometry={{ x: 40, y: 4, width: 120, height: 20 }}
          columnWidth={80}
          scale={resolveScale('week')}
          rangeStart={new Date('2026-01-01')}
          store={store}
          emit={emit}
          onTaskUpdate={vi.fn()}
        />
      </svg>
    </DragPreviewProvider>,
  );

  return { ...utils, dragPreviewStore, onTaskDrag, emit };
}

describe('TaskBar drag preview store', () => {
  it('publishes preview dates to DragPreviewStore on pointer move and clears on release', async () => {
    const onTaskDrag = vi.fn();
    const { container, dragPreviewStore, emit } = renderTaskBar(onTaskDrag);
    const bar = container.querySelector('.rg-bar-bg');
    expect(bar).toBeTruthy();

    fireEvent.pointerDown(bar!, { clientX: 100, pointerId: 1, buttons: 1 });
    expect(emit).toHaveBeenCalledWith(
      'taskDragStart',
      expect.objectContaining({ task: expect.objectContaining({ id: 't1' }) }),
    );

    fireEvent.pointerMove(document, { clientX: 220, pointerId: 1, buttons: 1 });
    expect(dragPreviewStore.getPreview('t1')).not.toBeNull();
    expect(onTaskDrag).toHaveBeenCalled();

    await act(async () => {
      fireEvent.pointerUp(document, { clientX: 220, pointerId: 1, buttons: 1 });
    });
    expect(dragPreviewStore.getPreview('t1')).toBeNull();
  });

  it('does not leave a stale preview behind after the drag ends', async () => {
    const { container, dragPreviewStore } = renderTaskBar();
    const bar = container.querySelector('.rg-bar-bg');

    fireEvent.pointerDown(bar!, { clientX: 100, pointerId: 1, buttons: 1 });
    fireEvent.pointerMove(document, { clientX: 200, pointerId: 1, buttons: 1 });
    expect(dragPreviewStore.getSnapshot().taskId).toBe('t1');

    await act(async () => {
      fireEvent.pointerUp(document, { clientX: 200, pointerId: 1, buttons: 1 });
    });
    expect(dragPreviewStore.getSnapshot().taskId).toBeNull();
    expect(dragPreviewStore.getSnapshot().dates).toBeNull();
  });
});
