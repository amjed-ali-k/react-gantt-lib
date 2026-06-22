import { memo, useMemo } from 'react';
import type { ViewScale } from '../../core/scale';
import type { DateMarkingLayers, TimelineRange } from '../../types';
import { dateToPixel, getMsPerPixel, resolveTimelineWidth } from '../../core/zoom';
import { DateMarkingHighlights } from './DateMarkingHighlights';

import type { RowLayout } from '../../core/rowLayout';
import { totalRowLayoutHeight } from '../../core/rowLayout';

interface TimelineGridProps {
  range: TimelineRange;
  scale: ViewScale;
  columnWidth: number;
  rowLayouts: RowLayout[];
  dateMarkings?: DateMarkingLayers;
}

export const TimelineGrid = memo(function TimelineGrid({
  range,
  scale,
  columnWidth,
  rowLayouts,
  dateMarkings,
}: TimelineGridProps) {
  const totalHeight = totalRowLayoutHeight(rowLayouts);
  const timelineWidth = resolveTimelineWidth(range, columnWidth);
  const markingRects = useMemo(
    () => [...(dateMarkings?.holidays ?? []), ...(dateMarkings?.blocks ?? [])],
    [dateMarkings],
  );

  const verticalLines = useMemo(() => {
    const lines: number[] = [];
    for (let x = 0; x < timelineWidth; x += columnWidth) {
      lines.push(x);
    }
    lines.push(timelineWidth);
    return lines;
  }, [timelineWidth, columnWidth]);

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
  const today = new Date();
  if (today < range.start || today > range.end) return null;

  const msPerPixel = getMsPerPixel(scale, columnWidth);
  const x = dateToPixel(today, range.start, msPerPixel);

  return (
    <line
      x1={x}
      y1={0}
      x2={x}
      y2={rowHeight}
      className="rg-today-marker"
      strokeWidth={2}
    />
  );
});
