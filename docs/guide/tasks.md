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

Add `dependencies` on the **successor** task pointing to predecessor id(s). A predecessor/successor
pair is one link; its id is `dependencyId(fromId, toId)` (`"a->b"`).

| `type` | From (predecessor) | To (successor) |
|--------|--------------------|----------------|
| `FS` (default) | end | start |
| `SS` | start | start |
| `FF` | end | end |
| `SF` | start | end |

Links are orthogonal SVG paths with an arrowhead pointing into the successor edge. When the
successor's edge is behind the predecessor's, the path doubles back through the row gutter;
milestones connect at the diamond's left (start) or right (end) tip. A non-zero `lag` is drawn as a
label on the link (`+2d` / `-1d` — override with `formatDependencyLag`).

```tsx
// Simple form (FS, no lag)
{ id: 'b', name: 'Task B', start: '...', end: '...', dependencies: ['task-a'] }

// Object form
{ id: 'b', dependencies: [{ id: 'task-a', type: 'SS', lag: 2, color: '#e11d48', critical: true }] }
```

`color` colours the line, arrowhead and label; `className` is added to the link's `<g>`;
`critical` adds `rg-dependency--critical` (heavier, red by default).

### Interactive links

Links are drawn but inert by default. Pass any of `onDependencyClick`, `onDependencyHover`,
`onDependencyContextMenu`, `onDependencyDelete`, or a controlled `selectedDependencyIds`, and each
link gets a wide invisible hit stroke (the only part that takes pointer events, and painted under
the bars so it never steals a bar drag):

- **Click** (or **Enter**/**Space** on a focused link) selects it; ctrl/meta-click toggles. Task and
  link selection are one selection: a plain click on either replaces both.
  `onSelectionChange` reports `{ selectedIds, selectedDependencyIds }`.
- **Delete**/**Backspace** while links are selected (and focus is in the chart, outside a text field)
  fires `onDependencyDelete({ dependencies })`. The chart does not remove anything — update `tasks`.
- Click, context menu and hover also reach `onGanttClick` / `onGanttContextMenu` / `onGanttHover`
  with a `{ type: 'dependency', id, from, to, dependency }` target.

```tsx
const [linkIds, setLinkIds] = useState<string[]>([]);

<GanttChart
  tasks={tasks}
  selectedDependencyIds={linkIds}
  onSelectionChange={(e) => setLinkIds(e.selectedDependencyIds)}
  onDependencyDelete={({ dependencies }) => removeLinks(dependencies.map((d) => d.id))}
/>
```

### Drawing links (drag-to-link)

Set `enableDependencyCreate` (or `GanttTask.enableDependencyCreate` per task, which overrides it)
and each bar and milestone gets a **connector handle** just outside its start and end edge, shown on
hover and focus, and on every linkable bar while a link is being drawn. A `readOnly` task has none.

- **Drag** from one handle to another task's handle. A live preview follows the pointer — dashed
  while it has nowhere to land, solid with a ring once it is over a handle — and the timeline
  auto-scrolls while the pointer is near the viewport's edges. Dropping on a handle fires
  `onDependencyCreate({ fromId, toId, type, source: 'pointer' })`, with the type inferred from the two
  handles: end→start `FS`, start→start `SS`, end→end `FF`, start→end `SF`.
- **Escape**, a drop on the same task, on a bar body or on empty space cancel with no event.
- **Keyboard:** linkable bars are focusable. Press **L** on a bar, move focus to the target bar
  (Tab), then **Enter** for `FS` or **Shift+Enter** to choose the type from a small menu (arrow keys,
  Enter; Escape closes it). Escape, or moving focus out of the chart, cancels. Progress is announced
  in a polite live region.

The chart adds nothing and checks nothing — not cycles, not duplicates. Validate in the handler,
then update `tasks`.

```tsx
<GanttChart
  tasks={tasks}
  enableDependencyCreate
  onDependencyCreate={({ fromId, toId, type }) => {
    if (wouldCycle(fromId, toId)) return;
    setTasks((ts) => ts.map((t) => (t.id === toId
      ? { ...t, dependencies: [...(t.dependencies ?? []), { id: fromId, type }] }
      : t)));
  }}
/>
```

`dependencyTypeForEdges(from, to)` is the inverse of `DEPENDENCY_EDGES`.

Building on links can reuse `routeDependency(type, fromX, fromY, toX, toY)`,
`buildDependencyPath`, `DEPENDENCY_EDGES` and `computeDependencyLinks`.

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
