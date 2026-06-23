import { describe, it, expect } from 'vitest';
import { stableTimelineRange, stableVisibleColumnRange } from '../src/core/stableValue';
import type { TimelineRange } from '../src/types';
import type { VisibleColumnRange } from '../src/core/visibleColumns';

describe('stableTimelineRange', () => {
  const base: TimelineRange = {
    start: new Date('2026-01-01'),
    end: new Date('2026-01-31'),
    columnCount: 10,
    fixed: true,
  };

  it('returns the previous object when values match', () => {
    const next: TimelineRange = {
      start: new Date('2026-01-01'),
      end: new Date('2026-01-31'),
      columnCount: 10,
      fixed: true,
    };
    expect(stableTimelineRange(next, base)).toBe(base);
  });

  it('returns the next object when values differ', () => {
    const next: TimelineRange = {
      ...base,
      columnCount: 11,
    };
    expect(stableTimelineRange(next, base)).toBe(next);
  });
});

describe('stableVisibleColumnRange', () => {
  const base: VisibleColumnRange = {
    startIndex: 2,
    endIndex: 8,
    startX: 96,
    endX: 432,
  };

  it('returns the previous object when indices match', () => {
    const next: VisibleColumnRange = { ...base };
    expect(stableVisibleColumnRange(next, base)).toBe(base);
  });

  it('returns the next object when indices differ', () => {
    const next: VisibleColumnRange = { ...base, endIndex: 9, endX: 480 };
    expect(stableVisibleColumnRange(next, base)).toBe(next);
  });
});
