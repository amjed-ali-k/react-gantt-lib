import { memo, type ReactNode } from 'react';
import { useMemo, useRef } from 'react';
import { addScaleSteps } from '../core/scale';
import { useGanttTimeline } from '../context/GanttChartContext';

export interface VirtualColumnSegment<T> {
  columnIndex: number;
  x: number;
  width: number;
  date: Date;
  data: T;
}

/**
 * Virtualized timeline column segments with incremental caching.
 * Only newly entered columns invoke `compute`; existing columns are reused while
 * they remain inside the buffered window.
 */
export function useVirtualColumnSegments<T>(
  compute: (columnIndex: number, date: Date) => T,
  resetKey?: string,
): VirtualColumnSegment<T>[] {
  const { visibleColumns, columnWidth, range, scale } = useGanttTimeline();
  const cacheRef = useRef(new Map<number, VirtualColumnSegment<T>>());
  const resetRef = useRef(resetKey);
  const computeRef = useRef(compute);
  computeRef.current = compute;

  if (resetRef.current !== resetKey) {
    cacheRef.current.clear();
    resetRef.current = resetKey;
  }

  return useMemo(() => {
    const { startIndex, endIndex } = visibleColumns;
    if (endIndex < startIndex) return [];

    const active = new Set<number>();
    const result: VirtualColumnSegment<T>[] = [];

    for (let i = startIndex; i <= endIndex; i++) {
      active.add(i);
      let segment = cacheRef.current.get(i);
      if (!segment) {
        const date = addScaleSteps(range.start, i, scale);
        segment = {
          columnIndex: i,
          x: i * columnWidth,
          width: columnWidth,
          date,
          data: computeRef.current(i, date),
        };
        cacheRef.current.set(i, segment);
      }
      result.push(segment);
    }

    for (const key of [...cacheRef.current.keys()]) {
      if (!active.has(key)) {
        cacheRef.current.delete(key);
      }
    }

    return result;
  }, [
    visibleColumns.startIndex,
    visibleColumns.endIndex,
    columnWidth,
    range.start,
    scale,
    resetKey,
  ]);
}

interface VirtualColumnCellProps {
  columnIndex: number;
  x: number;
  width: number;
  className?: string;
  title?: string;
  children: ReactNode;
}

/** Memoized absolutely-positioned cell for one virtual timeline column. */
export const VirtualColumnCell = memo(
  function VirtualColumnCell({
    columnIndex,
    x,
    width,
    className,
    title,
    children,
  }: VirtualColumnCellProps) {
    return (
      <div
        className={className}
        data-column-index={columnIndex}
        title={title}
        style={{
          position: 'absolute',
          left: x,
          width,
          top: 0,
          height: '100%',
        }}
      >
        {children}
      </div>
    );
  },
  (prev, next) =>
    prev.columnIndex === next.columnIndex &&
    prev.x === next.x &&
    prev.width === next.width &&
    prev.className === next.className &&
    prev.title === next.title &&
    prev.children === next.children,
);
