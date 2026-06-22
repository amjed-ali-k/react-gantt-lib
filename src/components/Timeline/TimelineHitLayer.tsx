import type { MouseEvent } from 'react';
import type { RowLayout } from '../../core/rowLayout';
import { pixelToDate, resolveRowAtY } from '../../core/timelineInteraction';
import type { EventEmitter } from '../../hooks/useGanttEmitter';
import type { TimelineRange } from '../../types';
import type { ViewScale } from '../../core/scale';
import { getMsPerPixel, resolveTimelineWidth } from '../../core/zoom';
import { createPointerDetail } from './pointerDetail';

interface TimelineHitLayerProps {
  range: TimelineRange;
  scale: ViewScale;
  columnWidth: number;
  rowLayouts: RowLayout[];
  height: number;
  interactive: boolean;
  emit: EventEmitter;
}

export function TimelineHitLayer({
  range,
  scale,
  columnWidth,
  rowLayouts,
  height,
  interactive,
  emit,
}: TimelineHitLayerProps) {
  if (!interactive) return null;

  const timelineWidth = resolveTimelineWidth(range, columnWidth);
  const msPerPixel = getMsPerPixel(scale, columnWidth);

  const resolveTarget = (clientX: number, clientY: number, svg: SVGSVGElement) => {
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * timelineWidth;
    const y = ((clientY - rect.top) / rect.height) * height;
    const rowIndex = resolveRowAtY(y, rowLayouts);
    const date = pixelToDate(x, range.start, msPerPixel);
    return { type: 'timeline' as const, date, rowIndex };
  };

  const handleClick = (e: MouseEvent<SVGRectElement>) => {
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    emit('ganttClick', createPointerDetail(resolveTarget(e.clientX, e.clientY, svg), e));
  };

  const handleContextMenu = (e: MouseEvent<SVGRectElement>) => {
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    emit('ganttContextMenu', createPointerDetail(resolveTarget(e.clientX, e.clientY, svg), e));
  };

  return (
    <svg
      className="rg-timeline-hit"
      width="100%"
      height={height}
      viewBox={`0 0 ${timelineWidth} ${height}`}
      preserveAspectRatio="none"
      data-testid="timeline-hit-layer"
    >
      <rect
        x={0}
        y={0}
        width={timelineWidth}
        height={height}
        fill="transparent"
        className="rg-timeline-hit-rect"
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      />
    </svg>
  );
}
