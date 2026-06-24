# react-gantt-lib

High-performance React Gantt chart with **granular bar updates** (only the changed task re-renders), three draggable sidebar panels, async custom rows, sticky rows, rich event hooks, and display-timezone support.

Built with **date-fns** for all date math.

## Table of contents

- [Install](#install)
- [Quick start](#quick-start)
- [Public API](#public-api)
- [Layout: three draggable panels](#layout-three-draggable-panels)
- [Tasks](#tasks)
- [Group rows & collapse](#group-rows--collapse)
- [Hierarchy](#hierarchy)
- [Columns](#columns)
- [Display timezone](#display-timezone)
- [Zoom & timeline scale](#zoom--timeline-scale)
- [Fixed timeline range](#fixed-timeline-range)
- [Drag, resize & snap](#drag-resize--snap)
- [Dependencies](#dependencies)
- [Baseline](#baseline)
- [Milestones](#milestones)
- [Holidays, blocked dates & event markers](#holidays-blocked-dates--event-markers)
- [Tooltip](#tooltip)
- [Selection](#selection)
- [Custom rows](#custom-rows)
- [Sticky rows](#sticky-rows)
- [Click, context menu & hover targets](#click-context-menu--hover-targets)
- [Event hooks](#event-hooks)
- [Performance model](#performance-model)
- [Utility functions](#utility-functions)
- [Theme](#theme)
- [CSS & DOM reference](#css--dom-reference)
- [Controlled state patterns](#controlled-state-patterns)
- [Full feature example](#full-feature-example)
- [Demo & playground](#demo--playground)
- [Limitations](#limitations)
- [Development](#development)
- [License](#license)

## Install

```bash
npm install react-gantt-lib date-fns react react-dom
```

**Peer dependencies:** React ≥ 18, React DOM ≥ 18. **Node** ≥ 18.

```tsx
import { GanttChart } from 'react-gantt-lib';
import 'react-gantt-lib/styles.css';
```

Dates accept ISO strings (`'2026-01-01'`, `'2026-04-22T14:00:00'`) or `Date` objects.

## Quick start

```tsx
import { useState } from 'react';
import { GanttChart } from 'react-gantt-lib';
import 'react-gantt-lib/styles.css';

const initialTasks = [
  { id: '1', name: 'Design', start: '2026-01-01', end: '2026-01-15', progress: 65 },
  { id: '2', name: 'Build', start: '2026-01-10', end: '2026-02-01', progress: 20 },
];

export function App() {
  const [tasks, setTasks] = useState(initialTasks);

  return (
    <GanttChart
      tasks={tasks}
      height={500}
      zoomLevel="week"
      onTasksChange={setTasks}
      onTaskDragEnd={(e) => console.log('moved', e.task.id, e.start, e.end)}
    />
  );
}
```

## Public API

### Components & hooks

| Export | Description |
|--------|-------------|
| `GanttChart` | Main chart component |
| `useSidebarLayout` | Build a custom shell with draggable panels |
| `useGanttTimeline` | Timeline metrics inside the chart tree (required for `__timeline__` custom cells) |
| `useGanttTimelineOptional` | Same as above; returns `null` outside `GanttChart` |
| `useGanttDisplayTimezone` | Current display timezone (`string \| undefined`) inside the chart tree |
| `useVirtualColumnSegments` | Virtualized column segments with incremental caching |
| `VirtualColumnCell` | Memoized cell wrapper for virtual column segments |
| `useBufferedSegmentCache` | Generic cache for buffered timeline segments |

### Classes

| Export | Description |
|--------|-------------|
| `TaskStore` | External task store with per-task version counters |

### Zoom & scale

| Export | Description |
|--------|-------------|
| `ZOOM_LEVELS` | Default zoom order |
| `PRESET_SCALES` | All built-in scale presets |
| `resolveScale(id)` | Resolve a scale id (falls back to `day`) |
| `resolveScales(ids?)` | Resolve an ordered list of scales |
| `getColumnWidth(scaleOrId, override?)` | Column width in px |
| `computeTimelineRange(tasks, scaleOrId, paddingUnits?, bounds?)` | Compute timeline start/end and column count |
| `nextZoomLevel(current, 'in' \| 'out', availableIds?)` | Step zoom in or out |

### Column virtualization utilities

| Export | Description |
|--------|-------------|
| `getVisibleColumnRange(...)` | Buffered visible column window |
| `getViewportColumnRange(...)` | Tight viewport column range (no buffer) |
| `maintainBufferedColumnRange(...)` | Incrementally update buffered range on scroll |
| `filterRectsInXRange(...)` | Filter date-marking rects to an x range |
| `DEFAULT_COLUMN_SCROLL_BUFFER_PERCENT` | Default horizontal scroll buffer (10%) |

### Dates

| Export | Description |
|--------|-------------|
| `toDate(value)` | Parse ISO string or `Date` |
| `addUnit(date, amount, zoom)` | Add scale units |
| `diffUnits(later, earlier, zoom)` | Difference in scale units |
| `format` | Re-exported from date-fns |

### Types

All types are exported: `GanttTask`, `GanttColumn`, `GanttChartProps`, `GanttCallbacks`, `GanttEventMap`, `GanttEventName`, `GanttEventHandler`, `GanttTarget`, `GanttPointerDetail`, `GanttHoverDetail`, `GanttTheme`, `CustomRowDefinition`, `CustomRowCellContext`, `CustomRowCellGenerator`, `HolidayMarking`, `HolidayDateEntry`, `BlockDateRange`, `EventMarker`, `TaskBaseline`, `GanttDependency`, `DependencyType`, `ViewScaleId`, `ZoomLevel`, `ViewScale`, `TaskTooltipRenderer`, `TaskTooltipChangeHandler`, `SidebarLayoutState`, `SidebarWidths`, `TimelineRange`, `TimelineRangeBounds`, `ResolvedTask`, `BarGeometry`, `ColumnRenderContext`, `DateMarkingLayers`, `DateMarkingRect`, `GanttTimelineContextValue`, `VirtualColumnSegment`, `VisibleColumnRange`.

## Layout: three draggable panels

| Panel | Prop | Default content | Resizer |
|-------|------|-----------------|---------|
| **Left** | `showTaskList` (default `true`) | Task name column(s) | `divider-left` |
| **Middle** | `showDateColumns` (default `true`) | Start / End columns | `divider-middle` |
| **Right** | always | SVG timeline + zoom toolbar | — |

Vertical scroll is synchronized across panels (`.rg-sync-scroll`).

### Panel sizing props

| Prop | Default | Description |
|------|---------|-------------|
| `defaultLeftWidth` | `220` | Left panel width (px) |
| `defaultMiddleWidth` | `180` | Middle panel width (px) |
| `minPanelWidth` | `80` | Minimum panel width when dragging dividers |
| `height` | `500` | Chart height |
| `width` | `'100%'` | Chart width |
| `rowHeight` | `36` | Task row height (px) |
| `className`, `style` | — | Root element overrides |

Hide panels: `showTaskList={false}`, `showDateColumns={false}`.

### Layout callbacks & data attributes

The root `.rg-gantt` element exposes layout as data attributes (px):

- `data-sidebar-left`
- `data-sidebar-middle`
- `data-timeline-left`

```tsx
<GanttChart
  onSidebarLayoutChange={({ leftWidth, middleWidth, rightWidth, timelineLeft, totalWidth }) => {
    // Sync external UI (legends, overlays) to panel positions
  }}
/>
```

### `useSidebarLayout`

Use independently when building a custom shell outside `GanttChart`:

```tsx
const { layout, leftWidth, middleWidth, timelineLeft, onDividerPointerDown, setLeftWidth, setMiddleWidth } =
  useSidebarLayout(containerRef, {
    defaultLeftWidth: 220,
    defaultMiddleWidth: 180,
    minPanelWidth: 80,
    onLayoutChange: (layout) => { /* ... */ },
  });
```

## Tasks

Each task in the `tasks` array maps to one row. Row order follows array order.

### Required fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier |
| `name` | `string` | Display name |
| `start` | `Date \| string` | Start date/time |
| `end` | `Date \| string` | End date/time |

### Optional fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `progress` | `number` | `0` | Completion 0–100 |
| `parentId` | `string` | — | Parent task id for hierarchy (16px indent per level) |
| `collapsed` | `boolean` | — | Hide descendant rows and timeline bars when `true` |
| `type` | `'task' \| 'milestone' \| 'group'` | `'task'` | Row kind (see [Group rows](#group-rows--collapse), [Milestones](#milestones)) |
| `showSummaryBar` | `boolean` | `true` | On group rows: show rolled-up summary bar |
| `readOnly` | `boolean` | — | Disable drag, resize, and progress edits |
| `enableDrag` | `boolean` | — | Per-task override (falls back to chart prop) |
| `enableResize` | `boolean` | — | Per-task override |
| `enableProgressDrag` | `boolean` | — | Per-task override |
| `dependencies` | `string[] \| GanttDependency[]` | — | Predecessor task ids (see [Dependencies](#dependencies)) |
| `baseline` | `{ start, end, color? }` | — | Original plan overlay (see [Baseline](#baseline)) |
| `color` | `string` | — | Bar fill / milestone color |
| `borderColor` | `string` | — | Bar outline color |
| `width` | `number` | — | Bar height in px within the row (not bar length) |
| `sticky` | `'top' \| 'bottom'` | — | Pin row while scrolling (see [Sticky rows](#sticky-rows)) |
| `meta` | `Record<string, unknown>` | — | Custom metadata |

## Group rows & collapse

Set `type: 'group'` on parent rows for hierarchy and optional summary timeline bars.

| `showSummaryBar` | Timeline behavior |
|------------------|-------------------|
| `true` (default) | One rolled-up bar spanning descendant dates; child bars hidden |
| `false` | No bar on the group row; children render their own bars |

**Sidebar collapse:** Parent rows with `type: 'group'` or any task with children show a ▸/▾ button in the first column. Click toggles `task.collapsed` and updates via `onTasksChange` when tasks are controlled.

Collapsed ancestors hide all descendant rows in both sidebar and timeline. Summary group dates roll up to min(start) / max(end) of visible descendant leaf bars.

```tsx
const tasks = [
  { id: 'phase', name: 'Phase 1', type: 'group', showSummaryBar: false, start: '2026-04-01', end: '2026-04-01' },
  { id: 'a', name: 'Task A', parentId: 'phase', start: '2026-04-02', end: '2026-04-06' },
  { id: 'envelope', name: 'Envelope', type: 'group', start: '2026-04-10', end: '2026-04-10' },
  { id: 'roof', name: 'Roofing', parentId: 'envelope', start: '2026-04-10', end: '2026-04-12' },
];
```

## Hierarchy

```tsx
const tasks = [
  { id: 'phase', name: 'Phase 1', type: 'group', start: '2026-01-01', end: '2026-01-31' },
  { id: 't1', name: 'Subtask', parentId: 'phase', start: '2026-01-05', end: '2026-01-10' },
  { id: 't0', name: 'Kickoff', start: '2026-01-02', end: '2026-01-04' },
];
```

Toggle collapse via the sidebar ▸/▾ button or set `collapsed: true` in task data. Persist with `onTasksChange`.

## Columns

### Left panel — `columns`

Default: `[{ key: 'name', title: 'Task', flex: 2, minWidth: 120 }]`

### Middle panel — `middleColumns`

Default: start and end date columns.

### Column definition

```ts
interface GanttColumn {
  key: string;
  title: string;
  width?: number;
  minWidth?: number;
  flex?: number;
  render?: (ctx: { task, rowIndex, columnKey }) => React.ReactNode;
}
```

Built-in cell keys (no custom `render` needed):

| Key | Renders |
|-----|---------|
| `name` | `task.name` |
| `progress` | `${progress}%` |
| `start` | Formatted start date (respects `timezone` when set) |
| `end` | Formatted end date (respects `timezone` when set) |

```tsx
<GanttChart
  columns={[
    { key: 'name', title: 'Task', flex: 2 },
    { key: 'progress', title: '%', render: ({ task }) => `${task.progress ?? 0}%` },
  ]}
  middleColumns={[
    { key: 'start', title: 'Start' },
    { key: 'end', title: 'End' },
  ]}
/>
```

## Display timezone

```tsx
<GanttChart tasks={tasks} timezone="America/New_York" showTooltip />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `timezone` | `string` | browser local | IANA timezone id (e.g. `America/New_York`, `Asia/Tokyo`, `UTC`) |

**Display only** — does not change stored task dates, drag/snap math, timeline range, bar positions, or callback payloads.

When set, all on-screen date/time labels use that zone for every viewer:

- Timeline header labels (upper + lower bands)
- Middle panel start/end columns
- Built-in task tooltip start/end (time shown when non-midnight in the display zone)

Not affected: bar geometry, today marker position, holidays/blocks grid placement, event marker x position, drag callback dates.

Use `useGanttDisplayTimezone()` inside the chart tree for custom column or tooltip UI:

```tsx
import { useGanttDisplayTimezone } from 'react-gantt-lib';

function MyCell() {
  const timezone = useGanttDisplayTimezone();
  // Format with Intl or your own helpers
}
```

## Zoom & timeline scale

One timeline column equals one step at the current scale.

| Scale id | Label | Step | Column width (px) |
|----------|-------|------|-------------------|
| `month` | Month | 1 month | 120 |
| `week` | Week | 1 week | 140 |
| `day` | Day | 1 day | 48 |
| `2day` | 2 Days | 2 days | 64 |
| `6hour` | 6 Hours | 6 hours | 56 |
| `3hour` | 3 Hours | 3 hours | 48 |
| `1hour` | 1 Hour | 1 hour | 40 |
| `hour` | Hour | 1 hour | 64 |
| `minute` | Minute | 1 minute | 40 |

### Zoom props

| Prop | Default | Description |
|------|---------|-------------|
| `zoomLevel` | `'week'` | Current scale (controlled) |
| `availableZoomLevels` | month → week → day → hour → minute | Toolbar +/− steps through this list |
| `columnWidth` | preset | Override column width in px |

The built-in toolbar shows `−` / label / `+`. Zoom preserves the viewport center on change. Sync externally via `zoomLevel` + `onZoomChange`.

```tsx
const [zoom, setZoom] = useState('week');

<GanttChart
  zoomLevel={zoom}
  availableZoomLevels={['day', '2day', '6hour', '3hour', '1hour']}
  onZoomChange={(e) => setZoom(e.scaleId)}
/>
```

## Fixed timeline range

Set **both** `minDate` and `maxDate` to lock the grid:

- Grid does not grow when tasks are dragged outside
- Task dates are clamped to the window on drag and resize
- Full range renders up front — no extra columns added on interaction

```tsx
<GanttChart
  tasks={tasks}
  minDate="2026-01-01"
  maxDate="2026-06-30"
  zoomLevel="week"
/>
```

Without both bounds, the range auto-expands from task min/max plus `paddingUnits` (default 2 columns each side).

## Drag, resize & snap

| Prop | Default | Description |
|------|---------|-------------|
| `enableDrag` | `true` | Move bar body |
| `enableResize` | `true` | Left/right resize handles on hover |
| `enableProgressDrag` | `true` | Bottom progress handle |
| `snapToGrid` | `true` | Snap dates to grid column boundaries on pointer-events |

Per-task overrides: `GanttTask.enableDrag`, `enableResize`, `enableProgressDrag`. `readOnly: true` disables all editing for that task.

| `snapToGrid` | Behavior |
|--------------|----------|
| `true` (default) | Smooth visual drag; dates snap to grid on pointer release |
| `false` | Pixel-precision dates on release (sub-hour at hour/minute zoom) |

Milestones are draggable (move only) with no resize handles. Hover a bar to reveal edge resize handles.

Disable editing globally:

```tsx
<GanttChart enableDrag={false} enableResize={false} enableProgressDrag={false} />
```

## Dependencies

Add `dependencies` on the **successor** task pointing to predecessor id(s).

**Supported:** finish-to-start (FS) only. Rendering: orthogonal SVG arrows from predecessor end → successor start.

```tsx
// Simple form
{ id: 'b', name: 'Task B', start: '...', end: '...', dependencies: ['task-a'] }

// Object form (type and lag are typed but not yet implemented — always FS, lag ignored)
{ id: 'b', dependencies: [{ id: 'task-a', type: 'FS', lag: 0 }] }
```

## Baseline

Show original plan dates as an amber overlay below bars (or behind milestone diamonds).

```tsx
{
  id: 't1',
  name: 'Foundation',
  start: '2026-04-05',
  end: '2026-04-12',
  baseline: { start: '2026-04-01', end: '2026-04-10', color: '#e6a23c' },
}
```

| Prop | Default | Description |
|------|---------|-------------|
| `showBaseline` | `true` | Toggle baseline rendering |

Tasks with a baseline get extra row height for the baseline marker.

## Milestones

```tsx
{ id: 'm1', name: 'Go-live', type: 'milestone', start: '2026-06-01', end: '2026-06-01' }
```

- Rendered as a 14px diamond
- Label to the right
- Datetime supported for sub-day placement
- Baseline shown behind the diamond when set

## Holidays, blocked dates & event markers

### Holidays — `holidays`

```tsx
holidays={{
  weekends: true,  // highlight Sat/Sun (week starts Monday)
  dates: [
    '2026-04-10',
    { date: '2026-04-25', label: 'ANZAC Day' },
  ],
  color: '#f2f2f2',
  isWeekend: (date) => /* custom predicate */,
}}
```

### Blocked dates — `blockDates`

Unavailable ranges shown in light rose on the timeline.

```tsx
blockDates={[
  { start: '2026-04-14', end: '2026-04-16', label: 'Offsite', color: '#fde8e8' },
]}
```

### Event markers — `eventMarkers`

Vertical dashed striplines with labeled callouts at specific date/times.

```tsx
eventMarkers={[
  { id: 'e1', date: '2026-04-07T10:00:00', label: 'Review', color: '#6366f1', labelTop: 8 },
]}
```

Holidays and blocks render in the timeline header grid; event markers render as full-height overlays.

## Tooltip

Built-in and custom task tooltips share an optimized overlay: position updates are imperative (no chart re-render on mousemove).

| Prop | Default | Description |
|------|---------|-------------|
| `showTooltip` | `false` | Built-in floating tooltip (name, start, end) |
| `renderTaskTooltip` | — | Custom tooltip UI; when set, replaces built-in content |

Tooltips are enabled when `showTooltip || renderTaskTooltip`.

### Built-in tooltip

```tsx
<GanttChart tasks={tasks} showTooltip onTasksChange={setTasks} />
```

### Custom tooltip

```tsx
<GanttChart
  tasks={tasks}
  onTasksChange={setTasks}
  renderTaskTooltip={(task, onChange) => (
    <MyTooltip task={task} onChange={onChange} />
  )}
/>
```

`onChange(patch)` applies `Partial<GanttTask>` to the hovered task (updates store + `onTasksChange`). Supports `name`, `progress`, `start`, `end`, `color`, `borderColor`. Ignored for `readOnly` tasks.

Custom tooltip shell: `.rg-task-tooltip-shell` (position only). Style your content inside; child gets `pointer-events: auto` for inputs and buttons.

### Performance

| Event | Chart re-render | Tooltip content update |
|-------|-------------------|------------------------|
| mousemove (hover) | no | no — position via DOM |
| drag / resize move | no | only when start/end/progress/name change |
| mouse enter / leave | no | show / hide |
| `onChange` from tooltip | no | only when patched fields change |

`onTaskHover` fires on enter and leave only (`task: null` on leave), **not** on mousemove. Use for external hover state — do not `setState` on every move from this hook.

## Selection

| Prop | Description |
|------|-------------|
| `selectedTaskIds` | Controlled selection (`string[]`) |
| `onSelectionChange` | `{ selectedIds }` |

Uncontrolled: click selects one task. **Ctrl/⌘+click** toggles a task in the selection without clearing others.

Selected bars get `.rg-bar--selected` with a focus ring; sidebar rows get `.rg-task-row--selected`.

```tsx
const [ids, setIds] = useState<string[]>([]);

<GanttChart
  tasks={tasks}
  selectedTaskIds={ids}
  onSelectionChange={(e) => setIds(e.selectedIds)}
/>
```

## Custom rows

Append extra rows below (or pinned to the top/bottom of) the task list via `customRows`.

```ts
interface CustomRowDefinition {
  id: string;
  meta?: unknown;
  height?: number;       // px; defaults to chart rowHeight
  sticky?: 'top' | 'bottom';
  cells: Record<string, (ctx) => ReactNode | Promise<ReactNode>>;
}
```

### Cell keys

| Key | Renders in |
|-----|------------|
| Match `columns[].key` / `middleColumns[].key` | Sidebar cells |
| `__timeline__` | Full-width band inside the timeline |

### Async cells

Generators may return JSX or a `Promise`:

- First load: loading ellipsis (`.rg-custom-cell--loading`)
- Reload (zoom, range, row height): keeps previous content until new result arrives
- Re-runs when structural metrics change — **not** on horizontal scroll

Callbacks: `onCustomRowCellReady`, `onCustomRowCellError`.

### `CustomRowCellContext`

Snapshot when the cell generator runs: `rowId`, `columnKey`, `columnIndex`, `rowIndex`, `zoomLevel`, `rangeStart`, `rangeEnd`, `scale`, `columnWidth`, `timelineWidth`, `msPerPixel`, `rowHeight`, `scrollLeft`, `viewportWidth`, `visibleColumnStart`, `visibleColumnEnd`, `viewportColumnStart`, `viewportColumnEnd`, `columnScrollBufferPercent`, `meta`.

For timeline bands, use `useGanttTimeline()` inside your component for live scroll and visible column window — do not rely on context snapshots for scroll position.

### Example

```tsx
import { GanttChart, useGanttTimeline } from 'react-gantt-lib';

function CapacityStrip() {
  const { range, msPerPixel, columnWidth, visibleColumns, scrollLeft } = useGanttTimeline();
  const width = range.pixelWidth ?? range.columnCount * columnWidth;
  return <div style={{ width }}>…</div>;
}

<GanttChart
  customRows={[
    {
      id: 'capacity',
      cells: {
        name: () => 'Capacity',
        start: () => '—',
        end: () => '—',
        __timeline__: () => <CapacityStrip />,
      },
    },
  ]}
/>
```

### Column scroll buffer

| Prop | Default | Description |
|------|---------|-------------|
| `columnScrollBufferPercent` | `10` | Horizontal buffer (% of viewport width) on each side for column virtualization |

### `useVirtualColumnSegments`

For custom timeline bands that need per-column data with caching:

```tsx
function MyStrip() {
  const segments = useVirtualColumnSegments(
    (columnIndex, date) => computeValue(columnIndex, date),
    `${zoomLevel}-${rangeStart}`, // resetKey — clears cache when this changes
  );
  return (
    <>
      {segments.map((seg) => (
        <VirtualColumnCell key={seg.columnIndex} columnIndex={seg.columnIndex} x={seg.x} width={seg.width}>
          {renderSegment(seg.data)}
        </VirtualColumnCell>
      ))}
    </>
  );
}
```

## Sticky rows

Pin rows to the top or bottom of the scroll viewport so they stay visible while scrolling large schedules. Works for both **task rows** and **custom rows**.

| `sticky` | Behavior |
|----------|----------|
| `'top'` | Pinned below the 52px header |
| `'bottom'` | Pinned to the viewport bottom |
| (omit) | Scrolls with main content |

Set on `GanttTask.sticky` or `CustomRowDefinition.sticky`. Multiple sticky rows on the same edge stack with computed offsets.

### Row display order

1. Sticky top tasks (`GanttTask.sticky: 'top'`)
2. Sticky top custom rows
3. Scrollable tasks
4. Inline custom rows (default footer behavior)
5. Sticky bottom custom rows
6. Sticky bottom tasks

```tsx
const tasks = [
  {
    id: 'baseline',
    name: 'Project baseline',
    start: '2026-01-01',
    end: '2026-12-31',
    sticky: 'top',
    color: '#6366f1',
    readOnly: true,
  },
  // …many scrollable tasks…
];

const customRows = [
  { id: 'legend', sticky: 'bottom', height: 32, cells: { name: () => 'Legend', __timeline__: () => <FooterLegend /> } },
  { id: 'totals', sticky: 'bottom', height: 28, cells: { name: () => 'Totals', __timeline__: () => <FooterTotals /> } },
];

<GanttChart tasks={tasks} customRows={customRows} height={520} />
```

CSS token: `--rg-sticky-row-bg` (opaque background so scrolled content does not show through).

## Click, context menu & hover targets

Unified handlers for bars, baselines, blocked dates, holidays, event markers, and empty timeline.

| Handler | Description |
|---------|-------------|
| `onGanttClick` | Click on any timeline target |
| `onGanttContextMenu` | Right-click; call `preventDefault()` to suppress browser menu |
| `onGanttHover` | Hover on blocks, holidays, etc. (when not occluded by task bars) |

Pass any of these to enable overlay hit targets for timeline, blocks, holidays, baselines, and event markers. Task bars always fire `onTaskClick`; also fire `onGanttClick` when that handler is set.

### `GanttTarget` types

| `type` | When | Key fields |
|--------|------|------------|
| `task` | Click task bar or milestone | `task`, `rowIndex`, `element: 'bar' \| 'milestone'` |
| `baseline` | Click baseline marker | `task`, `rowIndex`, `element` |
| `blockDate` | Click blocked date band | `range`, `index` |
| `holiday` | Click holiday/weekend band | `date`, `label?`, `index?` |
| `eventMarker` | Click event stripline | `marker`, `index` |
| `timeline` | Click empty timeline or header | `date`, `rowIndex` (null in header) |

Click priority (top wins): task bar → baseline → blocked/holiday band → empty timeline.

```tsx
<GanttChart
  blockDates={[{ start: '2026-04-14', end: '2026-04-16', label: 'Offsite' }]}
  onGanttContextMenu={(e) => {
    e.preventDefault();
    const { target } = e;
    if (target.type === 'task') openMenu(e.clientX, e.clientY, ['Edit', 'Delete'], target.task);
    if (target.type === 'blockDate') openMenu(e.clientX, e.clientY, ['Clear block'], target.range);
    if (target.type === 'timeline') openMenu(e.clientX, e.clientY, ['Add task'], target.date);
  }}
  onGanttHover={({ target, phase }) => {
    if (target?.type === 'blockDate' && phase === 'enter') showTip(target.range.label);
    if (phase === 'leave') hideTip();
  }}
/>
```

`onTaskClick` / `onTaskDoubleClick` include optional `element: 'bar' | 'milestone'` and modifier keys `ctrlKey`, `metaKey`, `shiftKey`.

## Event hooks

| Prop | Event | Payload highlights |
|------|-------|-------------------|
| `onTaskClick` | `taskClick` | `task`, `rowIndex`, `element?`, `ctrlKey?`, `metaKey?`, `shiftKey?` |
| `onTaskDoubleClick` | `taskDoubleClick` | `task`, `rowIndex`, `element?` |
| `onGanttClick` | `ganttClick` | `GanttPointerDetail` — unified click target |
| `onGanttContextMenu` | `ganttContextMenu` | `GanttPointerDetail` — right-click |
| `onGanttHover` | `ganttHover` | `GanttHoverDetail` — blocks, holidays, etc. |
| `onTaskHover` | `taskHover` | `task \| null`, `rowIndex`, `clientX?`, `clientY?` — enter/leave only |
| `onTaskDragStart` | `taskDragStart` | `task`, `start`, `end` |
| `onTaskDrag` | `taskDrag` | `task`, `start`, `end`, `deltaMs` |
| `onTaskDragEnd` | `taskDragEnd` | `task`, `start`, `end`, `previousStart`, `previousEnd` |
| `onTaskResizeStart` | `taskResizeStart` | `task`, `edge: 'start' \| 'end'` |
| `onTaskResize` | `taskResize` | `task`, `start`, `end`, `edge` |
| `onTaskResizeEnd` | `taskResizeEnd` | `task`, `start`, `end`, `edge`, `previousStart`, `previousEnd` |
| `onProgressChange` | `progressChange` | `task`, `progress`, `previousProgress` |
| `onZoomChange` | `zoomChange` | `zoomLevel`, `scaleId`, `scaleLabel`, `columnWidth` |
| `onScroll` | `scroll` | `scrollLeft`, `scrollTop` |
| `onSidebarLayoutChange` | `sidebarLayoutChange` | `SidebarLayoutState` |
| `onSelectionChange` | `selectionChange` | `{ selectedIds }` |
| `onCustomRowCellReady` | `customRowCellReady` | `rowId`, `columnKey` |
| `onCustomRowCellError` | `customRowCellError` | `rowId`, `columnKey`, `error` |
| `onTasksChange` | — | Full `GanttTask[]` after drag/resize/progress commit |

## Performance model

Unlike libraries that re-render the entire chart on every bar change:

1. **`TaskStore`** — external store with per-task version counters
2. **`TaskBar`** — `React.memo` with custom comparator; subscribes only to its task's version via `useTaskVersion`
3. **Drag/resize** — `updateTask()` bumps one task version → only that bar re-renders
4. **Grid, headers, dependency layer** — separate memoized components
5. **Timeline context** — ref-stabilized via metrics signature; consumers skip re-render when values unchanged
6. **Task tooltip** — isolated overlay; chart does not hold tooltip position state

### `TaskStore` API

```ts
const store = new TaskStore(initialTasks);
store.subscribe(listener);           // → unsubscribe
store.getSnapshot();
store.getVersion();
store.getTaskVersion(taskId);
store.setTasks(tasks);
store.updateTask(taskId, patch);
store.replaceTasks(tasks);
```

Import `TaskStore` directly for custom integrations.

## Utility functions

```ts
import {
  toDate,
  addUnit,
  diffUnits,
  format,
  getColumnWidth,
  computeTimelineRange,
  nextZoomLevel,
  resolveScale,
  resolveScales,
  ZOOM_LEVELS,
  PRESET_SCALES,
} from 'react-gantt-lib';

const range = computeTimelineRange(tasks, 'week', 2, {
  minDate: '2026-01-01',
  maxDate: '2026-12-31',
});
// → { start, end, columnCount, pixelWidth?, fixed? }
```

## Theme

| Prop | Default | Description |
|------|---------|-------------|
| `theme` | `'light'` | `'light'`, `'dark'`, or `'auto'` |

Applies class `rg-theme-{theme}` on `.rg-gantt`.

| Value | Behavior |
|-------|----------|
| `light` | Default light surfaces and text |
| `dark` | Twilight navy palette (`#0c1222` base), elevated surfaces, brighter accents |
| `auto` | Light by default; follows OS `prefers-color-scheme: dark` |

```tsx
<GanttChart tasks={tasks} theme="dark" />
<GanttChart tasks={tasks} theme="auto" />
```

Dark mode uses semantic CSS variables (`--rg-*`) — no pure black/white. Theme overrides all tokens on `.rg-theme-dark` and `.rg-theme-auto` (in dark media query).

## CSS & DOM reference

Import styles separately (not auto-imported):

```tsx
import 'react-gantt-lib/styles.css';
```

CSS variables (`--rg-*`) control backgrounds, text, borders, bars, tooltips, selection, sticky rows, and more.

Key classes:

| Class | Purpose |
|-------|---------|
| `.rg-gantt`, `.rg-gantt-body`, `.rg-panels` | Root layout |
| `.rg-task-list`, `.rg-task-row`, `.rg-task-row--selected` | Sidebar rows |
| `.rg-timeline-scroll`, `.rg-timeline-header`, `.rg-timeline-body` | Timeline |
| `.rg-bar`, `.rg-bar--selected`, `.rg-bar--group`, `.rg-bar-milestone` | Task bars |
| `.rg-baseline-layer`, `.rg-baseline-bar` | Baselines |
| `.rg-dependency-layer`, `.rg-dependency-arrow` | Dependency arrows |
| `.rg-custom-rows-timeline`, `.rg-custom-row-timeline-band` | Custom rows |
| `.rg-row--sticky`, `.rg-sticky-task-timeline-row` | Sticky rows |
| `.rg-task-tooltip`, `.rg-task-tooltip-shell` | Tooltips |
| `.rg-toolbar`, `.rg-divider` | Zoom toolbar and panel dividers |

Useful `data-testid` values: `gantt-chart`, `task-list-left`, `task-list-middle`, `timeline-header`, `timeline-body`, `zoom-toolbar`, `divider-left`, `divider-middle`, `dependency-layer`, `baseline-layer`, `event-markers`, `sticky-task-timeline-top`, `sticky-task-timeline-bottom`, `custom-rows-sticky-top`, `custom-rows-sticky-bottom`, `custom-rows`.

## Controlled state patterns

### Tasks (recommended)

```tsx
const [tasks, setTasks] = useState(initial);
<GanttChart tasks={tasks} onTasksChange={setTasks} />
```

### Zoom

```tsx
const [zoom, setZoom] = useState('week');
<GanttChart zoomLevel={zoom} onZoomChange={(e) => setZoom(e.scaleId)} />
```

### Selection

```tsx
<GanttChart selectedTaskIds={ids} onSelectionChange={(e) => setIds(e.selectedIds)} />
```

### Fixed window

```tsx
<GanttChart minDate="2026-01-01" maxDate="2026-06-30" />
```

### Per-task read-only

```tsx
{ id: 'done', name: 'Completed', start: '...', end: '...', readOnly: true }
```

## Full feature example

```tsx
<GanttChart
  tasks={tasks}
  columns={[
    { key: 'name', title: 'Task', flex: 2 },
    { key: 'progress', title: '%', render: ({ task }) => `${task.progress ?? 0}%` },
  ]}
  middleColumns={[
    { key: 'start', title: 'Start' },
    { key: 'end', title: 'End' },
  ]}
  height={480}
  theme="auto"
  minDate="2026-04-01"
  maxDate="2026-04-30"
  zoomLevel="day"
  availableZoomLevels={['day', '2day', '6hour', '3hour', '1hour']}
  snapToGrid
  showTooltip
  timezone="America/New_York"
  renderTaskTooltip={(task, onChange) => <MyTooltip task={task} onChange={onChange} />}
  showBaseline
  holidays={{ weekends: true, dates: [{ date: '2026-04-10', label: 'Holiday' }] }}
  blockDates={[{ start: '2026-04-14', end: '2026-04-16', label: 'Offsite' }]}
  eventMarkers={[{ id: 'e1', date: '2026-04-07', label: 'Review' }]}
  customRows={[myCustomRow]}
  selectedTaskIds={selectedIds}
  onTasksChange={setTasks}
  onZoomChange={(e) => setZoom(e.scaleId)}
  onSelectionChange={(e) => setSelectedIds(e.selectedIds)}
  onTaskDragEnd={(e) => console.log(e.task.id, e.start, e.end)}
  onGanttClick={(e) => console.log('clicked', e.target.type)}
  onGanttContextMenu={(e) => { e.preventDefault(); console.log('menu', e.target); }}
  onGanttHover={(e) => e.target?.type === 'blockDate' && e.phase === 'enter' && console.log(e.target.range.label)}
  onSidebarLayoutChange={(layout) => syncOverlays(layout.timelineLeft)}
/>
```

## Demo & playground

```bash
npm run demo   # → http://localhost:5173
```

| Demo file | Shows |
|-----------|-------|
| `demo/App.tsx` | Examples tab: sticky rows, grid snap, large timeline, custom row, smooth drag, timezone, advanced interactions |
| `demo/stickyRowsDemo.tsx` | Sticky top baseline bar + sticky bottom custom footer rows |
| `demo/timezoneDemo.tsx` | Timezone selector, live clocks, hour zoom, tooltips |
| `demo/advancedFeaturesDemo.tsx` | Multi-select, group folders/summary bars, collapse, read-only, block hover |
| `demo/playground.tsx` | Interactive controls for all major props |
| `demo/dailyColorStripRow.tsx` | Custom row with `useGanttTimeline()` daily color bands |

## Limitations

- `__timeline__` custom cell generators do not re-run on scroll — use `useGanttTimeline()` for live scroll/window data
- `lag` on `GanttDependency` is ignored; only finish-to-start is rendered
- `onGanttHover` for blocks may not fire when the pointer is over a task bar (bars sit above the block hit layer)
- No built-in context menu UI — use `onGanttContextMenu` + your own menu component
- No built-in task creation/editing forms — use `renderTaskTooltip` + `onChange` for inline edits
- No resource assignment or multi-project views
- Middle panel start/end show date only (not time)
- Sticky tasks are excluded from the scrollable timeline hit layer
- Dependency arrows use full task list row indices; pinned rows may affect visual arrow paths
- Week starts Monday (`weekStartsOn: 1`)

## Development

```bash
git clone https://github.com/amjed-ali-k/react-gantt-lib.git
cd react-gantt-lib
npm install
npm run demo       # http://localhost:5173
npm test
npm run typecheck
npm run build      # ESM + CJS + .d.ts → dist/
npm pack --dry-run # preview published tarball
```

Library build uses [tsdown](https://github.com/rolldown/tsdown) (dual ESM/CJS + declarations). Styles ship separately via `react-gantt-lib/styles.css`.

For AI/agent integration reference, see `react-gantt-lib/llm.txt` (also exported from the package).

## License

MIT
