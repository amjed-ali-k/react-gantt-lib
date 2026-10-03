import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  computeBarXExact,
  computeBarWidthExact,
  type TimelineBounds,
} from '../../core/zoom';
import type { ViewScale } from '../../core/scale';
import { createPointerDetail } from './pointerDetail';
import { milestoneDiamondPoints } from './milestoneGeometry';
import { useTaskTooltipOptional } from '../Tooltip/TaskTooltipLayer';
import { useDragPreviewStoreOptional } from '../../context/DragPreviewContext';
import { useDependencyLinkStoreOptional } from '../../context/DependencyLinkContext';
import { useTimelineKeyboardOptional } from '../../context/TimelineKeyboardContext';
import { RovingFocus, useIsTabStop } from '../../hooks/useRovingFocus';
import { useGanttDisplayTimezone } from '../../context/GanttDisplayContext';
import { formatTaskDateTime } from '../../core/dates';
import { addScaleSteps } from '../../core/scale';
import { taskAccessibleName, taskChangeAnnouncement } from '../../core/accessibility';
import type { DependencyEdge } from './dependencyPaths';

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
  /** Connector handles and the `L` key to draw links (needs the chart's link store). */
  enableDependencyCreate?: boolean;
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

interface DragPreview {
  start?: Date;
  end?: Date;
  progress?: number;
}

const HANDLE_WIDTH = 10;
/** Connector handles sit this far outside each bar edge (centre), clear of the resize handles. */
const CONNECTOR_OFFSET = 10;
const CONNECTOR_DOT_RADIUS = 4;
const CONNECTOR_HIT_RADIUS = 8;
const LABEL_GAP = 6;
const CONNECTOR_EDGES: DependencyEdge[] = ['start', 'end'];
/** Stands in for the chart's focus store when a bar renders outside a chart (tests). */
const NO_FOCUS = new RovingFocus();

function TaskBarInner({
  task,
  geometry,
  columnWidth,
  scale,
  store,
  enableDrag = true,
  enableResize = true,
  enableProgressDrag = true,
  enableDependencyCreate = false,
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
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const taskRef = useRef(task);
  taskRef.current = task;

  const msPerPixel = getMsPerPixel(scale, columnWidth);
  const tooltip = useTaskTooltipOptional();
  const dragPreviewStore = useDragPreviewStoreOptional();
  const chartLinkStore = useDependencyLinkStoreOptional();
  const keyboard = useTimelineKeyboardOptional();
  const isTabStop = useIsTabStop(keyboard?.focus ?? NO_FOCUS, task.id);
  const timeZone = useGanttDisplayTimezone();
  const linkStore = enableDependencyCreate ? chartLinkStore : null;
  // Whether the latest press on this bar was on a connector handle. A link drag that ends on this
  // same bar still makes the browser fire `click` on the bar group; that click is not a task click.
  const pressedConnectorRef = useRef(false);

  const resolveHoverTask = useCallback(
    (t: ResolvedTask, start?: Date, end?: Date) => {
      return start &&
        end &&
        Number.isFinite(start.getTime()) &&
        Number.isFinite(end.getTime())
        ? { ...t, start: start.toISOString(), end: end.toISOString() }
        : t;
    },
    [],
  );

  const emitTaskHover = useCallback(
    (t: ResolvedTask, clientX: number, clientY: number, start?: Date, end?: Date) => {
      const hoverTask = resolveHoverTask(t, start, end);
      emit('taskHover', {
        task: hoverTask,
        rowIndex: t._rowIndex,
        clientX,
        clientY,
      });
      return hoverTask;
    },
    [emit, resolveHoverTask],
  );

  const syncTooltip = useCallback(
    (t: ResolvedTask, clientX: number, clientY: number, start?: Date, end?: Date) => {
      const hoverTask = resolveHoverTask(t, start, end);
      tooltip?.show(hoverTask, clientX, clientY);
      return hoverTask;
    },
    [tooltip, resolveHoverTask],
  );

  const resolveDragDates = useCallback(
    (session: DragSession, clientX: number) => {
      const t = taskRef.current;
      if (session.mode === 'progress') {
        return { start: session.start, end: session.end };
      }
      const dx = clientX - session.originClientX;
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
      return { start, end };
    },
    [msPerPixel, timelineBounds],
  );

  /** Snaps, clamps to the timeline and pins milestones: the dates a move or resize commits. */
  const settleDates = useCallback(
    (mode: 'move' | 'resize-start' | 'resize-end', start: Date, end: Date) => {
      let settled = finalizeDragDates(start, end, scale, snapToGrid, rangeStart);
      if (timelineBounds) settled = clampTaskDates(settled.start, settled.end, timelineBounds, mode);
      if (taskRef.current.type === 'milestone') {
        settled = { start: settled.start, end: new Date(settled.start.getTime()) };
      }
      return settled;
    },
    [scale, snapToGrid, rangeStart, timelineBounds],
  );

  const endDrag = useCallback(
    (session: DragSession, pointer?: { clientX: number; clientY: number }) => {
      const t = taskRef.current;

      if (session.mode === 'progress') {
        let progress = session.progress;
        if (pointer) {
          const relX = pointer.clientX - session.barRect.left;
          progress = Math.max(
            0,
            Math.min(100, Math.round((relX / session.barRect.width) * 100)),
          );
        } else if (dragPreview?.progress != null) {
          progress = dragPreview.progress;
        }
        onTaskUpdate(t.id, { progress });
        emit('progressChange', { task: t, progress, previousProgress: session.progress });
        dragPreviewStore?.clear(t.id);
        setDragPreview(null);
        dragRef.current = null;
        setIsDragging(false);
        return;
      }

      let start = session.start;
      let end = session.end;
      if (pointer) {
        ({ start, end } = resolveDragDates(session, pointer.clientX));
      } else if (dragPreview?.start && dragPreview?.end) {
        start = dragPreview.start;
        end = dragPreview.end;
      }

      ({ start, end } = settleDates(
        session.mode === 'resize-start' || session.mode === 'resize-end' ? session.mode : 'move',
        start,
        end,
      ));

      onTaskUpdate(t.id, { start, end });
      if (pointer) {
        syncTooltip(t, pointer.clientX, pointer.clientY, start, end);
      }

      if (session.mode === 'move') {
        emit('taskDragEnd', {
          task: t,
          start,
          end,
          previousStart: session.start,
          previousEnd: session.end,
          source: 'pointer',
        });
      } else if (session.mode.startsWith('resize')) {
        emit('taskResizeEnd', {
          task: t,
          start,
          end,
          edge: session.mode === 'resize-start' ? 'start' : 'end',
          previousStart: session.start,
          previousEnd: session.end,
          source: 'pointer',
        });
      }

      dragPreviewStore?.clear(t.id);
      setDragPreview(null);
      dragRef.current = null;
      setIsDragging(false);
    },
    [
      settleDates,
      onTaskUpdate,
      emit,
      syncTooltip,
      dragPreview,
      resolveDragDates,
      dragPreviewStore,
    ],
  );

  useEffect(() => {
    if (!isDragging) return;
    const onPointerMove = (e: PointerEvent) => {
      const session = dragRef.current;
      if (!session) return;

      const t = taskRef.current;

      if (session.mode === 'progress') {
        const relX = e.clientX - session.barRect.left;
        const progress = Math.max(
          0,
          Math.min(100, Math.round((relX / session.barRect.width) * 100)),
        );
        setDragPreview({ progress });
        emit('progressChange', { task: t, progress, previousProgress: session.progress });
        return;
      }

      const { start, end } = resolveDragDates(session, e.clientX);
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return;
      setDragPreview({ start, end });
      dragPreviewStore?.setPreview(t.id, start, end);
      syncTooltip(t, e.clientX, e.clientY, start, end);

      if (session.mode === 'move') {
        emit('taskDrag', {
          task: t,
          start,
          end,
          deltaMs: start.getTime() - session.start.getTime(),
          source: 'pointer',
        });
      } else {
        emit('taskResize', {
          task: t,
          start,
          end,
          edge: session.mode === 'resize-start' ? 'start' : 'end',
          source: 'pointer',
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
  }, [isDragging, emit, endDrag, syncTooltip, resolveDragDates, dragPreviewStore]);

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
        emit('taskDragStart', { task, start, end, source: 'pointer' });
      } else if (mode.startsWith('resize')) {
        emit('taskResizeStart', {
          task,
          edge: mode === 'resize-start' ? 'start' : 'end',
          source: 'pointer',
        });
      }

      if (mode === 'move' || mode.startsWith('resize')) {
        syncTooltip(task, e.clientX, e.clientY, start, end);
      }

      dragPreviewStore?.clear();
      dragRef.current = {
        mode,
        originClientX: e.clientX,
        start,
        end,
        progress: task.progress ?? 0,
        barRect,
      };
      setDragPreview(null);
      setIsDragging(true);
    },
    [task, enableDrag, enableResize, enableProgressDrag, emit, syncTooltip, dragPreviewStore],
  );

  const renderGeometry = useMemo((): BarGeometry => {
    if (!dragPreview?.start || !dragPreview?.end) return geometry;
    return {
      ...geometry,
      x: computeBarXExact(dragPreview.start, rangeStart, scale, columnWidth),
      width: computeBarWidthExact(
        dragPreview.start,
        dragPreview.end,
        scale,
        columnWidth,
        rangeStart,
      ),
    };
  }, [dragPreview, geometry, rangeStart, scale, columnWidth]);

  const progress = Math.max(0, Math.min(100, dragPreview?.progress ?? task.progress ?? 0));
  const progressWidth =
    progress >= 100 ? renderGeometry.width : (renderGeometry.width * progress) / 100;
  const isMilestone = task.type === 'milestone';
  const isGroup = task.type === 'group';
  const taskElement = isMilestone ? 'milestone' : 'bar';
  const isReadOnly = !enableDrag && !enableResize && !enableProgressDrag;

  const handleTaskClick = useCallback(
    (e: React.MouseEvent) => {
      if (pressedConnectorRef.current) return;
      emit('taskClick', {
        task,
        rowIndex: task._rowIndex,
        element: taskElement,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        shiftKey: e.shiftKey,
      });
      emit(
        'ganttClick',
        createPointerDetail(
          { type: 'task', task, rowIndex: task._rowIndex, element: taskElement },
          e,
        ),
      );
    },
    [emit, task, taskElement],
  );

  const handleTaskDoubleClick = useCallback(() => {
    emit('taskDoubleClick', { task, rowIndex: task._rowIndex, element: taskElement });
  }, [emit, task, taskElement]);

  const handleTaskContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      emit(
        'ganttContextMenu',
        createPointerDetail(
          { type: 'task', task, rowIndex: task._rowIndex, element: taskElement },
          e,
        ),
      );
    },
    [emit, task, taskElement],
  );
  const beginLink = (edge: DependencyEdge) => (e: React.PointerEvent) => {
    if (!linkStore || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    pressedConnectorRef.current = true;
    linkStore.beginPointer({ taskId: task.id, edge }, e.clientX, e.clientY);
  };

  // Date, plus the time when it has one (hour and minute zoom).
  const formatDate = (date: Date) => formatTaskDateTime(date, timeZone);

  /**
   * One grid unit (a calendar step of the zoom scale) by keyboard: the same events and commit as a
   * pointer drag, `source: 'keyboard'`. False when the task cannot or did not change.
   */
  const nudge = (mode: 'move' | 'resize-start' | 'resize-end', direction: 1 | -1): boolean => {
    if (mode === 'move' ? !enableDrag : !enableResize || isMilestone) return false;
    const start = toDate(task.start);
    const end = toDate(task.end);
    const step = (date: Date) => addScaleSteps(date, direction, scale);
    const raw = {
      start: mode === 'resize-end' ? start : step(start),
      end: mode === 'resize-start' ? end : step(end),
    };
    if (raw.end.getTime() <= raw.start.getTime()) return false;
    const next = settleDates(mode, raw.start, raw.end);
    if (next.start.getTime() === start.getTime() && next.end.getTime() === end.getTime()) return false;
    const source = 'keyboard' as const;
    if (mode === 'move') {
      emit('taskDragStart', { task, start, end, source });
      emit('taskDrag', { task, ...next, deltaMs: next.start.getTime() - start.getTime(), source });
      onTaskUpdate(task.id, next);
      emit('taskDragEnd', { task, ...next, previousStart: start, previousEnd: end, source });
    } else {
      const edge = mode === 'resize-start' ? 'start' : 'end';
      emit('taskResizeStart', { task, edge, source });
      emit('taskResize', { task, ...next, edge, source });
      onTaskUpdate(task.id, next);
      emit('taskResizeEnd', { task, ...next, edge, previousStart: start, previousEnd: end, source });
    }
    keyboard?.announce(
      taskChangeAnnouncement(mode === 'move' ? 'Moved' : 'Resized', task, next.start, next.end, formatDate),
    );
    return true;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (linkStore?.handleBarKey(task.id, e)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (!keyboard || e.ctrlKey || e.metaKey) {
      // Ctrl/⌘+Space toggles the task in the selection; other chords stay the browser's.
      if (!(keyboard && e.key === ' ')) return;
    }
    const direction = e.key === 'ArrowRight' ? 1 : -1;
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowDown':
        keyboard.moveFocus(task.id, e.key === 'ArrowDown' ? 1 : -1);
        break;
      case 'ArrowLeft':
      case 'ArrowRight':
        // Not editable here (or at a bound): the key stays the browser's (Alt+Left is Back).
        if (!nudge(e.shiftKey ? 'resize-end' : e.altKey ? 'resize-start' : 'move', direction)) return;
        break;
      case 'Enter':
        handleTaskDoubleClick();
        break;
      case ' ':
        emit('taskClick', {
          task,
          rowIndex: task._rowIndex,
          element: taskElement,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          shiftKey: e.shiftKey,
        });
        break;
      case 'Home':
      case 'End':
        keyboard.scrollToEdge(e.key === 'Home' ? 'start' : 'end');
        break;
      case '+':
      case '=':
        keyboard.zoom('in');
        break;
      case '-':
      case '_':
        keyboard.zoom('out');
        break;
      default:
        return;
    }
    e.preventDefault();
    e.stopPropagation();
  };

  // A row of the timeline's treegrid: one tab stop for all bars (roving tabindex), arrows move it.
  const rowProps = keyboard
    ? {
        role: 'row',
        tabIndex: isTabStop ? 0 : -1,
        'aria-rowindex': task._rowIndex + 1,
        'aria-level': task._level + 1,
        'aria-expanded': isGroup ? !task.collapsed : undefined,
        'aria-selected': selected,
        'aria-label': taskAccessibleName(task, formatDate, keyboard.nameOf),
        'aria-keyshortcuts': linkStore ? 'L' : undefined,
        onKeyDown: handleKeyDown,
        onFocus: () => {
          keyboard.focus.setActive(task.id);
          linkStore?.focusBar(task.id);
        },
      }
    : {};
  // Every press starts as "not on a handle"; `beginLink` (bubbling, after this) says otherwise.
  const onPointerDownCapture = linkStore
    ? () => {
        pressedConnectorRef.current = false;
      }
    : undefined;

  // Drag-to-link handles: a wide transparent hit circle and a small dot, outside each edge.
  const connectors = linkStore && (
    <g className="rg-bar-connectors" aria-hidden="true">
      {CONNECTOR_EDGES.map((edge) => {
        const cx = edge === 'start' ? -CONNECTOR_OFFSET : renderGeometry.width + CONNECTOR_OFFSET;
        const cy = renderGeometry.height / 2;
        return (
          <g key={edge} className={`rg-bar-connector rg-bar-connector--${edge}`}>
            <circle className="rg-bar-connector-dot" cx={cx} cy={cy} r={CONNECTOR_DOT_RADIUS} />
            <circle
              className="rg-bar-connector-hit"
              cx={cx}
              cy={cy}
              r={CONNECTOR_HIT_RADIUS}
              data-connector-edge={edge}
              onPointerDown={beginLink(edge)}
            />
          </g>
        );
      })}
    </g>
  );
  const labelX =
    renderGeometry.width + LABEL_GAP + (linkStore ? CONNECTOR_OFFSET + CONNECTOR_DOT_RADIUS : 0);

  const accentColor = task.color ?? 'var(--rg-bar-fill)';
  const barStroke = task.borderColor;
  const barStrokeWidth = barStroke ? 1.5 : 0;

  return (
    <g
      ref={groupRef}
      className={`rg-bar ${selected ? 'rg-bar--selected' : ''} ${isGroup ? 'rg-bar--group' : ''} ${isReadOnly ? 'rg-bar--readonly' : ''}${task.critical ? ' rg-bar--critical' : ''}`}
      data-task-id={task.id}
      data-selected={selected || undefined}
      transform={`translate(${renderGeometry.x}, ${renderGeometry.y})`}
      onMouseEnter={(e) => {
        const hoverTask = emitTaskHover(task, e.clientX, e.clientY);
        tooltip?.show(hoverTask, e.clientX, e.clientY);
      }}
      onMouseMove={(e) => tooltip?.move(e.clientX, e.clientY)}
      onMouseLeave={() => {
        if (dragRef.current) return;
        emit('taskHover', { task: null, rowIndex: null });
        tooltip?.hide();
      }}
      onClick={handleTaskClick}
      onDoubleClick={handleTaskDoubleClick}
      onContextMenu={handleTaskContextMenu}
      {...rowProps}
      onPointerDownCapture={onPointerDownCapture}
    >
      <g role={keyboard ? 'gridcell' : undefined}>
      {task.critical &&
        (isMilestone ? (
          <polygon
            className="rg-bar-critical"
            transform="translate(-3, -3)"
            points={milestoneDiamondPoints(renderGeometry.width + 6, renderGeometry.height + 6)}
            pointerEvents="none"
          />
        ) : (
          <rect
            className="rg-bar-critical"
            x={-3}
            y={-3}
            width={renderGeometry.width + 6}
            height={renderGeometry.height + 6}
            rx={6}
            pointerEvents="none"
          />
        ))}
      {isMilestone ? (
        <>
          <polygon
            className="rg-bar-milestone"
            points={milestoneDiamondPoints(renderGeometry.width, renderGeometry.height)}
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
              width={renderGeometry.width + 8}
              height={renderGeometry.height + 8}
              fill="none"
              stroke={accentColor}
              strokeWidth={2}
              pointerEvents="none"
            />
          )}
          <text
            className="rg-bar-label"
            x={labelX}
            y={renderGeometry.height / 2}
            dominantBaseline="middle"
            fontSize={12}
            pointerEvents="none"
          >
            {task.name}
          </text>
          {connectors}
        </>
      ) : (
        <>
          <rect
            className="rg-bar-bg"
            width={renderGeometry.width}
            height={renderGeometry.height}
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
            height={renderGeometry.height}
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
                height={renderGeometry.height}
                rx={2}
                onPointerDown={beginDrag('resize-start')}
              />
              <rect
                className="rg-bar-handle rg-bar-handle--end"
                x={renderGeometry.width - HANDLE_WIDTH}
                y={0}
                width={HANDLE_WIDTH}
                height={renderGeometry.height}
                rx={2}
                onPointerDown={beginDrag('resize-end')}
              />
            </>
          )}
          {enableProgressDrag && (
            <rect
              className="rg-bar-progress-handle"
              x={Math.max(0, progressWidth - 4)}
              y={renderGeometry.height - 6}
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
              width={renderGeometry.width + 8}
              height={renderGeometry.height + 8}
              rx={6}
              fill="none"
              stroke={accentColor}
              strokeWidth={2}
              pointerEvents="none"
            />
          )}
          <text
            className="rg-bar-label"
            x={labelX}
            y={renderGeometry.height / 2}
            dominantBaseline="middle"
            fontSize={12}
            pointerEvents="none"
          >
            {task.name}
          </text>
          {connectors}
        </>
      )}
      </g>
    </g>
  );
}

/** The predecessor ids a bar's name lists, as a comparable string. */
function dependencyKey(task: ResolvedTask): string {
  return (task.dependencies ?? []).map((d) => (typeof d === 'string' ? d : d.id)).join('\n');
}

function propsEqual(prev: TaskBarProps, next: TaskBarProps): boolean {
  if (prev.selected !== next.selected) return false;
  if (prev.task.id !== next.task.id) return false;
  if (prev.geometry.x !== next.geometry.x) return false;
  if (prev.geometry.width !== next.geometry.width) return false;
  if (prev.geometry.y !== next.geometry.y) return false;
  if (prev.geometry.height !== next.geometry.height) return false;
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
  if (prev.task.name !== next.task.name) return false;
  if (prev.task.progress !== next.task.progress) return false;
  if (prev.enableDrag !== next.enableDrag) return false;
  if (prev.enableResize !== next.enableResize) return false;
  if (prev.enableProgressDrag !== next.enableProgressDrag) return false;
  if (prev.task.type !== next.task.type) return false;
  if (prev.task.width !== next.task.width) return false;
  if (prev.enableDependencyCreate !== next.enableDependencyCreate) return false;
  if (prev.task.critical !== next.task.critical) return false;
  if (dependencyKey(prev.task) !== dependencyKey(next.task)) return false;
  if (prev.task._start.getTime() !== next.task._start.getTime()) return false;
  if (prev.task._end.getTime() !== next.task._end.getTime()) return false;
  if (prev.task.collapsed !== next.task.collapsed) return false;
  return true;
}

export const TaskBar = memo(TaskBarInner, propsEqual);
