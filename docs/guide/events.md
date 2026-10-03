---
title: Events & Hooks
description: Event callbacks, click targets, and context menu hooks in react-gantt-lib.
---

# Events & Hooks

## Unified click & hover

| Handler | Description |
|---------|-------------|
| `onGanttClick` | Click on any timeline target |
| `onGanttContextMenu` | Right-click; call `preventDefault()` to suppress browser menu |
| `onGanttHover` | Hover on blocks, holidays, etc. |

### GanttTarget types

| `type` | When | Key fields |
|--------|------|------------|
| `task` | Click bar or milestone | `task`, `rowIndex`, `element` |
| `baseline` | Click baseline marker | `task`, `rowIndex` |
| `blockDate` | Click blocked band | `range`, `index` |
| `holiday` | Click holiday band | `date`, `label?` |
| `eventMarker` | Click stripline | `marker`, `index` |
| `draggableMarker` | Click draggable marker | `marker`, `index` |
| `timeline` | Click empty area | `date`, `rowIndex` |
| `dependency` | Click a link (interactive links only) | `id`, `from`, `to`, `dependency` |

```tsx
<GanttChart
  blockDates={[{ start: '2026-04-14', end: '2026-04-16', label: 'Offsite' }]}
  onGanttContextMenu={(e) => {
    e.preventDefault();
    const { target } = e;
    if (target.type === 'task') openMenu(e.clientX, e.clientY, ['Edit', 'Delete'], target.task);
    if (target.type === 'timeline') openMenu(e.clientX, e.clientY, ['Add task'], target.date);
  }}
  onGanttHover={({ target, phase }) => {
    if (target?.type === 'blockDate' && phase === 'enter') showTip(target.range.label);
    if (phase === 'leave') hideTip();
  }}
/>
```

## All event hooks

| Prop | Event | Payload highlights |
|------|-------|-------------------|
| `onTaskClick` | `taskClick` | `task`, modifiers |
| `onTaskDoubleClick` | `taskDoubleClick` | `task`, `rowIndex` |
| `onGanttClick` | `ganttClick` | `GanttPointerDetail` |
| `onGanttContextMenu` | `ganttContextMenu` | `GanttPointerDetail` |
| `onGanttHover` | `ganttHover` | `GanttHoverDetail` |
| `onTaskHover` | `taskHover` | enter/leave only |
| `onTaskDragStart/Drag/DragEnd` | drag lifecycle | `task`, dates |
| `onTaskResizeStart/Resize/ResizeEnd` | resize lifecycle | `task`, `edge` |
| `onProgressChange` | `progressChange` | `task`, `progress` |
| `onDraggableMarkerDragStart/Drag/DragEnd` | marker drag lifecycle | `marker`, `date`, optional `snapPoint` |
| `onDraggableMarkerDragToSnapPoint` | marker snapped to custom point | `snapPoint`, `phase: 'drag' \| 'end'` |
| `onZoomChange` | `zoomChange` | `scaleId`, `columnWidth` |
| `onScroll` | `scroll` | `scrollLeft`, `scrollTop` |
| `onSidebarLayoutChange` | layout | `SidebarLayoutState` |
| `onSelectionChange` | selection | `{ selectedIds, selectedDependencyIds }` |
| `onDependencyClick` | `dependencyClick` | dependency target, modifiers (also Enter/Space) |
| `onDependencyContextMenu` | `dependencyContextMenu` | dependency target, `preventDefault()` |
| `onDependencyHover` | `dependencyHover` | dependency target, `phase: 'enter' \| 'leave'` |
| `onDependencyDelete` | `dependencyDelete` | `{ dependencies }` — Delete/Backspace with links selected |
| `onTasksChange` | — | Full `GanttTask[]` after edits |

::: tip onTaskHover
Fires on enter and leave only — not on mousemove. Do not `setState` on every move from this hook.
:::

<GanttDemo name="advanced" :height="420" />

See [Advanced example](/examples/advanced) and the [GanttChart props reference](/api/gantt-chart).
