---
title: Performance
description: TaskStore, granular re-renders, and performance model in react-gantt-lib.
---

# Performance

Unlike libraries that re-render the entire chart on every bar change:

1. **`TaskStore`** — external store with per-task version counters
2. **`TaskBar`** — `React.memo` with custom comparator; subscribes only to its task's version
3. **Drag/resize** — `updateTask()` bumps one task version → only that bar re-renders
4. **Grid, headers, dependency layer** — separate memoized components
5. **Timeline context** — ref-stabilized via metrics signature
6. **Task tooltip** — isolated overlay; chart does not hold tooltip position state

## TaskStore API

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

## Column virtualization

For large timelines, `columnScrollBufferPercent` (default 10%) controls the horizontal buffer. Utilities:

- `getVisibleColumnRange`
- `getViewportColumnRange`
- `maintainBufferedColumnRange`
- `useVirtualColumnSegments`

<GanttDemo name="large-timeline" :height="480" />

See [Large Timeline example](/examples/large-timeline) for 50 rows over four years.
