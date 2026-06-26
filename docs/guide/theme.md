---
title: Theme & CSS
description: Light, dark, and auto themes plus CSS variables and DOM classes in react-gantt-lib.
---

# Theme & CSS

## Theme prop

| Prop | Default | Description |
|------|---------|-------------|
| `theme` | `'light'` | `'light'`, `'dark'`, or `'auto'` |

Applies class `rg-theme-{theme}` on `.rg-gantt`.

```tsx
<GanttChart tasks={tasks} theme="dark" />
<GanttChart tasks={tasks} theme="auto" />
```

Dark mode uses semantic CSS variables (`--rg-*`) — no pure black/white.

## Import styles

```tsx
import 'react-gantt-lib/styles.css';
```

Styles are **not** auto-imported. CSS variables control backgrounds, text, borders, bars, tooltips, selection, and sticky rows.

## Key classes

| Class | Purpose |
|-------|---------|
| `.rg-gantt`, `.rg-gantt-body`, `.rg-panels` | Root layout |
| `.rg-task-list`, `.rg-task-row`, `.rg-task-row--selected` | Sidebar rows |
| `.rg-timeline-scroll`, `.rg-timeline-header`, `.rg-timeline-body` | Timeline |
| `.rg-bar`, `.rg-bar--selected`, `.rg-bar-milestone` | Task bars |
| `.rg-baseline-layer`, `.rg-dependency-layer` | Overlays |
| `.rg-custom-rows-timeline` | Custom row bands |
| `.rg-row--sticky` | Sticky rows |
| `.rg-toolbar`, `.rg-divider` | Zoom toolbar and dividers |

## data-testid values

`gantt-chart`, `task-list-left`, `task-list-middle`, `timeline-header`, `timeline-body`, `zoom-toolbar`, `divider-left`, `divider-middle`, `dependency-layer`, `baseline-layer`, `sticky-task-timeline-top`, `sticky-task-timeline-bottom`, `custom-rows`.

<GanttDemo name="quick-start" :height="300" />

See [CSS & DOM reference](/api/types) for exported TypeScript types.
