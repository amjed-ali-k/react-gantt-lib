import { describe, it, expect, vi, afterEach } from 'vitest';
import { useState } from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { GanttChart } from '../src/GanttChart';
import type { GanttTask } from '../src/types';

const baseTasks: GanttTask[] = [
  { id: 't1', name: 'Design', start: '2026-01-01', end: '2026-01-15', progress: 10 },
  { id: 't2', name: 'Build', start: '2026-01-10', end: '2026-01-25', progress: 10 },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TaskStore prop sync', () => {
  it('does not warn about updating a component during render when tasks change via props', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { rerender } = render(
      <GanttChart tasks={baseTasks} minDate="2026-01-01" maxDate="2026-01-31" height={400} />,
    );

    act(() => {
      rerender(
        <GanttChart
          tasks={baseTasks.map((t) => (t.id === 't1' ? { ...t, progress: 90 } : t))}
          minDate="2026-01-01"
          maxDate="2026-01-31"
          height={400}
        />,
      );
    });

    const renderPhaseWarning = errorSpy.mock.calls.some((args) =>
      String(args[0]).includes('while rendering a different component'),
    );
    expect(renderPhaseWarning).toBe(false);
  });

  it('updates a memoised TaskBar for a non-geometry change (progress) made via props', () => {
    function Harness() {
      const [tasks, setTasks] = useState(baseTasks);
      return (
        <>
          <button
            type="button"
            onClick={() =>
              setTasks((prev) =>
                prev.map((t) => (t.id === 't1' ? { ...t, progress: 90 } : t)),
              )
            }
          >
            bump
          </button>
          <GanttChart
            tasks={tasks}
            minDate="2026-01-01"
            maxDate="2026-01-31"
            height={400}
          />
        </>
      );
    }

    const { container, getByText } = render(<Harness />);

    const progressRect = () =>
      container.querySelector(
        '.rg-timeline-bars [data-task-id="t1"] .rg-bar-progress',
      ) as SVGRectElement;

    const widthBefore = Number(progressRect().getAttribute('width'));

    act(() => {
      fireEvent.click(getByText('bump'));
    });

    const widthAfter = Number(progressRect().getAttribute('width'));

    // The bar's x/width geometry is unchanged (dates are identical); only the
    // progress fill changed. Since progress is not part of TaskBar's memo
    // comparator, this update can only land via the deferred store notify.
    expect(widthAfter).toBeGreaterThan(widthBefore);
  });
});
