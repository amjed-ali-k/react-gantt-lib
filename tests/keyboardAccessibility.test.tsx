import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { GanttChart } from '../src/GanttChart';
import { taskAccessibleName } from '../src/core/accessibility';
import type { GanttChartProps, GanttTask } from '../src/types';

const tasks: GanttTask[] = [
  { id: 'a', name: 'Design', start: '2026-01-05', end: '2026-01-08', progress: 40 },
  {
    id: 'b',
    name: 'Build',
    start: '2026-01-09',
    end: '2026-01-14',
    dependencies: ['a'],
    critical: true,
  },
  { id: 'm', name: 'Handover', start: '2026-01-16', end: '2026-01-16', type: 'milestone' },
];

function renderChart(props: Partial<GanttChartProps> = {}) {
  return render(
    <GanttChart
      tasks={tasks}
      height={400}
      zoomLevel="day"
      minDate="2026-01-01"
      maxDate="2026-02-28"
      {...props}
    />,
  );
}

const bar = (container: HTMLElement, id: string) =>
  container.querySelector<SVGGElement>(`.rg-bar[data-task-id="${id}"]`)!;
const announced = () => screen.getByTestId('gantt-announcer').textContent?.replace(/​/g, '');

describe('grid semantics and names', () => {
  it('bars are rows of a labelled treegrid, each with a gridcell', () => {
    const { container } = renderChart({ timelineLabel: 'Pour schedule' });
    const grid = screen.getByRole('treegrid', { name: 'Pour schedule' });
    expect(grid.getAttribute('aria-rowcount')).toBe('3');
    const row = bar(container, 'b');
    expect(row.getAttribute('role')).toBe('row');
    expect(row.getAttribute('aria-rowindex')).toBe('2');
    expect(row.getAttribute('aria-level')).toBe('1');
    expect(row.querySelector('[role="gridcell"]')).toBeTruthy();
  });

  it('names a bar by its dates, progress, predecessors and critical flag', () => {
    const { container } = renderChart();
    const label = (id: string) => bar(container, id).getAttribute('aria-label');
    const d = (iso: string) => new Date(iso).toLocaleDateString();
    expect(label('a')).toBe(`Design, ${d('2026-01-05')} to ${d('2026-01-08')}, 40%`);
    expect(label('b')).toBe(
      `Build, ${d('2026-01-09')} to ${d('2026-01-14')}, 0%, depends on Design, critical`,
    );
    expect(label('m')).toBe(`Handover, milestone, ${d('2026-01-16')}`);
  });

  it('taskAccessibleName falls back to the id for an unknown predecessor', () => {
    const name = taskAccessibleName(
      { id: 'x', name: 'X', start: '', end: '', dependencies: [{ id: 'gone' }], _start: new Date(0), _end: new Date(0) },
      () => 'D',
      () => undefined,
    );
    expect(name).toBe('X, D to D, 0%, depends on gone');
  });

  it('draws critical tasks with an outline, not only a colour', () => {
    const { container } = renderChart();
    expect(bar(container, 'b').getAttribute('class')).toContain('rg-bar--critical');
    expect(bar(container, 'b').querySelector('rect.rg-bar-critical')).toBeTruthy();
    expect(bar(container, 'a').querySelector('.rg-bar-critical')).toBeNull();
    const ms = render(
      <GanttChart tasks={[{ ...tasks[2], critical: true }]} height={200} zoomLevel="day" />,
    );
    expect(bar(ms.container, 'm').querySelector('polygon.rg-bar-critical')).toBeTruthy();
  });

  it('labels the today marker', () => {
    const today = new Date();
    const iso = (offset: number) => new Date(today.getTime() + offset * 864e5).toISOString().slice(0, 10);
    render(
      <GanttChart
        tasks={[{ id: 't', name: 'Now', start: iso(-2), end: iso(2) }]}
        height={200}
        zoomLevel="day"
      />,
    );
    const marker = screen.getByRole('img', { name: `Today, ${today.toLocaleDateString()}` });
    expect(marker.querySelector('title')?.textContent).toBe(`Today, ${today.toLocaleDateString()}`);
  });
});

describe('roving focus', () => {
  it('the bars are one tab stop; Up and Down move it between rows', () => {
    const { container } = renderChart();
    const tabStops = () =>
      [...container.querySelectorAll('.rg-bar')].filter((g) => g.getAttribute('tabindex') === '0');
    expect(tabStops()).toEqual([bar(container, 'a')]);

    act(() => bar(container, 'a').focus());
    fireEvent.keyDown(bar(container, 'a'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(bar(container, 'b'));
    expect(tabStops()).toEqual([bar(container, 'b')]);
    fireEvent.keyDown(bar(container, 'b'), { key: 'ArrowDown' });
    fireEvent.keyDown(bar(container, 'm'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(bar(container, 'm'));
    fireEvent.keyDown(bar(container, 'm'), { key: 'ArrowUp' });
    expect(document.activeElement).toBe(bar(container, 'b'));
  });

  it('falls back to the first bar when the focused one goes away', () => {
    const { container, rerender } = renderChart();
    act(() => bar(container, 'b').focus());
    expect(bar(container, 'b').getAttribute('tabindex')).toBe('0');
    rerender(<GanttChart tasks={[tasks[0], tasks[2]]} height={400} zoomLevel="day" />);
    expect(bar(container, 'a').getAttribute('tabindex')).toBe('0');
  });
});

describe('keyboard editing', () => {
  it('Left/Right move the task one grid unit, firing the drag events with source keyboard', () => {
    const onTaskDragStart = vi.fn();
    const onTaskDrag = vi.fn();
    const onTaskDragEnd = vi.fn();
    const onTasksChange = vi.fn();
    const { container } = renderChart({ onTaskDragStart, onTaskDrag, onTaskDragEnd, onTasksChange });
    act(() => bar(container, 'a').focus());
    fireEvent.keyDown(bar(container, 'a'), { key: 'ArrowRight' });

    expect(onTaskDragStart).toHaveBeenCalledWith(expect.objectContaining({ source: 'keyboard' }));
    expect(onTaskDrag).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'keyboard', deltaMs: 864e5 }),
    );
    const end = onTaskDragEnd.mock.calls[0]![0];
    expect(end.source).toBe('keyboard');
    expect(end.start.getTime() - end.previousStart.getTime()).toBe(864e5);
    expect(end.end.getTime() - end.previousEnd.getTime()).toBe(864e5);
    expect(onTasksChange).toHaveBeenCalled();
    expect(announced()).toBe(
      `Moved Design to ${end.start.toLocaleDateString()} – ${end.end.toLocaleDateString()}`,
    );

    fireEvent.keyDown(bar(container, 'a'), { key: 'ArrowLeft' });
    expect(onTaskDragEnd.mock.calls[1]![0].start.getTime()).toBe(end.previousStart.getTime());
  });

  it('Shift+Left/Right resize the end and Alt+Left/Right the start, with source keyboard', () => {
    const onTaskResizeStart = vi.fn();
    const onTaskResizeEnd = vi.fn();
    const { container } = renderChart({ onTaskResizeStart, onTaskResizeEnd });
    const a = bar(container, 'a');
    fireEvent.keyDown(a, { key: 'ArrowRight', shiftKey: true });
    let e = onTaskResizeEnd.mock.calls[0]![0];
    expect(e).toMatchObject({ edge: 'end', source: 'keyboard' });
    expect(e.end.getTime() - e.previousEnd.getTime()).toBe(864e5);
    expect(e.start.getTime()).toBe(e.previousStart.getTime());
    expect(announced()).toMatch(/^Resized Design to /);

    fireEvent.keyDown(a, { key: 'ArrowLeft', altKey: true });
    e = onTaskResizeEnd.mock.calls[1]![0];
    expect(e).toMatchObject({ edge: 'start', source: 'keyboard' });
    expect(e.previousStart.getTime() - e.start.getTime()).toBe(864e5);
    expect(onTaskResizeStart).toHaveBeenCalledTimes(2);
  });

  it('respects enableDrag / enableResize, and milestones only move', () => {
    const onTaskDragEnd = vi.fn();
    const onTaskResizeEnd = vi.fn();
    const { container } = renderChart({ enableDrag: false, onTaskDragEnd, onTaskResizeEnd });
    fireEvent.keyDown(bar(container, 'a'), { key: 'ArrowRight' });
    expect(onTaskDragEnd).not.toHaveBeenCalled();
    fireEvent.keyDown(bar(container, 'm'), { key: 'ArrowRight', shiftKey: true });
    expect(onTaskResizeEnd).not.toHaveBeenCalled();
  });

  it('a pointer drag reports source pointer', () => {
    const onTaskDragEnd = vi.fn();
    const { container } = renderChart({ onTaskDragEnd });
    fireEvent.pointerDown(bar(container, 'a').querySelector('.rg-bar-bg')!, { clientX: 100, button: 0 });
    fireEvent.pointerMove(document, { clientX: 200 });
    fireEvent.pointerUp(document, { clientX: 200 });
    expect(onTaskDragEnd).toHaveBeenCalledWith(expect.objectContaining({ source: 'pointer' }));
  });

  it('Enter opens (taskDoubleClick) and Space selects', () => {
    const onTaskDoubleClick = vi.fn();
    const onSelectionChange = vi.fn();
    const { container } = renderChart({ onTaskDoubleClick, onSelectionChange });
    fireEvent.keyDown(bar(container, 'b'), { key: 'Enter' });
    expect(onTaskDoubleClick).toHaveBeenCalledWith(
      expect.objectContaining({ task: expect.objectContaining({ id: 'b' }) }),
    );
    fireEvent.keyDown(bar(container, 'b'), { key: ' ' });
    expect(onSelectionChange).toHaveBeenLastCalledWith({ selectedIds: ['b'], selectedDependencyIds: [] });
    expect(bar(container, 'b').getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(bar(container, 'a'), { key: ' ', ctrlKey: true });
    expect(onSelectionChange).toHaveBeenLastCalledWith({
      selectedIds: ['b', 'a'],
      selectedDependencyIds: [],
    });
  });

  it('Home and End scroll to the ends of the timeline', () => {
    const { container } = renderChart();
    const scroll = container.querySelector<HTMLDivElement>('.rg-timeline-scroll')!;
    Object.defineProperty(scroll, 'scrollWidth', { value: 3000, configurable: true });
    Object.defineProperty(scroll, 'clientWidth', { value: 500, configurable: true });
    fireEvent.keyDown(bar(container, 'a'), { key: 'End' });
    expect(scroll.scrollLeft).toBe(2500);
    expect(announced()).toBe('End of timeline');
    fireEvent.keyDown(bar(container, 'a'), { key: 'Home' });
    expect(scroll.scrollLeft).toBe(0);
  });

  it('+ and - zoom', () => {
    const onZoomChange = vi.fn();
    const { container } = renderChart({ onZoomChange });
    fireEvent.keyDown(bar(container, 'a'), { key: '+' });
    expect(onZoomChange).toHaveBeenLastCalledWith(expect.objectContaining({ scaleId: 'hour' }));
    expect(announced()).toBe('Zoom: Hour');
    fireEvent.keyDown(bar(container, 'a'), { key: '-' });
    expect(onZoomChange).toHaveBeenLastCalledWith(expect.objectContaining({ scaleId: 'day' }));
  });

  it('leaves Ctrl/⌘ arrow chords to the browser', () => {
    const onTaskDragEnd = vi.fn();
    const { container } = renderChart({ onTaskDragEnd });
    fireEvent.keyDown(bar(container, 'a'), { key: 'ArrowRight', ctrlKey: true });
    expect(onTaskDragEnd).not.toHaveBeenCalled();
  });
});

describe('announcements', () => {
  it('an announce prop receives the messages instead of the built-in region', () => {
    const announce = vi.fn();
    const { container } = renderChart({ announce });
    expect(screen.queryByTestId('gantt-announcer')).toBeNull();
    fireEvent.keyDown(bar(container, 'a'), { key: 'ArrowRight' });
    expect(announce).toHaveBeenCalledWith(expect.stringMatching(/^Moved Design to /));
  });

  it('repeats an identical message so it is spoken again', () => {
    const { container } = renderChart();
    fireEvent.keyDown(bar(container, 'a'), { key: 'End' });
    const first = screen.getByTestId('gantt-announcer').textContent;
    fireEvent.keyDown(bar(container, 'a'), { key: 'End' });
    expect(screen.getByTestId('gantt-announcer').textContent).not.toBe(first);
    expect(announced()).toBe('End of timeline');
  });
});

describe('reduced motion', () => {
  const original = window.matchMedia;
  afterEach(() => {
    window.matchMedia = original;
  });

  function mockMatchMedia(matches: boolean) {
    const listeners = new Set<() => void>();
    const mql = {
      matches,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: (_: string, l: () => void) => listeners.add(l),
      removeEventListener: (_: string, l: () => void) => listeners.delete(l),
    };
    window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia;
    return {
      set(next: boolean) {
        mql.matches = next;
        act(() => listeners.forEach((l) => l()));
      },
    };
  }

  it('marks the chart so no transitions apply, and follows the OS setting', () => {
    const media = mockMatchMedia(true);
    const { container } = renderChart();
    const chart = container.querySelector('.rg-gantt')!;
    expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    expect(chart.className).toContain('rg-gantt--reduced-motion');
    media.set(false);
    expect(chart.className).not.toContain('rg-gantt--reduced-motion');
  });

  it('jumps instead of smooth-scrolling for Home/End', () => {
    mockMatchMedia(true);
    const { container } = renderChart();
    const scroll = container.querySelector<HTMLDivElement>('.rg-timeline-scroll')!;
    const scrollTo = vi.fn();
    scroll.scrollTo = scrollTo as unknown as typeof scroll.scrollTo;
    fireEvent.keyDown(bar(container, 'a'), { key: 'End' });
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'auto' }));
  });

  it('the stylesheet switches off every transition under the class and the media query', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const css = readFileSync(join(process.cwd(), 'src/styles/gantt.css'), 'utf8');
    for (const selector of ['.rg-gantt--reduced-motion *', '@media (prefers-reduced-motion: reduce)']) {
      const block = css.slice(css.indexOf(selector), css.indexOf('}', css.indexOf(selector)) + 1);
      expect(block, selector).toContain('transition: none !important');
    }
  });
});

describe('axe', () => {
  it('finds no violations in a chart with every interactive feature on', async () => {
    const { container } = renderChart({
      enableDependencyCreate: true,
      onDependencyCreate: vi.fn(),
      onDependencyDelete: vi.fn(),
      onGanttClick: vi.fn(),
      showTooltip: true,
      eventMarkers: [{ date: '2026-01-10', label: 'Inspection' }],
    });
    const results = await axe.run(container, {
      // jsdom has no layout, so contrast cannot be computed here (the e2e harness checks it).
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`)).toEqual([]);
  });
});
