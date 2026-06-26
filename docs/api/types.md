---
title: Types
description: Exported TypeScript types from react-gantt-lib.
---

# Types

All types are exported from the package:

**Core:** `GanttTask`, `GanttColumn`, `GanttChartProps`, `GanttCallbacks`, `GanttTheme`

**Events:** `GanttEventMap`, `GanttEventName`, `GanttEventHandler`, `GanttTarget`, `GanttPointerDetail`, `GanttHoverDetail`

**Custom rows:** `CustomRowDefinition`, `CustomRowCellContext`, `CustomRowCellGenerator`

**Markers:** `HolidayMarking`, `HolidayDateEntry`, `BlockDateRange`, `EventMarker`

**Tasks:** `TaskBaseline`, `GanttDependency`, `DependencyType`

**Scale:** `ViewScaleId`, `ZoomLevel`, `ViewScale`, `TimelineRange`, `TimelineRangeBounds`

**Layout:** `SidebarLayoutState`, `SidebarWidths`, `ResolvedTask`, `BarGeometry`

**Virtualization:** `GanttTimelineContextValue`, `VirtualColumnSegment`, `VisibleColumnRange`, `ColumnRenderContext`, `DateMarkingLayers`, `DateMarkingRect`

**Tooltips:** `TaskTooltipRenderer`, `TaskTooltipChangeHandler`

```tsx
import type { GanttTask, GanttChartProps } from 'react-gantt-lib';
```

## Controlled state patterns

```tsx
// Tasks
const [tasks, setTasks] = useState(initial);
<GanttChart tasks={tasks} onTasksChange={setTasks} />

// Zoom
const [zoom, setZoom] = useState('week');
<GanttChart zoomLevel={zoom} onZoomChange={(e) => setZoom(e.scaleId)} />

// Selection
<GanttChart selectedTaskIds={ids} onSelectionChange={(e) => setIds(e.selectedIds)} />

// Fixed window
<GanttChart minDate="2026-01-01" maxDate="2026-06-30" />
```

[API Overview](/api/)
