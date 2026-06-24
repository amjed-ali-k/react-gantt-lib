import {
  useRef,
  useState,
  useMemo,
  useCallback,
  useEffect,
  useLayoutEffect,
} from 'react';
import type {
  CustomRowDefinition,
  GanttChartProps,
  GanttColumn,
  GanttEventMap,
  GanttTask,
} from './types';
import { useGanttEmitter } from './hooks/useGanttEmitter';
import { useSidebarLayout } from './hooks/useSidebarLayout';
import { useTaskStore } from './hooks/useTaskStore';
import { DragPreviewStore } from './hooks/useDragPreviewStore';
import { DragPreviewProvider } from './context/DragPreviewContext';
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
import { computeRowLayouts } from './core/rowLayout';
import {
  partitionTasksBySticky,
  partitionCustomRowsBySticky,
  computeStickyTopOffsets,
  computeStickyBottomOffsets,
  taskSectionHeights,
  customRowHeights,
  totalStickyTimelineBodyHeight,
  rowLayoutsForTasks,
} from './core/stickyRows';
import { maintainBufferedColumnRange, getViewportColumnRange, DEFAULT_COLUMN_SCROLL_BUFFER_PERCENT } from './core/visibleColumns';
import { stableTimelineRange, timelineMetricsSignature } from './core/stableValue';
import { toDate } from './core/dates';
import { TaskListPanel, MiddlePanel } from './components/TaskList/TaskListPanel';
import { TimelineHeader } from './components/Timeline/TimelineHeader';
import { TimelineBody } from './components/Timeline/TimelineBody';
import { ZoomToolbar } from './components/Toolbar/ZoomToolbar';
import { CustomRowsTimeline } from './components/CustomRows/CustomRowsTimeline';
import { StickyTaskTimelineRows } from './components/Timeline/StickyTaskTimelineRows';
import { GanttTimelineProvider } from './context/GanttChartContext';
import { GanttDisplayProvider } from './context/GanttDisplayContext';
import { EventMarkersLayer } from './components/Timeline/EventMarkersLayer';
import { TaskTooltipProvider } from './components/Tooltip/TaskTooltipLayer';

const DEFAULT_COLUMNS: GanttColumn[] = [
  { key: 'name', title: 'Task', flex: 2, minWidth: 120 },
];

const DEFAULT_MIDDLE_COLUMNS: GanttColumn[] = [
  { key: 'start', title: 'Start', flex: 1, minWidth: 90 },
  { key: 'end', title: 'End', flex: 1, minWidth: 90 },
];

// Stable empty reference so an omitted `customRows` prop does not allocate a new
// array on every render (which would defeat memoisation of the sidebar panels).
const EMPTY_CUSTOM_ROWS: CustomRowDefinition[] = [];

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
  timezone,
  defaultLeftWidth = 220,
  defaultMiddleWidth = 180,
  minPanelWidth = 80,
  showTaskList = true,
  showDateColumns = true,
  showTooltip = false,
  renderTaskTooltip,
  holidays,
  blockDates,
  eventMarkers,
  showBaseline = true,
  groupSummaryRollup,
  enableDrag = true,
  enableResize = true,
  enableProgressDrag = true,
  snapToGrid = true,
  minDate,
  maxDate,
  customRows = EMPTY_CUSTOM_ROWS,
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
  const dragPreviewStoreRef = useRef<DragPreviewStore | null>(null);
  if (!dragPreviewStoreRef.current) {
    dragPreviewStoreRef.current = new DragPreviewStore();
  }
  const dragPreviewStore = dragPreviewStoreRef.current;
  const [scaleId, setScaleId] = useState(zoomProp);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const scrollRafRef = useRef<number | null>(null);
  const pendingScrollLeftRef = useRef(0);
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);
  const pendingCenterDateRef = useRef<Date | null>(null);

  const availableScales = useMemo(
    () => resolveScales(availableZoomLevels),
    [availableZoomLevels],
  );

  const scale = useMemo(() => resolveScale(scaleId), [scaleId]);

  const onTaskHoverRef = useRef(onTaskHover);
  onTaskHoverRef.current = onTaskHover;

  const handleTaskHover = useCallback((detail: GanttEventMap['taskHover']) => {
    onTaskHoverRef.current?.(detail);
  }, []);

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

  const resolvedTasks = useMemo(
    () => resolveTasks(tasks, { groupSummaryRollup }),
    [tasks, groupSummaryRollup],
  );
  const columnWidth = getColumnWidth(scale, columnWidthProp);

  const stickyTaskPartitions = useMemo(
    () => partitionTasksBySticky(resolvedTasks),
    [resolvedTasks],
  );
  const stickyCustomRowPartitions = useMemo(
    () => partitionCustomRowsBySticky(customRows),
    [customRows],
  );

  const rowLayouts = useMemo(
    () => computeRowLayouts(resolvedTasks, rowHeight, showBaseline),
    [resolvedTasks, rowHeight, showBaseline],
  );

  const stickyRowLayouts = useMemo(
    () => ({
      top: rowLayoutsForTasks(stickyTaskPartitions.top, rowHeight, showBaseline),
      scroll: rowLayoutsForTasks(stickyTaskPartitions.scroll, rowHeight, showBaseline),
      bottom: rowLayoutsForTasks(stickyTaskPartitions.bottom, rowHeight, showBaseline),
    }),
    [stickyTaskPartitions, rowHeight, showBaseline],
  );

  const stickyOffsets = useMemo(() => {
    const topTaskHeights = taskSectionHeights(
      stickyTaskPartitions.top,
      rowHeight,
      showBaseline,
    );
    const topCustomHeights = customRowHeights(stickyCustomRowPartitions.top, rowHeight);
    const topTaskOffsets = computeStickyTopOffsets(topTaskHeights, TIMELINE_HEADER_HEIGHT);
    const topCustomOffsets = computeStickyTopOffsets(
      topCustomHeights,
      TIMELINE_HEADER_HEIGHT + topTaskHeights.reduce((sum, h) => sum + h, 0),
    );

    const bottomCustomHeights = customRowHeights(stickyCustomRowPartitions.bottom, rowHeight);
    const bottomTaskHeights = taskSectionHeights(
      stickyTaskPartitions.bottom,
      rowHeight,
      showBaseline,
    );
    const bottomSectionHeights = [...bottomCustomHeights, ...bottomTaskHeights];
    const bottomSectionOffsets = computeStickyBottomOffsets(bottomSectionHeights);

    return {
      topTasks: topTaskOffsets,
      topCustomRows: topCustomOffsets,
      bottomCustomRows: bottomSectionOffsets.slice(0, bottomCustomHeights.length),
      bottomTasks: bottomSectionOffsets.slice(bottomCustomHeights.length),
    };
  }, [
    stickyTaskPartitions,
    stickyCustomRowPartitions,
    rowHeight,
    showBaseline,
  ]);

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
  const timelineBodyHeight = totalStickyTimelineBodyHeight(
    stickyTaskPartitions.top,
    stickyTaskPartitions.scroll,
    stickyTaskPartitions.bottom,
    stickyCustomRowPartitions.top,
    stickyCustomRowPartitions.inline,
    stickyCustomRowPartitions.bottom,
    rowHeight,
    showBaseline,
  );
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

  const metricsSignature = timelineMetricsSignature({
    zoomLevel: scaleId,
    columnWidth,
    timelineWidth,
    msPerPixel,
    rangeStart: range.start,
    rangeEnd: range.end,
    rangeColumnCount: range.columnCount,
    rowHeight,
    scrollLeft,
    viewportWidth,
    visibleStart: visibleColumns.startIndex,
    visibleEnd: visibleColumns.endIndex,
    viewportStart: viewportColumns.startIndex,
    viewportEnd: viewportColumns.endIndex,
    columnScrollBufferPercent,
  });

  const metricsSignatureRef = useRef(metricsSignature);
  const timelineContextRef = useRef(timelineContext);
  const customRowMetricsRef = useRef(customRowMetrics);

  if (metricsSignatureRef.current !== metricsSignature) {
    metricsSignatureRef.current = metricsSignature;
    timelineContextRef.current = timelineContext;
    customRowMetricsRef.current = customRowMetrics;
  }

  const stableTimelineContext = timelineContextRef.current;
  const stableCustomRowMetrics = customRowMetricsRef.current;

  // The left/middle sidebars are horizontally fixed: their content (task names,
  // start/end dates, custom sidebar cells) never depends on horizontal scroll or
  // the visible-column window. Give them a metrics object whose identity only
  // changes when a non-scroll field changes, so scrolling the timeline does not
  // re-render the sidebar panels.
  const sidebarMetricsSignature = [
    scaleId,
    columnWidth,
    timelineWidth,
    msPerPixel,
    range.start.getTime(),
    range.end.getTime(),
    rowHeight,
    columnScrollBufferPercent,
  ].join('|');
  const sidebarMetricsSignatureRef = useRef(sidebarMetricsSignature);
  const sidebarMetricsRef = useRef(customRowMetrics);
  if (sidebarMetricsSignatureRef.current !== sidebarMetricsSignature) {
    sidebarMetricsSignatureRef.current = sidebarMetricsSignature;
    sidebarMetricsRef.current = customRowMetrics;
  }
  const stableSidebarMetrics = sidebarMetricsRef.current;

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

  // Keep zoom-change inputs in a ref so the handler identity stays stable across
  // scroll/drag renders. Without this, the `...callbacks` rest object (recreated
  // every render) would change the callback identity each render and force the
  // memoised ZoomToolbar to re-render on every GanttChart render.
  const zoomChangeInputsRef = useRef({
    scale,
    columnWidth,
    rangeStart: range.start,
    columnWidthProp,
    onZoomChange: callbacks.onZoomChange,
  });
  zoomChangeInputsRef.current = {
    scale,
    columnWidth,
    rangeStart: range.start,
    columnWidthProp,
    onZoomChange: callbacks.onZoomChange,
  };

  const handleZoomChange = useCallback(
    (newScaleId: string) => {
      const {
        scale: curScale,
        columnWidth: curColumnWidth,
        rangeStart,
        columnWidthProp: curColumnWidthProp,
        onZoomChange,
      } = zoomChangeInputsRef.current;
      const scrollEl = timelineScrollRef.current;
      if (scrollEl && scrollEl.clientWidth > 0) {
        const centerPx = scrollEl.scrollLeft + scrollEl.clientWidth / 2;
        const msPerPixel = getMsPerPixel(curScale, curColumnWidth);
        pendingCenterDateRef.current = new Date(
          rangeStart.getTime() + centerPx * msPerPixel,
        );
      }
      setScaleId(newScaleId);
      const nextScale = resolveScale(newScaleId);
      const cw = getColumnWidth(nextScale, curColumnWidthProp);
      const detail = {
        zoomLevel: newScaleId,
        scaleId: newScaleId,
        scaleLabel: nextScale.label,
        columnWidth: cw,
      };
      emit('zoomChange', detail);
      onZoomChange?.(detail);
    },
    [emit],
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

  const handleTooltipTaskChange = useCallback(
    (taskId: string, patch: Partial<GanttTask>) => {
      const source = tasks.find((t) => t.id === taskId);
      if (source?.readOnly) return;

      const mapped: Record<string, unknown> = {};
      if (patch.name !== undefined) mapped.name = patch.name;
      if (patch.progress !== undefined) mapped.progress = patch.progress;
      if (patch.color !== undefined) mapped.color = patch.color;
      if (patch.borderColor !== undefined) mapped.borderColor = patch.borderColor;

      const hasStart = patch.start !== undefined;
      const hasEnd = patch.end !== undefined;
      if (hasStart || hasEnd) {
        const start = hasStart ? toDate(patch.start!) : toDate(source.start);
        const end = hasEnd ? toDate(patch.end!) : toDate(source.end);
        if (timelineBounds) {
          const clamped = clampTaskDates(start, end, timelineBounds, 'move');
          mapped.start = clamped.start.toISOString();
          mapped.end = clamped.end.toISOString();
        } else {
          if (hasStart) mapped.start = start.toISOString();
          if (hasEnd) mapped.end = end.toISOString();
        }
      }

      if (Object.keys(mapped).length === 0) return;

      updateTask(taskId, mapped);
      if (onTasksChange) {
        onTasksChange(
          tasks.map((t) => (t.id === taskId ? { ...t, ...mapped } : t)),
        );
      }
    },
    [tasks, updateTask, onTasksChange, timelineBounds],
  );

  const tooltipEnabled = showTooltip || !!renderTaskTooltip;

  return (
    <GanttDisplayProvider timezone={timezone}>
    <GanttTimelineProvider value={stableTimelineContext}>
    <DragPreviewProvider store={dragPreviewStore}>
    <div
      ref={containerRef}
      className={`rg-gantt rg-theme-${theme} ${className ?? ''}`.trim()}
      style={{ width, height, ...style }}
      data-testid="gantt-chart"
      data-sidebar-left={leftWidth}
      data-sidebar-middle={middleWidth}
      data-timeline-left={timelineLeft}
    >
      <TaskTooltipProvider
        enabled={tooltipEnabled}
        renderTaskTooltip={renderTaskTooltip}
        onTaskChange={handleTooltipTaskChange}
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
                stickyTasks={stickyTaskPartitions}
                sourceTasks={tasks}
                columns={columns}
                rowHeight={rowHeight}
                rowLayouts={rowLayouts}
                stickyRowLayouts={stickyRowLayouts}
                width={leftWidth}
                selectedTaskIds={effectiveSelectedIds}
                onToggleCollapse={handleToggleCollapse}
                emit={emit}
                customRows={customRows}
                stickyCustomRows={stickyCustomRowPartitions}
                customRowMetrics={stableSidebarMetrics}
                stickyOffsets={stickyOffsets}
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
                stickyTasks={stickyTaskPartitions}
                columns={middleColumns}
                rowHeight={rowHeight}
                rowLayouts={rowLayouts}
                stickyRowLayouts={stickyRowLayouts}
                width={middleWidth}
                customRows={customRows}
                stickyCustomRows={stickyCustomRowPartitions}
                customRowMetrics={stableSidebarMetrics}
                columnOffset={columns.length}
                emit={emit}
                stickyOffsets={stickyOffsets}
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
                <div className="rg-timeline-rows">
                <StickyTaskTimelineRows
                  tasks={stickyTaskPartitions.top}
                  rowLayouts={stickyRowLayouts.top}
                  allTasks={resolvedTasks}
                  position="top"
                  stickyOffsets={stickyOffsets.topTasks}
                  range={range}
                  scale={scale}
                  columnWidth={columnWidth}
                  store={store}
                  enableDrag={enableDrag}
                  enableResize={enableResize}
                  enableProgressDrag={enableProgressDrag}
                  groupSummaryRollup={groupSummaryRollup}
                  snapToGrid={snapToGrid}
                  timelineBounds={timelineBounds}
                  showBaseline={showBaseline}
                  selectedTaskIds={effectiveSelectedIds}
                  emit={emit}
                  onTaskUpdate={handleTaskUpdate}
                />
                <CustomRowsTimeline
                  rows={stickyCustomRowPartitions.top}
                  rowHeight={rowHeight}
                  timelineWidth={timelineWidth}
                  metrics={stableCustomRowMetrics}
                  columnCount={columns.length + middleColumns.length}
                  emit={emit}
                  stickyPosition="top"
                  stickyOffsets={stickyOffsets.topCustomRows}
                />
                <TimelineBody
                  tasks={stickyTaskPartitions.scroll}
                  range={range}
                  scale={scale}
                  columnWidth={columnWidth}
                  visibleColumns={visibleColumns}
                  rowLayouts={stickyRowLayouts.scroll}
                  store={store}
                  enableDrag={enableDrag}
                  enableResize={enableResize}
                  enableProgressDrag={enableProgressDrag}
                  groupSummaryRollup={groupSummaryRollup}
                  snapToGrid={snapToGrid}
                  timelineBounds={timelineBounds}
                  dateMarkings={dateMarkings}
                  blockDates={blockDates}
                  showBaseline={showBaseline}
                  selectedTaskIds={effectiveSelectedIds}
                  interactionsEnabled={interactionsEnabled}
                  emit={emit}
                  dragPreviewStore={dragPreviewStore}
                  onTaskUpdate={handleTaskUpdate}
                />
                <CustomRowsTimeline
                  rows={stickyCustomRowPartitions.inline}
                  rowHeight={rowHeight}
                  timelineWidth={timelineWidth}
                  metrics={stableCustomRowMetrics}
                  columnCount={columns.length + middleColumns.length}
                  emit={emit}
                />
                <CustomRowsTimeline
                  rows={stickyCustomRowPartitions.bottom}
                  rowHeight={rowHeight}
                  timelineWidth={timelineWidth}
                  metrics={stableCustomRowMetrics}
                  columnCount={columns.length + middleColumns.length}
                  emit={emit}
                  stickyPosition="bottom"
                  stickyOffsets={stickyOffsets.bottomCustomRows}
                />
                <StickyTaskTimelineRows
                  tasks={stickyTaskPartitions.bottom}
                  rowLayouts={stickyRowLayouts.bottom}
                  allTasks={resolvedTasks}
                  position="bottom"
                  stickyOffsets={stickyOffsets.bottomTasks}
                  range={range}
                  scale={scale}
                  columnWidth={columnWidth}
                  store={store}
                  enableDrag={enableDrag}
                  enableResize={enableResize}
                  enableProgressDrag={enableProgressDrag}
                  groupSummaryRollup={groupSummaryRollup}
                  snapToGrid={snapToGrid}
                  timelineBounds={timelineBounds}
                  showBaseline={showBaseline}
                  selectedTaskIds={effectiveSelectedIds}
                  emit={emit}
                  onTaskUpdate={handleTaskUpdate}
                />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </TaskTooltipProvider>
    </div>
    </DragPreviewProvider>
    </GanttTimelineProvider>
    </GanttDisplayProvider>
  );
}

export { useSidebarLayout } from './hooks/useSidebarLayout';
export { useGanttTimeline, useGanttTimelineOptional } from './context/GanttChartContext';
export { useGanttDisplayTimezone } from './context/GanttDisplayContext';
export type { GanttTimelineContextValue } from './context/GanttChartContext';
export type * from './types';
