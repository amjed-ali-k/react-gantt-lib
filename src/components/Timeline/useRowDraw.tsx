import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode, RefObject } from 'react';
import type { ResolvedTask, TimelineRange } from '../../types';
import type { ViewScale } from '../../core/scale';
import { addScaleSteps } from '../../core/scale';
import type { RowLayout } from '../../core/rowLayout';
import { resolveRowAtY } from '../../core/timelineInteraction';
import type { EventEmitter } from '../../hooks/useGanttEmitter';

/** A press that moves less than this is a click, not a drawing. */
const DRAW_THRESHOLD_PX = 4;

interface DrawState {
  rowIndex: number;
  fromX: number;
  toX: number;
}

interface UseRowDrawOptions {
  tasks: ResolvedTask[];
  rowLayouts: RowLayout[];
  range: TimelineRange;
  scale: ViewScale;
  columnWidth: number;
  svgRef: RefObject<SVGSVGElement | null>;
  emit: EventEmitter;
}

/**
 * Drawing a bar on a drawable row (`GanttTask.drawable`): press on its empty stretch, drag across
 * the columns, release. The span is whole columns; `taskDraw` reports it and the host decides what
 * it means. A bar, a link or a connector under the pointer is never a drawing.
 */
export function useRowDraw({
  tasks,
  rowLayouts,
  range,
  scale,
  columnWidth,
  svgRef,
  emit,
}: UseRowDrawOptions) {
  const [draw, setDraw] = useState<DrawState | null>(null);
  const drawRef = useRef<DrawState | null>(null);
  const available = tasks.some((task) => task.drawable && !task.readOnly);

  const xOf = useCallback(
    (clientX: number) => {
      const rect = svgRef.current?.getBoundingClientRect();
      return rect ? clientX - rect.left : 0;
    },
    [svgRef],
  );

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (e.button !== 0 || !svgRef.current) return;
      const target = e.target as Element;
      if (target !== svgRef.current && !target.classList.contains('rg-draw-surface')) return;
      const rect = svgRef.current.getBoundingClientRect();
      const rowIndex = resolveRowAtY(e.clientY - rect.top, rowLayouts);
      const row = rowIndex === null ? undefined : tasks[rowIndex];
      if (rowIndex === null || !row?.drawable || row.readOnly) return;
      e.preventDefault();
      const x = xOf(e.clientX);
      const next = { rowIndex, fromX: x, toX: x };
      drawRef.current = next;
      setDraw(next);
    },
    [svgRef, rowLayouts, tasks, xOf],
  );

  const active = draw !== null;
  useEffect(() => {
    if (!active) return;
    const finish = (clientX: number | null) => {
      const session = drawRef.current;
      drawRef.current = null;
      setDraw(null);
      if (!session || clientX === null) return;
      const toX = xOf(clientX);
      if (Math.abs(toX - session.fromX) < DRAW_THRESHOLD_PX) return;
      const row = tasks[session.rowIndex];
      if (!row) return;
      const first = Math.floor(Math.min(session.fromX, toX) / columnWidth);
      const last = Math.floor(Math.max(session.fromX, toX) / columnWidth);
      emit('taskDraw', {
        task: row,
        start: addScaleSteps(range.start, first, scale),
        end: addScaleSteps(range.start, last + 1, scale),
      });
    };
    const move = (e: PointerEvent) => {
      const session = drawRef.current;
      if (!session) return;
      const next = { ...session, toX: xOf(e.clientX) };
      drawRef.current = next;
      setDraw(next);
    };
    const up = (e: PointerEvent) => finish(e.clientX);
    const cancel = () => finish(null);
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancel();
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', cancel);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', cancel);
      document.removeEventListener('keydown', key);
    };
  }, [active, tasks, columnWidth, range.start, scale, emit, xOf]);

  let preview: ReactNode = null;
  if (draw && Math.abs(draw.toX - draw.fromX) >= DRAW_THRESHOLD_PX) {
    const row = rowLayouts[draw.rowIndex];
    const first = Math.floor(Math.min(draw.fromX, draw.toX) / columnWidth);
    const last = Math.floor(Math.max(draw.fromX, draw.toX) / columnWidth);
    if (row) {
      preview = (
        <rect
          className="rg-draw-preview"
          data-testid="draw-preview"
          x={first * columnWidth}
          y={row.y + 4}
          width={(last - first + 1) * columnWidth}
          height={Math.max(8, row.height - 8)}
          rx={4}
          pointerEvents="none"
        />
      );
    }
  }

  return { available, onPointerDown, preview };
}
