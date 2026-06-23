import { memo, useEffect, useState, useRef, type ReactNode } from 'react';
import type { CustomRowDefinition } from '../../types';
import type { EventEmitter } from '../../hooks/useGanttEmitter';
import { buildCustomRowCellContext, type CustomRowMetrics } from './customRowMetrics';

interface AsyncCellProps {
  row: CustomRowDefinition;
  columnKey: string;
  columnIndex: number;
  rowIndex: number;
  metrics: CustomRowMetrics;
  emit: EventEmitter;
  timeline?: boolean;
}

function metricsRevision(metrics: CustomRowMetrics, timeline: boolean): string {
  const parts = [
    metrics.zoomLevel,
    metrics.columnWidth,
    metrics.timelineWidth,
    metrics.msPerPixel,
    metrics.rangeStart.getTime(),
    metrics.rangeEnd.getTime(),
    metrics.rowHeight,
  ];
  if (timeline) {
    parts.push(
      metrics.visibleColumns.startIndex,
      metrics.visibleColumns.endIndex,
    );
  }
  return parts.join('|');
}

export const AsyncCustomCell = memo(function AsyncCustomCell({
  row,
  columnKey,
  columnIndex,
  rowIndex,
  metrics,
  emit,
  timeline = false,
}: AsyncCellProps) {
  const [content, setContent] = useState<ReactNode>(null);
  const [loading, setLoading] = useState(true);
  const metricsRef = useRef(metrics);
  metricsRef.current = metrics;

  const revision = metricsRevision(metrics, timeline);

  useEffect(() => {
    let cancelled = false;
    const generator = row.cells[columnKey];
    if (!generator) {
      setContent(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ctx = buildCustomRowCellContext(
      row,
      columnKey,
      columnIndex,
      rowIndex,
      metricsRef.current,
    );

    Promise.resolve(generator(ctx))
      .then((result) => {
        if (cancelled) return;
        setContent(result);
        setLoading(false);
        emit('customRowCellReady', { rowId: row.id, columnKey });
      })
      .catch((error) => {
        if (cancelled) return;
        setContent(null);
        setLoading(false);
        emit('customRowCellError', { rowId: row.id, columnKey, error });
      });

    return () => {
      cancelled = true;
    };
  }, [
    row.id,
    columnKey,
    columnIndex,
    rowIndex,
    revision,
    row.meta,
    row.height,
    emit,
    timeline,
  ]);

  const className = loading ? 'rg-custom-cell rg-custom-cell--loading' : 'rg-custom-cell';
  if (loading) {
    return timeline ? <div className={className}>…</div> : <span className={className}>…</span>;
  }
  return timeline ? <div className={className}>{content}</div> : <span className={className}>{content}</span>;
});
