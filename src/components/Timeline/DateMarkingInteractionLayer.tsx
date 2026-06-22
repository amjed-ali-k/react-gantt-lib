import type { MouseEvent } from 'react';
import type { BlockDateRange, DateMarkingLayers } from '../../types';
import type { EventEmitter } from '../../hooks/useGanttEmitter';
import { createPointerDetail } from './pointerDetail';

interface DateMarkingInteractionLayerProps {
  dateMarkings?: DateMarkingLayers;
  blockDates?: BlockDateRange[];
  height: number;
  interactive: boolean;
  emit: EventEmitter;
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

  return (
    <svg className="rg-date-marking-interaction" width="100%" height={height}>
      {rects.map((rect) => {
        const handleClick = (e: MouseEvent) => {
          e.stopPropagation();
          if (rect.kind === 'block') {
            const index = rect.sourceIndex ?? 0;
            const range = blockDates?.[index];
            if (!range) return;
            emit(
              'ganttClick',
              createPointerDetail({ type: 'blockDate', range, index }, e),
            );
            return;
          }
          if (!rect.date) return;
          emit(
            'ganttClick',
            createPointerDetail(
              {
                type: 'holiday',
                date: rect.date,
                label: rect.label,
                index: rect.sourceIndex,
              },
              e,
            ),
          );
        };

        const handleContextMenu = (e: MouseEvent) => {
          e.stopPropagation();
          if (rect.kind === 'block') {
            const index = rect.sourceIndex ?? 0;
            const range = blockDates?.[index];
            if (!range) return;
            emit(
              'ganttContextMenu',
              createPointerDetail({ type: 'blockDate', range, index }, e),
            );
            return;
          }
          if (!rect.date) return;
          emit(
            'ganttContextMenu',
            createPointerDetail(
              {
                type: 'holiday',
                date: rect.date,
                label: rect.label,
                index: rect.sourceIndex,
              },
              e,
            ),
          );
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
          />
        );
      })}
    </svg>
  );
}
