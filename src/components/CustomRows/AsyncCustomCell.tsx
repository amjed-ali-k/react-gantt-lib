import { useEffect, useState, useRef, memo, type ReactNode } from 'react';
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
  const genRef = useRef(row.cells[columnKey]);

  useEffect(() => {
    genRef.current = row.cells[columnKey];
  }, [row.cells, columnKey]);

  useEffect(() => {
    let cancelled = false;
    const generator = row.cells[columnKey];
    if (!generator) {
      setContent(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ctx = buildCustomRowCellContext(row, columnKey, columnIndex, rowIndex, metrics);

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
    metrics.zoomLevel,
    metrics.scale,
    metrics.columnWidth,
    metrics.timelineWidth,
    metrics.msPerPixel,
    metrics.rangeStart.getTime(),
    metrics.rangeEnd.getTime(),
    metrics.rowHeight,
    row.height,
    row.meta,
    emit,
  ]);

  const className = loading ? 'rg-custom-cell rg-custom-cell--loading' : 'rg-custom-cell';
  if (loading) {
    return timeline ? <div className={className}>…</div> : <span className={className}>…</span>;
  }
  return timeline ? <div className={className}>{content}</div> : <span className={className}>{content}</span>;
});
