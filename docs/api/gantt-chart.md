---
title: GanttChart Props
description: Complete prop reference for the GanttChart component.
---

# GanttChart Props

## Data

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tasks` | `GanttTask[]` | required | Task rows |
| `onTasksChange` | `(tasks) => void` | — | Called after drag/resize/progress |

## Layout

| Prop | Type | Default |
|------|------|---------|
| `height` | `number` | `500` |
| `width` | `string \| number` | `'100%'` |
| `rowHeight` | `number` | `36` |
| `showTaskList` | `boolean` | `true` |
| `showDateColumns` | `boolean` | `true` |
| `defaultLeftWidth` | `number` | `220` |
| `defaultMiddleWidth` | `number` | `180` |
| `minPanelWidth` | `number` | `80` |
| `columns` | `GanttColumn[]` | name column |
| `middleColumns` | `GanttColumn[]` | start/end |

## Timeline

| Prop | Type | Default |
|------|------|---------|
| `zoomLevel` | `ViewScaleId` | `'week'` |
| `availableZoomLevels` | `ViewScaleId[]` | preset list |
| `columnWidth` | `number` | preset |
| `minDate` | `Date \| string` | auto |
| `maxDate` | `Date \| string` | auto |
| `timezone` | `string` | browser local |

## Interaction

| Prop | Type | Default |
|------|------|---------|
| `enableDrag` | `boolean` | `true` |
| `enableResize` | `boolean` | `true` |
| `enableProgressDrag` | `boolean` | `true` |
| `enableDependencyCreate` | `boolean` | `false` (connector handles to draw links; per-task override) |
| `snapToGrid` | `boolean` | `true` |
| `selectedTaskIds` | `string[]` | — |
| `selectedDependencyIds` | `string[]` | — (controlled link selection; makes links interactive) |
| `formatDependencyLag` | `(lag, dependency) => string` | `+2d` / `-1d` |
| `showTooltip` | `boolean` | `false` |
| `renderTaskTooltip` | `fn` | — |
| `showBaseline` | `boolean` | `true` |

## Overlays

| Prop | Type |
|------|------|
| `holidays` | `HolidayMarking` |
| `blockDates` | `BlockDateRange[]` |
| `eventMarkers` | `EventMarker[]` |
| `draggableMarkers` | `DraggableMarker[]` |
| `draggableMarkerSnapPoints` | `DraggableMarkerSnapPoint[]` |
| `customRows` | `CustomRowDefinition[]` |

## Theme

| Prop | Type | Default |
|------|------|---------|
| `theme` | `'light' \| 'dark' \| 'auto'` | `'light'` |

## Performance

| Prop | Type | Default |
|------|------|---------|
| `columnScrollBufferPercent` | `number` | `10` |

## Events

See [Events & Hooks](/guide/events) for `onTaskClick`, `onGanttClick`, `onGanttContextMenu`, `onGanttHover`, drag/resize lifecycle, `onZoomChange`, `onScroll`, `onSidebarLayoutChange`, `onSelectionChange`, the `onDependency*` callbacks, and custom row callbacks.

<GanttDemo name="quick-start" :height="300" />

[API Overview](/api/) · [Playground](/playground/)
