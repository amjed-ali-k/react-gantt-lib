import { memo } from 'react';
import type { CustomRowDefinition } from '../../types';
import type { EventEmitter } from '../../hooks/useGanttEmitter';
import { AsyncCustomCell } from './AsyncCustomCell';
import type { CustomRowMetrics } from './customRowMetrics';
import { getCustomRowHeight } from './customRowMetrics';

interface CustomRowsTimelineProps {
  rows: CustomRowDefinition[];
  rowHeight: number;
  timelineWidth: number;
  metrics: CustomRowMetrics;
  columnCount: number;
  emit: EventEmitter;
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
  return true;
}

export const CustomRowsTimeline = memo(function CustomRowsTimeline({
  rows,
  rowHeight,
  timelineWidth,
  metrics,
  columnCount,
  emit,
}: CustomRowsTimelineProps) {
  if (rows.length === 0) return null;

  return (
    <div className="rg-custom-rows-timeline" data-testid="custom-rows">
      {rows.map((row, rowIndex) => {
        const height = getCustomRowHeight(row, rowHeight);
        return (
        <div
          key={row.id}
          className="rg-custom-row-timeline-band"
          style={{ height, width: timelineWidth }}
          data-row-id={row.id}
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
      })}
    </div>
  );
}, customRowsTimelinePropsEqual);
