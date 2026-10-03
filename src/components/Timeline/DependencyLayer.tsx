import { memo, useMemo, type CSSProperties } from 'react';
import type { GanttDependency, ResolvedTask, TimelineRange } from '../../types';
import type { RowLayout } from '../../core/rowLayout';
import { totalRowLayoutHeight } from '../../core/rowLayout';
import { resolveTimelineWidth } from '../../core/zoom';
import type { ViewScale } from '../../core/scale';
import type { DragPreviewStore } from '../../hooks/useDragPreviewStore';
import { useDragPreviewSnapshot } from '../../hooks/useDragPreviewStore';
import { computeDependencyLinks, defaultDependencyLagLabel, type DependencyLink } from './dependencyLinks';

/** Everything a dependency layer needs to lay out links. Shared by the drawn and the hit layer. */
export interface DependencyLinkLayerProps {
  tasks: ResolvedTask[];
  range: TimelineRange;
  scale: ViewScale;
  columnWidth: number;
  rowLayouts: RowLayout[];
  showBaseline: boolean;
  dragPreviewStore: DragPreviewStore;
}

/**
 * Link geometry, following an in-flight drag. Each layer subscribes on its own, so a drag frame
 * re-renders the layers and not the timeline body. With interactive links that computes the
 * geometry twice per frame (drawn + hit layer); it is linear in the number of links.
 */
export function useDependencyLinks({
  tasks,
  range,
  scale,
  columnWidth,
  rowLayouts,
  showBaseline,
  dragPreviewStore,
}: DependencyLinkLayerProps): DependencyLink[] {
  const dragPreview = useDragPreviewSnapshot(dragPreviewStore);
  return useMemo(
    () =>
      computeDependencyLinks({
        tasks,
        rowLayouts,
        rangeStart: range.start,
        scale,
        columnWidth,
        showBaseline,
        preview: { taskId: dragPreview.taskId, dates: dragPreview.dates },
      }),
    [
      tasks,
      range.start,
      scale,
      columnWidth,
      rowLayouts,
      showBaseline,
      dragPreview.taskId,
      dragPreview.dates,
    ],
  );
}

export type DependencyLagFormatter = (lag: number, dependency: GanttDependency) => string;

/** Label text for a link's lag; `''` (no label) when the lag is zero or the formatter says so. */
export function dependencyLagLabel(link: DependencyLink, format?: DependencyLagFormatter): string {
  if (link.lag === 0) return '';
  return format ? format(link.lag, link.target.dependency) : defaultDependencyLagLabel(link.lag);
}

function dependencyClassName(link: DependencyLink, selected: boolean): string {
  const { dependency } = link.target;
  let cls = `rg-dependency rg-dependency--${link.type.toLowerCase()}`;
  if (selected) cls += ' rg-dependency--selected';
  if (dependency.critical) cls += ' rg-dependency--critical';
  if (dependency.className) cls += ` ${dependency.className}`;
  return cls;
}

interface DependencyLayerProps extends DependencyLinkLayerProps {
  selectedDependencyIds?: string[];
  formatLag?: DependencyLagFormatter;
}

/**
 * Draws dependency links under the bars: line, arrowhead and lag label per link, grouped so a
 * link's `color`, `className`, selection and `critical` style all three. Not interactive — the
 * hit strokes live in `DependencyHitTargets`, inside the bars' SVG.
 */
export const DependencyLayer = memo(function DependencyLayer({
  selectedDependencyIds,
  formatLag,
  ...layout
}: DependencyLayerProps) {
  const links = useDependencyLinks(layout);
  const selected = useMemo(() => new Set(selectedDependencyIds), [selectedDependencyIds]);

  if (links.length === 0) return null;

  const totalHeight = totalRowLayoutHeight(layout.rowLayouts);
  const timelineWidth = resolveTimelineWidth(layout.range, layout.columnWidth);

  return (
    <svg
      className="rg-dependency-layer"
      width={timelineWidth}
      height={totalHeight}
      style={{ pointerEvents: 'none' }}
      aria-hidden="true"
      data-testid="dependency-layer"
    >
      {links.map((link) => {
        const color = link.target.dependency.color;
        const lagLabel = dependencyLagLabel(link, formatLag);
        return (
          <g
            key={link.id}
            className={dependencyClassName(link, selected.has(link.id))}
            style={color ? ({ '--rg-dependency-color': color } as CSSProperties) : undefined}
            data-dependency-id={link.id}
            data-dependency-type={link.type}
          >
            <path d={link.d} className="rg-dependency-arrow" fill="none" />
            <polygon points={link.head} className="rg-dependency-arrow-head" />
            {lagLabel && (
              <text
                x={link.label.x + 4}
                y={link.label.y}
                className="rg-dependency-lag"
                dominantBaseline="middle"
              >
                {lagLabel}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
});
