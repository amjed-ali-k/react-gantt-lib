import type React from 'react';
import type { ViewScale } from './core/scale';

/** Zoom level: one timeline column equals one unit of this scale. */
export type ZoomLevel = 'month' | 'week' | 'day' | 'hour' | 'minute';

/** Extended preset ids including multi-step column scales. */
export type ViewScaleId = ZoomLevel | '2day' | '6hour' | '3hour' | '1hour';

export type GanttTheme = 'light' | 'dark' | 'auto';

export type DependencyType = 'FS' | 'FF' | 'SS' | 'SF';

/** Original scheduled dates before plan changes (rendered as amber baseline). */
export interface TaskBaseline {
  start: Date | string;
  end: Date | string;
  /** Baseline marker color. Default: #e6a23c (amber). */
  color?: string;
}

/**
 * A link from a predecessor (`id`) to the task that lists it in `dependencies`.
 * The pair identifies the link: at most one link per predecessor/successor pair.
 */
export interface GanttDependency {
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
export interface GanttDependencyTarget {
  type: 'dependency';
  /** Stable link id — see `dependencyId()`. Used by `selectedDependencyIds`. */
  id: string;
  /** Predecessor. */
  from: GanttTask;
  /** Successor (the task that lists the dependency). */
  to: GanttTask;
  /** The link, normalised: `type` and `lag` are always set. */
  dependency: GanttDependency & { type: DependencyType; lag: number };
}

/** Roll-up behavior for group summary bars (`type: 'group'`, `showSummaryBar` true). */
export interface GroupSummaryRollup {
  /** Span min/max child dates. Default true. Set false to use `start` / `end` on the group row. */
  dates?: boolean;
  /** Duration-weighted average of child progress when unset. Set `progress` on the group to override, or `rollup.progress: false`. */
  progress?: boolean;
  /** Min/max of child baselines when unset. Set `baseline` on the group to override, or `rollup.baseline: false`. */
  baseline?: boolean;
}

export interface GanttTask {
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
  /** Where the bar's title goes: `outside` (right of the bar, default), `inside`, or `auto` (inside when it fits). */
  labelPlacement?: 'outside' | 'inside' | 'auto';
  /** A person's badge drawn at the end of the bar (inside it when it is wide enough, else beside it). */
  avatar?: GanttBarAvatar;
  /** An empty stretch of this row can be drawn on with the pointer: `onTaskDraw` reports the span. */
  drawable?: boolean;
  meta?: Record<string, unknown>;
}

export interface GanttColumn {
  key: string;
  title: React.ReactNode;
  width?: number;
  minWidth?: number;
  flex?: number;
  render?: (ctx: ColumnRenderContext) => React.ReactNode;
}

export interface ColumnRenderContext {
  task: GanttTask;
  rowIndex: number;
  columnKey: string;
}

export interface SidebarWidths {
  /** Left panel (primary task list) width in px */
  left: number;
  /** Middle panel (secondary columns) width in px */
  middle: number;
  /** Timeline starts at this x offset from chart left */
  timelineLeft: number;
  /** Total chart width */
  totalWidth: number;
}

export interface SidebarLayoutState {
  leftWidth: number;
  middleWidth: number;
  rightWidth: number;
  timelineLeft: number;
  totalWidth: number;
}

/** Context passed to custom async row cell generators */
export interface CustomRowCellContext<TMeta = unknown> {
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

export type CustomRowCellGenerator<TMeta = unknown> = (
  ctx: CustomRowCellContext<TMeta>,
) => Promise<React.ReactNode> | React.ReactNode;

export interface CustomRowDefinition<TMeta = unknown> {
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
export interface HolidayDateEntry {
  date: Date | string;
  label?: string;
}

/** Highlight weekends and/or specific dates on the timeline (Frappe Gantt-style). */
export interface HolidayMarking {
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
export interface BlockDateRange {
  start: Date | string;
  end: Date | string;
  label?: string;
  /** Fill color. Default: light rose. */
  color?: string;
}

export interface DateMarkingRect {
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
export type GanttTarget =
  | {
      type: 'task';
      task: GanttTask;
      rowIndex: number;
      element: 'bar' | 'milestone';
    }
  | {
      type: 'baseline';
      task: GanttTask;
      rowIndex: number;
      element: 'bar' | 'milestone';
    }
  | {
      type: 'blockDate';
      range: BlockDateRange;
      index: number;
    }
  | {
      type: 'holiday';
      date: Date;
      label?: string;
      index?: number;
    }
  | {
      type: 'eventMarker';
      marker: EventMarker;
      index: number;
    }
  | {
      type: 'draggableMarker';
      marker: DraggableMarker;
      index: number;
    }
  | {
      type: 'timeline';
      date: Date;
      rowIndex: number | null;
    }
  | GanttDependencyTarget;

export interface GanttPointerDetail {
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
export interface GanttDependencyCreateDetail {
  /** Predecessor: the task the link was drawn from. */
  fromId: string;
  /** Successor: the task the link was dropped on. Never equal to `fromId`. */
  toId: string;
  /** Inferred from the two handles: end→start FS, start→start SS, end→end FF, start→end SF. */
  type: DependencyType;
  source: 'pointer' | 'keyboard';
}

/** Pointer detail for dependency events — the target is always a dependency. */
export interface GanttDependencyPointerDetail extends Omit<GanttPointerDetail, 'target'> {
  target: GanttDependencyTarget;
}

export interface GanttDependencyHoverDetail {
  /** The hovered link; on `leave`, the link being left. */
  target: GanttDependencyTarget;
  phase: 'enter' | 'leave';
  clientX: number;
  clientY: number;
}

export interface GanttHoverDetail {
  target: GanttTarget | null;
  phase: 'enter' | 'leave' | 'move';
  clientX: number;
  clientY: number;
}

export interface DateMarkingLayers {
  holidays: DateMarkingRect[];
  blocks: DateMarkingRect[];
}

/** Vertical event marker at a specific date/time (Syncfusion-style stripline). */
export interface EventMarker {
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
export interface DraggableMarker {
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
export interface DraggableMarkerSnapPoint {
  id: string;
  date: Date | string;
}

/** What drove a move or resize: a pointer drag, or the arrow keys on a focused bar. */
export type GanttInputSource = 'pointer' | 'keyboard';

export interface GanttEventMap {
  taskClick: {
    task: GanttTask;
    rowIndex: number;
    element?: 'bar' | 'milestone';
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
  };
  taskDoubleClick: { task: GanttTask; rowIndex: number; element?: 'bar' | 'milestone' };
  ganttClick: GanttPointerDetail;
  ganttContextMenu: GanttPointerDetail;
  ganttHover: GanttHoverDetail;
  taskHover: {
    task: GanttTask | null;
    rowIndex: number | null;
    clientX?: number;
    clientY?: number;
  };
  taskDragStart: { task: GanttTask; start: Date; end: Date; source: GanttInputSource };
  taskDrag: { task: GanttTask; start: Date; end: Date; deltaMs: number; source: GanttInputSource };
  taskDragEnd: {
    task: GanttTask;
    start: Date;
    end: Date;
    previousStart: Date;
    previousEnd: Date;
    source: GanttInputSource;
  };
  taskResizeStart: { task: GanttTask; edge: 'start' | 'end'; source: GanttInputSource };
  taskResize: { task: GanttTask; start: Date; end: Date; edge: 'start' | 'end'; source: GanttInputSource };
  /** A drawable row was dragged across: the whole columns it covered (`end` is exclusive). */
  taskDraw: { task: GanttTask; start: Date; end: Date };
  taskResizeEnd: {
    task: GanttTask;
    start: Date;
    end: Date;
    edge: 'start' | 'end';
    previousStart: Date;
    previousEnd: Date;
    source: GanttInputSource;
  };
  progressChange: { task: GanttTask; progress: number; previousProgress: number };
  draggableMarkerDragStart: { marker: DraggableMarker; index: number; date: Date };
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
  zoomChange: { zoomLevel: string; columnWidth: number; scaleId: string; scaleLabel: string };
  scroll: { scrollLeft: number; scrollTop: number };
  sidebarLayoutChange: SidebarLayoutState;
  selectionChange: { selectedIds: string[]; selectedDependencyIds: string[] };
  dependencyClick: GanttDependencyPointerDetail;
  dependencyContextMenu: GanttDependencyPointerDetail;
  dependencyHover: GanttDependencyHoverDetail;
  dependencyDelete: { dependencies: GanttDependencyTarget[] };
  dependencyCreate: GanttDependencyCreateDetail;
  customRowCellReady: { rowId: string; columnKey: string };
  customRowCellError: { rowId: string; columnKey: string; error: unknown };
}

export type GanttEventName = keyof GanttEventMap;

export type GanttEventHandler<K extends GanttEventName> = (
  detail: GanttEventMap[K],
) => void;

/** Patch handler passed to `renderTaskTooltip` for inline edits from the tooltip. */
export type TaskTooltipChangeHandler = (patch: Partial<GanttTask>) => void;

/** Custom task tooltip renderer — receives the hovered task and an `onChange` patch handler. */
export type TaskTooltipRenderer = (
  task: GanttTask,
  onChange: TaskTooltipChangeHandler,
) => React.ReactNode;

export interface GanttCallbacks {
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
  /** A drawable row was dragged across (see `GanttTask.drawable`). */
  onTaskDraw?: GanttEventHandler<'taskDraw'>;
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

/** A badge at the end of a bar: initials (or a short label) on a colour. */
export interface GanttBarAvatar {
  /** Up to two characters, drawn in the badge. */
  label: string;
  /** Badge fill; a CSS colour or `var(--token)`. */
  color?: string;
  /** Accessible name, e.g. the person's name. */
  title?: string;
}

/** What a consumer can ask of a mounted chart (see `GanttChartProps.controllerRef`). */
export interface GanttController {
  /** Scrolls the timeline so `date` is at `align` (default: centre) of the viewport. */
  scrollToDate: (date: Date, options?: { align?: 'start' | 'center'; smooth?: boolean }) => void;
  /** Scrolls the timeline so the task's bar is in view, with a margin. */
  scrollToTask: (taskId: string, options?: { smooth?: boolean }) => void;
}

export interface GanttChartProps extends GanttCallbacks {
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
  style?: React.CSSProperties;
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
  /**
   * The zoom buttons: the default `toolbar` row above the chart, `floating` (a small +/- pair at
   * the chart's top right), or `none` when the host draws its own.
   */
  zoomControls?: 'toolbar' | 'floating' | 'none';
  /** Text of an upper-header band for a column's date; columns that agree are one band. */
  formatHeaderUpper?: (date: Date, scale: ViewScale, timeZone?: string) => string;
  /** The lower-header cell for a column's date. */
  formatHeaderLower?: (date: Date, scale: ViewScale, timeZone?: string) => React.ReactNode;
  /** Draw holidays and weekends hatched rather than as a flat tint. */
  hatchHolidays?: boolean;
  /** A chevron in a row whose bar is out of view, which scrolls to it. */
  showOffscreenIndicators?: boolean;
  /** Ctrl/Cmd + wheel over the timeline steps the zoom. */
  enableWheelZoom?: boolean;
  /** Highlights the hovered row across the list and the timeline. */
  highlightHoveredRow?: boolean;
  /** Receives the chart's imperative handle. */
  controllerRef?: React.Ref<GanttController>;
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
  children?: React.ReactNode;
}

export interface ResolvedTask extends GanttTask {
  _start: Date;
  _end: Date;
  _baselineStart?: Date;
  _baselineEnd?: Date;
  _rowIndex: number;
  _level: number;
  _visible: boolean;
}

export interface BarGeometry {
  x: number;
  width: number;
  y: number;
  height: number;
}

export interface TimelineRange {
  start: Date;
  end: Date;
  columnCount: number;
  /** Exact horizontal extent in px (fixed ranges). When set, use instead of columnCount × columnWidth. */
  pixelWidth?: number;
  /** True when range comes from explicit minDate/maxDate — grid does not grow with tasks. */
  fixed?: boolean;
}

export interface TimelineRangeBounds {
  minDate?: Date | string;
  maxDate?: Date | string;
}