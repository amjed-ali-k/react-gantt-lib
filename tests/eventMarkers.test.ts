import { describe, it, expect } from 'vitest';
import { computeEventMarkerPositions, TIMELINE_HEADER_HEIGHT } from '../src/core/eventMarkers';
import { resolveScale } from '../src/core/scale';
import { computeTimelineRange } from '../src/core/zoom';

const scale = resolveScale('day');

describe('computeEventMarkerPositions', () => {
  const range = computeTimelineRange(
    [],
    scale,
    2,
    { minDate: '2026-04-01', maxDate: '2026-04-30' },
  );

  it('places markers within the timeline range', () => {
    const markers = computeEventMarkerPositions(
      [{ id: 'a', date: '2026-04-07', label: 'Demand Analysis' }],
      range,
      scale,
      scale.columnWidth,
    );
    expect(markers).toHaveLength(1);
    expect(markers[0].x).toBeGreaterThan(0);
    expect(markers[0].label).toBe('Demand Analysis');
    expect(markers[0].labelTop).toBeGreaterThanOrEqual(TIMELINE_HEADER_HEIGHT);
  });

  it('omits markers outside the visible range', () => {
    const markers = computeEventMarkerPositions(
      [{ date: '2026-05-01', label: 'Out of range' }],
      range,
      scale,
      scale.columnWidth,
    );
    expect(markers).toHaveLength(0);
  });
});
