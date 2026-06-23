import {
  useRef,
  useState,
  useMemo,
  useCallback,
  useEffect,
  useLayoutEffect,
} from 'react';
import type { GanttChartProps, GanttColumn, GanttEventMap, GanttTask } from './types';
import { useGanttEmitter } from './hooks/useGanttEmitter';
import { useSidebarLayout } from './hooks/useSidebarLayout';
import { useTaskStore } from './hooks/useTaskStore';
import {
  computeTimelineRange,
  getColumnWidth,
  resolveTasks,
  clampTaskDates,
  getMsPerPixel,
  dateToPixel,
  resolveTimelineWidth,
} from './core/zoom';
import { resolveScale, resolveScales } from './core/scale';
import { computeDateMarkingRects } from './core/dateMarkings';
import { TIMELINE_HEADER_HEIGHT } from './core/eventMarkers';
import { computeRowLayouts, totalRowLayoutHeight } from './core/rowLayout';
import { maintainBufferedColumnRange, getViewportColumnRange, DEFAULT_COLUMN_SCROLL_BUFFER_PERCENT } from './core/visibleColumns';
import { stableTimelineRange } from './core/stableValue';
import { toDate } from './core/dates';
import { TaskListPanel, MiddlePanel } from './components/TaskList/TaskListPanel';
import { TimelineHeader } from './components/Timeline/TimelineHeader';
import { TimelineBody } from './components/Timeline/TimelineBody';
import { ZoomToolbar } from './components/Toolbar/ZoomToolbar';
import { CustomRowsTimeline } from './components/CustomRows/CustomRowsTimeline';
import { GanttTimelineProvider } from './context/GanttChartContext';
import { EventMarkersLayer } from './components/Timeline/EventMarkersLayer';
import { TaskTooltip } from './components/Tooltip/TaskTooltip';

const DEFAULT_COLUMNS: GanttColumn[] = [
  { key: 'name', title: 'Task', flex: 2, minWidth: 120 },
];

const DEFAULT_MIDDLE_COLUMNS: GanttColumn[] = [
  { key: 'start', title: 'Start', flex: 1, minWidth: 90 },
  { key: 'end', title: 'End', flex: 1, minWidth: 90 },
];

export function GanttChart({
  tasks: externalTasks,
  columns = DEFAULT_COLUMNS,
  middleColumns = DEFAULT_MIDDLE_COLUMNS,
  zoomLevel: zoomProp = 'week',
  availableZoomLevels,
  columnWidth: columnWidthProp,
  rowHeight = 36,
  height = 500,
  width = '100%',
  className,
  style,
  theme = 'light',
  defaultLeftWidth = 220,
  defaultMiddleWidth = 180,
  minPanelWidth = 80,
  showTaskList = true,
  showDateColumns = true,
  showTooltip = false,
  holidays,
  blockDates,
  eventMarkers,
  showBaseline = true,
  enableDrag = true,
  enableResize = true,
  enableProgressDrag = true,
  snapToGrid = true,
  minDate,
  maxDate,
  customRows = [],
  columnScrollBufferPercent = DEFAULT_COLUMN_SCROLL_BUFFER_PERCENT,
  onTasksChange,
  onSidebarLayoutChange,
  onTaskHover,
  onTaskClick,
  onSelectionChange,
  selectedTaskIds,
  ...callbacks
}: GanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const [scaleId, setScaleId] = useState(zoomProp);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const scrollRafRef = useRef<number | null>(null);
  const pendingScrollLeftRef = useRef(0);
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);
  const [tooltip, setTooltip] = useState<{
    task: GanttTask;
    x: number;
    y: number;
  } | null>(null);
  const pendingCenterDateRef = useRef<Date | null>(null);

  const availableScales = useMemo(
    () => resolveScales(availableZoomLevels),
    [availableZoomLevels],
  );

  const scale = useMemo(() => resolveScale(scaleId), [scaleId]);

  const handleTaskHover = useCallback(
    (detail: GanttEventMap['taskHover']) => {
      if (showTooltip && detail.task && detail.clientX != null && detail.clientY != null) {
        setTooltip({ task: detail.task, x: detail.clientX, y: detail.clientY });
      } else {
        setTooltip(null);
      }
      onTaskHover?.(detail);
    },
    [showTooltip, onTaskHover],
  );

  useEffect(() => {
    if (!showTooltip) setTooltip(null);
  }, [showTooltip]);

  const effectiveSelectedIds = selectedTaskIds ?? internalSelectedIds;

  const handleTaskClick = useCallback(
    (detail: GanttEventMap['taskClick']) => {
      const multi = !!(detail.ctrlKey || detail.metaKey);
      const computeNext = (current: string[]) => {
        if (multi) {
          return current.includes(detail.task.id)
            ? current.filter((id) => id !== detail.task.id)
            : [...current, detail.task.id];
        }
        return [detail.task.id];
      };

      if (selectedTaskIds === undefined) {
        setInternalSelectedIds((current) => {
          const nextIds = computeNext(current);
          onSelectionChange?.({ selectedIds: nextIds });
          return nextIds;
        });
      } else {
        onSelectionChange?.({ selectedIds: computeNext(selectedTaskIds) });
      }
      onTaskClick?.(detail);
    },
    [selectedTaskIds, onSelectionChange, onTaskClick],
  );

  const interactionsEnabled = !!(
    callbacks.onGanttClick ||
    callbacks.onGanttContextMenu ||
    callbacks.onGanttHover
  );

  const emit = useGanttEmitter({
    ...callbacks,
    onTaskHover: handleTaskHover,
    onTaskClick: handleTaskClick,
    onSidebarLayoutChange,
  });

  const onSidebarLayoutChangeRef = useRef(onSidebarLayoutChange);
  onSidebarLayoutChangeRef.current = onSidebarLayoutChange;

  const handleSidebarLayoutChange = useCallback(
    (layout: Parameters<NonNullable<typeof onSidebarLayoutChange>>[0]) => {
      const leftWidth = showTaskList ? layout.leftWidth : 0;
      const middleWidth = showDateColumns ? layout.middleWidth : 0;
      const timelineLeft = leftWidth + middleWidth;
      const effective = {
        ...layout,
        leftWidth,
        middleWidth,
        timelineLeft,
        rightWidth: Math.max(0, layout.totalWidth - timelineLeft),
      };
      emit('sidebarLayoutChange', effective);
      onSidebarLayoutChangeRef.current?.(effective);
    },
    [emit, showTaskList, showDateColumns],
  );

  const sidebar = useSidebarLayout(containerRef, {
    defaultLeftWidth,
    defaultMiddleWidth,
    minPanelWidth,
    onLayoutChange: handleSidebarLayoutChange,
  });

  const leftWidth = showTaskList ? sidebar.leftWidth : 0;
  const middleWidth = showDateColumns ? sidebar.middleWidth : 0;
  const timelineLeft = leftWidth + middleWidth;

  useEffect(() => {
    handleSidebarLayoutChange({
      leftWidth: sidebar.leftWidth,
      middleWidth: sidebar.middleWidth,
      rightWidth: sidebar.layout.rightWidth,
      timelineLeft: sidebar.layout.timelineLeft,
      totalWidth: sidebar.layout.totalWidth,
    });
  }, [
    showTaskList,
    showDateColumns,
    sidebar.leftWidth,
    sidebar.middleWidth,
    sidebar.layout.totalWidth,
    handleSidebarLayoutChange,
  ]);

  const { tasks, updateTask, store } = useTaskStore(externalTasks);

  const resolvedTasks = useMemo(() => resolveTasks(tasks), [tasks]);
  const columnWidth = getColumnWidth(scale, columnWidthProp);

  const rowLayouts = useMemo(
    () => computeRowLayouts(resolvedTasks, rowHeight, showBaseline),
    [resolvedTasks, rowHeight, showBaseline],
  );

  const timelineBounds = useMemo(() => {
    if (minDate == null || maxDate == null) return undefined;
    return { min: toDate(minDate), max: toDate(maxDate) };
  }, [minDate, maxDate]);

  const rangeRef = useRef<ReturnType<typeof computeTimelineRange> | null>(null);
  const visibleColumnsRef = useRef<ReturnType<typeof maintainBufferedColumnRange> | null>(null);

  const range = useMemo(() => {
    const next = computeTimelineRange(tasks, scale, 2, {
      minDate,
      maxDate,
    });
    const stable = stableTimelineRange(next, rangeRef.current ?? undefined);
    rangeRef.current = stable;
    return stable;
  }, [
    ...(minDate != null && maxDate != null ? [] : [tasks]),
    scale,
    minDate,
    maxDate,
  ]);

  const timelineWidth = resolveTimelineWidth(range, columnWidth);
  const msPerPixel = getMsPerPixel(scale, columnWidth);
  const timelineBodyHeight = totalRowLayoutHeight(rowLayouts);
  const timelineContentHeight = TIMELINE_HEADER_HEIGHT + timelineBodyHeight;

  const visibleColumns = useMemo(() => {
    const next = maintainBufferedColumnRange(
      scrollLeft,
      viewportWidth,
      columnWidth,
      range.columnCount,
      columnScrollBufferPercent,
      visibleColumnsRef.current,
    );
    visibleColumnsRef.current = next;
    return next;
  }, [scrollLeft, viewportWidth, columnWidth, range.columnCount, columnScrollBufferPercent]);

  const viewportColumns = useMemo(
    () => getViewportColumnRange(scrollLeft, viewportWidth, columnWidth, range.columnCount),
    [scrollLeft, viewportWidth, columnWidth, range.columnCount],
  );

  useEffect(() => {
    visibleColumnsRef.current = null;
  }, [range.columnCount, columnWidth, scaleId, columnScrollBufferPercent]);

  const timelineContext = useMemo(
    () => ({
      zoomLevel: scaleId,
      scale,
      columnWidth,
      timelineWidth,
      range,
      rowHeight,
      msPerPixel,
      scrollLeft,
      viewportWidth,
      visibleColumns,
      viewportColumns,
      columnScrollBufferPercent,
    }),
    [
      scaleId,
      scale,
      columnWidth,
      timelineWidth,
      range,
      rowHeight,
      msPerPixel,
      scrollLeft,
      viewportWidth,
      visibleColumns,
      viewportColumns,
      columnScrollBufferPercent,
    ],
  );

  const customRowMetrics = useMemo(
    () => ({
      zoomLevel: scaleId,
      scale,
      columnWidth,
      timelineWidth,
      msPerPixel,
      rangeStart: range.start,
      rangeEnd: range.end,
      rowHeight,
      scrollLeft,
      viewportWidth,
      visibleColumns,
      viewportColumns,
      columnScrollBufferPercent,
    }),
    [
      scaleId,
      scale,
      columnWidth,
      timelineWidth,
      msPerPixel,
      range,
      rowHeight,
      scrollLeft,
      viewportWidth,
      visibleColumns,
      viewportColumns,
      columnScrollBufferPercent,
    ],
  );

  const dateMarkings = useMemo(
    () => computeDateMarkingRects(range, scale, columnWidth, holidays, blockDates),
    [range, scale, columnWidth, holidays, blockDates],
  );

  useEffect(() => {
    const el = timelineScrollRef.current;
    if (!el) return;

    const update = () => {
      setViewportWidth(el.clientWidth);
      setScrollLeft(el.scrollLeft);
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [timelineLeft]);

  const clampTimelineScroll = useCallback(
    (el: HTMLDivElement) => {
      const maxScroll = Math.max(0, timelineWidth - el.clientWidth);
      if (el.scrollLeft > maxScroll) {
        el.scrollLeft = maxScroll;
      }
      return el.scrollLeft;
    },
    [timelineWidth],
  );

  useLayoutEffect(() => {
    const scrollEl = timelineScrollRef.current;
    if (!scrollEl) return;
    const left = clampTimelineScroll(scrollEl);
    setScrollLeft(left);
  }, [timelineWidth, viewportWidth, clampTimelineScroll]);

  const handleZoomChange = useCallback(
    (newScaleId: string) => {
      const scrollEl = timelineScrollRef.current;
      if (scrollEl && scrollEl.clientWidth > 0) {
        const centerPx = scrollEl.scrollLeft + scrollEl.clientWidth / 2;
        const msPerPixel = getMsPerPixel(scale, columnWidth);
        pendingCenterDateRef.current = new Date(
          range.start.getTime() + centerPx * msPerPixel,
        );
      }
      setScaleId(newScaleId);
      const nextScale = resolveScale(newScaleId);
      const cw = getColumnWidth(nextScale, columnWidthProp);
      const detail = {
        zoomLevel: newScaleId,
        scaleId: newScaleId,
        scaleLabel: nextScale.label,
        columnWidth: cw,
      };
      emit('zoomChange', detail);
      callbacks.onZoomChange?.(detail);
    },
    [emit, columnWidthProp, callbacks, scale, columnWidth, range.start],
  );

  useLayoutEffect(() => {
    const centerDate = pendingCenterDateRef.current;
    if (!centerDate) return;
    pendingCenterDateRef.current = null;

    const scrollEl = timelineScrollRef.current;
    if (!scrollEl) return;

    const msPerPixel = getMsPerPixel(scale, columnWidth);
    const centerPx = dateToPixel(centerDate, range.start, msPerPixel);
    const maxScroll = Math.max(0, timelineWidth - scrollEl.clientWidth);
    scrollEl.scrollLeft = Math.min(maxScroll, Math.max(0, centerPx - scrollEl.clientWidth / 2));
    setScrollLeft(scrollEl.scrollLeft);
  }, [scaleId, range.start, columnWidth, timelineWidth, scale]);

  useEffect(() => {
    if (!availableScales.some((s) => s.id === scaleId)) {
      setScaleId(availableScales[0]?.id ?? 'week');
    }
  }, [availableScales, scaleId]);

  const onTimelineScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      const left = clampTimelineScroll(el);
      pendingScrollLeftRef.current = left;

      if (scrollRafRef.current == null) {
        scrollRafRef.current = requestAnimationFrame(() => {
          scrollRafRef.current = null;
          setScrollLeft(pendingScrollLeftRef.current);
        });
      }

      emit('scroll', { scrollLeft: left, scrollTop: el.scrollTop });
    },
    [emit, clampTimelineScroll],
  );

  useEffect(() => {
    return () => {
      if (scrollRafRef.current != null) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setScaleId(zoomProp);
  }, [zoomProp]);

  const syncRowScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop;
    const panels = containerRef.current?.querySelectorAll('.rg-sync-scroll');
    panels?.forEach((p) => {
      if (p !== e.currentTarget) (p as HTMLElement).scrollTop = top;
    });
  }, []);

  const handleToggleCollapse = useCallback(
    (taskId: string) => {
      const source = tasks.find((t) => t.id === taskId);
      if (!source) return;
      const collapsed = !source.collapsed;
      updateTask(taskId, { collapsed });
      if (onTasksChange) {
        onTasksChange(
          tasks.map((t) => (t.id === taskId ? { ...t, collapsed } : t)),
        );
      }
    },
    [tasks, updateTask, onTasksChange],
  );

  const handleTaskUpdate = useCallback(
    (taskId: string, patch: { start?: Date; end?: Date; progress?: number }) => {
      const source = tasks.find((t) => t.id === taskId);
      if (source?.readOnly) return;
      const mapped: Record<string, unknown> = {};
      if (patch.start && patch.end && timelineBounds) {
        const clamped = clampTaskDates(patch.start, patch.end, timelineBounds, 'move');
        mapped.start = clamped.start.toISOString();
        mapped.end = clamped.end.toISOString();
      } else {
        if (patch.start) mapped.start = patch.start.toISOString();
        if (patch.end) mapped.end = patch.end.toISOString();
      }
      if (patch.progress !== undefined) mapped.progress = patch.progress;
      updateTask(taskId, mapped);
      if (onTasksChange) {
        const next = tasks.map((t) =>
          t.id === taskId ? { ...t, ...mapped } : t,
        );
        onTasksChange(next);
      }
    },
    [updateTask, onTasksChange, tasks, timelineBounds],
  );

  return (
    <GanttTimelineProvider value={timelineContext}>
    <div
      ref={containerRef}
      className={`rg-gantt rg-theme-${theme} ${className ?? ''}`.trim()}
      style={{ width, height, ...style }}
      data-testid="gantt-chart"
      data-sidebar-left={leftWidth}
      data-sidebar-middle={middleWidth}
      data-timeline-left={timelineLeft}
    >
      <div className="rg-gantt-toolbar-row">
        <ZoomToolbar
          scale={scale}
          availableScales={availableScales}
          onZoomChange={handleZoomChange}
        />
      </div>

      <div className="rg-gantt-body" style={{ height: `calc(100% - 40px)` }}>
        <div className="rg-panels">
          {showTaskList && (
            <div
              className="rg-panel-scroll rg-sync-scroll"
              style={{ width: leftWidth, overflow: 'auto' }}
              onScroll={syncRowScroll}
            >
              <TaskListPanel
                tasks={resolvedTasks}
                sourceTasks={tasks}
                columns={columns}
                rowHeight={rowHeight}
                rowLayouts={rowLayouts}
                width={leftWidth}
                selectedTaskIds={effectiveSelectedIds}
                onToggleCollapse={handleToggleCollapse}
                emit={emit}
                customRows={customRows}
                customRowMetrics={customRowMetrics}
              />
            </div>
          )}

          {showTaskList && showDateColumns && (
            <div
              className="rg-divider"
              role="separator"
              aria-orientation="vertical"
              onPointerDown={sidebar.onDividerPointerDown('left')}
              onPointerMove={sidebar.onDividerPointerMove}
              onPointerUp={sidebar.onDividerPointerUp}
              data-testid="divider-left"
            />
          )}

          {showDateColumns && (
            <div
              className="rg-panel-scroll rg-sync-scroll"
              style={{ width: middleWidth, overflow: 'auto' }}
              onScroll={syncRowScroll}
            >
              <MiddlePanel
                tasks={resolvedTasks}
                columns={middleColumns}
                rowHeight={rowHeight}
                rowLayouts={rowLayouts}
                width={middleWidth}
                customRows={customRows}
                customRowMetrics={customRowMetrics}
                columnOffset={columns.length}
                emit={emit}
              />
            </div>
          )}

          {(showTaskList || showDateColumns) && (
            <div
              className="rg-divider"
              role="separator"
              aria-orientation="vertical"
              onPointerDown={sidebar.onDividerPointerDown(showDateColumns ? 'middle' : 'left')}
              onPointerMove={sidebar.onDividerPointerMove}
              onPointerUp={sidebar.onDividerPointerUp}
              data-testid={showDateColumns ? 'divider-middle' : 'divider-left'}
            />
          )}

          <div className="rg-timeline-panel" style={{ flex: 1, minWidth: 0 }}>
            <div
              ref={timelineScrollRef}
              className="rg-timeline-scroll rg-sync-scroll"
              onScroll={(e) => {
                onTimelineScroll(e);
                syncRowScroll(e);
              }}
            >
              <div
                className="rg-timeline-inner"
                style={{ width: timelineWidth }}
              >
                {eventMarkers && eventMarkers.length > 0 && (
                  <EventMarkersLayer
                    markers={eventMarkers}
                    range={range}
                    scale={scale}
                    columnWidth={columnWidth}
                    totalHeight={timelineContentHeight}
                    interactive={interactionsEnabled}
                    emit={emit}
                  />
                )}
                <TimelineHeader
                  range={range}
                  scale={scale}
                  columnWidth={columnWidth}
                  visibleColumns={visibleColumns}
                  dateMarkings={dateMarkings}
                  interactive={interactionsEnabled}
                  emit={emit}
                />
                <TimelineBody
                  tasks={resolvedTasks}
                  range={range}
                  scale={scale}
                  columnWidth={columnWidth}
                  visibleColumns={visibleColumns}
                  rowLayouts={rowLayouts}
                  store={store}
                  enableDrag={enableDrag}
                  enableResize={enableResize}
                  enableProgressDrag={enableProgressDrag}
                  snapToGrid={snapToGrid}
                  timelineBounds={timelineBounds}
                  dateMarkings={dateMarkings}
                  blockDates={blockDates}
                  showBaseline={showBaseline}
                  selectedTaskIds={effectiveSelectedIds}
                  interactionsEnabled={interactionsEnabled}
                  emit={emit}
                  onTaskUpdate={handleTaskUpdate}
                />
                <CustomRowsTimeline
                  rows={customRows}
                  rowHeight={rowHeight}
                  timelineWidth={timelineWidth}
                  metrics={customRowMetrics}
                  columnCount={columns.length + middleColumns.length}
                  emit={emit}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {showTooltip && tooltip && (
        <TaskTooltip task={tooltip.task} x={tooltip.x} y={tooltip.y} />
      )}
    </div>
    </GanttTimelineProvider>
  );
}

export { useSidebarLayout } from './hooks/useSidebarLayout';
export { useGanttTimeline, useGanttTimelineOptional } from './context/GanttChartContext';
export type { GanttTimelineContextValue } from './context/GanttChartContext';
export type * from './types';
