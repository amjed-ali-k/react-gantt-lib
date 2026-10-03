import * as react3 from "react";
import React$1, { ReactNode, RefObject } from "react";
import { format } from "date-fns";

//#region src/core/scale.d.ts
interface ViewScale {
  id: string;
  label: string;
  stepAmount: number;
  stepUnit: ZoomLevel;
  columnWidth: number;
}
declare const PRESET_SCALES: Record<string, ViewScale>;
declare function resolveScale(id: string): ViewScale;
declare function resolveScales(ids?: string[]): ViewScale[];
//#endregion
//#region src/types.d.ts
/** Zoom level: one timeline column equals one unit of this scale. */
type ZoomLevel = 'month' | 'week' | 'day' | 'hour' | 'minute';
/** Extended preset ids including multi-step column scales. */
type ViewScaleId = ZoomLevel | '2day' | '6hour' | '3hour' | '1hour';
type GanttTheme = 'light' | 'dark' | 'auto';
type DependencyType = 'FS' | 'FF' | 'SS' | 'SF';
/** Original scheduled dates before plan changes (rendered as amber baseline). */
interface TaskBaseline {
  start: Date | string;
  end: Date | string;
  /** Baseline marker color. Default: #e6a23c (amber). */
  color?: string;
}
/**
 * A link from a predecessor (`id`) to the task that lists it in `dependencies`.
 * The pair identifies the link: at most one link per predecessor/successor pair.
 */
interface GanttDependency {
  /** Predecessor task id. */
  id: string;
  /** Link type. Default `FS`. */
  type?: DependencyType;
  /** Lag (positive) or lead (negative), drawn as a label. Units are the consumer's — see `formatDependencyLag`. */
  lag?: number;
  /** Line and arrowhead color. */
  color?: string;
  /** Extra class on the link's `<g>` (line, arrowhead and lag label). */
  className?: string;
  /** Marks the link as on the critical path (`rg-dependency--critical`). */
  critical?: boolean;
}
/** A dependency as an interaction target: the link and the two tasks it joins. */
interface GanttDependencyTarget {
  type: 'dependency';
  /** Stable link id — see `dependencyId()`. Used by `selectedDependencyIds`. */
  id: string;
  /** Predecessor. */
  from: GanttTask;
  /** Successor (the task that lists the dependency). */
  to: GanttTask;
  /** The link, normalised: `type` and `lag` are always set. */
  dependency: GanttDependency & {
    type: DependencyType;
    lag: number;
  };
}
/** Roll-up behavior for group summary bars (`type: 'group'`, `showSummaryBar` true). */
interface GroupSummaryRollup {
  /** Span min/max child dates. Default true. Set false to use `start` / `end` on the group row. */
  dates?: boolean;
  /** Duration-weighted average of child progress when unset. Set `progress` on the group to override, or `rollup.progress: false`. */
  progress?: boolean;
  /** Min/max of child baselines when unset. Set `baseline` on the group to override, or `rollup.baseline: false`. */
  baseline?: boolean;
}
interface GanttTask {
  id: string;
  name: string;
  start: Date | string;
  end: Date | string;
  progress?: number;
  parentId?: string;
  dependencies?: GanttDependency[] | string[];
  type?: 'task' | 'milestone' | 'group';
  /** On group rows: show a spanning summary bar (default true). Set false for sidebar-only group rows. */
  showSummaryBar?: boolean;
  /** Per-group overrides for summary bar roll-up (dates, progress, baseline). */
  rollup?: GroupSummaryRollup;
  /** Prevent drag, resize, and progress edits for this task. */
  readOnly?: boolean;
  /** Per-task overrides for interaction (fall back to chart-level props). */
  enableDrag?: boolean;
  enableResize?: boolean;
  enableProgressDrag?: boolean;
  /** Show connector handles to link a new dependency from or to this task. Falls back to `enableDependencyCreate`. */
  enableDependencyCreate?: boolean;
  /** Original plan dates — line below bars or diamond behind milestones. */
  baseline?: TaskBaseline;
  /** Bar fill / milestone color. */
  color?: string;
  /** Bar outline color. */
  borderColor?: string;
  /** On the critical path: drawn with a heavy dashed outline (`rg-bar--critical`), not colour alone. */
  critical?: boolean;
  /** Bar height in px (within the row). */
  width?: number;
  collapsed?: boolean;
  /** Pin this row to the top or bottom of the scroll viewport so it stays visible. */
  sticky?: 'top' | 'bottom';
  meta?: Record<string, unknown>;
}
interface GanttColumn {
  key: string;
  title: string;
  width?: number;
  minWidth?: number;
  flex?: number;
  render?: (ctx: ColumnRenderContext) => React$1.ReactNode;
}
interface ColumnRenderContext {
  task: GanttTask;
  rowIndex: number;
  columnKey: string;
}
interface SidebarWidths {
  /** Left panel (primary task list) width in px */
  left: number;
  /** Middle panel (secondary columns) width in px */
  middle: number;
  /** Timeline starts at this x offset from chart left */
  timelineLeft: number;
  /** Total chart width */
  totalWidth: number;
}
interface SidebarLayoutState {
  leftWidth: number;
  middleWidth: number;
  rightWidth: number;
  timelineLeft: number;
  totalWidth: number;
}
/** Context passed to custom async row cell generators */
interface CustomRowCellContext<TMeta = unknown> {
  rowId: string;
  columnKey: string;
  columnIndex: number;
  rowIndex: number;
  zoomLevel: string;
  rangeStart: Date;
  rangeEnd: Date;
  /** Resolved view scale for the current zoom level. */
  scale: ViewScale;
  columnWidth: number;
  timelineWidth: number;
  msPerPixel: number;
  rowHeight: number;
  /** Horizontal scroll offset of the timeline viewport in px. */
  scrollLeft: number;
  /** Width of the timeline viewport in px. */
  viewportWidth: number;
  /** First visible column index (includes overscan). */
  visibleColumnStart: number;
  /** Last visible column index inside the buffered virtual window. */
  visibleColumnEnd: number;
  /** Tight viewport column range (no buffer) — useful for highlighting only on-screen columns. */
  viewportColumnStart: number;
  viewportColumnEnd: number;
  /** Horizontal scroll buffer (% of viewport width) applied on each side. */
  columnScrollBufferPercent: number;
  meta?: TMeta;
}
type CustomRowCellGenerator<TMeta = unknown> = (ctx: CustomRowCellContext<TMeta>) => Promise<React$1.ReactNode> | React$1.ReactNode;
interface CustomRowDefinition<TMeta = unknown> {
  id: string;
  meta?: TMeta;
  /** Row height in px. Falls back to the chart `rowHeight` when omitted. */
  height?: number;
  /** Pin this custom row to the top or bottom of the scroll viewport. */
  sticky?: 'top' | 'bottom';
  /** Per-column async data/renderer. Key = column key from columns config */
  cells: Record<string, CustomRowCellGenerator<TMeta>>;
}
/** Named holiday date (Frappe-style). */
interface HolidayDateEntry {
  date: Date | string;
  label?: string;
}
/** Highlight weekends and/or specific dates on the timeline (Frappe Gantt-style). */
interface HolidayMarking {
  /** Highlight Saturdays and Sundays. */
  weekends?: boolean;
  /** Specific dates to highlight, e.g. public holidays. */
  dates?: (Date | string | HolidayDateEntry)[];
  /** Column fill color. Default: #f2f2f2. */
  color?: string;
  /** Custom weekend predicate. Default: Saturday/Sunday. */
  isWeekend?: (date: Date) => boolean;
}
/** Blocked / unavailable date range shown in light rose on the timeline. */
interface BlockDateRange {
  start: Date | string;
  end: Date | string;
  label?: string;
  /** Fill color. Default: light rose. */
  color?: string;
}
interface DateMarkingRect {
  key: string;
  x: number;
  width: number;
  color?: string;
  kind: 'holiday' | 'block';
  label?: string;
  /** Calendar day for holiday highlights. */
  date?: Date;
  /** Index in the original `blockDates` or `holidays.dates` array when applicable. */
  sourceIndex?: number;
}
/** Discriminated union describing what was clicked or right-clicked on the chart. */
type GanttTarget = {
  type: 'task';
  task: GanttTask;
  rowIndex: number;
  element: 'bar' | 'milestone';
} | {
  type: 'baseline';
  task: GanttTask;
  rowIndex: number;
  element: 'bar' | 'milestone';
} | {
  type: 'blockDate';
  range: BlockDateRange;
  index: number;
} | {
  type: 'holiday';
  date: Date;
  label?: string;
  index?: number;
} | {
  type: 'eventMarker';
  marker: EventMarker;
  index: number;
} | {
  type: 'draggableMarker';
  marker: DraggableMarker;
  index: number;
} | {
  type: 'timeline';
  date: Date;
  rowIndex: number | null;
} | GanttDependencyTarget;
interface GanttPointerDetail {
  target: GanttTarget;
  clientX: number;
  clientY: number;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  /** Call to suppress the browser context menu (context-menu events only). */
  preventDefault: () => void;
}
/** A new link the user drew (drag between connector handles, or the `L` keyboard flow). */
interface GanttDependencyCreateDetail {
  /** Predecessor: the task the link was drawn from. */
  fromId: string;
  /** Successor: the task the link was dropped on. Never equal to `fromId`. */
  toId: string;
  /** Inferred from the two handles: end→start FS, start→start SS, end→end FF, start→end SF. */
  type: DependencyType;
  source: 'pointer' | 'keyboard';
}
/** Pointer detail for dependency events — the target is always a dependency. */
interface GanttDependencyPointerDetail extends Omit<GanttPointerDetail, 'target'> {
  target: GanttDependencyTarget;
}
interface GanttDependencyHoverDetail {
  /** The hovered link; on `leave`, the link being left. */
  target: GanttDependencyTarget;
  phase: 'enter' | 'leave';
  clientX: number;
  clientY: number;
}
interface GanttHoverDetail {
  target: GanttTarget | null;
  phase: 'enter' | 'leave' | 'move';
  clientX: number;
  clientY: number;
}
interface DateMarkingLayers {
  holidays: DateMarkingRect[];
  blocks: DateMarkingRect[];
}
/** Vertical event marker at a specific date/time (Syncfusion-style stripline). */
interface EventMarker {
  id?: string;
  date: Date | string;
  label: string;
  /** Line, label border, and arrow color. */
  color?: string;
  /** Label vertical offset in px from top of timeline (header + body). */
  labelTop?: number;
}
/**
 * Draggable vertical timeline marker (today-marker style).
 * Use drag callbacks to drive history playback, baselines, or other project-specific overlays.
 */
interface DraggableMarker {
  id: string;
  date: Date | string;
  /** Optional label shown at the top of the line. */
  label?: string;
  /** Line and label accent color. Defaults to the today-marker color. */
  color?: string;
  /** When false, the marker is visible but not draggable. Default true. */
  draggable?: boolean;
}
/**
 * Invisible snap target for draggable markers. Not rendered — used only for drag snapping.
 * Supports date-only or datetime strings for sub-day precision.
 */
interface DraggableMarkerSnapPoint {
  id: string;
  date: Date | string;
}
/** What drove a move or resize: a pointer drag, or the arrow keys on a focused bar. */
type GanttInputSource = 'pointer' | 'keyboard';
interface GanttEventMap {
  taskClick: {
    task: GanttTask;
    rowIndex: number;
    element?: 'bar' | 'milestone';
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
  };
  taskDoubleClick: {
    task: GanttTask;
    rowIndex: number;
    element?: 'bar' | 'milestone';
  };
  ganttClick: GanttPointerDetail;
  ganttContextMenu: GanttPointerDetail;
  ganttHover: GanttHoverDetail;
  taskHover: {
    task: GanttTask | null;
    rowIndex: number | null;
    clientX?: number;
    clientY?: number;
  };
  taskDragStart: {
    task: GanttTask;
    start: Date;
    end: Date;
    source: GanttInputSource;
  };
  taskDrag: {
    task: GanttTask;
    start: Date;
    end: Date;
    deltaMs: number;
    source: GanttInputSource;
  };
  taskDragEnd: {
    task: GanttTask;
    start: Date;
    end: Date;
    previousStart: Date;
    previousEnd: Date;
    source: GanttInputSource;
  };
  taskResizeStart: {
    task: GanttTask;
    edge: 'start' | 'end';
    source: GanttInputSource;
  };
  taskResize: {
    task: GanttTask;
    start: Date;
    end: Date;
    edge: 'start' | 'end';
    source: GanttInputSource;
  };
  taskResizeEnd: {
    task: GanttTask;
    start: Date;
    end: Date;
    edge: 'start' | 'end';
    previousStart: Date;
    previousEnd: Date;
    source: GanttInputSource;
  };
  progressChange: {
    task: GanttTask;
    progress: number;
    previousProgress: number;
  };
  draggableMarkerDragStart: {
    marker: DraggableMarker;
    index: number;
    date: Date;
  };
  draggableMarkerDrag: {
    marker: DraggableMarker;
    index: number;
    date: Date;
    previousDate: Date;
    deltaMs: number;
  };
  draggableMarkerDragEnd: {
    marker: DraggableMarker;
    index: number;
    date: Date;
    previousDate: Date;
    snapPoint?: DraggableMarkerSnapPoint;
    snapPointIndex?: number;
  };
  draggableMarkerDragToSnapPoint: {
    marker: DraggableMarker;
    index: number;
    snapPoint: DraggableMarkerSnapPoint;
    snapPointIndex: number;
    date: Date;
    previousDate: Date;
    phase: 'drag' | 'end';
  };
  zoomChange: {
    zoomLevel: string;
    columnWidth: number;
    scaleId: string;
    scaleLabel: string;
  };
  scroll: {
    scrollLeft: number;
    scrollTop: number;
  };
  sidebarLayoutChange: SidebarLayoutState;
  selectionChange: {
    selectedIds: string[];
    selectedDependencyIds: string[];
  };
  dependencyClick: GanttDependencyPointerDetail;
  dependencyContextMenu: GanttDependencyPointerDetail;
  dependencyHover: GanttDependencyHoverDetail;
  dependencyDelete: {
    dependencies: GanttDependencyTarget[];
  };
  dependencyCreate: GanttDependencyCreateDetail;
  customRowCellReady: {
    rowId: string;
    columnKey: string;
  };
  customRowCellError: {
    rowId: string;
    columnKey: string;
    error: unknown;
  };
}
type GanttEventName = keyof GanttEventMap;
type GanttEventHandler<K extends GanttEventName> = (detail: GanttEventMap[K]) => void;
/** Patch handler passed to `renderTaskTooltip` for inline edits from the tooltip. */
type TaskTooltipChangeHandler = (patch: Partial<GanttTask>) => void;
/** Custom task tooltip renderer — receives the hovered task and an `onChange` patch handler. */
type TaskTooltipRenderer = (task: GanttTask, onChange: TaskTooltipChangeHandler) => React$1.ReactNode;
interface GanttCallbacks {
  onTaskClick?: GanttEventHandler<'taskClick'>;
  onTaskDoubleClick?: GanttEventHandler<'taskDoubleClick'>;
  /** Unified click handler for bars, baselines, blocked dates, holidays, event markers, and empty timeline. */
  onGanttClick?: GanttEventHandler<'ganttClick'>;
  /** Right-click handler for the same targets as `onGanttClick`. Call `preventDefault()` to suppress the browser menu. */
  onGanttContextMenu?: GanttEventHandler<'ganttContextMenu'>;
  /** Hover handler for blocked dates, holidays, and other gantt targets (when not occluded by task bars). */
  onGanttHover?: GanttEventHandler<'ganttHover'>;
  /** Fires on mouse enter and leave only (`task: null` on leave). Not called on mousemove. */
  onTaskHover?: GanttEventHandler<'taskHover'>;
  onTaskDragStart?: GanttEventHandler<'taskDragStart'>;
  onTaskDrag?: GanttEventHandler<'taskDrag'>;
  onTaskDragEnd?: GanttEventHandler<'taskDragEnd'>;
  onTaskResizeStart?: GanttEventHandler<'taskResizeStart'>;
  onTaskResize?: GanttEventHandler<'taskResize'>;
  onTaskResizeEnd?: GanttEventHandler<'taskResizeEnd'>;
  onProgressChange?: GanttEventHandler<'progressChange'>;
  onDraggableMarkerDragStart?: GanttEventHandler<'draggableMarkerDragStart'>;
  onDraggableMarkerDrag?: GanttEventHandler<'draggableMarkerDrag'>;
  onDraggableMarkerDragEnd?: GanttEventHandler<'draggableMarkerDragEnd'>;
  /** Fires when a draggable marker snaps to a custom snap point (during drag and on release). */
  onDraggableMarkerDragToSnapPoint?: GanttEventHandler<'draggableMarkerDragToSnapPoint'>;
  onZoomChange?: GanttEventHandler<'zoomChange'>;
  onScroll?: GanttEventHandler<'scroll'>;
  onSidebarLayoutChange?: GanttEventHandler<'sidebarLayoutChange'>;
  /** Task and dependency selection changed (click, ctrl/meta-click, keyboard select). */
  onSelectionChange?: GanttEventHandler<'selectionChange'>;
  /** Click (or Enter/Space) on a dependency line. Also selects it. Setting this makes links interactive. */
  onDependencyClick?: GanttEventHandler<'dependencyClick'>;
  /** Right-click on a dependency line. Call `preventDefault()` to suppress the browser menu. */
  onDependencyContextMenu?: GanttEventHandler<'dependencyContextMenu'>;
  /** Pointer enters or leaves a dependency line. */
  onDependencyHover?: GanttEventHandler<'dependencyHover'>;
  /** Delete or Backspace with one or more dependencies selected. The chart does not remove them. */
  onDependencyDelete?: GanttEventHandler<'dependencyDelete'>;
  /**
   * A link was drawn (needs `enableDependencyCreate`). The chart does not add it and does not check
   * for cycles or duplicates — validate, then update `tasks`.
   */
  onDependencyCreate?: GanttEventHandler<'dependencyCreate'>;
  onCustomRowCellReady?: GanttEventHandler<'customRowCellReady'>;
  onCustomRowCellError?: GanttEventHandler<'customRowCellError'>;
}
interface GanttChartProps extends GanttCallbacks {
  tasks: GanttTask[];
  columns?: GanttColumn[];
  middleColumns?: GanttColumn[];
  zoomLevel?: ViewScaleId | string;
  /** Ordered list of scale ids shown in the zoom toolbar. Defaults to month → week → day → hour → minute. */
  availableZoomLevels?: (ViewScaleId | string)[];
  columnWidth?: number;
  rowHeight?: number;
  height?: number | string;
  width?: number | string;
  className?: string;
  style?: React$1.CSSProperties;
  /** Chart color theme. `auto` follows the OS prefers-color-scheme setting. Default `light`. */
  theme?: GanttTheme;
  /**
   * IANA timezone for all on-screen date/time labels (e.g. `America/New_York`).
   * When omitted, labels use the browser's local timezone.
   * Display only — task dates, drag/snap, and callbacks are unchanged.
   */
  timezone?: string;
  defaultLeftWidth?: number;
  defaultMiddleWidth?: number;
  minPanelWidth?: number;
  /** Show the left task name panel. Default true. */
  showTaskList?: boolean;
  /** Show the middle start/end date columns panel. Default true. */
  showDateColumns?: boolean;
  /** Show the built-in task tooltip on hover. Default false. */
  showTooltip?: boolean;
  /**
   * Custom task tooltip renderer. When set, tooltips are enabled and replace the built-in UI.
   * Position updates during hover/drag are applied imperatively (no chart re-renders).
   * Content re-renders only when the hovered task data changes.
   */
  renderTaskTooltip?: TaskTooltipRenderer;
  /** Highlight weekends and specific holiday dates on the timeline. */
  holidays?: HolidayMarking;
  /** Blocked date ranges shown in light rose on the timeline. */
  blockDates?: BlockDateRange[];
  /** Vertical dashed markers with labels at specific date/times. */
  eventMarkers?: EventMarker[];
  /** Draggable vertical markers (today-marker style) with drag lifecycle callbacks. */
  draggableMarkers?: DraggableMarker[];
  /**
   * Custom snap targets for draggable markers. Not rendered — the marker magnet-snaps to the
   * nearest point by timeline distance. Takes priority over `snapToGrid` when provided.
   */
  draggableMarkerSnapPoints?: DraggableMarkerSnapPoint[];
  /** Show baseline markers for tasks that define `baseline`. Default true. */
  showBaseline?: boolean;
  /** Default roll-up behavior for group summary bars. Per-task `rollup` overrides these. */
  groupSummaryRollup?: GroupSummaryRollup;
  enableDrag?: boolean;
  enableResize?: boolean;
  enableProgressDrag?: boolean;
  /** When true (default), dates snap to the zoom grid on pointer release. */
  snapToGrid?: boolean;
  /**
   * Fixed timeline start. Set together with `maxDate` to lock the grid —
   * dragging tasks will not expand columns or scroll extent.
   */
  minDate?: Date | string;
  /**
   * Fixed timeline end. Set together with `minDate` to lock the grid.
   */
  maxDate?: Date | string;
  selectedTaskIds?: string[];
  /**
   * Controlled dependency selection (ids from `dependencyId()`). Setting it, or any dependency
   * callback, makes links interactive: hover, click to select, Delete to `onDependencyDelete`.
   */
  selectedDependencyIds?: string[];
  /** Lag label text, called for links with a non-zero lag. Default: `+2d` / `-1d` (lag read as days). Return `''` to hide a label. */
  formatDependencyLag?: (lag: number, dependency: GanttDependency) => string;
  /**
   * Show connector handles at each bar's start and end (on hover and focus) to draw new links:
   * drag from one handle to another task's, or focus a bar, press `L`, focus the target bar and
   * press Enter (FS) or Shift+Enter (choose the type). Reported through `onDependencyCreate`.
   * Per-task `enableDependencyCreate` overrides it. Default false.
   */
  enableDependencyCreate?: boolean;
  /**
   * Speaks keyboard moves, resizes, zoom and linking progress ("Moved Rebar inspection to 12 Oct –
   * 14 Oct"). Pass it to route them to your own live region; without it the chart renders a visually
   * hidden `role="status"` region.
   */
  announce?: (message: string) => void;
  /** Accessible name of the timeline grid. Default "Timeline". */
  timelineLabel?: string;
  onTasksChange?: (tasks: GanttTask[]) => void;
  customRows?: CustomRowDefinition[];
  /**
   * Horizontal buffer for column virtualization, as % of viewport width on each side.
   * Buffered columns stay mounted while scrolling so custom cells are not recalculated
   * until they leave the buffer. Default 10.
   */
  columnScrollBufferPercent?: number;
  /** Called whenever sidebar positions change — use to sync external UI */
  onSidebarLayoutChange?: GanttEventHandler<'sidebarLayoutChange'>;
  children?: React$1.ReactNode;
}
interface ResolvedTask extends GanttTask {
  _start: Date;
  _end: Date;
  _baselineStart?: Date;
  _baselineEnd?: Date;
  _rowIndex: number;
  _level: number;
  _visible: boolean;
}
interface BarGeometry {
  x: number;
  width: number;
  y: number;
  height: number;
}
interface TimelineRange {
  start: Date;
  end: Date;
  columnCount: number;
  /** Exact horizontal extent in px (fixed ranges). When set, use instead of columnCount × columnWidth. */
  pixelWidth?: number;
  /** True when range comes from explicit minDate/maxDate — grid does not grow with tasks. */
  fixed?: boolean;
}
interface TimelineRangeBounds {
  minDate?: Date | string;
  maxDate?: Date | string;
}
//#endregion
//#region src/hooks/useSidebarLayout.d.ts
interface UseSidebarLayoutOptions {
  defaultLeftWidth?: number;
  defaultMiddleWidth?: number;
  minPanelWidth?: number;
  onLayoutChange?: (layout: SidebarLayoutState) => void;
}
declare function useSidebarLayout(containerRef: RefObject<HTMLElement | null>, options?: UseSidebarLayoutOptions): {
  layout: SidebarLayoutState;
  leftWidth: number;
  middleWidth: number;
  timelineLeft: number;
  onDividerPointerDown: (divider: "left" | "middle") => (e: React.PointerEvent) => void;
  onDividerPointerMove: (e: React.PointerEvent) => void;
  onDividerPointerUp: (e: React.PointerEvent) => void;
  setLeftWidth: react3.Dispatch<react3.SetStateAction<number>>;
  setMiddleWidth: react3.Dispatch<react3.SetStateAction<number>>;
};
//#endregion
//#region src/core/visibleColumns.d.ts
/** Default horizontal buffer (% of viewport width) on each side of the virtual column window. */
declare const DEFAULT_COLUMN_SCROLL_BUFFER_PERCENT = 10;
interface VisibleColumnRange {
  startIndex: number;
  endIndex: number;
  startX: number;
  endX: number;
}
/** Tight viewport column indices (no buffer). */
declare function getViewportColumnRange(scrollLeft: number, viewportWidth: number, columnWidth: number, columnCount: number): VisibleColumnRange;
/**
 * Maintain a sticky buffered column window for virtualization.
 * Expands when new columns enter the buffer; shrinks only after columns leave the buffer zone.
 * Returns the previous range object when indices are unchanged.
 */
declare function maintainBufferedColumnRange(scrollLeft: number, viewportWidth: number, columnWidth: number, columnCount: number, bufferPercent: number, prev: VisibleColumnRange | null): VisibleColumnRange;
/**
 * Compute which column indices intersect the current horizontal viewport.
 * @deprecated Prefer {@link maintainBufferedColumnRange} with a percentage buffer.
 */
declare function getVisibleColumnRange(scrollLeft: number, viewportWidth: number, columnWidth: number, columnCount: number, overscan?: number): VisibleColumnRange;
/** Keep only rects that overlap a horizontal pixel range. */
declare function filterRectsInXRange(rects: DateMarkingRect[], startX: number, endX: number): DateMarkingRect[];
//#endregion
//#region src/context/GanttChartContext.d.ts
interface GanttTimelineContextValue {
  zoomLevel: string;
  scale: ViewScale;
  columnWidth: number;
  timelineWidth: number;
  range: TimelineRange;
  rowHeight: number;
  msPerPixel: number;
  scrollLeft: number;
  viewportWidth: number;
  /** Buffered virtual column window — sticky while scrolling inside the buffer. */
  visibleColumns: VisibleColumnRange;
  /** Tight viewport column window without buffer. */
  viewportColumns: VisibleColumnRange;
  columnScrollBufferPercent: number;
}
/** Timeline scale/range metrics for custom row renderers inside `GanttChart`. */
declare function useGanttTimeline(): GanttTimelineContextValue;
declare function useGanttTimelineOptional(): GanttTimelineContextValue | null;
//#endregion
//#region src/context/GanttDisplayContext.d.ts
/** Display timezone from `GanttChart`'s `timezone` prop. Undefined means browser local time. */
declare function useGanttDisplayTimezone(): string | undefined;
//#endregion
//#region src/GanttChart.d.ts
declare function GanttChart({
  tasks: externalTasks,
  columns,
  middleColumns,
  zoomLevel: zoomProp,
  availableZoomLevels,
  columnWidth: columnWidthProp,
  rowHeight,
  height,
  width,
  className,
  style,
  theme,
  timezone,
  defaultLeftWidth,
  defaultMiddleWidth,
  minPanelWidth,
  showTaskList,
  showDateColumns,
  showTooltip,
  renderTaskTooltip,
  holidays,
  blockDates,
  eventMarkers,
  draggableMarkers,
  draggableMarkerSnapPoints,
  showBaseline,
  groupSummaryRollup,
  enableDrag,
  enableResize,
  enableProgressDrag,
  snapToGrid,
  minDate,
  maxDate,
  customRows,
  columnScrollBufferPercent,
  onTasksChange,
  onSidebarLayoutChange,
  onTaskHover,
  onTaskClick,
  onSelectionChange,
  selectedTaskIds,
  selectedDependencyIds,
  formatDependencyLag,
  enableDependencyCreate,
  announce: announceProp,
  timelineLabel,
  ...callbacks
}: GanttChartProps): react3.JSX.Element;
//#endregion
//#region src/core/zoom.d.ts
declare const ZOOM_LEVELS: ("month" | "week" | "day" | "hour" | "minute")[];
declare function getColumnWidth(scaleOrId: ViewScale | string, override?: number): number;
declare function computeTimelineRange(tasks: GanttTask[], scaleOrId: ViewScale | string, paddingUnits?: number, bounds?: TimelineRangeBounds): TimelineRange;
declare function nextZoomLevel(current: string, direction: 'in' | 'out', availableIds?: string[]): string;
//#endregion
//#region src/hooks/useBufferedSegmentCache.d.ts
/**
 * Incrementally cache computed segments keyed by an id.
 * Only calls `compute` for keys that newly enter the active set.
 * Drops cache entries once they leave the buffered window.
 */
declare function useBufferedSegmentCache<K, T>(activeKeys: readonly K[], compute: (key: K) => T, resetKey?: string): T[];
//#endregion
//#region src/hooks/useVirtualColumnSegments.d.ts
interface VirtualColumnSegment<T> {
  columnIndex: number;
  x: number;
  width: number;
  date: Date;
  data: T;
}
/**
 * Virtualized timeline column segments with incremental caching.
 * Only newly entered columns invoke `compute`; existing columns are reused while
 * they remain inside the buffered window.
 */
declare function useVirtualColumnSegments<T>(compute: (columnIndex: number, date: Date) => T, resetKey?: string): VirtualColumnSegment<T>[];
interface VirtualColumnCellProps {
  columnIndex: number;
  x: number;
  width: number;
  className?: string;
  title?: string;
  children: ReactNode;
}
/** Memoized absolutely-positioned cell for one virtual timeline column. */
declare const VirtualColumnCell: react3.NamedExoticComponent<VirtualColumnCellProps>;
//#endregion
//#region src/core/dates.d.ts
declare function toDate(value: Date | string): Date;
declare function addUnit(date: Date, amount: number, zoom: ZoomLevel): Date;
declare function diffUnits(later: Date, earlier: Date, zoom: ZoomLevel): number;
//#endregion
//#region src/hooks/useTaskStore.d.ts
type Listener$1 = () => void;
/** External store for granular task updates — only subscribers to changed task re-render */
declare class TaskStore {
  private tasks;
  private version;
  private taskVersions;
  private listeners;
  constructor(initial: GanttTask[]);
  subscribe: (listener: Listener$1) => (() => void);
  getSnapshot: () => GanttTask[];
  getVersion: () => number;
  getTaskVersion(taskId: string): number;
  private notify;
  private bumpTask;
  setTasks(tasks: GanttTask[]): void;
  updateTask(taskId: string, patch: Partial<GanttTask>): void;
  private applyReplace;
  replaceTasks(tasks: GanttTask[]): void;
  /**
   * Sync tasks from props *during render*. Updates the snapshot and per-task
   * versions immediately so the owning component renders fresh data, but does
   * NOT call listeners — notifying here would trigger setState in subscribed
   * descendants (e.g. TaskBar) while the parent is still rendering, which React
   * forbids ("Cannot update a component while rendering a different one").
   *
   * No deferred notify is needed: the owning component re-renders with the new
   * snapshot and hands each TaskBar its updated task object, and TaskBar's memo
   * comparator inspects the rendered task fields, so changed bars re-render and
   * unchanged bars stay memoised.
   */
  syncExternalTasks(tasks: GanttTask[]): void;
}
//#endregion
//#region src/hooks/useDragPreviewStore.d.ts
type Listener = () => void;
interface DragPreviewDates {
  start: Date;
  end: Date;
}
interface DragPreviewSnapshot {
  taskId: string | null;
  dates: DragPreviewDates | null;
  version: number;
}
/** Ephemeral drag dates for dependency rendering — does not mutate task store. */
declare class DragPreviewStore {
  private taskId;
  private dates;
  private version;
  private snapshot;
  private listeners;
  subscribe: (listener: Listener) => (() => void);
  getSnapshot: () => DragPreviewSnapshot;
  getVersion(): number;
  getPreview(taskId: string): DragPreviewDates | null;
  setPreview(taskId: string, start: Date, end: Date): void;
  clear(taskId?: string): void;
  private notify;
}
//#endregion
//#region src/core/rowLayout.d.ts
interface RowLayout {
  y: number;
  height: number;
}
//#endregion
//#region src/components/Timeline/dependencyPaths.d.ts
interface Point {
  x: number;
  y: number;
}
/** Which bar edge a link leaves (`from`) and arrives at (`to`). */
type DependencyEdge = 'start' | 'end';
declare const DEPENDENCY_EDGES: Record<DependencyType, {
  from: DependencyEdge;
  to: DependencyEdge;
}>;
/**
 * Orthogonal route (corner points) for a link of `type` from the predecessor's connector
 * `(fromX, fromY)` to the successor's `(toX, toY)`. The connectors are the bar edges named by
 * `DEPENDENCY_EDGES[type]`; the route leaves and arrives horizontally and always ends with at
 * least `MIN_HEAD_RUN` px of straight line before the arrowhead.
 *
 * - **Same side** (SS, FF): one C-shaped run around whichever edge sticks out further.
 * - **Opposite sides** (FS, SF): a Z when the successor's edge is far enough ahead; otherwise the
 *   path doubles back through the row gutter (the "backwards" case).
 */
declare function routeDependency(type: DependencyType, fromX: number, fromY: number, toX: number, toY: number): Point[];
/** SVG path data for a link of `type` — see `routeDependency`. */
declare function buildDependencyPath(type: DependencyType, fromX: number, fromY: number, toX: number, toY: number): string;
//#endregion
//#region src/components/Timeline/dependencyLinks.d.ts
/** Stable id of the link from `fromId` (predecessor) to `toId` (successor). */
declare function dependencyId(fromId: string, toId: string): string;
/** Every link declared on `tasks`, as targets — whether or not both ends are rendered. */
declare function collectDependencyTargets<T extends GanttTask>(tasks: readonly T[], ids?: ReadonlySet<string>): (GanttDependencyTarget & {
  from: T;
  to: T;
})[];
/** A rendered link: its target plus the geometry every dependency layer draws from. */
interface DependencyLink {
  target: GanttDependencyTarget & {
    from: ResolvedTask;
    to: ResolvedTask;
  };
  id: string;
  type: DependencyType;
  lag: number;
  /** Corner points of the orthogonal route, predecessor connector first. */
  points: Point[];
  /** SVG path data for the line. */
  d: string;
  /** Arrowhead polygon `points`. */
  head: string;
  /** Where the lag label is drawn. */
  label: Point;
}
interface DependencyLinkInput {
  /** The tasks of one timeline section, in row order; `rowLayouts[i]` is `tasks[i]`'s row. */
  tasks: ResolvedTask[];
  rowLayouts: RowLayout[];
  rangeStart: Date;
  scale: ViewScale;
  columnWidth: number;
  showBaseline: boolean;
  /** In-flight drag dates, so links follow a bar before the drop is committed. */
  preview?: {
    taskId: string | null;
    dates: DragPreviewDates | null;
  };
}
/**
 * Geometry for every link whose both ends are in `tasks`. Pure — the layers memoise it. Rows are
 * looked up by position in `tasks`, not `_rowIndex` (which counts sticky rows too), so a section
 * of the chart only draws links between its own rows.
 */
declare function computeDependencyLinks({
  tasks,
  rowLayouts,
  rangeStart,
  scale,
  columnWidth,
  showBaseline,
  preview
}: DependencyLinkInput): DependencyLink[];
/** Default lag label: the lag read as days, signed (`+2d`, `-1d`). */
declare function defaultDependencyLagLabel(lag: number): string;
//#endregion
//#region src/core/dependencyLinking.d.ts
/** The link type a drag from `from` to `to` draws — the inverse of `DEPENDENCY_EDGES`. */
declare function dependencyTypeForEdges(from: DependencyEdge, to: DependencyEdge): DependencyType;
//#endregion
export { BarGeometry, BlockDateRange, ColumnRenderContext, CustomRowCellContext, CustomRowCellGenerator, CustomRowDefinition, DEFAULT_COLUMN_SCROLL_BUFFER_PERCENT, DEPENDENCY_EDGES, DateMarkingLayers, DateMarkingRect, type DependencyEdge, type DependencyLink, type DependencyLinkInput, DependencyType, type DragPreviewDates, type DragPreviewSnapshot, DragPreviewStore, DraggableMarker, DraggableMarkerSnapPoint, EventMarker, GanttCallbacks, GanttChart, GanttChartProps, GanttColumn, GanttDependency, GanttDependencyCreateDetail, GanttDependencyHoverDetail, GanttDependencyPointerDetail, GanttDependencyTarget, GanttEventHandler, GanttEventMap, GanttEventName, GanttHoverDetail, GanttInputSource, GanttPointerDetail, GanttTarget, GanttTask, GanttTheme, type GanttTimelineContextValue, GroupSummaryRollup, HolidayDateEntry, HolidayMarking, PRESET_SCALES, ResolvedTask, SidebarLayoutState, SidebarWidths, TaskBaseline, TaskStore, TaskTooltipChangeHandler, TaskTooltipRenderer, TimelineRange, TimelineRangeBounds, type ViewScale, ViewScaleId, VirtualColumnCell, type VirtualColumnSegment, type VisibleColumnRange, ZOOM_LEVELS, ZoomLevel, addUnit, buildDependencyPath, collectDependencyTargets, computeDependencyLinks, computeTimelineRange, defaultDependencyLagLabel, dependencyId, dependencyTypeForEdges, diffUnits, filterRectsInXRange, format, getColumnWidth, getViewportColumnRange, getVisibleColumnRange, maintainBufferedColumnRange, nextZoomLevel, resolveScale, resolveScales, routeDependency, toDate, useBufferedSegmentCache, useGanttDisplayTimezone, useGanttTimeline, useGanttTimelineOptional, useSidebarLayout, useVirtualColumnSegments };