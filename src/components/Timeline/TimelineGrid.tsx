import { memo, useMemo } from 'react';
import type { ViewScale } from '../../core/scale';
import type { DateMarkingLayers, TimelineRange } from '../../types';
import { dateToScalePixel, resolveTimelineWidth } from '../../core/zoom';
import {
  filterRectsInXRange,
  getVisibleVerticalLines,
  type VisibleColumnRange,
} from '../../core/visibleColumns';
import { DateMarkingHighlights } from './DateMarkingHighlights';
import { useGanttDisplayTimezone } from '../../context/GanttDisplayContext';
import { formatDisplayDate } from '../../core/displayFormat';

import type { RowLayout } from '../../core/rowLayout';
import { totalRowLayoutHeight } from '../../core/rowLayout';

interface TimelineGridProps {
  range: TimelineRange;
  scale: ViewScale;
  columnWidth: number;
  rowLayouts: RowLayout[];
  visibleColumns: VisibleColumnRange;
  dateMarkings?: DateMarkingLayers;
}

export const TimelineGrid = memo(function TimelineGrid({
  range,
  scale,
  columnWidth,
  rowLayouts,
  visibleColumns,
  dateMarkings,
}: TimelineGridProps) {
  const totalHeight = totalRowLayoutHeight(rowLayouts);
  const timelineWidth = resolveTimelineWidth(range, columnWidth);
  const markingRects = useMemo(() => {
    const all = [...(dateMarkings?.holidays ?? []), ...(dateMarkings?.blocks ?? [])];
    return filterRectsInXRange(all, visibleColumns.startX, visibleColumns.endX);
  }, [dateMarkings, visibleColumns.startX, visibleColumns.endX]);

  const verticalLines = useMemo(
    () => getVisibleVerticalLines(visibleColumns, columnWidth, timelineWidth),
    [visibleColumns, columnWidth, timelineWidth],
  );

  const horizontalLines = useMemo(() => {
    return rowLayouts.map((row) => row.y + row.height);
  }, [rowLayouts]);

  return (
    <svg
      className="rg-timeline-grid"
      width="100%"
      height={totalHeight}
      viewBox={`0 0 ${timelineWidth} ${totalHeight}`}
      preserveAspectRatio="none"
      data-testid="timeline-grid"
    >
      <rect x={0} y={0} width={timelineWidth} height={totalHeight} className="rg-grid-fill" />
      <DateMarkingHighlights rects={markingRects} height={totalHeight} />
      {verticalLines.map((x) => (
        <line
          key={x}
          x1={x}
          y1={0}
          x2={x}
          y2={totalHeight}
          className="rg-grid-line rg-grid-line--vertical"
        />
      ))}
      {horizontalLines.map((y) => (
        <line
          key={y}
          x1={0}
          y1={y}
          x2={timelineWidth}
          y2={y}
          className="rg-grid-line rg-grid-line--horizontal"
        />
      ))}
      <TodayMarker
        range={range}
        scale={scale}
        columnWidth={columnWidth}
        rowHeight={totalHeight}
      />
    </svg>
  );
});

const TodayMarker = memo(function TodayMarker({
  range,
  scale,
  columnWidth,
  rowHeight,
}: {
  range: TimelineRange;
  scale: ViewScale;
  columnWidth: number;
  rowHeight: number;
}) {
  const timeZone = useGanttDisplayTimezone();
  const today = new Date();
  if (today < range.start || today > range.end) return null;

  const x = dateToScalePixel(today, range.start, scale, columnWidth);
  const label = `Today, ${formatDisplayDate(today, timeZone)}`;

  return (
    <g role="img" aria-label={label} data-testid="today-marker">
      <title>{label}</title>
      <line
        x1={x}
        y1={0}
        x2={x}
        y2={rowHeight}
        className="rg-today-marker"
        strokeWidth={2}
      />
    </g>
  );
});
