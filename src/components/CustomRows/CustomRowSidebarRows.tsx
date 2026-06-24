import { memo } from 'react';
import type { CSSProperties } from 'react';
import type { CustomRowDefinition, GanttColumn } from '../../types';
import type { EventEmitter } from '../../hooks/useGanttEmitter';
import { AsyncCustomCell } from './AsyncCustomCell';
import type { CustomRowMetrics } from './customRowMetrics';
import { getCustomRowHeight } from './customRowMetrics';
import type { StickyPosition } from '../../core/stickyRows';

interface CustomRowSidebarRowsProps {
  rows: CustomRowDefinition[];
  columns: GanttColumn[];
  rowHeight: number;
  metrics: CustomRowMetrics;
  emit: EventEmitter;
  columnOffset?: number;
  stickyPosition?: StickyPosition;
  stickyOffsets?: number[];
}

function stickyRowStyle(
  position: StickyPosition | undefined,
  offset: number | undefined,
): CSSProperties | undefined {
  if (!position || offset === undefined) return undefined;
  return position === 'top'
    ? {
        position: 'sticky',
        top: offset,
        zIndex: 2,
        background: 'var(--rg-sticky-row-bg, var(--rg-surface))',
      }
    : {
        position: 'sticky',
        bottom: offset,
        zIndex: 2,
        background: 'var(--rg-sticky-row-bg, var(--rg-surface))',
      };
}

export const CustomRowLeftRows = memo(function CustomRowLeftRows({
  rows,
  columns,
  rowHeight,
  metrics,
  emit,
  stickyPosition,
  stickyOffsets,
}: CustomRowSidebarRowsProps) {
  if (rows.length === 0) return null;

  return (
    <>
      {rows.map((row, rowIndex) => {
        const height = getCustomRowHeight(row, rowHeight);
        return (
          <div
            key={row.id}
            className={`rg-task-row rg-custom-row-sidebar${stickyPosition ? ' rg-row--sticky' : ''}`}
            style={{
              height,
              paddingLeft: 8,
              ...stickyRowStyle(stickyPosition, stickyOffsets?.[rowIndex]),
            }}
            data-row-id={row.id}
            data-sticky={stickyPosition}
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
        );
      })}
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
  stickyPosition,
  stickyOffsets,
}: CustomRowSidebarRowsProps) {
  if (rows.length === 0) return null;

  return (
    <>
      {rows.map((row, rowIndex) => {
        const height = getCustomRowHeight(row, rowHeight);
        return (
          <div
            key={row.id}
            className={`rg-task-row rg-custom-row-sidebar${stickyPosition ? ' rg-row--sticky' : ''}`}
            style={{
              height,
              ...stickyRowStyle(stickyPosition, stickyOffsets?.[rowIndex]),
            }}
            data-row-id={row.id}
            data-sticky={stickyPosition}
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
        );
      })}
    </>
  );
});
