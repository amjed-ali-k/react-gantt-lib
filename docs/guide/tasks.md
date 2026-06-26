---
title: Tasks & Hierarchy
description: Task fields, group rows, collapse, milestones, and hierarchy in react-gantt-lib.
---

# Tasks & Hierarchy

Each task in the `tasks` array maps to one row. Row order follows array order.

## Required fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier |
| `name` | `string` | Display name |
| `start` | `Date \| string` | Start date/time |
| `end` | `Date \| string` | End date/time |

## Optional fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `progress` | `number` | `0` | Completion 0–100 |
| `parentId` | `string` | — | Parent task id (16px indent per level) |
| `collapsed` | `boolean` | — | Hide descendants when `true` |
| `type` | `'task' \| 'milestone' \| 'group'` | `'task'` | Row kind |
| `showSummaryBar` | `boolean` | `true` | Group summary bar on timeline |
| `readOnly` | `boolean` | — | Disable drag, resize, progress edits |
| `dependencies` | `string[] \| GanttDependency[]` | — | Predecessor ids |
| `baseline` | `{ start, end, color? }` | — | Original plan overlay |
| `color` | `string` | — | Bar fill color |
| `sticky` | `'top' \| 'bottom'` | — | Pin row while scrolling |

## Group rows

Set `type: 'group'` on parent rows for hierarchy and optional summary timeline bars.

| `showSummaryBar` | Timeline behavior |
|------------------|-------------------|
| `true` (default) | Summary bar with rolled-up dates/progress; child bars when expanded |
| `false` | No bar on group row; children render their own bars |

Parent rows with children show a ▸/▾ collapse button. Click toggles `task.collapsed` and updates via `onTasksChange`.

<GanttDemo name="group-summary" :height="480" />

```tsx
const tasks = [
  { id: 'phase', name: 'Phase 1', type: 'group', showSummaryBar: false, start: '2026-04-01', end: '2026-04-01' },
  { id: 'a', name: 'Task A', parentId: 'phase', start: '2026-04-02', end: '2026-04-06' },
  { id: 'envelope', name: 'Envelope', type: 'group', start: '2026-04-10', end: '2026-04-10' },
  { id: 'roof', name: 'Roofing', parentId: 'envelope', start: '2026-04-10', end: '2026-04-12' },
];
```

## Milestones

```tsx
{ id: 'm1', name: 'Go-live', type: 'milestone', start: '2026-06-01', end: '2026-06-01' }
```

Rendered as a 14px diamond with label to the right. Draggable (move only), no resize handles.

## Dependencies

Add `dependencies` on the **successor** pointing to predecessor id(s). Finish-to-start (FS) only.

```tsx
{ id: 'b', name: 'Task B', start: '...', end: '...', dependencies: ['task-a'] }
```

## Baseline

Show original plan dates as an amber overlay. Enable with `showBaseline` (default `true`).

```tsx
{
  id: 't1',
  name: 'Foundation',
  start: '2026-04-05',
  end: '2026-04-12',
  baseline: { start: '2026-04-01', end: '2026-04-10', color: '#e6a23c' },
}
```

See also: [Group Summary example](/examples/group-summary) · [Advanced example](/examples/advanced)
