---
title: Draggable Markers
description: Scrub timeline history with draggable vertical markers, custom snap points, and drag lifecycle callbacks.
---

# Draggable Markers

Add one or more **draggable vertical markers** — styled like the built-in today line — and use the drag callbacks to drive project-specific overlays such as history playback, baselines, or audit scrubbers.

<GanttDemo name="draggable-markers" :height="380" />

## Basic setup

```tsx
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { GanttChart } from 'react-gantt-lib';
import type { DraggableMarker } from 'react-gantt-lib';

const toDateString = (date: Date) => format(date, 'yyyy-MM-dd');

const [marker, setMarker] = useState<DraggableMarker>({
  id: 'as-of',
  date: '2026-02-20',
  label: 'As of',
  color: '#6366f1',
});

const draggableMarkers = useMemo(() => [marker], [marker]);

<GanttChart
  tasks={tasks}
  minDate="2026-01-26"
  maxDate="2026-04-05"
  draggableMarkers={draggableMarkers}
  onDraggableMarkerDrag={({ date }) =>
    setMarker((m) => ({ ...m, date: toDateString(date) }))
  }
  onDraggableMarkerDragEnd={({ date, previousDate }) => {
    const iso = toDateString(date);
    setMarker((m) => ({ ...m, date: iso }));
    console.log('scrubbed', previousDate, '→', date);
  }}
/>
```

::: warning Date strings
Use local calendar dates (`format(date, 'yyyy-MM-dd')`), not `date.toISOString().slice(0, 10)` — UTC conversion can shift the marker off the grid after release.
:::

## Custom snap points

Pass invisible snap targets when the marker should jump between known dates/times (saved revisions, audit checkpoints, baseline snapshots). Snap points are **not rendered** — they only affect drag snapping.

When `draggableMarkerSnapPoints` is provided, it **takes priority over** `snapToGrid`.

```tsx
import type { DraggableMarkerSnapPoint } from 'react-gantt-lib';

const revisionSnapPoints: DraggableMarkerSnapPoint[] = [
  { id: 'rev-1', date: '2026-02-02' },
  { id: 'rev-2', date: '2026-02-14T09:00:00' }, // datetime supported
  { id: 'rev-3', date: '2026-03-01' },
  { id: 'rev-4', date: '2026-03-29' },
];

<GanttChart
  tasks={tasks}
  minDate="2026-01-26"
  maxDate="2026-04-05"
  draggableMarkers={draggableMarkers}
  draggableMarkerSnapPoints={revisionSnapPoints}
  onDraggableMarkerDragToSnapPoint={({
    snapPoint,
    snapPointIndex,
    date,
    phase,
  }) => {
    // phase: 'drag' while scrubbing, 'end' on pointer release
    loadRevision(snapPoint.id, date);
    console.log(phase, snapPointIndex, snapPoint.id);
  }}
  onDraggableMarkerDragEnd={({ snapPoint, date }) => {
    if (snapPoint) {
      setMarker((m) => ({ ...m, date: toDateString(date) }));
    }
  }}
/>
```

### Snap behaviour

| Mode | When | Snaps to |
|------|------|----------|
| Custom snap points | `draggableMarkerSnapPoints.length > 0` | Nearest snap point (by timeline distance) |
| Grid snap (default) | `snapToGrid={true}` and no snap points | Nearest column boundary (vertical grid line) |
| Free drag | `snapToGrid={false}` and no snap points | Exact pointer position |

During drag with snap points, the marker **magnet-snaps** to the nearest point in real time. `onDraggableMarkerDragToSnapPoint` fires when the active snap target **changes** (`phase: 'drag'`) and again on **pointer release** (`phase: 'end'`).

Use `onDraggableMarkerDragToSnapPoint` to load revision data, diff tasks, or update external history UI. Keep work lightweight during `phase: 'drag'` if the handler runs often.

## Props & callbacks

| Prop / callback | Description |
|-----------------|-------------|
| `draggableMarkers` | `{ id, date, label?, color?, draggable? }[]` — `id` is required |
| `draggableMarkerSnapPoints` | `{ id, date }[]` — invisible snap targets; datetime strings supported |
| `onDraggableMarkerDragStart` | Pointer down — `{ marker, index, date }` |
| `onDraggableMarkerDrag` | Pointer move — `{ marker, index, date, previousDate, deltaMs }` |
| `onDraggableMarkerDragEnd` | Pointer up — `{ marker, index, date, previousDate, snapPoint?, snapPointIndex? }` |
| `onDraggableMarkerDragToSnapPoint` | Snapped to a custom point — `{ marker, snapPoint, snapPointIndex, date, previousDate, phase }` |

During drag, marker position updates **imperatively** in the layer (no full chart re-render). Update your `draggableMarkers` state from the callbacks to keep the marker controlled after release.

::: tip Performance — optional callbacks
Drag handlers are **opt-in**. Omit any callback you do not need — it will not be invoked, and related work is skipped:

| Omitted callback | Skipped work |
|------------------|--------------|
| All drag callbacks | No hit targets, no document listeners, no snap-point resolution — markers render as static lines only |
| `onDraggableMarkerDrag` | No per-pointermove callback or payload allocation |
| `onDraggableMarkerDragToSnapPoint` | No snap-point change tracking during drag |
| `draggableMarkerSnapPoints` without drag callbacks | Snap points are not resolved at all |

Register only `onDraggableMarkerDragEnd` (or `onDraggableMarkerDragToSnapPoint`) if you only care about the final snap target.
:::

::: tip Performance
Avoid heavy work in `onDraggableMarkerDrag`. Prefer lightweight state updates during `phase: 'drag'`; defer expensive revision diffs to `phase: 'end'` or `onDraggableMarkerDragEnd`.
:::

[Guide: Events](/guide/events) · [← Examples](/examples/)
