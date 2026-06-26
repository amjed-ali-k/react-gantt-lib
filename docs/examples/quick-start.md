---
title: Quick Start Example
description: Minimal react-gantt-lib example with drag, resize, and zoom.
---

# Quick Start

<GanttDemo name="quick-start" :height="360" />

```tsx
import { useState } from 'react';
import { GanttChart } from 'react-gantt-lib';
import 'react-gantt-lib/styles.css';

export function MyGantt() {
  const [tasks, setTasks] = useState([
    { id: '1', name: 'Design', start: '2026-01-01', end: '2026-01-15', progress: 65 },
    { id: '2', name: 'Build', start: '2026-01-10', end: '2026-02-01', progress: 20 },
  ]);

  return (
    <GanttChart
      tasks={tasks}
      height={500}
      zoomLevel="week"
      onTasksChange={setTasks}
    />
  );
}
```

[← All examples](/examples/) · [Getting Started guide](/guide/getting-started)
