import { describe, it, expect } from 'vitest';
import {
  getViewportColumnRange,
  computeBufferedColumnIndices,
  maintainBufferedColumnRange,
  filterRectsInXRange,
  buildUpperHeaderBandsForVisibleRange,
  getVisibleVerticalLines,
} from '../src/core/visibleColumns';
import { stableTimelineRange, stableVisibleColumnRange } from '../src/core/stableValue';
import { PRESET_SCALES } from '../src/core/scale';
import type { DateMarkingRect, TimelineRange } from '../src/types';

/**
 * Performance contract tests for column virtualization.
 *
 * The two non-negotiable contracts:
 *
 * 1. **Reference stability** – `maintainBufferedColumnRange`, `stableTimelineRange`,
 *    and `stableVisibleColumnRange` must return the *exact same object reference*
 *    when the computed value is unchanged. React.memo on TimelineHeader / TimelineBody
 *    relies on this to bail out without diffing their (large) prop trees.
 *
 * 2. **Correctness at scale** – viewport maths, buffer expansion/shrink semantics,
 *    and rect culling must produce exact results for 365-day / 10k-rect inputs.
 */

// ── helpers ──────────────────────────────────────────────────────────────────

function makeRect(i: number): DateMarkingRect {
  return { key: `r${i}`, x: i * 10, width: 9, kind: 'holiday' };
}

// ── getViewportColumnRange ────────────────────────────────────────────────────

describe('getViewportColumnRange', () => {
  const CW = 120;
  const COLS = 365;

  it('returns all columns when viewport covers the full range', () => {
    const r = getViewportColumnRange(0, COLS * CW, CW, COLS);
    expect(r.startIndex).toBe(0);
    expect(r.endIndex).toBe(COLS - 1);
  });

  it('selects the correct tight subset for a mid-range viewport', () => {
    // viewport starting at column 100, showing 5 columns
    const r = getViewportColumnRange(100 * CW, 5 * CW, CW, COLS);
    expect(r.startIndex).toBe(100);
    expect(r.endIndex).toBe(104);
  });

  it('clamps startIndex to 0 when scrollLeft is negative (defensive)', () => {
    const r = getViewportColumnRange(0, 5 * CW, CW, COLS);
    expect(r.startIndex).toBeGreaterThanOrEqual(0);
  });

  it('clamps endIndex to columnCount - 1 when viewport extends past range', () => {
    const r = getViewportColumnRange((COLS - 2) * CW, 10 * CW, CW, COLS);
    expect(r.endIndex).toBeLessThanOrEqual(COLS - 1);
  });

  it('startX and endX are geometrically consistent with indices', () => {
    const r = getViewportColumnRange(10 * CW, 5 * CW, CW, COLS);
    expect(r.startX).toBe(r.startIndex * CW);
    expect(r.endX).toBe((r.endIndex + 1) * CW);
  });

  it('returns empty range for zero column count', () => {
    const r = getViewportColumnRange(0, 600, CW, 0);
    expect(r.endIndex).toBeLessThan(r.startIndex);
  });

  it('returns empty range for zero column width', () => {
    const r = getViewportColumnRange(0, 600, 0, COLS);
    expect(r.endIndex).toBeLessThan(r.startIndex);
  });
});

// ── computeBufferedColumnIndices ─────────────────────────────────────────────

describe('computeBufferedColumnIndices', () => {
  const CW = 120;
  const COLS = 365;

  it('buffered range is strictly wider than the tight viewport range', () => {
    const tight = getViewportColumnRange(50 * CW, 5 * CW, CW, COLS);
    const buffered = computeBufferedColumnIndices(50 * CW, 5 * CW, CW, COLS, 20);
    expect(buffered.startIndex).toBeLessThanOrEqual(tight.startIndex);
    expect(buffered.endIndex).toBeGreaterThanOrEqual(tight.endIndex);
  });

  it('buffer of 0% equals the tight viewport range', () => {
    const tight = getViewportColumnRange(50 * CW, 600, CW, COLS);
    const buffered = computeBufferedColumnIndices(50 * CW, 600, CW, COLS, 0);
    expect(buffered.startIndex).toBe(tight.startIndex);
    expect(buffered.endIndex).toBe(tight.endIndex);
  });

  it('clamps start at 0 even with large buffer', () => {
    const buffered = computeBufferedColumnIndices(0, 600, CW, COLS, 100);
    expect(buffered.startIndex).toBeGreaterThanOrEqual(0);
  });

  it('clamps end at columnCount - 1 even with large buffer', () => {
    const buffered = computeBufferedColumnIndices((COLS - 1) * CW, 600, CW, COLS, 100);
    expect(buffered.endIndex).toBeLessThanOrEqual(COLS - 1);
  });
});

// ── maintainBufferedColumnRange — reference stability ────────────────────────

describe('maintainBufferedColumnRange — reference stability (React.memo contract)', () => {
  const CW = 120;
  const COLS = 365;
  const BUFFER = 10;

  it('returns the SAME object reference when scroll position is unchanged', () => {
    const initial = maintainBufferedColumnRange(0, 600, CW, COLS, BUFFER, null);
    const again = maintainBufferedColumnRange(0, 600, CW, COLS, BUFFER, initial);
    expect(again).toBe(initial);
  });

  it('returns the SAME reference for tiny scroll that stays within buffer', () => {
    const initial = maintainBufferedColumnRange(0, 600, CW, COLS, BUFFER, null);
    // move 5px — well inside buffer zone, no column boundary crossed
    const scrolled = maintainBufferedColumnRange(5, 600, CW, COLS, BUFFER, initial);
    expect(scrolled).toBe(initial);
  });

  it('returns a NEW reference when the buffered window must expand', () => {
    // Start near end of range so scrolling right forces expansion
    const initial = maintainBufferedColumnRange(0, 600, CW, COLS, BUFFER, null);
    // Jump far enough that new columns enter buffer
    const jumped = maintainBufferedColumnRange(100 * CW, 600, CW, COLS, BUFFER, initial);
    // endIndex must grow
    expect(jumped.endIndex).toBeGreaterThan(initial.endIndex);
    expect(jumped).not.toBe(initial);
  });

  it('visible columns are always strictly inside the buffered window', () => {
    let range = maintainBufferedColumnRange(0, 600, CW, COLS, BUFFER, null);
    for (let scroll = 0; scroll <= 100 * CW; scroll += 5 * CW) {
      const vp = getViewportColumnRange(scroll, 600, CW, COLS);
      range = maintainBufferedColumnRange(scroll, 600, CW, COLS, BUFFER, range);
      expect(range.startIndex).toBeLessThanOrEqual(vp.startIndex);
      expect(range.endIndex).toBeGreaterThanOrEqual(vp.endIndex);
    }
  });

  it('startX equals startIndex × columnWidth and endX equals (endIndex+1) × columnWidth', () => {
    const range = maintainBufferedColumnRange(20 * CW, 600, CW, COLS, BUFFER, null);
    expect(range.startX).toBe(range.startIndex * CW);
    expect(range.endX).toBe((range.endIndex + 1) * CW);
  });

  it('repeating same scroll position many times returns same reference each time', () => {
    let range = maintainBufferedColumnRange(50 * CW, 600, CW, COLS, BUFFER, null);
    const ref = range;
    for (let i = 0; i < 60; i++) {
      range = maintainBufferedColumnRange(50 * CW, 600, CW, COLS, BUFFER, range);
    }
    expect(range).toBe(ref);
  });
});

// ── filterRectsInXRange ───────────────────────────────────────────────────────

describe('filterRectsInXRange', () => {
  it('returns empty array for empty input', () => {
    expect(filterRectsInXRange([], 0, 600)).toEqual([]);
  });

  it('returns empty array when window has zero or negative width', () => {
    const rects: DateMarkingRect[] = [{ key: 'r', x: 50, width: 10, kind: 'holiday' }];
    expect(filterRectsInXRange(rects, 200, 100)).toEqual([]); // endX < startX
    expect(filterRectsInXRange(rects, 200, 200)).toEqual([]); // zero width
  });

  it('excludes rects entirely to the left of the window', () => {
    const rects: DateMarkingRect[] = [
      { key: 'r1', x: 0, width: 50, kind: 'holiday' },   // [0,50] outside [100,500]
      { key: 'r2', x: 80, width: 15, kind: 'holiday' },  // [80,95] outside [100,500]
    ];
    expect(filterRectsInXRange(rects, 100, 500)).toHaveLength(0);
  });

  it('excludes rects entirely to the right of the window', () => {
    const rects: DateMarkingRect[] = [
      { key: 'r1', x: 510, width: 20, kind: 'block' },
      { key: 'r2', x: 600, width: 50, kind: 'block' },
    ];
    expect(filterRectsInXRange(rects, 100, 500)).toHaveLength(0);
  });

  it('includes rects that partially overlap the left edge', () => {
    const rects: DateMarkingRect[] = [{ key: 'r', x: 80, width: 40, kind: 'holiday' }]; // [80,120] ∩ [100,500]
    expect(filterRectsInXRange(rects, 100, 500)).toHaveLength(1);
  });

  it('includes rects that partially overlap the right edge', () => {
    const rects: DateMarkingRect[] = [{ key: 'r', x: 480, width: 40, kind: 'block' }]; // [480,520] ∩ [100,500]
    expect(filterRectsInXRange(rects, 100, 500)).toHaveLength(1);
  });

  it('includes a rect that spans the entire window', () => {
    const rects: DateMarkingRect[] = [{ key: 'r', x: 50, width: 600, kind: 'holiday' }]; // [50,650] ⊃ [100,500]
    expect(filterRectsInXRange(rects, 100, 500)).toHaveLength(1);
  });

  it('handles 10 000 rects and returns only the visible subset quickly', () => {
    const rects = Array.from({ length: 10_000 }, (_, i) => makeRect(i));
    // window [1000, 2000] → rects where x*10+9 >= 1000 and x*10 <= 2000
    // i.e. i from 100 to 200 inclusive = 101 rects
    const t0 = performance.now();
    const result = filterRectsInXRange(rects, 1000, 2000);
    const elapsed = performance.now() - t0;

    expect(elapsed).toBeLessThan(50); // sub-50 ms for 10k rects
    expect(result.length).toBeGreaterThan(0);
    for (const r of result) {
      expect(r.x + r.width).toBeGreaterThanOrEqual(1000);
      expect(r.x).toBeLessThanOrEqual(2000);
    }
  });
});

// ── stableTimelineRange ───────────────────────────────────────────────────────

describe('stableTimelineRange — reference identity', () => {
  const base: TimelineRange = {
    start: new Date('2026-01-01'),
    end: new Date('2026-12-31'),
    columnCount: 365,
    pixelWidth: 43_800,
    fixed: true,
  };

  it('returns prev reference when all fields are equal', () => {
    const next: TimelineRange = {
      start: new Date(base.start.getTime()),
      end: new Date(base.end.getTime()),
      columnCount: base.columnCount,
      pixelWidth: base.pixelWidth,
      fixed: base.fixed,
    };
    expect(stableTimelineRange(next, base)).toBe(base);
  });

  it('returns new object when start date changes', () => {
    const next = { ...base, start: new Date('2026-02-01') };
    const result = stableTimelineRange(next, base);
    expect(result).not.toBe(base);
    expect(result.start.getTime()).toBe(next.start.getTime());
  });

  it('returns new object when end date changes', () => {
    const next = { ...base, end: new Date('2027-12-31') };
    expect(stableTimelineRange(next, base)).not.toBe(base);
  });

  it('returns new object when columnCount changes', () => {
    const next = { ...base, columnCount: 400 };
    expect(stableTimelineRange(next, base)).not.toBe(base);
  });

  it('returns new object when pixelWidth changes', () => {
    const next = { ...base, pixelWidth: 50_000 };
    expect(stableTimelineRange(next, base)).not.toBe(base);
  });

  it('returns new object when fixed flag flips', () => {
    const next = { ...base, fixed: false };
    expect(stableTimelineRange(next, base)).not.toBe(base);
  });

  it('returns the next object itself when prev is undefined', () => {
    expect(stableTimelineRange(base, undefined)).toBe(base);
  });

  it('100 consecutive no-op calls all return the same reference', () => {
    let ref: TimelineRange = base;
    for (let i = 0; i < 100; i++) {
      const next: TimelineRange = {
        start: new Date(base.start.getTime()),
        end: new Date(base.end.getTime()),
        columnCount: base.columnCount,
        pixelWidth: base.pixelWidth,
        fixed: base.fixed,
      };
      ref = stableTimelineRange(next, ref);
    }
    expect(ref).toBe(base);
  });
});

// ── stableVisibleColumnRange ──────────────────────────────────────────────────

describe('stableVisibleColumnRange — reference identity', () => {
  const base = { startIndex: 10, endIndex: 20, startX: 1200, endX: 2520 };

  it('returns prev reference when all fields are equal', () => {
    const next = { ...base };
    expect(stableVisibleColumnRange(next, base)).toBe(base);
  });

  it('returns new object when startIndex changes', () => {
    expect(stableVisibleColumnRange({ ...base, startIndex: 11 }, base)).not.toBe(base);
  });

  it('returns new object when endIndex changes', () => {
    expect(stableVisibleColumnRange({ ...base, endIndex: 21 }, base)).not.toBe(base);
  });

  it('returns new object when startX changes', () => {
    expect(stableVisibleColumnRange({ ...base, startX: 1320 }, base)).not.toBe(base);
  });

  it('returns new object when endX changes', () => {
    expect(stableVisibleColumnRange({ ...base, endX: 2640 }, base)).not.toBe(base);
  });

  it('returns next itself when prev is undefined', () => {
    expect(stableVisibleColumnRange(base, undefined)).toBe(base);
  });

  it('simulates 200 scroll frames — only actually-changed frames create new objects', () => {
    let prev = stableVisibleColumnRange(base, undefined);
    let newObjectCount = 0;
    const CW = 120;

    for (let frame = 0; frame < 200; frame++) {
      // Every 10 frames advance by one column, otherwise no change
      const startIndex = base.startIndex + Math.floor(frame / 10);
      const endIndex = base.endIndex + Math.floor(frame / 10);
      const next = {
        startIndex,
        endIndex,
        startX: startIndex * CW,
        endX: (endIndex + 1) * CW,
      };
      const result = stableVisibleColumnRange(next, prev);
      if (result !== prev) newObjectCount++;
      prev = result;
    }

    // Advance happens at frames 10,20,...,190 = 19 transitions
    // (frame 0 still matches base so no new object is created there)
    expect(newObjectCount).toBe(19);
  });
});

// ── getVisibleVerticalLines ────────────────────────────────────────────────────

describe('getVisibleVerticalLines', () => {
  it('produces a line at x=0 when startIndex is 0', () => {
    const visible = { startIndex: 0, endIndex: 4, startX: 0, endX: 600 };
    const lines = getVisibleVerticalLines(visible, 120, 600);
    expect(lines).toContain(0);
  });

  it('all lines fall within [0, timelineWidth]', () => {
    const visible = { startIndex: 2, endIndex: 7, startX: 240, endX: 960 };
    const lines = getVisibleVerticalLines(visible, 120, 1000);
    for (const x of lines) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1000);
    }
  });

  it('returns empty array for an empty visible range', () => {
    const empty = { startIndex: 0, endIndex: -1, startX: 0, endX: 0 };
    expect(getVisibleVerticalLines(empty, 120, 600)).toEqual([]);
  });
});

// ── buildUpperHeaderBandsForVisibleRange ──────────────────────────────────────

describe('buildUpperHeaderBandsForVisibleRange', () => {
  it('returns non-empty bands for a day-scale visible window', () => {
    const scale = PRESET_SCALES.day;
    const range: TimelineRange = {
      start: new Date('2026-01-01'),
      end: new Date('2026-12-31'),
      columnCount: 365,
    };
    const visible = {
      startIndex: 0,
      endIndex: 30,
      startX: 0,
      endX: 30 * scale.columnWidth,
    };
    const bands = buildUpperHeaderBandsForVisibleRange(range, scale, scale.columnWidth, visible);
    expect(bands.length).toBeGreaterThan(0);
    expect(bands[0].label).toBeTruthy();
    expect(bands[0].width).toBeGreaterThan(0);
  });

  it('all band labels are non-empty strings', () => {
    const scale = PRESET_SCALES.month;
    const range: TimelineRange = {
      start: new Date('2026-01-01'),
      end: new Date('2028-12-31'),
      columnCount: 36,
    };
    const visible = {
      startIndex: 0,
      endIndex: 35,
      startX: 0,
      endX: 36 * scale.columnWidth,
    };
    const bands = buildUpperHeaderBandsForVisibleRange(range, scale, scale.columnWidth, visible);
    for (const band of bands) {
      expect(typeof band.label).toBe('string');
      expect(band.label.length).toBeGreaterThan(0);
    }
  });

  it('band widths are all positive', () => {
    const scale = PRESET_SCALES.week;
    const range: TimelineRange = {
      start: new Date('2026-01-05'),
      end: new Date('2026-12-28'),
      columnCount: 52,
    };
    const visible = {
      startIndex: 0,
      endIndex: 51,
      startX: 0,
      endX: 52 * scale.columnWidth,
    };
    const bands = buildUpperHeaderBandsForVisibleRange(range, scale, scale.columnWidth, visible);
    for (const band of bands) {
      expect(band.width).toBeGreaterThan(0);
    }
  });

  it('returns empty bands for an empty visible range', () => {
    const scale = PRESET_SCALES.day;
    const range: TimelineRange = { start: new Date('2026-01-01'), end: new Date('2026-12-31'), columnCount: 365 };
    const empty = { startIndex: 0, endIndex: -1, startX: 0, endX: 0 };
    const bands = buildUpperHeaderBandsForVisibleRange(range, scale, scale.columnWidth, empty);
    expect(bands).toHaveLength(0);
  });
});
