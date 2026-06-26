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
