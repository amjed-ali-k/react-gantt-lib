---
title: Getting Started
description: Install react-gantt-lib, import styles, and render your first interactive Gantt chart in React.
---

# Getting Started

**React-Gantt-Lib** is a high-performance React Gantt chart with granular bar updates, three draggable sidebar panels, sticky rows, custom timeline bands, and display-timezone support. All date math uses **date-fns**.

## Install

```bash
npm install react-gantt-lib date-fns react react-dom
```

**Peer dependencies:** React ≥ 18, React DOM ≥ 18. **Node** ≥ 18.

Import the component and styles separately:

```tsx
import { GanttChart } from 'react-gantt-lib';
import 'react-gantt-lib/styles.css';
```

Dates accept ISO strings (`'2026-01-01'`, `'2026-04-22T14:00:00'`) or `Date` objects.

## Quick start

```tsx
import { useState } from 'react';
import { GanttChart } from 'react-gantt-lib';
import 'react-gantt-lib/styles.css';

const initialTasks = [
  { id: '1', name: 'Design', start: '2026-01-01', end: '2026-01-15', progress: 65 },
  { id: '2', name: 'Build', start: '2026-01-10', end: '2026-02-01', progress: 20 },
];

export function App() {
  const [tasks, setTasks] = useState(initialTasks);

  return (
    <GanttChart
      tasks={tasks}
      height={500}
      zoomLevel="week"
      onTasksChange={setTasks}
      onTaskDragEnd={(e) => console.log('moved', e.task.id, e.start, e.end)}
    />
  );
}
```

## Live example

<GanttDemo name="quick-start" :height="360" />

::: tip Controlled tasks
Always wire `tasks` + `onTasksChange` so drag, resize, and progress edits persist in your app state.
:::

## Next steps

- [Tasks & Hierarchy](/guide/tasks) — task fields, groups, collapse
- [Layout & Panels](/guide/layout) — three-panel layout and sizing
- [Examples](/examples/) — feature-specific live demos
- [Playground](/playground/) — tweak every major prop interactively
