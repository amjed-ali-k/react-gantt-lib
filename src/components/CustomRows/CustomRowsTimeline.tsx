import { memo } from 'react';
import type { CustomRowDefinition } from '../../types';
import type { EventEmitter } from '../../hooks/useGanttEmitter';
import { AsyncCustomCell } from './AsyncCustomCell';
import type { CustomRowMetrics } from './customRowMetrics';

interface CustomRowsTimelineProps {
  rows: CustomRowDefinition[];
  rowHeight: number;
  timelineWidth: number;
  metrics: CustomRowMetrics;
  columnCount: number;
  emit: EventEmitter;
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
      {rows.map((row, rowIndex) => (
        <div
          key={row.id}
          className="rg-custom-row-timeline-band"
          style={{ height: rowHeight, width: timelineWidth }}
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
      ))}
    </div>
  );
});
