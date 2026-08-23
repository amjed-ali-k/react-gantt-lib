import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  computeDraggableMarkerPositions,
  computeDraggableMarkerSnapPoints,
  resolveMarkerPositionFromX,
  resolveNearestSnapPoint,
  type DraggableMarkerInteractionFlags,
} from '../../core/draggableMarkers';
import { resolveTimelineWidth } from '../../core/zoom';
import type { DraggableMarker, DraggableMarkerSnapPoint, TimelineRange } from '../../types';
import type { ViewScale } from '../../core/scale';
import type { TimelineBounds } from '../../core/zoom';
import type { EventEmitter } from '../../hooks/useGanttEmitter';
import { toDate } from '../../core/dates';
import { createPointerDetail } from './pointerDetail';

const HIT_WIDTH = 12;
const LABEL_OFFSET = HIT_WIDTH / 2 + 4;

interface DraggableMarkersLayerProps {
  markers: DraggableMarker[];
  snapPoints?: DraggableMarkerSnapPoint[];
  range: TimelineRange;
  scale: ViewScale;
  columnWidth: number;
  totalHeight: number;
  snapToGrid?: boolean;
  timelineBounds?: TimelineBounds;
  interactionFlags: DraggableMarkerInteractionFlags;
  emit?: EventEmitter;
}

interface DragSession {
  index: number;
  marker: DraggableMarker;
  originDate: Date;
  lineEl: SVGLineElement;
  hitEl: HTMLDivElement | null;
  activeSnapPointIndex: number | null;
}

function clientXToTimelineX(
  clientX: number,
  layerRect: DOMRect,
  timelineWidth: number,
): number {
  return ((clientX - layerRect.left) / layerRect.width) * timelineWidth;
}

function setMarkerX(
  x: number,
  lineEl: SVGLineElement,
  hitEl: HTMLDivElement | null,
) {
  lineEl.setAttribute('x1', String(x));
  lineEl.setAttribute('x2', String(x));
  if (hitEl) {
    hitEl.style.left = `${x - HIT_WIDTH / 2}px`;
  }
}

export const DraggableMarkersLayer = memo(function DraggableMarkersLayer({
  markers,
  snapPoints,
  range,
  scale,
  columnWidth,
  totalHeight,
  snapToGrid = true,
  timelineBounds,
  interactionFlags,
  emit,
}: DraggableMarkersLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef(new Map<string, SVGLineElement>());
  const hitRefs = useRef(new Map<string, HTMLDivElement>());
  const dragRef = useRef<DragSession | null>(null);
  const didDragRef = useRef(false);
  const flagsRef = useRef(interactionFlags);
  flagsRef.current = interactionFlags;
  const [isDragging, setIsDragging] = useState(false);

  const { dragEnabled, clickEnabled, useSnapPoints } = interactionFlags;
  const renderHitTargets = dragEnabled || clickEnabled;

  const timelineWidth = resolveTimelineWidth(range, columnWidth);

  const resolved = useMemo(
    () => computeDraggableMarkerPositions(markers, range, scale, columnWidth),
    [markers, range, scale, columnWidth],
  );

  const resolvedSnapPoints = useMemo(
    () =>
      useSnapPoints
        ? computeDraggableMarkerSnapPoints(snapPoints, range, scale, columnWidth)
        : [],
    [useSnapPoints, snapPoints, range, scale, columnWidth],
  );

  const resolvePositionFromX = useCallback(
    (x: number, snap: boolean) =>
      resolveMarkerPositionFromX(
        x,
        range.start,
        scale,
        columnWidth,
        snap && !useSnapPoints ? snapToGrid : false,
        timelineWidth,
        timelineBounds,
        snap && useSnapPoints ? resolvedSnapPoints : undefined,
      ),
    [
      range.start,
      scale,
      columnWidth,
      snapToGrid,
      timelineWidth,
      timelineBounds,
      useSnapPoints,
      resolvedSnapPoints,
    ],
  );

  const resolvePositionFromClient = useCallback(
    (clientX: number, snap: boolean) => {
      const layer = layerRef.current;
      if (!layer) {
        return { x: 0, date: new Date(), stepIndex: 0 };
      }
      const x = clientXToTimelineX(
        clientX,
        layer.getBoundingClientRect(),
        timelineWidth,
      );
      return resolvePositionFromX(x, snap);
    },
    [timelineWidth, resolvePositionFromX],
  );

  const endDrag = useCallback(
    (session: DragSession, clientX: number) => {
      const flags = flagsRef.current;
      const position = resolvePositionFromClient(clientX, true);
      const { marker, index, originDate, lineEl, hitEl } = session;

      if (flags.emitDragEnd && emit) {
        emit('draggableMarkerDragEnd', {
          marker,
          index,
          date: position.date,
          previousDate: originDate,
          snapPoint: position.snapPoint?.snapPoint,
          snapPointIndex: position.snapPoint?.index,
        });
      }

      if (flags.emitDragToSnapPoint && position.snapPoint && emit) {
        emit('draggableMarkerDragToSnapPoint', {
          marker,
          index,
          snapPoint: position.snapPoint.snapPoint,
          snapPointIndex: position.snapPoint.index,
          date: position.date,
          previousDate: originDate,
          phase: 'end',
        });
      }

      setMarkerX(position.x, lineEl, hitEl);

      dragRef.current = null;
      setIsDragging(false);
      lineEl.classList.remove('rg-draggable-marker-line--dragging');
    },
    [emit, resolvePositionFromClient],
  );

  useEffect(() => {
    if (!isDragging) return;

    const onPointerMove = (e: PointerEvent) => {
      const session = dragRef.current;
      const layer = layerRef.current;
      const flags = flagsRef.current;
      if (!session || !layer) return;

      didDragRef.current = true;
      const x = clientXToTimelineX(
        e.clientX,
        layer.getBoundingClientRect(),
        timelineWidth,
      );

      const position = resolvePositionFromX(x, useSnapPoints);
      setMarkerX(position.x, session.lineEl, session.hitEl);

      if (
        flags.emitDragToSnapPoint &&
        position.snapPoint &&
        position.snapPoint.index !== session.activeSnapPointIndex &&
        emit
      ) {
        session.activeSnapPointIndex = position.snapPoint.index;
        emit('draggableMarkerDragToSnapPoint', {
          marker: session.marker,
          index: session.index,
          snapPoint: position.snapPoint.snapPoint,
          snapPointIndex: position.snapPoint.index,
          date: position.date,
          previousDate: session.originDate,
          phase: 'drag',
        });
      }

      if (flags.emitDrag && emit) {
        emit('draggableMarkerDrag', {
          marker: session.marker,
          index: session.index,
          date: position.date,
          previousDate: session.originDate,
          deltaMs: position.date.getTime() - session.originDate.getTime(),
        });
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const session = dragRef.current;
      if (!session) return;
      endDrag(session, e.clientX);
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
    return () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
    };
  }, [isDragging, timelineWidth, useSnapPoints, resolvePositionFromX, emit, endDrag]);

  const beginDrag = useCallback(
    (resolvedMarker: (typeof resolved)[number]) => (e: ReactPointerEvent) => {
      const flags = flagsRef.current;
      if (!resolvedMarker.draggable || !flags.dragEnabled) return;

      e.preventDefault();
      e.stopPropagation();

      const lineEl = lineRefs.current.get(resolvedMarker.key);
      if (!lineEl) return;
      const hitEl = hitRefs.current.get(resolvedMarker.key) ?? null;

      didDragRef.current = false;
      const originDate = toDate(resolvedMarker.marker.date);
      const originSnap =
        useSnapPoints && resolvedSnapPoints.length > 0
          ? resolveNearestSnapPoint(resolvedMarker.x, resolvedSnapPoints)
          : null;

      if (flags.emitDragStart && emit) {
        emit('draggableMarkerDragStart', {
          marker: resolvedMarker.marker,
          index: resolvedMarker.index,
          date: originDate,
        });
      }

      lineEl.classList.add('rg-draggable-marker-line--dragging');
      dragRef.current = {
        index: resolvedMarker.index,
        marker: resolvedMarker.marker,
        originDate,
        lineEl,
        hitEl,
        activeSnapPointIndex: originSnap?.index ?? null,
      };
      setIsDragging(true);
    },
    [emit, useSnapPoints, resolvedSnapPoints],
  );

  const handleClick = (
    resolvedMarker: (typeof resolved)[number],
    e: React.MouseEvent,
  ) => {
    const flags = flagsRef.current;
    if (!flags.clickEnabled || !emit || didDragRef.current) return;
    e.stopPropagation();
    emit(
      'ganttClick',
      createPointerDetail(
        { type: 'draggableMarker', marker: resolvedMarker.marker, index: resolvedMarker.index },
        e,
      ),
    );
  };

  if (resolved.length === 0) return null;

  return (
    <div
      ref={layerRef}
      className={`rg-draggable-markers${renderHitTargets ? ' rg-draggable-markers--interactive' : ''}`}
      style={{ height: totalHeight }}
      data-testid="draggable-markers"
    >
      <svg
        className="rg-draggable-markers-svg"
        width="100%"
        height={totalHeight}
        viewBox={`0 0 ${timelineWidth} ${totalHeight}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        {resolved.map((item) => (
          <line
            key={item.key}
            ref={(el) => {
              if (el) lineRefs.current.set(item.key, el);
              else lineRefs.current.delete(item.key);
            }}
            x1={item.x}
            y1={0}
            x2={item.x}
            y2={totalHeight}
            className="rg-draggable-marker-line"
            style={item.color ? ({ stroke: item.color } as CSSProperties) : undefined}
            strokeWidth={2}
          />
        ))}
      </svg>
      {!renderHitTargets &&
        resolved.map(
          (item) =>
            item.label && (
              <div
                key={`label-${item.key}`}
                className="rg-draggable-marker-label rg-draggable-marker-label--static"
                style={{
                  left: item.x + 4,
                  ...(item.color ? { color: item.color, borderColor: item.color } : {}),
                }}
              >
                {item.label}
              </div>
            ),
        )}
      {renderHitTargets &&
        resolved.map((item) => (
          <div
            key={`hit-${item.key}`}
            ref={(el) => {
              if (el) hitRefs.current.set(item.key, el);
              else hitRefs.current.delete(item.key);
            }}
            className={`rg-draggable-marker-hit${
              dragEnabled && item.draggable ? ' rg-draggable-marker-hit--draggable' : ''
            }`}
            style={{ left: item.x - HIT_WIDTH / 2, width: HIT_WIDTH, height: totalHeight }}
            tabIndex={clickEnabled || (dragEnabled && item.draggable) ? 0 : -1}
            aria-label={item.label ?? `Draggable marker ${item.marker.id}`}
            onPointerDown={
              dragEnabled && item.draggable ? beginDrag(item) : undefined
            }
            onClick={clickEnabled ? (e) => handleClick(item, e) : undefined}
          >
            {item.label && (
              <div
                className="rg-draggable-marker-label"
                style={{
                  left: LABEL_OFFSET,
                  ...(item.color ? { color: item.color, borderColor: item.color } : {}),
                }}
              >
                {item.label}
              </div>
            )}
          </div>
        ))}
    </div>
  );
});
