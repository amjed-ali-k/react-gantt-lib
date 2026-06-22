import type { CSSProperties, MouseEvent } from 'react';
import { memo, useMemo } from 'react';
import { computeEventMarkerPositions, TIMELINE_HEADER_HEIGHT } from '../../core/eventMarkers';
import type { EventMarker, TimelineRange } from '../../types';
import type { ViewScale } from '../../core/scale';
import type { EventEmitter } from '../../hooks/useGanttEmitter';
import { createPointerDetail } from './pointerDetail';

interface EventMarkersLayerProps {
  markers: EventMarker[];
  range: TimelineRange;
  scale: ViewScale;
  columnWidth: number;
  totalHeight: number;
  headerHeight?: number;
  interactive?: boolean;
  emit?: EventEmitter;
}

export const EventMarkersLayer = memo(function EventMarkersLayer({
  markers,
  range,
  scale,
  columnWidth,
  totalHeight,
  headerHeight = TIMELINE_HEADER_HEIGHT,
  interactive = false,
  emit,
}: EventMarkersLayerProps) {
  const resolved = useMemo(
    () => computeEventMarkerPositions(markers, range, scale, columnWidth, headerHeight),
    [markers, range, scale, columnWidth, headerHeight],
  );

  if (resolved.length === 0) return null;

  const handleClick = (marker: EventMarker, index: number, e: MouseEvent) => {
    if (!interactive || !emit) return;
    e.stopPropagation();
    emit(
      'ganttClick',
      createPointerDetail({ type: 'eventMarker', marker, index }, e),
    );
  };

  const handleContextMenu = (marker: EventMarker, index: number, e: MouseEvent) => {
    if (!interactive || !emit) return;
    e.stopPropagation();
    emit(
      'ganttContextMenu',
      createPointerDetail({ type: 'eventMarker', marker, index }, e),
    );
  };

  return (
    <div
      className={`rg-event-markers${interactive ? ' rg-event-markers--interactive' : ''}`}
      style={{ height: totalHeight }}
      data-testid="event-markers"
    >
      {resolved.map((marker) => (
        <div
          key={marker.key}
          className="rg-event-marker rg-event-marker-hit"
          style={
            {
              left: marker.x,
              '--rg-event-marker-color': marker.color,
            } as CSSProperties
          }
          tabIndex={interactive ? 0 : -1}
          aria-label={`Event marker ${marker.label}`}
          onClick={(e) => handleClick(marker.marker, marker.index, e)}
          onContextMenu={(e) => handleContextMenu(marker.marker, marker.index, e)}
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
