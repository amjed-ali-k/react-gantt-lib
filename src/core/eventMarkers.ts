import type { EventMarker, TimelineRange } from '../types';
import { toDate } from './dates';
import type { ViewScale } from './scale';
import { dateToPixel, getMsPerPixel, resolveTimelineWidth } from './zoom';

export const DEFAULT_EVENT_MARKER_COLOR = '#64748b';
export const TIMELINE_HEADER_HEIGHT = 52;
const LABEL_STAGGER = 36;

export interface ResolvedEventMarker {
  key: string;
  x: number;
  label: string;
  labelTop: number;
  color: string;
}

export function computeEventMarkerPositions(
  markers: EventMarker[] | undefined,
  range: TimelineRange,
  scale: ViewScale,
  columnWidth: number,
  headerHeight = TIMELINE_HEADER_HEIGHT,
): ResolvedEventMarker[] {
  if (!markers?.length) return [];

  const msPerPixel = getMsPerPixel(scale, columnWidth);
  const timelineWidth = resolveTimelineWidth(range, columnWidth);
  const result: ResolvedEventMarker[] = [];

  markers.forEach((marker, index) => {
    const date = toDate(marker.date);
    if (date < range.start || date > range.end) return;

    const x = dateToPixel(date, range.start, msPerPixel);
    if (x < 0 || x > timelineWidth) return;

    result.push({
      key: marker.id ?? `event-${index}-${date.getTime()}`,
      x,
      label: marker.label,
      labelTop: marker.labelTop ?? headerHeight + 20 + index * LABEL_STAGGER,
      color: marker.color ?? DEFAULT_EVENT_MARKER_COLOR,
    });
  });

  return result;
}
