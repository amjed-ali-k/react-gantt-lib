import { describe, it, expect } from 'vitest';
import { addScaleSteps } from '../src/core/scale';
import {
  computeDraggableMarkerPositions,
  computeDraggableMarkerSnapPoints,
  resolveDraggableMarkerInteractionFlags,
  resolveMarkerDateFromX,
  resolveMarkerPositionFromX,
  snapMarkerX,
} from '../src/core/draggableMarkers';
import { resolveScale } from '../src/core/scale';
import { computeTimelineRange, dateToScalePixel } from '../src/core/zoom';

const dayScale = resolveScale('day');
const weekScale = resolveScale('week');

describe('computeDraggableMarkerPositions', () => {
  const range = computeTimelineRange(
    [],
    dayScale,
    2,
    { minDate: '2026-04-01', maxDate: '2026-04-30' },
  );

  it('places markers within the timeline range', () => {
    const markers = computeDraggableMarkerPositions(
      [{ id: 'as-of', date: '2026-04-07', label: 'As of' }],
      range,
      dayScale,
      dayScale.columnWidth,
    );
    expect(markers).toHaveLength(1);
    expect(markers[0].x).toBeGreaterThan(0);
    expect(markers[0].label).toBe('As of');
    expect(markers[0].draggable).toBe(true);
  });

  it('omits markers outside the visible range', () => {
    const markers = computeDraggableMarkerPositions(
      [{ id: 'future', date: '2026-05-01' }],
      range,
      dayScale,
      dayScale.columnWidth,
    );
    expect(markers).toHaveLength(0);
  });

  it('respects draggable: false', () => {
    const markers = computeDraggableMarkerPositions(
      [{ id: 'fixed', date: '2026-04-10', draggable: false }],
      range,
      dayScale,
      dayScale.columnWidth,
    );
    expect(markers[0].draggable).toBe(false);
  });
});

describe('resolveMarkerPositionFromX', () => {
  const weekRange = computeTimelineRange(
    [],
    weekScale,
    2,
    { minDate: '2026-01-26', maxDate: '2026-04-05' },
  );
  const cw = weekScale.columnWidth;
  const timelineWidth = weekRange.pixelWidth!;

  it('converts pixel x to a date without snap', () => {
    const { date } = resolveMarkerPositionFromX(
      0,
      weekRange.start,
      weekScale,
      cw,
      false,
      timelineWidth,
    );
    expect(date.getTime()).toBe(weekRange.start.getTime());
  });

  it('snaps x to column boundaries that match vertical grid lines', () => {
    for (let step = 0; step < 6; step++) {
      const gridX = step * cw;
      const nudgedX = gridX + cw * 0.08;
      const { x, date } = resolveMarkerPositionFromX(
        nudgedX,
        weekRange.start,
        weekScale,
        cw,
        true,
        timelineWidth,
      );
      expect(x).toBe(gridX);
      expect(date.getTime()).toBe(addScaleSteps(weekRange.start, step, weekScale).getTime());
      expect(dateToScalePixel(date, weekRange.start, weekScale, cw)).toBe(gridX);
    }
  });

  it('snaps near-midpoint to nearest column', () => {
    const { x } = resolveMarkerPositionFromX(
      cw * 1.45,
      weekRange.start,
      weekScale,
      cw,
      true,
      timelineWidth,
    );
    expect(x).toBe(1 * cw);
  });
});

describe('snapMarkerX', () => {
  it('aligns to integer multiples of column width', () => {
    expect(snapMarkerX(73, 140)).toBe(140);
    expect(snapMarkerX(66, 140)).toBe(0);
  });
});

describe('resolveMarkerDateFromX', () => {
  const rangeStart = new Date('2026-04-01T00:00:00');

  it('snaps to grid when enabled', () => {
    const midDay = resolveMarkerDateFromX(
      dayScale.columnWidth * 0.4,
      rangeStart,
      dayScale,
      dayScale.columnWidth,
      true,
    );
    expect(midDay.getHours()).toBe(0);
    expect(midDay.getMinutes()).toBe(0);
  });
});

describe('resolveDraggableMarkerInteractionFlags', () => {
  it('disables drag and snap resolution when no drag callbacks are registered', () => {
    expect(
      resolveDraggableMarkerInteractionFlags({ hasSnapPoints: true }),
    ).toEqual({
      dragEnabled: false,
      emitDragStart: false,
      emitDrag: false,
      emitDragEnd: false,
      emitDragToSnapPoint: false,
      clickEnabled: false,
      useSnapPoints: false,
    });
  });

  it('enables only registered drag callbacks', () => {
    expect(
      resolveDraggableMarkerInteractionFlags({
        onDragEnd: () => {},
        onDragToSnapPoint: () => {},
        hasSnapPoints: true,
      }),
    ).toEqual({
      dragEnabled: true,
      emitDragStart: false,
      emitDrag: false,
      emitDragEnd: true,
      emitDragToSnapPoint: true,
      clickEnabled: false,
      useSnapPoints: true,
    });
  });

  it('does not resolve snap points when drag is disabled', () => {
    expect(
      resolveDraggableMarkerInteractionFlags({
        onGanttClick: () => {},
        hasSnapPoints: true,
      }).useSnapPoints,
    ).toBe(false);
  });
});

describe('custom snap points', () => {
  const weekRange = computeTimelineRange(
    [],
    weekScale,
    2,
    { minDate: '2026-01-26', maxDate: '2026-04-05' },
  );
  const cw = weekScale.columnWidth;
  const timelineWidth = weekRange.pixelWidth!;

  const snapPoints = computeDraggableMarkerSnapPoints(
    [
      { id: 'a', date: '2026-02-02' },
      { id: 'b', date: '2026-03-01' },
      { id: 'c', date: '2026-03-29' },
    ],
    weekRange,
    weekScale,
    cw,
  );

  it('snaps to nearest custom snap point instead of grid', () => {
    const target = snapPoints[1];
    const between = (snapPoints[0].x + snapPoints[1].x) / 2 + 2;
    const { x, snapPoint } = resolveMarkerPositionFromX(
      between,
      weekRange.start,
      weekScale,
      cw,
      true,
      timelineWidth,
      undefined,
      snapPoints,
    );
    expect(snapPoint?.snapPoint.id).toBe('b');
    expect(x).toBe(target.x);
  });

  it('prefers closer snap point when dragging near either side', () => {
    const nearFirst = snapPoints[0].x + 5;
    const nearLast = snapPoints[2].x - 5;
    expect(
      resolveMarkerPositionFromX(
        nearFirst,
        weekRange.start,
        weekScale,
        cw,
        true,
        timelineWidth,
        undefined,
        snapPoints,
      ).snapPoint?.snapPoint.id,
    ).toBe('a');
    expect(
      resolveMarkerPositionFromX(
        nearLast,
        weekRange.start,
        weekScale,
        cw,
        true,
        timelineWidth,
        undefined,
        snapPoints,
      ).snapPoint?.snapPoint.id,
    ).toBe('c');
  });
});
