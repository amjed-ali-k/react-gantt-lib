import { memo, useMemo, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import type { EventEmitter } from '../../hooks/useGanttEmitter';
import type { GanttDependencyPointerDetail } from '../../types';
import { createPointerDetail } from './pointerDetail';
import { dependencyAccessibleName, type DependencyLink } from './dependencyLinks';
import {
  dependencyLagLabel,
  useDependencyLinks,
  type DependencyLagFormatter,
  type DependencyLinkLayerProps,
} from './DependencyLayer';

interface DependencyHitTargetsProps extends DependencyLinkLayerProps {
  selectedDependencyIds?: string[];
  formatLag?: DependencyLagFormatter;
  emit: EventEmitter;
  /** Selects a link — `multi` toggles it instead (ctrl/meta-click). */
  onSelect: (id: string, multi: boolean) => void;
}

function pointerDetail(
  link: DependencyLink,
  e: Parameters<typeof createPointerDetail>[1],
): GanttDependencyPointerDetail {
  return { ...createPointerDetail(link.target, e), target: link.target };
}

/**
 * Invisible, wide hit strokes over each link, rendered as the first children of the bars' SVG:
 * the bars paint over them (so a bar keeps its own pointer events) while a click on a link in
 * the space between bars lands here. Only these strokes take pointer events.
 *
 * Each stroke is focusable: Enter/Space selects the link like a click, and the chart turns
 * Delete/Backspace into `dependencyDelete` while any link is selected.
 */
export const DependencyHitTargets = memo(function DependencyHitTargets({
  selectedDependencyIds,
  formatLag,
  emit,
  onSelect,
  ...layout
}: DependencyHitTargetsProps) {
  const links = useDependencyLinks(layout);
  const selected = useMemo(() => new Set(selectedDependencyIds), [selectedDependencyIds]);

  if (links.length === 0) return null;

  const activate = (link: DependencyLink, detail: GanttDependencyPointerDetail) => {
    onSelect(link.id, !!(detail.ctrlKey || detail.metaKey));
    emit('dependencyClick', detail);
    emit('ganttClick', detail);
  };

  return (
    <g className="rg-dependency-hits" data-testid="dependency-hits">
      {links.map((link) => {
        const handleClick = (e: MouseEvent<SVGPathElement>) => {
          e.stopPropagation();
          activate(link, pointerDetail(link, e));
        };
        const handleKeyDown = (e: KeyboardEvent<SVGPathElement>) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          const box = e.currentTarget.getBoundingClientRect();
          activate(
            link,
            pointerDetail(link, {
              clientX: box.left + box.width / 2,
              clientY: box.top + box.height / 2,
              ctrlKey: e.ctrlKey,
              metaKey: e.metaKey,
              shiftKey: e.shiftKey,
              preventDefault: () => e.preventDefault(),
            }),
          );
        };
        const handleContextMenu = (e: MouseEvent<SVGPathElement>) => {
          e.stopPropagation();
          const detail = pointerDetail(link, e);
          emit('dependencyContextMenu', detail);
          emit('ganttContextMenu', detail);
        };
        const hover = (phase: 'enter' | 'leave') => (e: PointerEvent<SVGPathElement>) => {
          const detail = { target: link.target, phase, clientX: e.clientX, clientY: e.clientY };
          emit('dependencyHover', detail);
          emit('ganttHover', detail);
        };
        const isSelected = selected.has(link.id);

        return (
          <path
            key={link.id}
            d={link.d}
            className={`rg-dependency-hit${isSelected ? ' rg-dependency-hit--selected' : ''}`}
            fill="none"
            stroke="transparent"
            pointerEvents="stroke"
            tabIndex={0}
            role="button"
            aria-pressed={isSelected}
            aria-label={dependencyAccessibleName(link, dependencyLagLabel(link, formatLag))}
            data-dependency-id={link.id}
            data-dependency-type={link.type}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            onContextMenu={handleContextMenu}
            onPointerEnter={hover('enter')}
            onPointerLeave={hover('leave')}
          />
        );
      })}
    </g>
  );
});
