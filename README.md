# react-gantt-lib

High-performance React Gantt chart with **granular bar updates** (only the changed task re-renders), three draggable side panels, rich event hooks, and async custom footer rows.

Built with **date-fns** for all date math.

## Install

```bash
npm install react-gantt-lib date-fns react react-dom
```

## Quick start

```tsx
import { GanttChart } from 'react-gantt-lib';
import 'react-gantt-lib/styles.css';
const tasks = [
  { id: '1', name: 'Design', start: '2026-01-01', end: '2026-01-15', progress: 65 },
  { id: '2', name: 'Build', start: '2026-01-10', end: '2026-02-01', progress: 20 },
];

export function App() {
  return (
    <GanttChart
      tasks={tasks}
      height={500}
      zoomLevel="week"
      onTaskDragEnd={(e) => console.log('moved', e.task.id, e.start, e.end)}
      onTaskHover={(e) => e.task && console.log('hover', e.task.name)}
    />
  );
}
```

## Layout: three draggable panels

| Panel | Default content | Resizer |
|-------|-----------------|---------|
| **Left** | Task name column(s) | `divider-left` |
| **Middle** | Start / End columns | `divider-middle` |
| **Right** | SVG timeline | — |

Sidebar positions are exposed via `onSidebarLayoutChange` and `data-*` attributes on the root element:

```tsx
<GanttChart
  onSidebarLayoutChange={({ leftWidth, middleWidth, timelineLeft, totalWidth }) => {
    // Sync external UI (legends, overlays) to panel positions
  }}
/>
```

Use `useSidebarLayout` independently if you build a custom shell.

## Zoom levels

One column = one unit at the selected scale:

| Level | Column represents |
|-------|-------------------|
| `month` | 1 month |
| `week` | 1 week |
| `day` | 1 day |
| `hour` | 1 hour |
| `minute` | 1 minute |

Toolbar `+` / `−` or controlled `zoomLevel` prop.

### Snap vs smooth drag

| Prop | Behavior |
|------|----------|
| `snapToGrid={true}` (default) | Bars move smoothly while dragging; dates **snap to the grid on release** |
| `snapToGrid={false}` | Fully smooth drag and resize — dates keep pixel-level precision |

```tsx
<GanttChart tasks={tasks} snapToGrid={false} zoomLevel="day" />
```

Hover a bar to reveal **edge resize handles** (left/right grips).

### Fixed timeline range

Set `minDate` and `maxDate` together to lock the grid. The chart renders the full range up front — dragging tasks **will not add columns or expand scroll**. Task dates are clamped inside the window.

```tsx
<GanttChart
  tasks={tasks}
  minDate="2026-01-01"
  maxDate="2026-06-30"
  zoomLevel="week"
/>
```

## Performance model

Unlike libraries that re-render the entire chart on every bar change:

1. **`TaskStore`** — external store with per-task version counters
2. **`TaskBar`** — `React.memo` with custom comparator; subscribes only to its task's version
3. **Drag/resize** — `updateTask()` bumps one task version → only that bar re-renders

Grid and headers are separate memoized components and do not re-render when a single task changes.

## Event hooks

| Hook | When |
|------|------|
| `onTaskClick` | Click task row or bar |
| `onTaskDoubleClick` | Double-click bar |
| `onTaskHover` | Mouse enter/leave (`task: null` on leave) |
| `onTaskDragStart` | Begin bar move |
| `onTaskDrag` | During bar move |
| `onTaskDragEnd` | After bar move committed |
| `onTaskResizeStart` | Begin resize |
| `onTaskResize` | During resize |
| `onTaskResizeEnd` | After resize committed |
| `onProgressChange` | Progress handle drag |
| `onZoomChange` | Zoom level changed |
| `onScroll` | Timeline/panel scroll |
| `onSidebarLayoutChange` | Panel widths changed (drag or resize) |
| `onSelectionChange` | Selection changed |
| `onCustomRowCellReady` | Async custom cell resolved |
| `onCustomRowCellError` | Async custom cell failed |

Controlled updates: `onTasksChange` receives the full task array after edits.

## Custom rows + `useGanttTimeline()`

Append extra rows below the task list. Sidebar cells scroll vertically with tasks; timeline bands live inside `.rg-timeline-inner` so they **scroll and zoom with the chart**.

Each cell generator receives `CustomRowCellContext` (`zoomLevel`, `rangeStart`, `rangeEnd`, `scale`, `columnWidth`, `timelineWidth`, `msPerPixel`, `rowHeight`, `meta`, …). For timeline bands, prefer the hook inside your component:

```tsx
import { GanttChart, useGanttTimeline } from 'react-gantt-lib';

function CapacityStrip() {
  const { range, msPerPixel, columnWidth } = useGanttTimeline();
  // render bands aligned to the current zoom/range
  return <div style={{ width: range.columnCount * columnWidth }}>…</div>;
}

<GanttChart
  customRows={[
    {
      id: 'capacity',
      cells: {
        name: async () => 'Capacity',
        start: async () => '—',
        end: async () => '—',
        __timeline__: async () => <CapacityStrip />,
      },
    },
  ]}
/>
```

Use `__timeline__` for the full-width timeline band. Generators may return JSX or a Promise.

## Columns

```tsx
<GanttChart
  columns={[
    { key: 'name', title: 'Task', flex: 2 },
    { key: 'progress', title: '%', render: ({ task }) => `${task.progress}%` },
  ]}
  middleColumns={[
    { key: 'start', title: 'Start' },
    { key: 'end', title: 'End' },
  ]}
/>
```

## Development

```bash
git clone https://github.com/amjed-ali-k/react-gantt-lib.git
cd react-gantt-lib
npm install
npm run demo       # opens http://localhost:5173
npm test
npm run typecheck
npm run build      # ESM + CJS + .d.ts → dist/
npm pack --dry-run # preview published tarball
```

Library build uses [tsdown](https://github.com/rolldown/tsdown) (dual ESM/CJS + declarations). Styles ship separately via `react-gantt-lib/styles.css`.

## License

MIT
