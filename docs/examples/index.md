---
title: Examples
description: Live interactive examples for every major feature of react-gantt-lib.
---

# Examples

Each example is a live, interactive chart you can drag, resize, and zoom. Use the source links in the repo under `demo/` for full implementation details.

| Example | Highlights |
|---------|------------|
| [Quick Start](/examples/quick-start) | Minimal setup, drag & resize |
| [Group Summary](/examples/group-summary) | 5 groups × 4 tasks, roll-up bars |
| [Sticky Rows](/examples/sticky-rows) | Pinned top baseline + bottom footer |
| [Grid Snap](/examples/grid-snap) | Week-boundary snapping |
| [Large Timeline](/examples/large-timeline) | 50 rows, column virtualization |
| [Custom Rows](/examples/custom-rows) | `useGanttTimeline()` color strip |
| [Timezone](/examples/timezone) | IANA display timezone |
| [Advanced](/examples/advanced) | Multi-select, blocks, read-only |
| [Draggable Markers](/examples/draggable-markers) | History scrubber, drag callbacks |

::: tip Interactive playground
Want to toggle every prop? Open the [Playground](/playground/) for date range, holidays, blocks, zoom, and more.
:::

<GanttDemo name="quick-start" :height="340" />
