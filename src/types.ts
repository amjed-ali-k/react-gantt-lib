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

export interface GanttDependency {
  id: string;
  type?: DependencyType;
  lag?: number;
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
  /** Prevent drag, resize, and progress edits for this task. */
  readOnly?: boolean;
  /** Per-task overrides for interaction (fall back to chart-level props). */
  enableDrag?: boolean;
  enableResize?: boolean;
  enableProgressDrag?: boolean;
  /** Original plan dates — line below bars or diamond behind milestones. */
  baseline?: TaskBaseline;
  /** Bar fill / milestone color. */
  color?: string;
  /** Bar outline color. */
  borderColor?: string;
  /** Bar height in px (within the row). */
  width?: number;
  collapsed?: boolean;
  meta?: Record<string, unknown>;
}

export interface GanttColumn {
  key: string;
  title: string;
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
  meta?: TMeta;
}

export type CustomRowCellGenerator<TMeta = unknown> = (
  ctx: CustomRowCellContext<TMeta>,
) => Promise<React.ReactNode> | React.ReactNode;

export interface CustomRowDefinition<TMeta = unknown> {
  id: string;
  meta?: TMeta;
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
      type: 'timeline';
      date: Date;
      rowIndex: number | null;
    };

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
  taskDragStart: { task: GanttTask; start: Date; end: Date };
  taskDrag: { task: GanttTask; start: Date; end: Date; deltaMs: number };
  taskDragEnd: { task: GanttTask; start: Date; end: Date; previousStart: Date; previousEnd: Date };
  taskResizeStart: { task: GanttTask; edge: 'start' | 'end' };
  taskResize: { task: GanttTask; start: Date; end: Date; edge: 'start' | 'end' };
  taskResizeEnd: { task: GanttTask; start: Date; end: Date; edge: 'start' | 'end'; previousStart: Date; previousEnd: Date };
  progressChange: { task: GanttTask; progress: number; previousProgress: number };
  zoomChange: { zoomLevel: string; columnWidth: number; scaleId: string; scaleLabel: string };
  scroll: { scrollLeft: number; scrollTop: number };
  sidebarLayoutChange: SidebarLayoutState;
  selectionChange: { selectedIds: string[] };
  customRowCellReady: { rowId: string; columnKey: string };
  customRowCellError: { rowId: string; columnKey: string; error: unknown };
}

export type GanttEventName = keyof GanttEventMap;

export type GanttEventHandler<K extends GanttEventName> = (
  detail: GanttEventMap[K],
) => void;

export interface GanttCallbacks {
  onTaskClick?: GanttEventHandler<'taskClick'>;
  onTaskDoubleClick?: GanttEventHandler<'taskDoubleClick'>;
  /** Unified click handler for bars, baselines, blocked dates, holidays, event markers, and empty timeline. */
  onGanttClick?: GanttEventHandler<'ganttClick'>;
  /** Right-click handler for the same targets as `onGanttClick`. Call `preventDefault()` to suppress the browser menu. */
  onGanttContextMenu?: GanttEventHandler<'ganttContextMenu'>;
  /** Hover handler for blocked dates, holidays, and other gantt targets (when not occluded by task bars). */
  onGanttHover?: GanttEventHandler<'ganttHover'>;
  onTaskHover?: GanttEventHandler<'taskHover'>;
  onTaskDragStart?: GanttEventHandler<'taskDragStart'>;
  onTaskDrag?: GanttEventHandler<'taskDrag'>;
  onTaskDragEnd?: GanttEventHandler<'taskDragEnd'>;
  onTaskResizeStart?: GanttEventHandler<'taskResizeStart'>;
  onTaskResize?: GanttEventHandler<'taskResize'>;
  onTaskResizeEnd?: GanttEventHandler<'taskResizeEnd'>;
  onProgressChange?: GanttEventHandler<'progressChange'>;
  onZoomChange?: GanttEventHandler<'zoomChange'>;
  onScroll?: GanttEventHandler<'scroll'>;
  onSidebarLayoutChange?: GanttEventHandler<'sidebarLayoutChange'>;
  onSelectionChange?: GanttEventHandler<'selectionChange'>;
  onCustomRowCellReady?: GanttEventHandler<'customRowCellReady'>;
  onCustomRowCellError?: GanttEventHandler<'customRowCellError'>;
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
  defaultLeftWidth?: number;
  defaultMiddleWidth?: number;
  minPanelWidth?: number;
  /** Show the left task name panel. Default true. */
  showTaskList?: boolean;
  /** Show the middle start/end date columns panel. Default true. */
  showDateColumns?: boolean;
  /** Show a tooltip with task name and start/end date+time on hover. Default false. */
  showTooltip?: boolean;
  /** Highlight weekends and specific holiday dates on the timeline. */
  holidays?: HolidayMarking;
  /** Blocked date ranges shown in light rose on the timeline. */
  blockDates?: BlockDateRange[];
  /** Vertical dashed markers with labels at specific date/times. */
  eventMarkers?: EventMarker[];
  /** Show baseline markers for tasks that define `baseline`. Default true. */
  showBaseline?: boolean;
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
  onTasksChange?: (tasks: GanttTask[]) => void;
  customRows?: CustomRowDefinition[];
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