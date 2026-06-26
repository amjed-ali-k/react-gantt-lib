---
title: Custom Rows
description: Async sidebar cells and full-width timeline bands with useGanttTimeline in react-gantt-lib.
---

# Custom Rows

Append extra rows below (or pinned to the top/bottom of) the task list via `customRows`.

```ts
interface CustomRowDefinition {
  id: string;
  meta?: unknown;
  height?: number;
  sticky?: 'top' | 'bottom';
  cells: Record<string, (ctx) => ReactNode | Promise<ReactNode>>;
}
```

## Cell keys

| Key | Renders in |
|-----|------------|
| Match `columns[].key` / `middleColumns[].key` | Sidebar cells |
| `__timeline__` | Full-width band inside timeline |

## useGanttTimeline()

For timeline bands, use `useGanttTimeline()` inside your component for live scroll and visible column window — context snapshots do not update on scroll.

```tsx
import { GanttChart, useGanttTimeline } from 'react-gantt-lib';

function CapacityStrip() {
  const { range, msPerPixel, columnWidth, visibleColumns, scrollLeft } = useGanttTimeline();
  const width = range.pixelWidth ?? range.columnCount * columnWidth;
  return <div style={{ width }}>…</div>;
}

<GanttChart
  customRows={[
    {
      id: 'capacity',
      cells: {
        name: () => 'Capacity',
        start: () => '—',
        end: () => '—',
        __timeline__: () => <CapacityStrip />,
      },
    },
  ]}
/>
```

## Column virtualization

| Prop | Default | Description |
|------|---------|-------------|
| `columnScrollBufferPercent` | `10` | Horizontal buffer (% of viewport) for virtualization |

Use `useVirtualColumnSegments` for per-column data with incremental caching.

<GanttDemo name="custom-rows" :height="400" />

See [Custom Rows example](/examples/custom-rows).

::: warning Scroll behavior
`__timeline__` cell generators do not re-run on scroll — use `useGanttTimeline()` for live scroll data.
:::
