---
title: Utilities
description: Date helpers, zoom utilities, and column virtualization functions.
---

# Utilities

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
  getVisibleColumnRange,
  getViewportColumnRange,
  maintainBufferedColumnRange,
  filterRectsInXRange,
  DEFAULT_COLUMN_SCROLL_BUFFER_PERCENT,
} from 'react-gantt-lib';
```

## computeTimelineRange

```ts
const range = computeTimelineRange(tasks, 'week', 2, {
  minDate: '2026-01-01',
  maxDate: '2026-12-31',
});
// → { start, end, columnCount, pixelWidth?, fixed? }
```

## Column virtualization

| Function | Purpose |
|----------|---------|
| `getVisibleColumnRange(...)` | Buffered visible column window |
| `getViewportColumnRange(...)` | Tight viewport range (no buffer) |
| `maintainBufferedColumnRange(...)` | Incremental range update on scroll |
| `filterRectsInXRange(...)` | Filter date-marking rects to x range |

[Zoom & Timeline guide](/guide/zoom-timeline) · [Performance guide](/guide/performance)
