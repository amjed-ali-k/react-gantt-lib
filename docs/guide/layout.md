---
title: Layout & Panels
description: Three draggable sidebar panels, sizing props, and useSidebarLayout in react-gantt-lib.
---

# Layout & Panels

| Panel | Prop | Default content | Resizer |
|-------|------|-----------------|---------|
| **Left** | `showTaskList` (default `true`) | Task name column(s) | `divider-left` |
| **Middle** | `showDateColumns` (default `true`) | Start / End columns | `divider-middle` |
| **Right** | always | SVG timeline + zoom toolbar | — |

Vertical scroll is synchronized across panels (`.rg-sync-scroll`).

## Panel sizing

| Prop | Default | Description |
|------|---------|-------------|
| `defaultLeftWidth` | `220` | Left panel width (px) |
| `defaultMiddleWidth` | `180` | Middle panel width (px) |
| `minPanelWidth` | `80` | Minimum when dragging dividers |
| `height` | `500` | Chart height |
| `width` | `'100%'` | Chart width |
| `rowHeight` | `36` | Task row height (px) |

Hide panels: `showTaskList={false}`, `showDateColumns={false}`.

## Layout callbacks

The root `.rg-gantt` element exposes layout as data attributes (px):

- `data-sidebar-left`
- `data-sidebar-middle`
- `data-timeline-left`

```tsx
<GanttChart
  onSidebarLayoutChange={({ leftWidth, middleWidth, rightWidth, timelineLeft, totalWidth }) => {
    // Sync external UI to panel positions
  }}
/>
```

## useSidebarLayout

Build a custom shell outside `GanttChart`:

```tsx
const { layout, leftWidth, middleWidth, timelineLeft, onDividerPointerDown, setLeftWidth, setMiddleWidth } =
  useSidebarLayout(containerRef, {
    defaultLeftWidth: 220,
    defaultMiddleWidth: 180,
    minPanelWidth: 80,
    onLayoutChange: (layout) => { /* ... */ },
  });
```

<GanttDemo name="quick-start" :height="320" />

See [Columns & Timezone](/guide/columns-timezone) for customizing panel columns.
