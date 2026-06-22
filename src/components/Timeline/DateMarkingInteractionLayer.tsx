import type { MouseEvent } from 'react';
import type { BlockDateRange, DateMarkingLayers, GanttTarget } from '../../types';
import type { EventEmitter } from '../../hooks/useGanttEmitter';
import { createPointerDetail } from './pointerDetail';

interface DateMarkingInteractionLayerProps {
  dateMarkings?: DateMarkingLayers;
  blockDates?: BlockDateRange[];
  height: number;
  interactive: boolean;
  emit: EventEmitter;
}

function targetFromRect(
  rect: NonNullable<DateMarkingLayers>['blocks'][number],
  blockDates?: BlockDateRange[],
): GanttTarget | null {
  if (rect.kind === 'block') {
    const index = rect.sourceIndex ?? 0;
    const range = blockDates?.[index];
    if (!range) return null;
    return { type: 'blockDate', range, index };
  }
  if (!rect.date) return null;
  return {
    type: 'holiday',
    date: rect.date,
    label: rect.label,
    index: rect.sourceIndex,
  };
}

export function DateMarkingInteractionLayer({
  dateMarkings,
  blockDates,
  height,
  interactive,
  emit,
}: DateMarkingInteractionLayerProps) {
  if (!interactive || !dateMarkings) return null;

  const rects = [...dateMarkings.holidays, ...dateMarkings.blocks];
  if (rects.length === 0) return null;

  const emitHover = (
    target: GanttTarget | null,
    phase: 'enter' | 'leave' | 'move',
    e: MouseEvent,
  ) => {
    emit('ganttHover', {
      target,
      phase,
      clientX: e.clientX,
      clientY: e.clientY,
    });
  };

  return (
    <svg className="rg-date-marking-interaction" width="100%" height={height}>
      {rects.map((rect) => {
        const handleClick = (e: MouseEvent) => {
          e.stopPropagation();
          const target = targetFromRect(rect, blockDates);
          if (!target) return;
          emit('ganttClick', createPointerDetail(target, e));
        };

        const handleContextMenu = (e: MouseEvent) => {
          e.stopPropagation();
          const target = targetFromRect(rect, blockDates);
          if (!target) return;
          emit('ganttContextMenu', createPointerDetail(target, e));
        };

        const handleMouseEnter = (e: MouseEvent) => {
          const target = targetFromRect(rect, blockDates);
          if (!target) return;
          emitHover(target, 'enter', e);
        };

        const handleMouseMove = (e: MouseEvent) => {
          const target = targetFromRect(rect, blockDates);
          if (!target) return;
          emitHover(target, 'move', e);
        };

        const handleMouseLeave = (e: MouseEvent) => {
          const target = targetFromRect(rect, blockDates);
          emitHover(target, 'leave', e);
        };

        return (
          <rect
            key={rect.key}
            x={rect.x}
            y={0}
            width={rect.width}
            height={height}
            fill="transparent"
            className={`rg-date-marking-hit rg-date-marking-hit--${rect.kind}`}
            data-testid={`date-marking-hit-${rect.kind}`}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            onMouseEnter={handleMouseEnter}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />
        );
      })}
    </svg>
  );
}
