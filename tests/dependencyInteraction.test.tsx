import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { GanttChart } from '../src/GanttChart';
import type { GanttChartProps, GanttTask } from '../src/types';

const tasks: GanttTask[] = [
  { id: 'a', name: 'Design', start: '2026-01-01', end: '2026-01-05' },
  { id: 'b', name: 'Build', start: '2026-01-07', end: '2026-01-12', dependencies: ['a'] },
  {
    id: 'c',
    name: 'Test',
    start: '2026-01-08',
    end: '2026-01-14',
    dependencies: [{ id: 'b', type: 'SS', lag: 2, color: '#ff0000', className: 'mine', critical: true }],
  },
];

function renderChart(props: Partial<GanttChartProps> = {}) {
  return render(<GanttChart tasks={tasks} height={400} zoomLevel="day" {...props} />);
}

const hit = (container: HTMLElement, id: string) =>
  container.querySelector<SVGPathElement>(`.rg-dependency-hit[data-dependency-id="${id}"]`)!;
const drawn = (container: HTMLElement, id: string) =>
  container.querySelector<SVGGElement>(`.rg-dependency[data-dependency-id="${id}"]`)!;

describe('dependency rendering', () => {
  it('draws each link with its type, style overrides and lag label', () => {
    const { container } = renderChart();
    const fs = drawn(container, 'a->b');
    expect(fs.getAttribute('data-dependency-type')).toBe('FS');
    expect(fs.querySelector('.rg-dependency-lag')).toBeNull();

    const ss = drawn(container, 'b->c');
    expect(ss.getAttribute('class')).toContain('rg-dependency--ss');
    expect(ss.getAttribute('class')).toContain('rg-dependency--critical');
    expect(ss.getAttribute('class')).toContain('mine');
    expect(ss.style.getPropertyValue('--rg-dependency-color')).toBe('#ff0000');
    expect(ss.querySelector('.rg-dependency-lag')?.textContent).toBe('+2d');
    expect(ss.querySelector('polygon.rg-dependency-arrow-head')).toBeTruthy();
  });

  it('uses formatDependencyLag for the label', () => {
    const { container } = renderChart({ formatDependencyLag: (lag) => `${lag} wd` });
    expect(drawn(container, 'b->c').querySelector('.rg-dependency-lag')?.textContent).toBe('2 wd');
  });

  it('is not interactive unless a dependency callback or selectedDependencyIds is given', () => {
    const { container } = renderChart({ onSelectionChange: vi.fn(), onGanttClick: vi.fn() });
    expect(container.querySelector('.rg-dependency-hit')).toBeNull();
  });
});

describe('dependency interaction', () => {
  it('click selects the link and fires dependencyClick and ganttClick with a dependency target', () => {
    const onDependencyClick = vi.fn();
    const onGanttClick = vi.fn();
    const onSelectionChange = vi.fn();
    const { container } = renderChart({ onDependencyClick, onGanttClick, onSelectionChange });

    fireEvent.click(hit(container, 'a->b'));

    const target = expect.objectContaining({
      type: 'dependency',
      id: 'a->b',
      from: expect.objectContaining({ id: 'a' }),
      to: expect.objectContaining({ id: 'b' }),
      dependency: { id: 'a', type: 'FS', lag: 0 },
    });
    expect(onDependencyClick).toHaveBeenCalledWith(expect.objectContaining({ target }));
    expect(onGanttClick).toHaveBeenCalledWith(expect.objectContaining({ target }));
    expect(onSelectionChange).toHaveBeenLastCalledWith({ selectedIds: [], selectedDependencyIds: ['a->b'] });
    expect(hit(container, 'a->b').getAttribute('aria-pressed')).toBe('true');
    expect(drawn(container, 'a->b').getAttribute('class')).toContain('rg-dependency--selected');
  });

  it('ctrl-click adds to the selection; a task click replaces it', () => {
    const onSelectionChange = vi.fn();
    const { container } = renderChart({ onDependencyClick: vi.fn(), onSelectionChange });
    fireEvent.click(hit(container, 'a->b'));
    fireEvent.click(hit(container, 'b->c'), { ctrlKey: true });
    expect(onSelectionChange).toHaveBeenLastCalledWith({
      selectedIds: [],
      selectedDependencyIds: ['a->b', 'b->c'],
    });
    fireEvent.click(within(screen.getByTestId('task-list-left')).getByText('Design'));
    expect(onSelectionChange).toHaveBeenLastCalledWith({ selectedIds: ['a'], selectedDependencyIds: [] });
  });

  it('Enter and Space on a focused link select it', () => {
    const onDependencyClick = vi.fn();
    const { container } = renderChart({ onDependencyClick });
    const path = hit(container, 'b->c');
    expect(path.getAttribute('tabindex')).toBe('0');
    expect(path.getAttribute('role')).toBe('button');
    expect(path.getAttribute('aria-label')).toBe('Dependency: Build start to start Test, lag +2d');
    fireEvent.keyDown(path, { key: 'Enter' });
    expect(onDependencyClick).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(path, { key: ' ' });
    expect(onDependencyClick).toHaveBeenCalledTimes(2);
    expect(path.getAttribute('aria-pressed')).toBe('true');
  });

  it('Delete and Backspace fire onDependencyDelete for the selected links', () => {
    const onDependencyDelete = vi.fn();
    const { container } = renderChart({ onDependencyDelete });
    const path = hit(container, 'b->c');

    fireEvent.keyDown(path, { key: 'Delete' });
    expect(onDependencyDelete).not.toHaveBeenCalled();

    fireEvent.click(path);
    fireEvent.keyDown(path, { key: 'Delete' });
    expect(onDependencyDelete).toHaveBeenCalledWith({
      dependencies: [
        expect.objectContaining({ id: 'b->c', dependency: expect.objectContaining({ type: 'SS', lag: 2 }) }),
      ],
    });
    fireEvent.keyDown(path, { key: 'Backspace' });
    expect(onDependencyDelete).toHaveBeenCalledTimes(2);
  });

  it('ignores Delete typed into a text field inside the chart', () => {
    const onDependencyDelete = vi.fn();
    const { container } = renderChart({
      onDependencyDelete,
      selectedDependencyIds: ['a->b'],
      columns: [{ key: 'name', title: 'Task', render: ({ task }) => <input aria-label={task.name} /> }],
    });
    fireEvent.keyDown(screen.getByLabelText('Design'), { key: 'Backspace' });
    expect(onDependencyDelete).not.toHaveBeenCalled();
    fireEvent.keyDown(hit(container, 'a->b'), { key: 'Backspace' });
    expect(onDependencyDelete).toHaveBeenCalledTimes(1);
  });

  it('honours controlled selectedDependencyIds', () => {
    const onSelectionChange = vi.fn();
    const { container, rerender } = renderChart({ selectedDependencyIds: ['b->c'], onSelectionChange });
    expect(hit(container, 'b->c').getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(hit(container, 'a->b'));
    expect(onSelectionChange).toHaveBeenLastCalledWith({ selectedIds: [], selectedDependencyIds: ['a->b'] });
    // Controlled: nothing changes until the parent passes the new ids.
    expect(hit(container, 'b->c').getAttribute('aria-pressed')).toBe('true');
    rerender(
      <GanttChart tasks={tasks} height={400} zoomLevel="day" selectedDependencyIds={['a->b']} />,
    );
    expect(hit(container, 'a->b').getAttribute('aria-pressed')).toBe('true');
    expect(hit(container, 'b->c').getAttribute('aria-pressed')).toBe('false');
  });

  it('fires dependencyContextMenu and dependencyHover', () => {
    const onDependencyContextMenu = vi.fn();
    const onGanttContextMenu = vi.fn();
    const onDependencyHover = vi.fn();
    const { container } = renderChart({ onDependencyContextMenu, onGanttContextMenu, onDependencyHover });
    const path = hit(container, 'a->b');

    fireEvent.contextMenu(path);
    expect(onDependencyContextMenu).toHaveBeenCalledWith(
      expect.objectContaining({ target: expect.objectContaining({ id: 'a->b' }), preventDefault: expect.any(Function) }),
    );
    expect(onGanttContextMenu).toHaveBeenCalledWith(
      expect.objectContaining({ target: expect.objectContaining({ type: 'dependency' }) }),
    );

    fireEvent.pointerEnter(path);
    fireEvent.pointerLeave(path);
    expect(onDependencyHover.mock.calls.map(([d]) => [d.phase, d.target.id])).toEqual([
      ['enter', 'a->b'],
      ['leave', 'a->b'],
    ]);
  });

  it('only the hit strokes take pointer events', () => {
    const { container } = renderChart({ onDependencyClick: vi.fn() });
    expect(screen.getByTestId('dependency-layer').style.pointerEvents).toBe('none');
    expect(hit(container, 'a->b').getAttribute('pointer-events')).toBe('stroke');
    // Hit strokes sit under the bars, inside the bars' SVG.
    const bars = container.querySelector('.rg-timeline-bars')!;
    expect(bars.firstElementChild?.getAttribute('data-testid')).toBe('dependency-hits');
  });
});
