---
title: Columns & Timezone
description: Customize sidebar columns and display timezone formatting in react-gantt-lib.
---

# Columns & Timezone

## Left panel — `columns`

Default: `[{ key: 'name', title: 'Task', flex: 2, minWidth: 120 }]`

## Middle panel — `middleColumns`

Default: start and end date columns.

```ts
interface GanttColumn {
  key: string;
  title: string;
  width?: number;
  minWidth?: number;
  flex?: number;
  render?: (ctx: { task, rowIndex, columnKey }) => React.ReactNode;
}
```

Built-in keys: `name`, `progress`, `start`, `end` (respects `timezone` when set).

```tsx
<GanttChart
  columns={[
    { key: 'name', title: 'Task', flex: 2 },
    { key: 'progress', title: '%', render: ({ task }) => `${task.progress ?? 0}%` },
  ]}
  middleColumns={[
    { key: 'start', title: 'Start' },
    { key: 'end', title: 'End' },
  ]}
/>
```

## Display timezone

```tsx
<GanttChart tasks={tasks} timezone="America/New_York" showTooltip />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `timezone` | `string` | browser local | IANA timezone id |

**Display only** — does not change stored task dates, drag math, bar positions, or callback payloads.

When set, all on-screen date/time labels use that zone:

- Timeline header labels
- Middle panel start/end columns
- Built-in task tooltip

Use `useGanttDisplayTimezone()` inside the chart tree for custom cells:

```tsx
import { useGanttDisplayTimezone } from 'react-gantt-lib';

function MyCell() {
  const timezone = useGanttDisplayTimezone();
  // Format with Intl or your helpers
}
```

<GanttDemo name="timezone" :height="400" />

See [Timezone example](/examples/timezone) for a live timezone selector.
