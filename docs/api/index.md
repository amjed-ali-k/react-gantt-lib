---
title: API Overview
description: Public exports from react-gantt-lib — components, hooks, utilities, and types.
---

# API Overview

## Components & hooks

| Export | Description |
|--------|-------------|
| `GanttChart` | Main chart component |
| `useSidebarLayout` | Build a custom shell with draggable panels |
| `useGanttTimeline` | Timeline metrics inside chart tree (required for `__timeline__` cells) |
| `useGanttTimelineOptional` | Same; returns `null` outside `GanttChart` |
| `useGanttDisplayTimezone` | Current display timezone inside chart tree |
| `useVirtualColumnSegments` | Virtualized column segments with caching |
| `VirtualColumnCell` | Memoized cell wrapper for virtual segments |
| `useBufferedSegmentCache` | Generic cache for buffered timeline segments |

## Classes

| Export | Description |
|--------|-------------|
| `TaskStore` | External task store with per-task version counters |

## Zoom & scale

| Export | Description |
|--------|-------------|
| `ZOOM_LEVELS` | Default zoom order |
| `PRESET_SCALES` | All built-in scale presets |
| `resolveScale(id)` | Resolve a scale id (falls back to `day`) |
| `resolveScales(ids?)` | Resolve ordered list of scales |
| `getColumnWidth(scaleOrId, override?)` | Column width in px |
| `computeTimelineRange(...)` | Compute timeline start/end and column count |
| `nextZoomLevel(current, 'in' \| 'out', availableIds?)` | Step zoom |

## Dates

| Export | Description |
|--------|-------------|
| `toDate(value)` | Parse ISO string or `Date` |
| `addUnit(date, amount, zoom)` | Add scale units |
| `diffUnits(later, earlier, zoom)` | Difference in scale units |
| `format` | Re-exported from date-fns |

## Package exports

```tsx
import { GanttChart } from 'react-gantt-lib';
import 'react-gantt-lib/styles.css';
```

Agent/LLM reference: `react-gantt-lib/llm.txt` (also on npm).

- [GanttChart Props](/api/gantt-chart)
- [Components & Hooks](/api/components)
- [Utilities](/api/utilities)
- [Types](/api/types)
