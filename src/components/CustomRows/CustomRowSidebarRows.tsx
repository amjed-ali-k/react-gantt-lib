import { memo } from 'react';
import type { CustomRowDefinition, GanttColumn } from '../../types';
import type { EventEmitter } from '../../hooks/useGanttEmitter';
import { AsyncCustomCell } from './AsyncCustomCell';
import type { CustomRowMetrics } from './customRowMetrics';

interface CustomRowSidebarRowsProps {
  rows: CustomRowDefinition[];
  columns: GanttColumn[];
  rowHeight: number;
  metrics: CustomRowMetrics;
  emit: EventEmitter;
  columnOffset?: number;
}

export const CustomRowLeftRows = memo(function CustomRowLeftRows({
  rows,
  columns,
  rowHeight,
  metrics,
  emit,
}: CustomRowSidebarRowsProps) {
  if (rows.length === 0) return null;

  return (
    <>
      {rows.map((row, rowIndex) => (
        <div
          key={row.id}
          className="rg-task-row rg-custom-row-sidebar"
          style={{ height: rowHeight, paddingLeft: 8 }}
          data-row-id={row.id}
        >
          {columns.map((col, colIdx) => (
            <div
              key={col.key}
              className="rg-task-cell"
              style={{ flex: col.flex ?? 1, minWidth: col.minWidth }}
            >
              <AsyncCustomCell
                row={row}
                columnKey={col.key}
                columnIndex={colIdx}
                rowIndex={rowIndex}
                metrics={metrics}
                emit={emit}
              />
            </div>
          ))}
        </div>
      ))}
    </>
  );
});

export const CustomRowMiddleRows = memo(function CustomRowMiddleRows({
  rows,
  columns,
  rowHeight,
  metrics,
  emit,
  columnOffset = 0,
}: CustomRowSidebarRowsProps) {
  if (rows.length === 0) return null;

  return (
    <>
      {rows.map((row, rowIndex) => (
        <div
          key={row.id}
          className="rg-task-row rg-custom-row-sidebar"
          style={{ height: rowHeight }}
          data-row-id={row.id}
        >
          {columns.map((col, colIdx) => (
            <div
              key={col.key}
              className="rg-task-cell"
              style={{ flex: col.flex ?? 1, minWidth: col.minWidth }}
            >
              <AsyncCustomCell
                row={row}
                columnKey={col.key}
                columnIndex={columnOffset + colIdx}
                rowIndex={rowIndex}
                metrics={metrics}
                emit={emit}
              />
            </div>
          ))}
        </div>
      ))}
    </>
  );
});
