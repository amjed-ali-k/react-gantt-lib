import { useState } from 'react';
import { GanttChart } from '@src/GanttChart';
import type { GanttTask } from '@src/types';
import { DemoFrame } from './DemoFrame';
import { useVpTheme } from './useVpTheme';

const TASKS: GanttTask[] = [
  { id: 'phase-1', name: 'Discovery', start: '2026-01-06', end: '2026-01-17', progress: 100 },
  { id: 'task-1', name: 'User research', start: '2026-01-06', end: '2026-01-10', progress: 100, parentId: 'phase-1' },
  { id: 'task-2', name: 'Wireframes', start: '2026-01-11', end: '2026-01-17', progress: 80, parentId: 'phase-1', dependencies: ['task-1'] },
  { id: 'phase-2', name: 'Build', start: '2026-01-20', end: '2026-02-14', progress: 45 },
  { id: 'task-3', name: 'Frontend', start: '2026-01-20', end: '2026-02-07', progress: 55, parentId: 'phase-2', dependencies: ['task-2'] },
  { id: 'task-4', name: 'Backend API', start: '2026-01-22', end: '2026-02-10', progress: 40, parentId: 'phase-2', dependencies: ['task-2'] },
];

export default function GridSnapDemo({ height = 380 }: { height?: number }) {
  const theme = useVpTheme();
  const [tasks, setTasks] = useState(TASKS);

  return (
    <DemoFrame caption="Dates snap to week boundaries when you release a drag (snapToGrid default).">
      <GanttChart
        tasks={tasks}
        height={height}
        theme={theme}
        zoomLevel="week"
        minDate="2025-12-29"
        maxDate="2026-02-22"
        snapToGrid
        onTasksChange={setTasks}
      />
    </DemoFrame>
  );
}
