import { afterAll, beforeAll, describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GanttChart } from '../src/GanttChart';
import type { GanttController, GanttTask } from '../src/types';

const tasks: GanttTask[] = [
  {
    id: 'a',
    name: 'Pour footings',
    start: '2026-01-05',
    end: '2026-01-09',
    avatar: { label: 'AK', color: '#2563eb', title: 'Amjed' },
    labelPlacement: 'inside',
  },
  { id: 'b', name: 'Unscheduled', start: '2026-01-05', end: '2026-01-06', drawable: true },
];

// jsdom lays nothing out: give the timeline a viewport so its columns are drawn.
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 1200 });
});
afterAll(() => {
  delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
});

describe('ClickUp-style additions', () => {
  it('hides the toolbar row and floats the zoom buttons on request', () => {
    const { container } = render(<GanttChart tasks={tasks} height={300} zoomControls="floating" />);
    expect(container.querySelector('.rg-gantt-toolbar-row')).toBeNull();
    expect(container.querySelector('.rg-zoom-floating [aria-label="Zoom in"]')).toBeTruthy();
  });

  it('draws the header from the host formatters', () => {
    render(
      <GanttChart
        tasks={tasks}
        height={300}
        zoomLevel="day"
        formatHeaderUpper={() => 'ONE BAND'}
        formatHeaderLower={(date) => <span data-testid="lower">{date.getDate()}</span>}
      />,
    );
    expect(screen.getAllByText('ONE BAND').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('lower').length).toBeGreaterThan(0);
  });

  it('hatches holidays with a date to select them by', () => {
    const { container } = render(
      <GanttChart
        tasks={tasks}
        height={300}
        zoomLevel="day"
        holidays={{ dates: ['2026-01-06'] }}
        hatchHolidays
      />,
    );
    const marking = container.querySelector('[data-testid="date-marking-holiday"]');
    expect(marking?.getAttribute('data-date')).toBe('2026-01-06');
    expect(marking?.getAttribute('data-hatched')).toBe('true');
    expect(container.querySelector('.rg-date-marking-hatch')).toBeTruthy();
  });

  it('puts an avatar on a bar and its title inside', () => {
    const { container } = render(<GanttChart tasks={tasks} height={300} zoomLevel="day" />);
    expect(container.querySelector('[data-testid="bar-avatar"]')?.textContent).toContain('AK');
    expect(container.querySelector('.rg-bar-label--inside')?.textContent).toBe('Pour footings');
  });

  it('hands the host a controller', () => {
    const ref = createRef<GanttController>();
    render(<GanttChart tasks={tasks} height={300} controllerRef={ref} />);
    expect(typeof ref.current?.scrollToDate).toBe('function');
    expect(typeof ref.current?.scrollToTask).toBe('function');
  });

  it('reports a span drawn across a drawable row', () => {
    const onTaskDraw = vi.fn();
    const { container } = render(
      <GanttChart tasks={tasks} height={300} zoomLevel="day" onTaskDraw={onTaskDraw} />,
    );
    const svg = container.querySelector('.rg-timeline-bars') as SVGSVGElement;
    svg.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 4000, height: 72, right: 4000, bottom: 72, x: 0, y: 0 }) as DOMRect;
    const surface = container.querySelector('.rg-draw-surface') as Element;
    // Row 1 (the second) starts at y = 36 with the default row height.
    fireEvent.pointerDown(surface, { clientX: 480, clientY: 50, button: 0 });
    fireEvent(document, new PointerEvent('pointermove', { clientX: 700, clientY: 50 }));
    fireEvent(document, new PointerEvent('pointerup', { clientX: 700, clientY: 50 }));
    expect(onTaskDraw).toHaveBeenCalledTimes(1);
    const detail = onTaskDraw.mock.calls[0]![0];
    expect(detail.task.id).toBe('b');
    expect(detail.end.getTime()).toBeGreaterThan(detail.start.getTime());
  });
});
