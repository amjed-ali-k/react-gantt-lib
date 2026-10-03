import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { GanttChart } from '../src/GanttChart';
import type { GanttChartProps, GanttTask } from '../src/types';

const tasks: GanttTask[] = [
  { id: 'a', name: 'Design', start: '2026-01-01', end: '2026-01-05' },
  { id: 'b', name: 'Build', start: '2026-01-07', end: '2026-01-12' },
  { id: 'm', name: 'Handover', start: '2026-01-14', end: '2026-01-14', type: 'milestone' },
];

function renderChart(props: Partial<GanttChartProps> = {}) {
  const onDependencyCreate = vi.fn();
  const utils = render(
    <GanttChart
      tasks={tasks}
      height={400}
      zoomLevel="day"
      enableDependencyCreate
      onDependencyCreate={onDependencyCreate}
      {...props}
    />,
  );
  return { ...utils, onDependencyCreate };
}

const bar = (container: HTMLElement, id: string) =>
  container.querySelector<SVGGElement>(`.rg-bar[data-task-id="${id}"]`)!;
const handle = (container: HTMLElement, id: string, edge: 'start' | 'end') =>
  bar(container, id)?.querySelector<SVGCircleElement>(`[data-connector-edge="${edge}"]`) ?? null;

/** Pointer drag between two elements; jsdom has no hit-testing, so events target them directly. */
function drag(from: Element, over: Element, { drop = over, before }: { drop?: Element; before?: () => void } = {}) {
  fireEvent.pointerDown(from, { button: 0, clientX: 10, clientY: 10, pointerId: 1 });
  fireEvent.pointerMove(over, { clientX: 200, clientY: 40, pointerId: 1 });
  before?.();
  fireEvent.pointerUp(drop, { clientX: 200, clientY: 40, pointerId: 1 });
}

describe('drag-to-link', () => {
  it.each([
    ['end', 'start', 'FS'],
    ['start', 'start', 'SS'],
    ['end', 'end', 'FF'],
    ['start', 'end', 'SF'],
  ] as const)('dragging %s → %s reports %s', (fromEdge, toEdge, type) => {
    const { container, onDependencyCreate } = renderChart();
    drag(handle(container, 'a', fromEdge)!, handle(container, 'b', toEdge)!);
    expect(onDependencyCreate).toHaveBeenCalledTimes(1);
    expect(onDependencyCreate).toHaveBeenCalledWith({ fromId: 'a', toId: 'b', type, source: 'pointer' });
  });

  it('links to and from milestones', () => {
    const { container, onDependencyCreate } = renderChart();
    drag(handle(container, 'm', 'end')!, handle(container, 'b', 'end')!);
    expect(onDependencyCreate).toHaveBeenCalledWith({ fromId: 'm', toId: 'b', type: 'FF', source: 'pointer' });
  });

  it('draws a preview while dragging and marks the chart as linking', () => {
    const { container } = renderChart();
    fireEvent.pointerDown(handle(container, 'a', 'end')!, { button: 0, clientX: 10, clientY: 10 });
    expect(container.querySelector('.rg-gantt')!.className).toContain('rg-gantt--linking');
    fireEvent.pointerMove(handle(container, 'b', 'start')!, { clientX: 200, clientY: 40 });
    expect(container.querySelector('.rg-dependency--preview .rg-dependency-arrow')).toBeTruthy();
    expect(container.querySelector('.rg-link-target')).toBeTruthy();
    fireEvent.pointerUp(document.body, { clientX: 500, clientY: 300 });
    expect(container.querySelector('.rg-link-preview')).toBeNull();
    expect(container.querySelector('.rg-gantt')!.className).not.toContain('rg-gantt--linking');
  });

  it('does not start a bar drag or select the task', () => {
    const onTaskDragStart = vi.fn();
    const onTaskClick = vi.fn();
    const { container } = renderChart({ onTaskDragStart, onTaskClick });
    const start = handle(container, 'a', 'end')!;
    drag(start, start);
    fireEvent.click(start);
    expect(onTaskDragStart).not.toHaveBeenCalled();
    expect(onTaskClick).not.toHaveBeenCalled();
  });

  describe('cancels with no event', () => {
    it('on Escape', () => {
      const { container, onDependencyCreate } = renderChart();
      drag(handle(container, 'a', 'end')!, handle(container, 'b', 'start')!, {
        before: () => fireEvent.keyDown(document, { key: 'Escape' }),
      });
      expect(onDependencyCreate).not.toHaveBeenCalled();
      expect(container.querySelector('.rg-link-preview')).toBeNull();
    });

    it('when dropped on the task it started from', () => {
      const { container, onDependencyCreate } = renderChart();
      drag(handle(container, 'a', 'end')!, handle(container, 'a', 'start')!);
      expect(onDependencyCreate).not.toHaveBeenCalled();
    });

    it('when dropped on empty space or on a bar body', () => {
      const { container, onDependencyCreate } = renderChart();
      drag(handle(container, 'a', 'end')!, document.body);
      drag(handle(container, 'a', 'end')!, bar(container, 'b').querySelector('.rg-bar-bg')!);
      expect(onDependencyCreate).not.toHaveBeenCalled();
    });

    it('on pointercancel', () => {
      const { container, onDependencyCreate } = renderChart();
      fireEvent.pointerDown(handle(container, 'a', 'end')!, { button: 0 });
      fireEvent.pointerMove(handle(container, 'b', 'start')!);
      fireEvent.pointerCancel(document);
      fireEvent.pointerUp(handle(container, 'b', 'start')!);
      expect(onDependencyCreate).not.toHaveBeenCalled();
    });
  });

  it('auto-scrolls the timeline while the pointer is near a viewport edge', async () => {
    const { container } = renderChart();
    const scroll = container.querySelector<HTMLDivElement>('.rg-timeline-scroll')!;
    scroll.getBoundingClientRect = () =>
      ({ left: 0, right: 400, top: 0, bottom: 300, width: 400, height: 300, x: 0, y: 0 }) as DOMRect;

    fireEvent.pointerDown(handle(container, 'a', 'end')!, { button: 0, clientX: 100, clientY: 150 });
    fireEvent.pointerMove(document, { clientX: 398, clientY: 150 });
    await act(() => new Promise((r) => setTimeout(r, 120)));
    const scrolled = scroll.scrollLeft;
    expect(scrolled).toBeGreaterThan(0);
    expect(scroll.scrollTop).toBe(0);

    // Back in the middle: scrolling stops.
    fireEvent.pointerMove(document, { clientX: 200, clientY: 150 });
    await act(() => new Promise((r) => setTimeout(r, 60)));
    const settled = scroll.scrollLeft;
    await act(() => new Promise((r) => setTimeout(r, 60)));
    expect(scroll.scrollLeft).toBe(settled);
    fireEvent.pointerUp(document.body);
  });
});

describe('keyboard linking', () => {
  function link(container: HTMLElement, fromId: string, toId: string, shiftKey = false) {
    act(() => bar(container, fromId).focus());
    fireEvent.keyDown(bar(container, fromId), { key: 'l' });
    act(() => bar(container, toId).focus());
    fireEvent.keyDown(bar(container, toId), { key: 'Enter', shiftKey });
  }

  it('L on a focused bar, then Enter on another, links finish to start', () => {
    const { container, onDependencyCreate } = renderChart();
    link(container, 'a', 'b');
    expect(onDependencyCreate).toHaveBeenCalledWith({ fromId: 'a', toId: 'b', type: 'FS', source: 'keyboard' });
    expect(screen.getByRole('status').textContent).toBe('Linked Design to Build, finish to start.');
  });

  it('announces the session and draws the preview to the focused bar', () => {
    const { container } = renderChart();
    act(() => bar(container, 'a').focus());
    fireEvent.keyDown(bar(container, 'a'), { key: 'L' });
    expect(screen.getByRole('status').textContent).toMatch(/^Linking from Design\./);
    expect(container.querySelector('.rg-link-source')).toBeTruthy();
    expect(container.querySelector('.rg-dependency--preview')).toBeNull();
    act(() => bar(container, 'b').focus());
    expect(container.querySelector('.rg-dependency--preview')).toBeTruthy();
  });

  it('Shift+Enter opens a menu to choose the type', () => {
    const { container, onDependencyCreate } = renderChart();
    link(container, 'a', 'b', true);
    const menu = screen.getByRole('menu', { name: 'Link Design to Build as' });
    const items = screen.getAllByRole('menuitem');
    expect(items.map((i) => i.textContent)).toEqual([
      'FS finish to start',
      'SS start to start',
      'FF finish to finish',
      'SF start to finish',
    ]);
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[2]);
    fireEvent.click(items[2]);
    expect(onDependencyCreate).toHaveBeenCalledWith({ fromId: 'a', toId: 'b', type: 'FF', source: 'keyboard' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(bar(container, 'b'));
  });

  it('Escape in the menu closes it and keeps linking; Escape again cancels', () => {
    const { container, onDependencyCreate } = renderChart();
    link(container, 'a', 'b', true);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(bar(container, 'b'));
    expect(container.querySelector('.rg-link-source')).toBeTruthy();
    fireEvent.keyDown(bar(container, 'b'), { key: 'Escape' });
    expect(container.querySelector('.rg-link-source')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('Linking cancelled.');
    fireEvent.keyDown(bar(container, 'b'), { key: 'Enter' });
    expect(onDependencyCreate).not.toHaveBeenCalled();
  });

  it('Enter on the source bar does not link it to itself', () => {
    const { container, onDependencyCreate } = renderChart();
    link(container, 'a', 'a');
    expect(onDependencyCreate).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toBe('Choose a different task to link to.');
  });
});

describe('enabling', () => {
  it('is off by default: no handles, no focusable bars, no link layer', () => {
    const { container } = render(<GanttChart tasks={tasks} height={400} zoomLevel="day" />);
    expect(container.querySelector('[data-connector-edge]')).toBeNull();
    expect(bar(container, 'a').getAttribute('tabindex')).toBeNull();
    expect(container.querySelector('.rg-link-layer')).toBeNull();
    expect(bar(container, 'a').querySelector('.rg-bar-label')!.getAttribute('x')).toBe(
      String(Number(bar(container, 'a').querySelector('.rg-bar-bg')!.getAttribute('width')) + 6),
    );
  });

  it('a task can opt out of the chart setting, or in without it', () => {
    const mixed: GanttTask[] = [
      { ...tasks[0], enableDependencyCreate: false },
      tasks[1],
      { ...tasks[2], enableDependencyCreate: true },
    ];
    const on = renderChart({ tasks: mixed });
    expect(handle(on.container, 'a', 'start')).toBeNull();
    expect(handle(on.container, 'b', 'start')).toBeTruthy();
    on.unmount();

    const off = renderChart({ tasks: mixed, enableDependencyCreate: false });
    expect(handle(off.container, 'b', 'start')).toBeNull();
    expect(handle(off.container, 'm', 'end')).toBeTruthy();
    expect(bar(off.container, 'm').getAttribute('tabindex')).toBe('0');
  });
});
