import type { ViewScale } from '../../core/scale';

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
  row: { id: string; meta?: unknown },
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
    rowHeight: metrics.rowHeight,
    meta: row.meta,
  };
}
