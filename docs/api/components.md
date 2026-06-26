---
title: Components & Hooks
description: useSidebarLayout, useGanttTimeline, useVirtualColumnSegments, and TaskStore.
---

# Components & Hooks

## useSidebarLayout

Build a custom three-panel shell outside `GanttChart`:

```tsx
const { layout, leftWidth, middleWidth, timelineLeft, onDividerPointerDown } =
  useSidebarLayout(containerRef, {
    defaultLeftWidth: 220,
    defaultMiddleWidth: 180,
    minPanelWidth: 80,
    onLayoutChange: (layout) => { /* ... */ },
  });
```

## useGanttTimeline

Required inside `__timeline__` custom cells. Returns live scroll position, visible columns, range, and scale metrics.

```tsx
function MyStrip() {
  const { range, columnWidth, visibleColumns, scrollLeft, msPerPixel } = useGanttTimeline();
  // ...
}
```

## useGanttTimelineOptional

Same as `useGanttTimeline` but returns `null` outside the chart tree — safe for shared components.

## useGanttDisplayTimezone

Returns the current display timezone (`string | undefined`) for custom column or tooltip formatting.

## useVirtualColumnSegments

For custom timeline bands with per-column data and incremental caching:

```tsx
const segments = useVirtualColumnSegments(
  (columnIndex, date) => computeValue(columnIndex, date),
  `${zoomLevel}-${rangeStart}`,
);
```

## VirtualColumnCell

Memoized wrapper for virtual column segment rendering.

## TaskStore

External store with per-task version counters for granular updates:

```ts
const store = new TaskStore(initialTasks);
store.updateTask(taskId, patch); // only that bar re-renders
```

[Performance guide](/guide/performance) · [Custom Rows guide](/guide/custom-rows)
