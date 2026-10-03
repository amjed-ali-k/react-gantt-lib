import { memo, useMemo, useState, type FocusEvent, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import type { EventEmitter } from '../../hooks/useGanttEmitter';
import type { GanttDependencyPointerDetail } from '../../types';
import { createPointerDetail } from './pointerDetail';
import { escapeAttribute } from './barElement';
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

/** The link a delegated event came from, by the hit stroke's `data-dependency-id`. */
function linkOf(byId: Map<string, DependencyLink>, e: { target: EventTarget }): DependencyLink | undefined {
  const id = e.target instanceof Element ? e.target.getAttribute('data-dependency-id') : null;
  return id === null ? undefined : byId.get(id);
}

/**
 * Invisible, wide hit strokes over each link, rendered as the first children of the bars' SVG:
 * the bars paint over them (so a bar keeps its own pointer events) while a click on a link in
 * the space between bars lands here. Only these strokes take pointer events; the handlers are
 * delegated to the group, so each stroke carries only static props.
 *
 * The links are one tab stop (roving tabindex): arrow keys and Home/End move between them, Enter or
 * Space selects the focused one like a click, and the chart turns Delete/Backspace into
 * `dependencyDelete` while any link is selected.
 */
export const DependencyHitTargets = memo(function DependencyHitTargets({
  selectedDependencyIds,
  formatLag,
  emit,
  onSelect,
  ...layout
}: DependencyHitTargetsProps) {
  const links = useDependencyLinks(layout);
  const byId = useMemo(() => new Map(links.map((link) => [link.id, link])), [links]);
  const selected = useMemo(() => new Set(selectedDependencyIds), [selectedDependencyIds]);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  if (links.length === 0) return null;

  // The tab stop: the link last focused, else the first selected one, else the first link.
  const tabStop =
    (focusedId !== null && byId.has(focusedId) ? focusedId : undefined) ??
    links.find((link) => selected.has(link.id))?.id ??
    links[0]!.id;

  const activate = (detail: GanttDependencyPointerDetail) => {
    onSelect(detail.target.id, !!(detail.ctrlKey || detail.metaKey));
    emit('dependencyClick', detail);
    emit('ganttClick', detail);
  };

  const handleClick = (e: MouseEvent<SVGGElement>) => {
    const link = linkOf(byId, e);
    if (!link) return;
    e.stopPropagation();
    activate(createPointerDetail(link.target, e));
  };

  const moveFocus = (e: KeyboardEvent<SVGGElement>, from: DependencyLink): boolean => {
    const index = links.indexOf(from);
    const last = links.length - 1;
    const next =
      e.key === 'ArrowDown' || e.key === 'ArrowRight'
        ? Math.min(last, index + 1)
        : e.key === 'ArrowUp' || e.key === 'ArrowLeft'
          ? Math.max(0, index - 1)
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : -1;
    if (next < 0) return false;
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget.querySelector<SVGPathElement>(
      `[data-dependency-id="${escapeAttribute(links[next]!.id)}"]`,
    );
    target?.focus();
    return true;
  };

  const handleFocus = (e: FocusEvent<SVGGElement>) => {
    const link = linkOf(byId, e);
    if (link) setFocusedId(link.id);
  };

  const handleKeyDown = (e: KeyboardEvent<SVGGElement>) => {
    const link = linkOf(byId, e);
    if (link && moveFocus(e, link)) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (!link || !(e.target instanceof Element)) return;
    e.preventDefault();
    const box = e.target.getBoundingClientRect();
    activate(
      createPointerDetail(link.target, {
        clientX: box.left + box.width / 2,
        clientY: box.top + box.height / 2,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        shiftKey: e.shiftKey,
        preventDefault: () => e.preventDefault(),
      }),
    );
  };

  const handleContextMenu = (e: MouseEvent<SVGGElement>) => {
    const link = linkOf(byId, e);
    if (!link) return;
    e.stopPropagation();
    const detail = createPointerDetail(link.target, e);
    emit('dependencyContextMenu', detail);
    emit('ganttContextMenu', detail);
  };

  // pointerover/out bubble (enter/leave do not), so the group sees each stroke being entered and left.
  const hover = (phase: 'enter' | 'leave') => (e: PointerEvent<SVGGElement>) => {
    const link = linkOf(byId, e);
    if (!link) return;
    const detail = { target: link.target, phase, clientX: e.clientX, clientY: e.clientY };
    emit('dependencyHover', detail);
    emit('ganttHover', detail);
  };

  return (
    <g
      className="rg-dependency-hits"
      role="group"
      aria-label="Dependencies"
      data-testid="dependency-hits"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onContextMenu={handleContextMenu}
      onPointerOver={hover('enter')}
      onPointerOut={hover('leave')}
    >
      {links.map((link) => {
        const isSelected = selected.has(link.id);
        return (
          <path
            key={link.id}
            d={link.d}
            className={`rg-dependency-hit${isSelected ? ' rg-dependency-hit--selected' : ''}`}
            fill="none"
            stroke="transparent"
            pointerEvents="stroke"
            tabIndex={link.id === tabStop ? 0 : -1}
            role="button"
            aria-pressed={isSelected}
            aria-label={dependencyAccessibleName(link, dependencyLagLabel(link, formatLag))}
            data-dependency-id={link.id}
            data-dependency-type={link.type}
          />
        );
      })}
    </g>
  );
});
