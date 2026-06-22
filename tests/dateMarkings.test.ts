import { describe, it, expect } from 'vitest';
import { computeDateMarkingRects } from '../src/core/dateMarkings';
import { resolveScale } from '../src/core/scale';
import { computeTimelineRange } from '../src/core/zoom';

const scale = resolveScale('day');

describe('computeDateMarkingRects', () => {
  const range = computeTimelineRange(
    [],
    scale,
    2,
    { minDate: '2026-04-01', maxDate: '2026-04-30' },
  );

  it('marks weekends when enabled', () => {
    const { holidays } = computeDateMarkingRects(range, scale, scale.columnWidth, {
      weekends: true,
    });
    expect(holidays.length).toBeGreaterThan(0);
    expect(holidays.every((r) => r.kind === 'holiday')).toBe(true);
    expect(holidays[0].color).toBeUndefined();
  });

  it('marks specific holiday dates', () => {
    const { holidays } = computeDateMarkingRects(range, scale, scale.columnWidth, {
      dates: [{ date: '2026-04-10', label: 'Holiday' }],
    });
    expect(holidays).toHaveLength(1);
    expect(holidays[0].label).toBe('Holiday');
  });

  it('marks block date ranges in rose', () => {
    const { blocks } = computeDateMarkingRects(range, scale, scale.columnWidth, undefined, [
      { start: '2026-04-14', end: '2026-04-16', label: 'Blocked' },
    ]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe('block');
    expect(blocks[0].color).toBeUndefined();
    expect(blocks[0].width).toBeGreaterThan(scale.columnWidth);
  });

  it('passes custom colors through when provided', () => {
    const { holidays, blocks } = computeDateMarkingRects(
      range,
      scale,
      scale.columnWidth,
      { weekends: true, color: '#abcdef' },
      [{ start: '2026-04-14', end: '2026-04-16', color: '#ff00ff' }],
    );
    expect(holidays[0].color).toBe('#abcdef');
    expect(blocks[0].color).toBe('#ff00ff');
  });
});
