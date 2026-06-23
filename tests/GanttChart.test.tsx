import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { GanttChart } from '../src/GanttChart';
import type { CustomRowDefinition, GanttTask } from '../src/types';

const sampleTasks = [
  { id: 't1', name: 'Design', start: '2026-01-01', end: '2026-01-15', progress: 40 },
  { id: 't2', name: 'Build', start: '2026-01-10', end: '2026-01-25', progress: 10 },
];

describe('GanttChart', () => {
  it('renders chart with task list and timeline', () => {
    render(<GanttChart tasks={sampleTasks} height={400} />);
    expect(screen.getByTestId('gantt-chart')).toBeTruthy();
    expect(screen.getByTestId('task-list-left')).toBeTruthy();
    expect(screen.getByTestId('timeline-header')).toBeTruthy();
    expect(screen.getByTestId('task-list-left').textContent).toContain('Design');
  });

  it('fires onTaskClick hook', () => {
    const onTaskClick = vi.fn();
    render(<GanttChart tasks={sampleTasks} onTaskClick={onTaskClick} height={400} />);
    const list = screen.getByTestId('task-list-left');
    fireEvent.click(within(list).getByText('Design'));
    expect(onTaskClick).toHaveBeenCalledWith(
      expect.objectContaining({ task: expect.objectContaining({ id: 't1' }) }),
    );
  });

  it('fires onSidebarLayoutChange with three panel positions', () => {
    const onSidebarLayoutChange = vi.fn();
    render(
      <GanttChart
        tasks={sampleTasks}
        height={400}
        defaultLeftWidth={200}
        defaultMiddleWidth={150}
        onSidebarLayoutChange={onSidebarLayoutChange}
      />,
    );
    expect(onSidebarLayoutChange).toHaveBeenCalled();
    const layout = onSidebarLayoutChange.mock.calls.at(-1)?.[0];
    expect(layout).toMatchObject({
      leftWidth: 200,
      middleWidth: 150,
      timelineLeft: 350,
    });
  });

  it('renders custom async rows', async () => {
    const customRows: CustomRowDefinition[] = [
      {
        id: 'footer-1',
        cells: {
          name: async () => 'Async Name',
          __timeline__: async () => 'Timeline cell',
        },
      },
    ];
    render(<GanttChart tasks={sampleTasks} customRows={customRows} height={400} />);
    await waitFor(() => {
      expect(screen.getByText('Async Name')).toBeTruthy();
    });
  });

  it('applies optional per-row height on custom rows', async () => {
    const customRows: CustomRowDefinition[] = [
      {
        id: 'short-row',
        height: 20,
        cells: {
          name: () => 'Short row',
          __timeline__: () => null,
        },
      },
      {
        id: 'tall-row',
        height: 60,
        cells: {
          name: () => 'Tall row',
          __timeline__: () => null,
        },
      },
    ];
    const { container } = render(
      <GanttChart tasks={sampleTasks} customRows={customRows} height={400} />,
    );
    await waitFor(() => {
      expect(screen.getByText('Short row')).toBeTruthy();
    });
    const shortRow = container.querySelector('[data-row-id="short-row"]');
    const tallRow = container.querySelector('[data-row-id="tall-row"]');
    expect(shortRow?.getAttribute('style')).toContain('height: 20px');
    expect(tallRow?.getAttribute('style')).toContain('height: 60px');
  });

  it('exposes zoom toolbar', () => {
    render(<GanttChart tasks={sampleTasks} zoomLevel="week" height={400} />);
    expect(screen.getByTestId('zoom-toolbar')).toBeTruthy();
    expect(screen.getByText('Week')).toBeTruthy();
  });

  it('fires onGanttClick for task bar clicks', () => {
    const onGanttClick = vi.fn();
    const { container } = render(
      <GanttChart tasks={sampleTasks} onGanttClick={onGanttClick} height={400} />,
    );
    const bar = container.querySelector('[data-task-id="t1"] .rg-bar-bg');
    expect(bar).toBeTruthy();
    fireEvent.click(bar!);
    expect(onGanttClick).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          type: 'task',
          element: 'bar',
          task: expect.objectContaining({ id: 't1' }),
        }),
      }),
    );
  });

  it('fires onGanttContextMenu for blocked dates', () => {
    const onGanttContextMenu = vi.fn();
    const { container } = render(
      <GanttChart
        tasks={sampleTasks}
        minDate="2026-01-01"
        maxDate="2026-01-31"
        blockDates={[{ start: '2026-01-05', end: '2026-01-07', label: 'Blocked' }]}
        onGanttContextMenu={onGanttContextMenu}
        height={400}
      />,
    );
    const hit = container.querySelector('[data-testid="date-marking-hit-block"]');
    expect(hit).toBeTruthy();
    fireEvent.contextMenu(hit!);
    expect(onGanttContextMenu).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          type: 'blockDate',
          range: expect.objectContaining({ label: 'Blocked' }),
        }),
      }),
    );
  });

  it('fires onGanttClick for empty timeline area', () => {
    const onGanttClick = vi.fn();
    const { container } = render(
      <GanttChart
        tasks={sampleTasks}
        minDate="2026-01-01"
        maxDate="2026-01-31"
        onGanttClick={onGanttClick}
        height={400}
      />,
    );
    const hit = container.querySelector('[data-testid="timeline-hit-layer"] .rg-timeline-hit-rect');
    expect(hit).toBeTruthy();
    fireEvent.click(hit!);
    expect(onGanttClick).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ type: 'timeline' }),
      }),
    );
  });

  it('supports ctrl/meta multi-select with modifier keys on taskClick', () => {
    const onSelectionChange = vi.fn();
    render(
      <GanttChart
        tasks={sampleTasks}
        height={400}
        onSelectionChange={onSelectionChange}
      />,
    );
    const list = screen.getByTestId('task-list-left');
    fireEvent.click(within(list).getByText('Design'));
    fireEvent.click(within(list).getByText('Build'), { ctrlKey: true });
    expect(onSelectionChange).toHaveBeenLastCalledWith({
      selectedIds: ['t1', 't2'],
    });
    fireEvent.click(within(list).getByText('Design'), { metaKey: true });
    expect(onSelectionChange).toHaveBeenLastCalledWith({
      selectedIds: ['t2'],
    });
  });

  it('exposes data-task-id on sidebar rows', () => {
    const { container } = render(<GanttChart tasks={sampleTasks} height={400} />);
    const list = screen.getByTestId('task-list-left');
    const row = within(list).getByText('Design').closest('[data-task-id="t1"]');
    expect(row).toBeTruthy();
    expect(container.querySelector('[data-testid="task-list-middle"] [data-task-id="t1"]')).toBeTruthy();
  });

  it('fires onGanttHover for blocked date regions', () => {
    const onGanttHover = vi.fn();
    const { container } = render(
      <GanttChart
        tasks={sampleTasks}
        minDate="2026-01-01"
        maxDate="2026-01-31"
        blockDates={[{ start: '2026-01-05', end: '2026-01-07', label: 'Blocked' }]}
        onGanttHover={onGanttHover}
        height={400}
      />,
    );
    const hit = container.querySelector('[data-testid="date-marking-hit-block"]');
    expect(hit).toBeTruthy();
    fireEvent.mouseEnter(hit!);
    expect(onGanttHover).toHaveBeenCalledWith(
      expect.objectContaining({
        phase: 'enter',
        target: expect.objectContaining({
          type: 'blockDate',
          range: expect.objectContaining({ label: 'Blocked' }),
        }),
      }),
    );
    fireEvent.mouseLeave(hit!);
    expect(onGanttHover).toHaveBeenCalledWith(
      expect.objectContaining({ phase: 'leave' }),
    );
  });

  it('hides child bars when parent is a summary group', () => {
    const groupTasks = [
      { id: 'g1', name: 'Phase', start: '2026-01-01', end: '2026-01-01', type: 'group' as const },
      { id: 'c1', name: 'Child', start: '2026-01-05', end: '2026-01-10', parentId: 'g1' },
    ];
    const { container } = render(
      <GanttChart tasks={groupTasks} minDate="2026-01-01" maxDate="2026-01-31" height={400} />,
    );
    expect(container.querySelector('.rg-timeline-bars [data-task-id="g1"]')).toBeTruthy();
    expect(container.querySelector('.rg-timeline-bars [data-task-id="c1"]')).toBeNull();
  });

  it('collapses and expands group children from sidebar toggle', () => {
    const groupTasks: GanttTask[] = [
      { id: 'g1', name: 'Phase', type: 'group', start: '2026-01-01', end: '2026-01-30' },
      { id: 'c1', name: 'Child', start: '2026-01-05', end: '2026-01-10', parentId: 'g1' },
    ];
    function Harness() {
      const [tasks, setTasks] = useState(groupTasks);
      return (
        <GanttChart
          tasks={tasks}
          onTasksChange={setTasks}
          minDate="2026-01-01"
          maxDate="2026-01-31"
          height={400}
        />
      );
    }
    render(<Harness />);
    const list = screen.getByTestId('task-list-left');
    expect(within(list).getByText('Child')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse group' }));
    expect(within(list).queryByText('Child')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Expand group' }));
    expect(within(list).getByText('Child')).toBeTruthy();
  });

  it('does not update read-only tasks on drag end', () => {
    const onTasksChange = vi.fn();
    const tasks = [
      {
        id: 'done',
        name: 'Done',
        start: '2026-01-05',
        end: '2026-01-10',
        readOnly: true,
      },
    ];
    const { container } = render(
      <GanttChart
        tasks={tasks}
        minDate="2026-01-01"
        maxDate="2026-01-31"
        onTasksChange={onTasksChange}
        height={400}
      />,
    );
    const bar = container.querySelector('[data-task-id="done"] .rg-bar-bg');
    expect(bar).toBeTruthy();
    fireEvent.pointerDown(bar!, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(document, { clientX: 200, pointerId: 1 });
    fireEvent.pointerUp(document, { clientX: 200, pointerId: 1 });
    expect(onTasksChange).not.toHaveBeenCalled();
  });

  it('does not re-run custom row generators when tasks update within a fixed range', async () => {
    const sidebarGen = vi.fn(async () => 'Sidebar stable');
    const timelineGen = vi.fn(async () => 'Timeline stable');
    const customRows: CustomRowDefinition[] = [
      {
        id: 'stable-row',
        cells: {
          name: sidebarGen,
          __timeline__: timelineGen,
        },
      },
    ];
    const dragTasks = [
      { id: 't1', name: 'Drag me', start: '2026-01-01', end: '2026-01-10', progress: 0 },
      { id: 't2', name: 'Other', start: '2026-01-15', end: '2026-01-20', progress: 0 },
    ];

    const { rerender } = render(
      <GanttChart
        tasks={dragTasks}
        minDate="2026-01-01"
        maxDate="2026-01-31"
        customRows={customRows}
        height={400}
      />,
    );

    await waitFor(() => {
      expect(sidebarGen).toHaveBeenCalledTimes(1);
      expect(timelineGen).toHaveBeenCalledTimes(1);
    });

    const updatedTasks = dragTasks.map((task) =>
      task.id === 't1'
        ? { ...task, start: '2026-01-03', end: '2026-01-12' }
        : task,
    );

    rerender(
      <GanttChart
        tasks={updatedTasks}
        minDate="2026-01-01"
        maxDate="2026-01-31"
        customRows={customRows}
        height={400}
      />,
    );

    expect(sidebarGen).toHaveBeenCalledTimes(1);
    expect(timelineGen).toHaveBeenCalledTimes(1);
  });
});
