import { describe, it, expect, beforeEach, vi } from 'vitest';
import { memo, createElement } from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react';

/**
 * Render-count harness for guarding against unwanted re-renders.
 *
 * Each gantt sub-component is wrapped in a `memo` spy that increments a counter
 * whenever the underlying (already memoised) component actually renders. The
 * spy uses default shallow prop comparison, which mirrors what `React.memo`
 * does for these components, so the counter faithfully reflects how often
 * `GanttChart` forces each panel to re-render by handing it new prop
 * references.
 *
 * Why this matters: the left task list, middle date panel, and zoom toolbar are
 * horizontally fixed and have nothing to do with timeline scroll position or an
 * in-progress drag. Re-rendering them on every scroll frame / pointer move is
 * pure wasted work and the kind of thing that makes large charts feel janky.
 */
const counts = vi.hoisted(() => ({
  taskListPanel: 0,
  middlePanel: 0,
  zoomToolbar: 0,
  timelineHeader: 0,
  timelineBody: 0,
}));

vi.mock('../src/components/TaskList/TaskListPanel', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../src/components/TaskList/TaskListPanel')>();
  return {
    ...actual,
    TaskListPanel: memo((props: Record<string, unknown>) => {
      counts.taskListPanel++;
      return createElement(actual.TaskListPanel, props as never);
    }),
    MiddlePanel: memo((props: Record<string, unknown>) => {
      counts.middlePanel++;
      return createElement(actual.MiddlePanel, props as never);
    }),
  };
});

vi.mock('../src/components/Toolbar/ZoomToolbar', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../src/components/Toolbar/ZoomToolbar')>();
  return {
    ...actual,
    ZoomToolbar: memo((props: Record<string, unknown>) => {
      counts.zoomToolbar++;
      return createElement(actual.ZoomToolbar, props as never);
    }),
  };
});

vi.mock('../src/components/Timeline/TimelineHeader', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../src/components/Timeline/TimelineHeader')>();
  return {
    ...actual,
    TimelineHeader: memo((props: Record<string, unknown>) => {
      counts.timelineHeader++;
      return createElement(actual.TimelineHeader, props as never);
    }),
  };
});

vi.mock('../src/components/Timeline/TimelineBody', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../src/components/Timeline/TimelineBody')>();
  return {
    ...actual,
    TimelineBody: memo((props: Record<string, unknown>) => {
      counts.timelineBody++;
      return createElement(actual.TimelineBody, props as never);
    }),
  };
});

import { GanttChart } from '../src/GanttChart';
import type { CustomRowDefinition } from '../src/types';

const sampleTasks = [
  { id: 't1', name: 'Design', start: '2026-01-01', end: '2026-01-15', progress: 40 },
  { id: 't2', name: 'Build', start: '2026-01-10', end: '2026-01-25', progress: 10 },
];

function resetCounts() {
  counts.taskListPanel = 0;
  counts.middlePanel = 0;
  counts.zoomToolbar = 0;
  counts.timelineHeader = 0;
  counts.timelineBody = 0;
}

function flushRaf() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/** Make a scroll container report a real width and remember scrollLeft writes. */
function makeScrollable(el: HTMLElement, clientWidth = 600) {
  let sl = 0;
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: clientWidth });
  Object.defineProperty(el, 'scrollLeft', {
    configurable: true,
    get: () => sl,
    set: (v: number) => {
      sl = v;
    },
  });
}

async function scrollTimelineTo(container: HTMLElement, left: number) {
  const scrollEl = container.querySelector('.rg-timeline-scroll') as HTMLElement;
  makeScrollable(scrollEl);
  await act(async () => {
    scrollEl.scrollLeft = left;
    fireEvent.scroll(scrollEl);
    await flushRaf();
  });
}

function renderGantt(extraProps: Record<string, unknown> = {}) {
  return render(
    <GanttChart
      tasks={sampleTasks}
      minDate="2026-01-01"
      maxDate="2026-03-31"
      height={400}
      {...extraProps}
    />,
  );
}

describe('GanttChart horizontal scroll performance', () => {
  beforeEach(resetCounts);

  it('does not re-render the task list, middle, or zoom toolbar panels on scroll', async () => {
    const { container } = renderGantt();
    resetCounts();

    await scrollTimelineTo(container, 1200);

    expect(counts.taskListPanel).toBe(0);
    expect(counts.middlePanel).toBe(0);
    expect(counts.zoomToolbar).toBe(0);
  });

  it('still updates the timeline header/body on scroll (column virtualization)', async () => {
    const { container } = renderGantt();
    resetCounts();

    await scrollTimelineTo(container, 1200);

    // The timeline area legitimately reacts to scroll (visible-column window),
    // so at least one of header/body must update to reflect the new viewport.
    expect(counts.timelineHeader + counts.timelineBody).toBeGreaterThan(0);
  });

  it('does not re-render the sidebar panels even with custom sidebar rows present', async () => {
    const customRows: CustomRowDefinition[] = [
      {
        id: 'footer',
        cells: {
          name: () => 'Footer',
          __timeline__: () => 'Timeline footer',
        },
      },
    ];
    const { container } = renderGantt({ customRows });
    await waitFor(() => expect(counts.taskListPanel).toBeGreaterThan(0));
    resetCounts();

    await scrollTimelineTo(container, 1200);

    expect(counts.taskListPanel).toBe(0);
    expect(counts.middlePanel).toBe(0);
    expect(counts.zoomToolbar).toBe(0);
  });
});

describe('GanttChart drag performance', () => {
  beforeEach(resetCounts);

  it('does not re-render sidebar or toolbar panels during an in-progress drag', async () => {
    const { container } = renderGantt();
    await waitFor(() => expect(counts.taskListPanel).toBeGreaterThan(0));
    resetCounts();

    const bar = container.querySelector('[data-task-id="t1"] .rg-bar-bg')!;
    await act(async () => {
      fireEvent.pointerDown(bar, { clientX: 100, pointerId: 1, buttons: 1 });
      fireEvent.pointerMove(document, { clientX: 160, pointerId: 1, buttons: 1 });
      fireEvent.pointerMove(document, { clientX: 220, pointerId: 1, buttons: 1 });
      fireEvent.pointerMove(document, { clientX: 280, pointerId: 1, buttons: 1 });
    });

    expect(counts.taskListPanel).toBe(0);
    expect(counts.middlePanel).toBe(0);
    expect(counts.zoomToolbar).toBe(0);
    expect(counts.timelineHeader).toBe(0);
    expect(counts.timelineBody).toBe(0);
  });

  it('does not re-render the zoom toolbar when a drag completes', async () => {
    const { container } = renderGantt();
    await waitFor(() => expect(counts.taskListPanel).toBeGreaterThan(0));
    resetCounts();

    const bar = container.querySelector('[data-task-id="t1"] .rg-bar-bg')!;
    await act(async () => {
      fireEvent.pointerDown(bar, { clientX: 100, pointerId: 1, buttons: 1 });
      fireEvent.pointerMove(document, { clientX: 220, pointerId: 1, buttons: 1 });
      fireEvent.pointerUp(document, { clientX: 220, pointerId: 1, buttons: 1 });
    });

    expect(counts.zoomToolbar).toBe(0);
  });

  it('re-renders data-driven panels at most once when a drag completes', async () => {
    const { container } = renderGantt();
    await waitFor(() => expect(counts.taskListPanel).toBeGreaterThan(0));
    resetCounts();

    const bar = container.querySelector('[data-task-id="t1"] .rg-bar-bg')!;
    await act(async () => {
      fireEvent.pointerDown(bar, { clientX: 100, pointerId: 1, buttons: 1 });
      fireEvent.pointerMove(document, { clientX: 220, pointerId: 1, buttons: 1 });
      fireEvent.pointerUp(document, { clientX: 220, pointerId: 1, buttons: 1 });
    });

    // The committed task move legitimately updates the panels that display task
    // data, but it must collapse to a single render rather than one per frame.
    expect(counts.middlePanel).toBeLessThanOrEqual(1);
    expect(counts.taskListPanel).toBeLessThanOrEqual(1);
    expect(counts.timelineBody).toBeLessThanOrEqual(1);
  });
});

describe('GanttChart stable-prop performance', () => {
  beforeEach(resetCounts);

  it('does not re-render any panel when re-rendered with an equal-but-new tasks array', () => {
    const { rerender } = renderGantt();
    resetCounts();

    rerender(
      <GanttChart
        tasks={sampleTasks.map((t) => ({ ...t }))}
        minDate="2026-01-01"
        maxDate="2026-03-31"
        height={400}
      />,
    );

    expect(counts.taskListPanel).toBe(0);
    expect(counts.middlePanel).toBe(0);
    expect(counts.zoomToolbar).toBe(0);
    expect(counts.timelineHeader).toBe(0);
    expect(counts.timelineBody).toBe(0);
  });

  it('does not re-render the zoom toolbar when only unrelated callbacks change', () => {
    const { rerender } = renderGantt({ onScroll: () => {} });
    resetCounts();

    // A brand-new onScroll handler each render must not invalidate the toolbar.
    rerender(
      <GanttChart
        tasks={sampleTasks}
        minDate="2026-01-01"
        maxDate="2026-03-31"
        height={400}
        onScroll={() => {}}
      />,
    );

    expect(counts.zoomToolbar).toBe(0);
  });
});
