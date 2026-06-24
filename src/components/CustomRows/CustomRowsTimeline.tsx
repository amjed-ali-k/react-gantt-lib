import { memo } from 'react';
import type { CustomRowDefinition } from '../../types';
import type { EventEmitter } from '../../hooks/useGanttEmitter';
import { AsyncCustomCell } from './AsyncCustomCell';
import type { CustomRowMetrics } from './customRowMetrics';
import { getCustomRowHeight } from './customRowMetrics';
import type { StickyPosition } from '../../core/stickyRows';

interface CustomRowsTimelineProps {
  rows: CustomRowDefinition[];
  rowHeight: number;
  timelineWidth: number;
  metrics: CustomRowMetrics;
  columnCount: number;
  emit: EventEmitter;
  stickyPosition?: StickyPosition;
  stickyOffsets?: number[];
}

function customRowsTimelinePropsEqual(
  prev: CustomRowsTimelineProps,
  next: CustomRowsTimelineProps,
): boolean {
  if (prev.rows !== next.rows) return false;
  if (prev.metrics !== next.metrics) return false;
  if (prev.timelineWidth !== next.timelineWidth) return false;
  if (prev.columnCount !== next.columnCount) return false;
  if (prev.rowHeight !== next.rowHeight) return false;
  if (prev.emit !== next.emit) return false;
  if (prev.stickyPosition !== next.stickyPosition) return false;
  if (prev.stickyOffsets !== next.stickyOffsets) return false;
  return true;
}

export const CustomRowsTimeline = memo(function CustomRowsTimeline({
  rows,
  rowHeight,
  timelineWidth,
  metrics,
  columnCount,
  emit,
  stickyPosition,
  stickyOffsets,
}: CustomRowsTimelineProps) {
  if (rows.length === 0) return null;

  const bands = rows.map((row, rowIndex) => {
    const height = getCustomRowHeight(row, rowHeight);
    const stickyOffset = stickyOffsets?.[rowIndex];
    return (
      <div
        key={row.id}
        className={`rg-custom-row-timeline-band${stickyPosition ? ' rg-row--sticky' : ''}`}
        style={{
          height,
          width: timelineWidth,
          ...(stickyPosition && stickyOffset !== undefined
            ? {
                position: 'sticky' as const,
                top: stickyPosition === 'top' ? stickyOffset : undefined,
                bottom: stickyPosition === 'bottom' ? stickyOffset : undefined,
                zIndex: 4,
              }
            : {}),
        }}
        data-row-id={row.id}
        data-sticky={stickyPosition}
        data-testid={
          stickyPosition && rowIndex === 0
            ? `custom-rows-sticky-${stickyPosition}`
            : undefined
        }
      >
        <AsyncCustomCell
          row={row}
          columnKey="__timeline__"
          columnIndex={columnCount}
          rowIndex={rowIndex}
          metrics={metrics}
          emit={emit}
          timeline
        />
      </div>
    );
  });

  if (stickyPosition) {
    return <>{bands}</>;
  }

  return (
    <div className="rg-custom-rows-timeline" data-testid="custom-rows">
      {bands}
    </div>
  );
}, customRowsTimelinePropsEqual);
