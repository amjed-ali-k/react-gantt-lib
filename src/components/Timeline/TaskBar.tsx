import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { ResolvedTask, BarGeometry } from '../../types';
import type { EventEmitter } from '../../hooks/useGanttEmitter';
import type { TaskStore } from '../../hooks/useTaskStore';
import { useTaskVersion } from '../../hooks/useTaskStore';
import { toDate } from '../../core/dates';
import {
  getMsPerPixel,
  pixelDeltaToDates,
  finalizeDragDates,
  clampTaskDates,
  type TimelineBounds,
} from '../../core/zoom';
import type { ViewScale } from '../../core/scale';
import { milestoneDiamondPoints } from './milestoneGeometry';

export interface TaskBarProps {
  task: ResolvedTask;
  geometry: BarGeometry;
  columnWidth: number;
  scale: ViewScale;
  rangeStart: Date;
  store: TaskStore;
  selected?: boolean;
  enableDrag?: boolean;
  enableResize?: boolean;
  enableProgressDrag?: boolean;
  snapToGrid?: boolean;
  timelineBounds?: TimelineBounds;
  emit: EventEmitter;
  onTaskUpdate: (taskId: string, patch: { start?: Date; end?: Date; progress?: number }) => void;
}

type DragMode = 'move' | 'resize-start' | 'resize-end' | 'progress';

interface DragSession {
  mode: DragMode;
  originClientX: number;
  start: Date;
  end: Date;
  progress: number;
  barRect: DOMRect;
}

const HANDLE_WIDTH = 10;

function TaskBarInner({
  task,
  geometry,
  columnWidth,
  scale,
  store,
  enableDrag = true,
  enableResize = true,
  enableProgressDrag = true,
  snapToGrid = true,
  timelineBounds,
  rangeStart,
  emit,
  onTaskUpdate,
  selected = false,
}: TaskBarProps) {
  useTaskVersion(store, task.id);

  const groupRef = useRef<SVGGElement>(null);
  const dragRef = useRef<DragSession | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const taskRef = useRef(task);
  taskRef.current = task;

  const msPerPixel = getMsPerPixel(scale, columnWidth);

  const emitTaskHover = useCallback(
    (t: ResolvedTask, clientX: number, clientY: number, start?: Date, end?: Date) => {
      const hoverTask =
        start && end
          ? { ...t, start: start.toISOString(), end: end.toISOString() }
          : t;
      emit('taskHover', {
        task: hoverTask,
        rowIndex: t._rowIndex,
        clientX,
        clientY,
      });
    },
    [emit],
  );

  const endDrag = useCallback(
    (session: DragSession, pointer?: { clientX: number; clientY: number }) => {
      const t = taskRef.current;
      let start = toDate(t.start);
      let end = toDate(t.end);

      if (session.mode === 'move' || session.mode.startsWith('resize')) {
        const finalized = finalizeDragDates(start, end, scale, snapToGrid, rangeStart);
        start = finalized.start;
        end = finalized.end;
        if (timelineBounds) {
          const clamped = clampTaskDates(
            start,
            end,
            timelineBounds,
            session.mode === 'resize-start'
              ? 'resize-start'
              : session.mode === 'resize-end'
                ? 'resize-end'
                : 'move',
          );
          start = clamped.start;
          end = clamped.end;
        }
        if (t.type === 'milestone') {
          end = new Date(start.getTime());
        }
        onTaskUpdate(t.id, { start, end });
        if (pointer) {
          emitTaskHover(t, pointer.clientX, pointer.clientY, start, end);
        }
      }

      if (session.mode === 'move') {
        emit('taskDragEnd', {
          task: t,
          start,
          end,
          previousStart: session.start,
          previousEnd: session.end,
        });
      } else if (session.mode.startsWith('resize')) {
        emit('taskResizeEnd', {
          task: t,
          start,
          end,
          edge: session.mode === 'resize-start' ? 'start' : 'end',
          previousStart: session.start,
          previousEnd: session.end,
        });
      }

      dragRef.current = null;
      setIsDragging(false);
    },
    [scale, snapToGrid, timelineBounds, rangeStart, onTaskUpdate, emit, emitTaskHover],
  );

  useEffect(() => {
    if (!isDragging) return;
    const onPointerMove = (e: PointerEvent) => {
      const session = dragRef.current;
      if (!session) return;

      const t = taskRef.current;
      const dx = e.clientX - session.originClientX;

      if (session.mode === 'progress') {
        const relX = e.clientX - session.barRect.left;
        const progress = Math.max(
          0,
          Math.min(100, Math.round((relX / session.barRect.width) * 100)),
        );
        onTaskUpdate(t.id, { progress });
        emit('progressChange', { task: t, progress, previousProgress: session.progress });
        return;
      }

      let { start, end } = pixelDeltaToDates(
        session.mode,
        session.start,
        session.end,
        dx,
        msPerPixel,
      );
      if (timelineBounds) {
        ({ start, end } = clampTaskDates(
          start,
          end,
          timelineBounds,
          session.mode === 'move' ? 'move' : session.mode,
        ));
      }
      if (t.type === 'milestone') {
        end = new Date(start.getTime());
      }
      onTaskUpdate(t.id, { start, end });
      emitTaskHover(t, e.clientX, e.clientY, start, end);

      if (session.mode === 'move') {
        emit('taskDrag', {
          task: t,
          start,
          end,
          deltaMs: start.getTime() - session.start.getTime(),
        });
      } else {
        emit('taskResize', {
          task: t,
          start,
          end,
          edge: session.mode === 'resize-start' ? 'start' : 'end',
        });
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const session = dragRef.current;
      if (!session) return;
      endDrag(session, { clientX: e.clientX, clientY: e.clientY });
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
    return () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
    };
  }, [isDragging, msPerPixel, timelineBounds, onTaskUpdate, emit, endDrag, emitTaskHover]);

  const beginDrag = useCallback(
    (mode: DragMode) => (e: React.PointerEvent) => {
      if (mode === 'move' && !enableDrag) return;
      if ((mode === 'resize-start' || mode === 'resize-end') && !enableResize) return;
      if (mode === 'progress' && !enableProgressDrag) return;

      e.preventDefault();
      e.stopPropagation();

      const start = toDate(task.start);
      const end = toDate(task.end);
      const barRect = groupRef.current?.getBoundingClientRect() ?? e.currentTarget.getBoundingClientRect();

      if (mode === 'move') {
        emit('taskDragStart', { task, start, end });
      } else if (mode.startsWith('resize')) {
        emit('taskResizeStart', { task, edge: mode === 'resize-start' ? 'start' : 'end' });
      }

      if (mode === 'move' || mode.startsWith('resize')) {
        emitTaskHover(task, e.clientX, e.clientY, start, end);
      }

      dragRef.current = {
        mode,
        originClientX: e.clientX,
        start,
        end,
        progress: task.progress ?? 0,
        barRect,
      };
      setIsDragging(true);
    },
    [task, enableDrag, enableResize, enableProgressDrag, emit, emitTaskHover],
  );

  const progress = task.progress ?? 0;
  const progressWidth = (geometry.width * progress) / 100;
  const isMilestone = task.type === 'milestone';
  const accentColor = task.color ?? 'var(--rg-bar-fill)';
  const barStroke = task.borderColor;
  const barStrokeWidth = barStroke ? 1.5 : 0;

  return (
    <g
      ref={groupRef}
      className={`rg-bar ${selected ? 'rg-bar--selected' : ''}`}
      data-task-id={task.id}
      data-selected={selected || undefined}
      transform={`translate(${geometry.x}, ${geometry.y})`}
      onMouseEnter={(e) => emitTaskHover(task, e.clientX, e.clientY)}
      onMouseMove={(e) => emitTaskHover(task, e.clientX, e.clientY)}
      onMouseLeave={() => {
        if (dragRef.current) return;
        emit('taskHover', { task: null, rowIndex: null });
      }}
      onClick={() => emit('taskClick', { task, rowIndex: task._rowIndex })}
      onDoubleClick={() => emit('taskDoubleClick', { task, rowIndex: task._rowIndex })}
    >
      {isMilestone ? (
        <>
          <polygon
            className="rg-bar-milestone"
            points={milestoneDiamondPoints(geometry.width, geometry.height)}
            fill={accentColor}
            stroke={barStroke}
            strokeWidth={barStrokeWidth}
            onPointerDown={beginDrag('move')}
          />
          {selected && (
            <rect
              className="rg-bar-focus-ring"
              x={-4}
              y={-4}
              width={geometry.width + 8}
              height={geometry.height + 8}
              fill="none"
              stroke={accentColor}
              strokeWidth={2}
              pointerEvents="none"
            />
          )}
          <text
            className="rg-bar-label"
            x={geometry.width + 6}
            y={geometry.height / 2}
            dominantBaseline="middle"
            fontSize={12}
            pointerEvents="none"
          >
            {task.name}
          </text>
        </>
      ) : (
        <>
          <rect
            className="rg-bar-bg"
            width={geometry.width}
            height={geometry.height}
            rx={4}
            fill={task.color ? accentColor : 'var(--rg-bar-bg)'}
            fillOpacity={task.color ? 0.35 : 1}
            stroke={barStroke}
            strokeWidth={barStrokeWidth}
            onPointerDown={beginDrag('move')}
          />
          <rect
            className="rg-bar-progress"
            width={progressWidth}
            height={geometry.height}
            rx={4}
            fill={accentColor}
            pointerEvents="none"
          />
          {enableResize && (
            <>
              <rect
                className="rg-bar-handle rg-bar-handle--start"
                x={0}
                y={0}
                width={HANDLE_WIDTH}
                height={geometry.height}
                rx={2}
                onPointerDown={beginDrag('resize-start')}
              />
              <rect
                className="rg-bar-handle rg-bar-handle--end"
                x={geometry.width - HANDLE_WIDTH}
                y={0}
                width={HANDLE_WIDTH}
                height={geometry.height}
                rx={2}
                onPointerDown={beginDrag('resize-end')}
              />
            </>
          )}
          {enableProgressDrag && (
            <rect
              className="rg-bar-progress-handle"
              x={Math.max(0, progressWidth - 4)}
              y={geometry.height - 6}
              width={8}
              height={10}
              rx={2}
              onPointerDown={beginDrag('progress')}
            />
          )}
          {selected && (
            <rect
              className="rg-bar-focus-ring"
              x={-4}
              y={-4}
              width={geometry.width + 8}
              height={geometry.height + 8}
              rx={6}
              fill="none"
              stroke={accentColor}
              strokeWidth={2}
              pointerEvents="none"
            />
          )}
          <text
            className="rg-bar-label"
            x={geometry.width + 6}
            y={geometry.height / 2}
            dominantBaseline="middle"
            fontSize={12}
            pointerEvents="none"
          >
            {task.name}
          </text>
        </>
      )}
    </g>
  );
}

function propsEqual(prev: TaskBarProps, next: TaskBarProps): boolean {
  if (prev.selected !== next.selected) return false;
  if (prev.task.id !== next.task.id) return false;
  if (prev.geometry.x !== next.geometry.x) return false;
  if (prev.geometry.width !== next.geometry.width) return false;
  if (prev.geometry.y !== next.geometry.y) return false;
  if (prev.columnWidth !== next.columnWidth) return false;
  if (prev.scale.id !== next.scale.id) return false;
  if (prev.snapToGrid !== next.snapToGrid) return false;
  if (prev.timelineBounds?.min.getTime() !== next.timelineBounds?.min.getTime()) return false;
  if (prev.timelineBounds?.max.getTime() !== next.timelineBounds?.max.getTime()) return false;
  if (prev.rangeStart.getTime() !== next.rangeStart.getTime()) return false;
  if (prev.store.getTaskVersion(prev.task.id) !== next.store.getTaskVersion(next.task.id)) {
    return false;
  }
  if (prev.task.color !== next.task.color) return false;
  if (prev.task.borderColor !== next.task.borderColor) return false;
  if (prev.task.width !== next.task.width) return false;
  return true;
}

export const TaskBar = memo(TaskBarInner, propsEqual);
