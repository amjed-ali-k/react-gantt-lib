import { memo } from 'react';
import type { ResolvedTask, TimelineRange } from '../../types';
import type { ViewScale } from '../../core/scale';
import type { RowLayout } from '../../core/rowLayout';
import { shouldRenderTaskBar } from '../../core/groupTasks';
import { computeBarWidthExact, computeBarXExact } from '../../core/zoom';

/** How far inside the viewport edge a chevron sits, and the size of its button. */
const EDGE_INSET = 6;
const BUTTON_SIZE = 22;

interface RowOverlaysProps {
  tasks: ResolvedTask[];
  rowLayouts: RowLayout[];
  range: TimelineRange;
  scale: ViewScale;
  columnWidth: number;
  scrollLeft: number;
  viewportWidth: number;
  /** Draws a band under the hovered row (the chart moves it; see `highlightHoveredRow`). */
  hoverBand: boolean;
  /** Draws a chevron in each row whose bar is out of view. */
  indicators: boolean;
  onReveal: (taskId: string) => void;
}

/**
 * What sits over the rows without taking space: the hovered row's band, and the edge chevrons of
 * rows whose bar is scrolled out of view. A zero-height layer at the rows' origin, so a row's `y`
 * is its offset here; the chevrons ride a sticky strip as wide as the viewport.
 */
export const RowOverlays = memo(function RowOverlays({
  tasks,
  rowLayouts,
  range,
  scale,
  columnWidth,
  scrollLeft,
  viewportWidth,
  hoverBand,
  indicators,
  onReveal,
}: RowOverlaysProps) {
  const chevrons: { task: ResolvedTask; row: RowLayout; side: 'before' | 'after' }[] = [];
  if (indicators && viewportWidth > 0) {
    tasks.forEach((task, i) => {
      if (!shouldRenderTaskBar(task, tasks)) return;
      const x = computeBarXExact(task._start, range.start, scale, columnWidth);
      const width = computeBarWidthExact(task._start, task._end, scale, columnWidth, range.start);
      const row = rowLayouts[i];
      if (!row) return;
      if (x + width <= scrollLeft) chevrons.push({ task, row, side: 'before' });
      else if (x >= scrollLeft + viewportWidth) chevrons.push({ task, row, side: 'after' });
    });
  }

  return (
    <div className="rg-row-overlays" aria-hidden={chevrons.length === 0 ? true : undefined}>
      {hoverBand && <div className="rg-row-hover-band" data-testid="row-hover-band" hidden />}
      {indicators && (
        <div className="rg-offscreen-strip" style={{ width: viewportWidth }}>
          {chevrons.map(({ task, row, side }) => (
            <button
              key={task.id}
              type="button"
              // Keyboard users reach every bar with the arrow keys, which scrolls to it.
              tabIndex={-1}
              className={`rg-offscreen rg-offscreen--${side}`}
              data-testid="offscreen-chevron"
              data-side={side}
              data-for-task={task.id}
              aria-label={`Scroll to ${task.name} (${side === 'before' ? 'earlier' : 'later'})`}
              style={{
                top: row.y + (row.height - BUTTON_SIZE) / 2,
                ...(side === 'before'
                  ? { left: EDGE_INSET }
                  : { left: viewportWidth - BUTTON_SIZE - EDGE_INSET }),
              }}
              onClick={(e) => {
                e.stopPropagation();
                onReveal(task.id);
              }}
            >
              <span aria-hidden="true">{side === 'before' ? '‹' : '›'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
