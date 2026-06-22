import type { CSSProperties } from 'react';
import { memo, useMemo } from 'react';
import { computeEventMarkerPositions, TIMELINE_HEADER_HEIGHT } from '../../core/eventMarkers';
import type { EventMarker, TimelineRange } from '../../types';
import type { ViewScale } from '../../core/scale';

interface EventMarkersLayerProps {
  markers: EventMarker[];
  range: TimelineRange;
  scale: ViewScale;
  columnWidth: number;
  totalHeight: number;
  headerHeight?: number;
}

export const EventMarkersLayer = memo(function EventMarkersLayer({
  markers,
  range,
  scale,
  columnWidth,
  totalHeight,
  headerHeight = TIMELINE_HEADER_HEIGHT,
}: EventMarkersLayerProps) {
  const resolved = useMemo(
    () => computeEventMarkerPositions(markers, range, scale, columnWidth, headerHeight),
    [markers, range, scale, columnWidth, headerHeight],
  );

  if (resolved.length === 0) return null;

  return (
    <div
      className="rg-event-markers"
      style={{ height: totalHeight }}
      data-testid="event-markers"
    >
      {resolved.map((marker) => (
        <div
          key={marker.key}
          className="rg-event-marker"
          style={
            {
              left: marker.x,
              '--rg-event-marker-color': marker.color,
            } as CSSProperties
          }
          tabIndex={-1}
          aria-label={`Event marker ${marker.label}`}
        >
          <div className="rg-event-marker-label" style={{ top: marker.labelTop }}>
            {marker.label}
          </div>
          <div
            className="rg-event-marker-arrow"
            style={{ top: marker.labelTop + 10 }}
          />
        </div>
      ))}
    </div>
  );
});
