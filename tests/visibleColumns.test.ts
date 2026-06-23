import { describe, it, expect } from 'vitest';
import { addScaleSteps } from '../src/core/scale';
import { resolveScale } from '../src/core/scale';
import { computeTimelineRange } from '../src/core/zoom';
import {
  buildUpperHeaderBandsForVisibleRange,
  computeBufferedColumnIndices,
  filterRectsInXRange,
  getViewportColumnRange,
  getVisibleColumnRange,
  getVisibleVerticalLines,
  maintainBufferedColumnRange,
} from '../src/core/visibleColumns';
import type { DateMarkingRect } from '../src/types';

describe('getViewportColumnRange', () => {
  it('returns tight viewport indices without buffer', () => {
    const range = getViewportColumnRange(480, 400, 48, 100);
    expect(range.startIndex).toBe(10);
    expect(range.endIndex).toBe(18);
  });
});

describe('computeBufferedColumnIndices', () => {
  it('adds 10% viewport buffer on each side', () => {
    const { startIndex, endIndex } = computeBufferedColumnIndices(480, 400, 48, 100, 10);
    expect(startIndex).toBe(9);
    expect(endIndex).toBe(19);
  });
});

describe('maintainBufferedColumnRange', () => {
  it('returns the same object while scrolling inside the buffer', () => {
    const first = maintainBufferedColumnRange(480, 400, 48, 100, 10, null);
    const second = maintainBufferedColumnRange(500, 400, 48, 100, 10, first);
    expect(second).toBe(first);
    expect(second.startIndex).toBe(first.startIndex);
    expect(second.endIndex).toBe(first.endIndex);
  });

  it('extends the end when scrolling right past the buffer edge', () => {
    const first = maintainBufferedColumnRange(0, 400, 48, 100, 10, null);
    const second = maintainBufferedColumnRange(48 * 12, 400, 48, 100, 10, first);
    expect(second.endIndex).toBeGreaterThan(first.endIndex);
  });

  it('eventually releases columns that leave the buffer', () => {
    let current = maintainBufferedColumnRange(0, 400, 48, 100, 10, null);
    current = maintainBufferedColumnRange(48 * 20, 400, 48, 100, 10, current);
    expect(current.startIndex).toBeGreaterThan(0);
  });
});

describe('getVisibleColumnRange', () => {
  it('returns empty range when columnCount is zero', () => {
    expect(getVisibleColumnRange(0, 800, 48, 0)).toEqual({
      startIndex: 0,
      endIndex: -1,
      startX: 0,
      endX: 0,
    });
  });

  it('computes visible indices with column overscan', () => {
    const range = getVisibleColumnRange(480, 400, 48, 100, 2);
    expect(range.startIndex).toBe(8);
    expect(range.endIndex).toBe(20);
    expect(range.startX).toBe(8 * 48);
    expect(range.endX).toBe(21 * 48);
  });

  it('clamps to column bounds', () => {
    const range = getVisibleColumnRange(0, 200, 48, 5, 2);
    expect(range.startIndex).toBe(0);
    expect(range.endIndex).toBe(4);
  });
});

describe('filterRectsInXRange', () => {
  const rects: DateMarkingRect[] = [
    { key: 'a', x: 0, width: 48, kind: 'holiday' },
    { key: 'b', x: 200, width: 48, kind: 'holiday' },
    { key: 'c', x: 500, width: 48, kind: 'block' },
  ];

  it('keeps rects overlapping the range', () => {
    const filtered = filterRectsInXRange(rects, 180, 260);
    expect(filtered.map((r) => r.key)).toEqual(['b']);
  });

  it('returns empty when range is invalid', () => {
    expect(filterRectsInXRange(rects, 100, 100)).toEqual([]);
  });
});

describe('getVisibleVerticalLines', () => {
  it('returns grid lines for visible columns plus trailing edge when near end', () => {
    const visible = { startIndex: 2, endIndex: 4, startX: 96, endX: 240 };
    const lines = getVisibleVerticalLines(visible, 48, 480);
    expect(lines).toEqual([96, 144, 192, 240]);
  });
});

describe('buildUpperHeaderBandsForVisibleRange', () => {
  it('extends the first band backward to the label boundary', () => {
    const tasks = [{ id: 't1', name: 'A', start: '2026-01-01', end: '2026-03-31' }];
    const scale = resolveScale('week');
    const range = computeTimelineRange(tasks, scale);
    const columnWidth = 48;
    const visible = getViewportColumnRange(48 * 10, 400, columnWidth, range.columnCount);

    const bands = buildUpperHeaderBandsForVisibleRange(range, scale, columnWidth, visible);
    expect(bands.length).toBeGreaterThan(0);
    expect(bands[0].x).toBeLessThanOrEqual(visible.startX);
  });

  it('matches full-range bands for the same column window', async () => {
    const { buildUpperHeaderBands } = await import('../src/components/Timeline/TimelineHeader');
    const tasks = [{ id: 't1', name: 'A', start: '2026-01-01', end: '2026-02-28' }];
    const scale = resolveScale('day');
    const range = computeTimelineRange(tasks, scale);
    const columnWidth = 48;
    const visible = getViewportColumnRange(0, columnWidth * 20, columnWidth, range.columnCount);

    const columns = [];
    for (let i = visible.startIndex; i <= visible.endIndex; i++) {
      columns.push({ date: addScaleSteps(range.start, i, scale), x: i * columnWidth });
    }

    const fullSlice = buildUpperHeaderBands(columns, scale, columnWidth);
    const virtualized = buildUpperHeaderBandsForVisibleRange(
      range,
      scale,
      columnWidth,
      visible,
    );

    expect(virtualized).toEqual(fullSlice);
  });
});
