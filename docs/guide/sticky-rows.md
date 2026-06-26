---
title: Sticky Rows
description: Pin task rows and custom rows to the top or bottom viewport in react-gantt-lib.
---

# Sticky Rows

Pin rows to the top or bottom of the scroll viewport. Works for **task rows** and **custom rows**.

| `sticky` | Behavior |
|----------|----------|
| `'top'` | Pinned below the 52px header |
| `'bottom'` | Pinned to viewport bottom |
| (omit) | Scrolls with main content |

Set on `GanttTask.sticky` or `CustomRowDefinition.sticky`. Multiple sticky rows on the same edge stack with computed offsets.

## Row display order

1. Sticky top tasks
2. Sticky top custom rows
3. Scrollable tasks
4. Inline custom rows
5. Sticky bottom custom rows
6. Sticky bottom tasks

```tsx
const tasks = [
  {
    id: 'baseline',
    name: 'Project baseline',
    start: '2026-01-01',
    end: '2026-12-31',
    sticky: 'top',
    color: '#6366f1',
    readOnly: true,
  },
  // …many scrollable tasks…
];

const customRows = [
  { id: 'legend', sticky: 'bottom', height: 32, cells: { name: () => 'Legend', __timeline__: () => <FooterLegend /> } },
];

<GanttChart tasks={tasks} customRows={customRows} height={520} />
```

CSS token: `--rg-sticky-row-bg` (opaque background so scrolled content does not show through).

<GanttDemo name="sticky-rows" :height="520" />

See [Sticky Rows example](/examples/sticky-rows).
