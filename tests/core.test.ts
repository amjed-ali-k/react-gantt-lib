import { describe, it, expect } from 'vitest';
import {
  toDate,
  startOfUnit,
  addUnit,
  diffUnits,
  formatHeader,
  formatTaskDateTime,
} from '../src/core/dates';
import {
  computeTimelineRange,
  computeBarXExact,
  computeBarWidthExact,
  pixelDeltaToDates,
  getMsPerPixel,
  clampTaskDates,
  resolveTasks,
  nextZoomLevel,
  getColumnWidth,
  resolveTimelineWidth,
  dateToScalePixel,
  scalePixelToDate,
} from '../src/core/zoom';
import { formatScaleHeader, formatScaleSubHeader, resolveScale } from '../src/core/scale';
import { formatDisplayDate } from '../src/core/displayFormat';
import { TaskStore } from '../src/hooks/useTaskStore';

describe('dates', () => {
  it('parses ISO dates', () => {
    const d = toDate('2026-01-15');
    expect(d.getFullYear()).toBe(2026);
  });

  it('diffUnits for days', () => {
    const a = toDate('2026-01-01');
    const b = toDate('2026-01-05');
    expect(diffUnits(b, a, 'day')).toBe(4);
  });

  it('addUnit months', () => {
    const d = toDate('2026-01-15');
    const next = addUnit(d, 1, 'month');
    expect(next.getMonth()).toBe(1);
  });

  it('formatHeader per zoom', () => {
    const d = toDate('2026-06-15T14:30:00');
    expect(formatHeader(d, 'month')).toContain('Jun');
  });

  it('formatTaskDateTime omits time at midnight', () => {
    expect(formatTaskDateTime('2026-04-01')).toBe('Apr 1, 2026');
  });

  it('formatTaskDateTime includes time when set', () => {
    expect(formatTaskDateTime('2026-04-22T14:00:00')).toBe('Apr 22, 2026 14:00');
  });

  it('formatTaskDateTime respects display timezone', () => {
    expect(formatTaskDateTime('2026-04-22T18:00:00Z', 'America/New_York')).toBe('Apr 22, 2026 14:00');
  });

  it('formatTaskDateTime omits time at midnight in display timezone', () => {
    expect(formatTaskDateTime('2026-04-01T04:00:00Z', 'America/New_York')).toBe('Apr 1, 2026');
  });
});

describe('zoom', () => {
  const tasks = [
    { id: '1', name: 'A', start: '2026-01-01', end: '2026-01-10' },
    { id: '2', name: 'B', start: '2026-01-05', end: '2026-01-20' },
  ];

  it('computes timeline range with padding', () => {
    const range = computeTimelineRange(tasks, 'day');
    expect(range.columnCount).toBeGreaterThan(10);
    expect(range.start <= toDate('2026-01-01')).toBe(true);
  });

  it('computes bar geometry', () => {
    const range = computeTimelineRange(tasks, 'day');
    const cw = getColumnWidth('day');
    const x = computeBarXExact(toDate('2026-01-01'), range.start, 'day', cw);
    expect(x).toBeGreaterThanOrEqual(0);
    const w = computeBarWidthExact(toDate('2026-01-01'), toDate('2026-01-05'), 'day', cw);
    expect(w).toBeGreaterThan(0);
  });

  it('resolves task hierarchy visibility', () => {
    const hierarchical = [
      { id: 'p', name: 'Parent', start: '2026-01-01', end: '2026-01-30', collapsed: true },
      { id: 'c', name: 'Child', start: '2026-01-02', end: '2026-01-10', parentId: 'p' },
    ];
    const resolved = resolveTasks(hierarchical);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].id).toBe('p');
  });

  it('nextZoomLevel steps through levels', () => {
    expect(nextZoomLevel('week', 'in')).toBe('day');
    expect(nextZoomLevel('week', 'out')).toBe('month');
  });

  it('pixel width for day range matches end of maxDate not extra columns', () => {
    const range = computeTimelineRange([], 'day', 2, {
      minDate: '2026-04-01',
      maxDate: '2026-04-30',
    });
    const cw = getColumnWidth('day');
    expect(resolveTimelineWidth(range, cw)).toBe(range.pixelWidth);
    expect(range.pixelWidth).toBeLessThanOrEqual(range.columnCount * cw);
  });

  it('uses one column per calendar month for fixed month ranges', () => {
    const range = computeTimelineRange([], 'month', 2, {
      minDate: '2026-01-01',
      maxDate: '2026-12-31',
    });
    const cw = getColumnWidth('month');
    expect(range.fixed).toBe(true);
    expect(range.columnCount).toBe(12);
    expect(resolveTimelineWidth(range, cw)).toBe(12 * cw);
  });

  it('maps month pixels by calendar month boundaries', () => {
    const scale = resolveScale('month');
    const cw = getColumnWidth(scale);
    const start = toDate('2026-01-01');
    expect(dateToScalePixel(toDate('2026-02-01'), start, scale, cw)).toBe(cw);
    expect(dateToScalePixel(toDate('2026-03-01'), start, scale, cw)).toBe(cw * 2);

    const roundTrip = scalePixelToDate(cw * 2, start, scale, cw);
    expect(roundTrip).toEqual(toDate('2026-03-01'));
  });

  it('measures month bar width on the same chart grid as bar x', () => {
    const scale = resolveScale('month');
    const cw = getColumnWidth(scale);
    const rangeStart = toDate('2026-01-01');
    const start = toDate('2026-01-15');
    const end = toDate('2026-02-15');
    const x = computeBarXExact(start, rangeStart, scale, cw);
    const width = computeBarWidthExact(start, end, scale, cw, rangeStart);
    const endX = computeBarXExact(end, rangeStart, scale, cw);
    expect(x + width).toBeCloseTo(endX, 6);
  });

  it('supports custom 2-day scale', () => {
    const range = computeTimelineRange(tasks, '2day', 2, {
      minDate: '2026-01-01',
      maxDate: '2026-01-31',
    });
    expect(range.fixed).toBe(true);
    expect(range.columnCount).toBeGreaterThan(10);
  });

  it('pixelDeltaToDates moves smoothly by pixels', () => {
    const start = toDate('2026-01-01');
    const end = toDate('2026-01-05');
    const msPerPixel = getMsPerPixel('day', 48);
    const moved = pixelDeltaToDates('move', start, end, 48, msPerPixel);
    expect(moved.start.getTime()).toBeGreaterThan(start.getTime());
    expect(moved.end.getTime() - moved.start.getTime()).toBe(end.getTime() - start.getTime());
  });

  it('uses fixed bounds when minDate and maxDate are set', () => {
    const tasks = [
      { id: '1', name: 'A', start: '2026-06-01', end: '2026-06-10' },
    ];
    const range = computeTimelineRange(tasks, 'week', 2, {
      minDate: '2026-01-01',
      maxDate: '2026-03-01',
    });
    expect(range.fixed).toBe(true);
    expect(range.start).toEqual(startOfUnit(toDate('2026-01-01'), 'week'));
    expect(range.pixelWidth).toBeDefined();
    expect(range.pixelWidth!).toBeLessThanOrEqual(range.columnCount * getColumnWidth('week'));
    // dragging task outside does not change column count
    const range2 = computeTimelineRange(
      [{ id: '1', name: 'A', start: '2027-01-01', end: '2027-06-10' }],
      'week',
      2,
      { minDate: '2026-01-01', maxDate: '2026-03-01' },
    );
    expect(range2.columnCount).toBe(range.columnCount);
  });

  it('clampTaskDates keeps move inside bounds', () => {
    const bounds = { min: toDate('2026-01-01'), max: toDate('2026-01-31') };
    const clamped = clampTaskDates(toDate('2026-02-05'), toDate('2026-02-08'), bounds, 'move');
    expect(clamped.end.getTime()).toBeLessThanOrEqual(bounds.max.getTime());
  });
});

describe('buildUpperHeaderBands', () => {
  it('does not shift calendar month headers when display timezone is behind browser timezone', () => {
    const scale = resolveScale('month');
    const jan = new Date(2024, 0, 1);
    expect(formatScaleHeader(jan, scale, 'America/New_York')).toBe('Jan 2024');
    expect(formatScaleSubHeader(jan, scale, 'America/New_York')).toBe('2024');
  });

  it('does not shift day headers for calendar grid dates with display timezone', () => {
    const scale = resolveScale('day');
    const jan = new Date(2024, 0, 1);
    expect(formatScaleHeader(jan, scale, 'America/New_York')).toBe('1');
    expect(formatScaleSubHeader(jan, scale, 'America/New_York')).toBe('January 2024');
  });

  it('keeps timezone conversion for hour scale labels', () => {
    const scale = resolveScale('1hour');
    expect(formatScaleHeader(new Date('2026-06-23T13:00:00Z'), scale, 'America/New_York')).toBe(
      '09:00',
    );
  });

  it('does not shift local date-only sidebar values when display timezone is set', () => {
    expect(formatDisplayDate(new Date(2024, 0, 1), 'America/New_York')).toBe('1/1/2024');
  });

  it('spans month label across all week columns in that month', async () => {
    const { buildUpperHeaderBands } = await import('../src/components/Timeline/TimelineHeader');
    const columnWidth = 140;
    const columns = Array.from({ length: 4 }, (_, i) => ({
      date: addUnit(toDate('2026-01-05'), i, 'week'),
      x: i * columnWidth,
    }));
    const bands = buildUpperHeaderBands(columns, resolveScale('week'), columnWidth);
    expect(bands).toHaveLength(1);
    expect(bands[0].label).toContain('January');
    expect(bands[0].width).toBe(4 * columnWidth);
  });

  it('splits bands when month changes', async () => {
    const { buildUpperHeaderBands } = await import('../src/components/Timeline/TimelineHeader');
    const columnWidth = 48;
    const columns = [
      { date: toDate('2026-01-30'), x: 0 },
      { date: toDate('2026-01-31'), x: columnWidth },
      { date: toDate('2026-02-01'), x: columnWidth * 2 },
      { date: toDate('2026-02-02'), x: columnWidth * 3 },
    ];
    const bands = buildUpperHeaderBands(columns, resolveScale('day'), columnWidth);
    expect(bands).toHaveLength(2);
    expect(bands[0].width).toBe(columnWidth * 2);
    expect(bands[1].width).toBe(columnWidth * 2);
  });
});

describe('TaskStore granular updates', () => {
  it('bumps only changed task version', () => {
    const store = new TaskStore([
      { id: 'a', name: 'A', start: '2026-01-01', end: '2026-01-05' },
      { id: 'b', name: 'B', start: '2026-01-02', end: '2026-01-06' },
    ]);
    const vBeforeA = store.getTaskVersion('a');
    const vBeforeB = store.getTaskVersion('b');
    store.updateTask('a', { name: 'A2' });
    expect(store.getTaskVersion('a')).toBe(vBeforeA + 1);
    expect(store.getTaskVersion('b')).toBe(vBeforeB);
  });
});

describe('startOfUnit', () => {
  it('aligns to week start (Monday)', () => {
    const wed = toDate('2026-06-17');
    const weekStart = startOfUnit(wed, 'week');
    expect(weekStart.getDay()).toBe(1);
  });
});
