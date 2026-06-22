import { memo, useMemo } from 'react';
import { addScaleSteps, formatScaleHeader, formatScaleSubHeader } from '../../core/scale';
import type { ViewScale } from '../../core/scale';
import type { DateMarkingLayers, TimelineRange } from '../../types';
import { DateMarkingHeaderHighlights } from './DateMarkingHighlights';

interface TimelineHeaderProps {
  range: TimelineRange;
  scale: ViewScale;
  columnWidth: number;
  dateMarkings?: DateMarkingLayers;
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
  dateMarkings,
}: TimelineHeaderProps) {
  const columns = useMemo((): HeaderColumn[] => {
    const cols: HeaderColumn[] = [];
    for (let i = 0; i < range.columnCount; i++) {
      cols.push({ date: addScaleSteps(range.start, i, scale), x: i * columnWidth });
    }
    return cols;
  }, [range.start, range.columnCount, scale, columnWidth]);

  const upperBands = useMemo(
    () => buildUpperHeaderBands(columns, scale, columnWidth),
    [columns, scale, columnWidth],
  );

  const markingRects = useMemo(
    () => [...(dateMarkings?.holidays ?? []), ...(dateMarkings?.blocks ?? [])],
    [dateMarkings],
  );

  return (
    <div className="rg-timeline-header" data-testid="timeline-header">
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
          {columns.map((col, i) => (
            <div
              key={`l-${i}`}
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
