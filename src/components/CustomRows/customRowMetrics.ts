import type { ViewScale } from '../../core/scale';

export function getCustomRowHeight(
  row: { height?: number },
  defaultRowHeight: number,
): number {
  return row.height ?? defaultRowHeight;
}

export function totalCustomRowsHeight(
  rows: { height?: number }[],
  defaultRowHeight: number,
): number {
  return rows.reduce(
    (sum, row) => sum + getCustomRowHeight(row, defaultRowHeight),
    0,
  );
}

/** Timeline metrics passed to custom row cells (also available via `useGanttTimeline`). */
export interface CustomRowMetrics {
  zoomLevel: string;
  scale: ViewScale;
  columnWidth: number;
  timelineWidth: number;
  msPerPixel: number;
  rangeStart: Date;
  rangeEnd: Date;
  rowHeight: number;
}

export function buildCustomRowCellContext(
  row: { id: string; meta?: unknown; height?: number },
  columnKey: string,
  columnIndex: number,
  rowIndex: number,
  metrics: CustomRowMetrics,
) {
  return {
    rowId: row.id,
    columnKey,
    columnIndex,
    rowIndex,
    zoomLevel: metrics.zoomLevel,
    rangeStart: metrics.rangeStart,
    rangeEnd: metrics.rangeEnd,
    scale: metrics.scale,
    columnWidth: metrics.columnWidth,
    timelineWidth: metrics.timelineWidth,
    msPerPixel: metrics.msPerPixel,
    rowHeight: getCustomRowHeight(row, metrics.rowHeight),
    meta: row.meta,
  };
}
