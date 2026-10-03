---
title: Interactions
description: Drag, resize, snap, selection, tooltips, and date markers in react-gantt-lib.
---

# Interactions

## Drag, resize & snap

| Prop | Default | Description |
|------|---------|-------------|
| `enableDrag` | `true` | Move bar body |
| `enableResize` | `true` | Left/right handles on hover |
| `enableProgressDrag` | `true` | Bottom progress handle |
| `snapToGrid` | `true` | Snap to grid on pointer release |

| `snapToGrid` | Behavior |
|--------------|----------|
| `true` (default) | Smooth visual drag; dates snap on release |
| `false` | Pixel-precision dates (sub-hour at hour zoom) |

Per-task overrides: `enableDrag`, `enableResize`, `enableProgressDrag`. `readOnly: true` disables all editing.

<GanttDemo name="interactions" :height="260" />

## Keyboard & accessibility

The timeline's bars are rows of a `role="treegrid"` (named by `timelineLabel`, default "Timeline";
`aria-rowindex` / `aria-level` match the task list), each a `role="row"` with a `gridcell`. The bars
are **one tab stop** (roving tabindex) and each is named for assistive tech:
"Pour slab, 3/3/2026 to 3/6/2026, 40%, depends on Rebar, critical" (milestones: "Handover,
milestone, 3/15/2026"; dates in the display `timezone`).

| Key (on a focused bar) | Action |
|---|---|
| Up / Down | Move focus to the previous / next row |
| Left / Right | Move the task one grid unit (when drag is enabled) |
| Shift + Left / Right | Resize the end (when resize is enabled; not milestones) |
| Alt + Left / Right | Resize the start |
| Enter | `onTaskDoubleClick` (open) |
| Space | Select (Ctrl/⌘ + Space toggles) |
| Home / End | Scroll to the start / end of the timeline |
| `+` / `-` | Zoom in / out |
| `L` | Start drawing a link (with `enableDependencyCreate`) |

A keyboard move or resize fires the same `taskDragStart/Drag/DragEnd` or
`taskResizeStart/Resize/ResizeEnd` events as a pointer, snapped and clamped the same way, with
`source: 'keyboard'` (pointer drags carry `source: 'pointer'`).

- **Announcements.** Moves, resizes, zoom, Home/End and drawing links are spoken ("Moved Rebar
  inspection to 10/12/2026 – 10/14/2026") through a visually hidden `role="status"` region, or
  through your `announce(message)` prop if you pass one.
- **Dependency links** (when interactive) are a second tab stop, a `role="group"` named
  "Dependencies": arrows and Home/End move between links, Enter/Space selects.
- **Reduced motion.** Under `prefers-reduced-motion: reduce` the chart gets `rg-gantt--reduced-motion`
  and every transition and animation inside it is off; Home/End jump instead of smooth-scrolling.
- **Critical path.** `critical: true` on a task draws a heavy dashed outline (`rg-bar--critical`), a
  shape rather than only a colour (`--rg-critical`), and adds "critical" to its name. Links already
  take `critical` (see [Dependencies](./tasks#dependencies)).
- **Today marker** is a `role="img"` named "Today, <date>".

## Selection

```tsx
const [ids, setIds] = useState<string[]>([]);

<GanttChart
  tasks={tasks}
  selectedTaskIds={ids}
  onSelectionChange={(e) => setIds(e.selectedIds)}
/>
```

Uncontrolled: click selects one task. **Ctrl/⌘+click** toggles without clearing.

## Tooltips

| Prop | Default | Description |
|------|---------|-------------|
| `showTooltip` | `false` | Built-in floating tooltip |
| `renderTaskTooltip` | — | Custom tooltip UI |

`onChange(patch)` from custom tooltips applies `Partial<GanttTask>` to the hovered task.

## Holidays, blocks & event markers

```tsx
holidays={{
  weekends: true,
  dates: [{ date: '2026-04-25', label: 'ANZAC Day' }],
}}

blockDates={[
  { start: '2026-04-14', end: '2026-04-16', label: 'Offsite', color: '#fde8e8' },
]}

eventMarkers={[
  { id: 'e1', date: '2026-04-07T10:00:00', label: 'Review', color: '#6366f1' },
]}
```

<GanttDemo name="advanced" :height="420" />

See [Advanced example](/examples/advanced) for multi-select, read-only tasks, and block hover.
