import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { GanttChart } from '../src/GanttChart';
import type { CustomRowDefinition } from '../src/types';

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
    const bar = container.querySelector('[data-task-id="t1"]');
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
});
