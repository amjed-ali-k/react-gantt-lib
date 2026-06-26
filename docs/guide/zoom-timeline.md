---
title: Zoom & Timeline
description: Zoom levels, fixed timeline range, and scale configuration in react-gantt-lib.
---

# Zoom & Timeline

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

## Zoom props

| Prop | Default | Description |
|------|---------|-------------|
| `zoomLevel` | `'week'` | Current scale (controlled) |
| `availableZoomLevels` | month → week → day → hour → minute | Toolbar steps |
| `columnWidth` | preset | Override column width (px) |

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
- Task dates clamp to the window on drag/resize
- Full range renders up front

```tsx
<GanttChart
  tasks={tasks}
  minDate="2026-01-01"
  maxDate="2026-06-30"
  zoomLevel="week"
/>
```

Without both bounds, the range auto-expands from task min/max plus `paddingUnits` (default 2 columns each side).

<GanttDemo name="grid-snap" :height="360" />

## Large timelines

For 50+ rows and multi-year ranges, column virtualization keeps scroll performance smooth.

<GanttDemo name="large-timeline" :height="560" />

See [Grid Snap](/examples/grid-snap) and [Large Timeline](/examples/large-timeline) examples.
