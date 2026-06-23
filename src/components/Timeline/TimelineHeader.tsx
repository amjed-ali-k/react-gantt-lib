import { memo, useMemo } from 'react';
import type { MouseEvent } from 'react';
import { addScaleSteps, formatScaleHeader, formatScaleSubHeader } from '../../core/scale';
import type { ViewScale } from '../../core/scale';
import type { DateMarkingLayers, TimelineRange } from '../../types';
import { getMsPerPixel, resolveTimelineWidth } from '../../core/zoom';
import { pixelToDate } from '../../core/timelineInteraction';
import type { EventEmitter } from '../../hooks/useGanttEmitter';
import {
  buildUpperHeaderBandsForVisibleRange,
  filterRectsInXRange,
  type VisibleColumnRange,
} from '../../core/visibleColumns';
import { DateMarkingHeaderHighlights } from './DateMarkingHighlights';
import { createPointerDetail } from './pointerDetail';

interface TimelineHeaderProps {
  range: TimelineRange;
  scale: ViewScale;
  columnWidth: number;
  visibleColumns: VisibleColumnRange;
  dateMarkings?: DateMarkingLayers;
  interactive?: boolean;
  emit?: EventEmitter;
}

interface HeaderColumn {
  date: Date;
  x: number;
}

export interface HeaderBand {
  label: string;
  x: number;
  width: number;
}

/** Group adjacent columns that share the same upper-tier label into spanning bands. */
export function buildUpperHeaderBands(
  columns: HeaderColumn[],
  scale: ViewScale,
  columnWidth: number,
): HeaderBand[] {
  if (columns.length === 0) return [];

  const bands: HeaderBand[] = [];
  let bandStartX = columns[0].x;
  let bandLabel = formatScaleSubHeader(columns[0].date, scale);

  for (let i = 1; i <= columns.length; i++) {
    const atEnd = i === columns.length;
    const nextLabel = atEnd ? null : formatScaleSubHeader(columns[i].date, scale);

    if (atEnd || nextLabel !== bandLabel) {
      const endX = atEnd ? columns[i - 1].x + columnWidth : columns[i].x;
      bands.push({
        label: bandLabel,
        x: bandStartX,
        width: endX - bandStartX,
      });
      if (!atEnd) {
        bandLabel = nextLabel!;
        bandStartX = columns[i].x;
      }
    }
  }

  return bands;
}

export const TimelineHeader = memo(function TimelineHeader({
  range,
  scale,
  columnWidth,
  visibleColumns,
  dateMarkings,
  interactive = false,
  emit,
}: TimelineHeaderProps) {
  const { startIndex, endIndex } = visibleColumns;

  const visibleLowerColumns = useMemo((): HeaderColumn[] => {
    if (endIndex < startIndex) return [];
    const cols: HeaderColumn[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      cols.push({ date: addScaleSteps(range.start, i, scale), x: i * columnWidth });
    }
    return cols;
  }, [range.start, scale, columnWidth, startIndex, endIndex]);

  const upperBands = useMemo(
    () => buildUpperHeaderBandsForVisibleRange(range, scale, columnWidth, visibleColumns),
    [range, scale, columnWidth, visibleColumns],
  );

  const markingRects = useMemo(() => {
    const all = [...(dateMarkings?.holidays ?? []), ...(dateMarkings?.blocks ?? [])];
    return filterRectsInXRange(all, visibleColumns.startX, visibleColumns.endX);
  }, [dateMarkings, visibleColumns.startX, visibleColumns.endX]);

  const timelineWidth = resolveTimelineWidth(range, columnWidth);
  const msPerPixel = getMsPerPixel(scale, columnWidth);

  const resolveHeaderTarget = (clientX: number, headerEl: HTMLDivElement) => {
    const rect = headerEl.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * timelineWidth;
    const date = pixelToDate(x, range.start, msPerPixel);
    return { type: 'timeline' as const, date, rowIndex: null };
  };

  const handleHeaderClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!interactive || !emit) return;
    emit('ganttClick', createPointerDetail(resolveHeaderTarget(e.clientX, e.currentTarget), e));
  };

  const handleHeaderContextMenu = (e: MouseEvent<HTMLDivElement>) => {
    if (!interactive || !emit) return;
    emit(
      'ganttContextMenu',
      createPointerDetail(resolveHeaderTarget(e.clientX, e.currentTarget), e),
    );
  };

  return (
    <div
      className={`rg-timeline-header${interactive ? ' rg-timeline-header--interactive' : ''}`}
      data-testid="timeline-header"
      onClick={interactive ? handleHeaderClick : undefined}
      onContextMenu={interactive ? handleHeaderContextMenu : undefined}
    >
      <div className="rg-timeline-header-inner">
        <DateMarkingHeaderHighlights rects={markingRects} />
        <div className="rg-timeline-header-upper">
          {upperBands.map((band, i) => (
            <div
              key={`u-${band.label}-${band.x}-${i}`}
              className="rg-header-cell rg-header-cell--upper"
              style={{ left: band.x, width: band.width }}
            >
              {band.label}
            </div>
          ))}
        </div>
        <div className="rg-timeline-header-lower">
          {visibleLowerColumns.map((col, i) => (
            <div
              key={`l-${startIndex + i}`}
              className="rg-header-cell rg-header-cell--lower"
              style={{ left: col.x, width: columnWidth }}
            >
              {formatScaleHeader(col.date, scale)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
