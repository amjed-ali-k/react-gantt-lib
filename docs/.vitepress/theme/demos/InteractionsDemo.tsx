import { useState } from 'react';
import { GanttChart } from '@src/GanttChart';
import type { GanttTask } from '@src/types';
import { DemoFrame } from './DemoFrame';
import { useVpTheme } from './useVpTheme';

const SMOOTH_TASKS: GanttTask[] = [
  { id: 's1', name: 'Smooth drag', start: '2026-03-02T09:00:00', end: '2026-03-06T17:30:00', progress: 35, color: '#8b5cf6' },
  { id: 's2', name: 'Sub-hour precision', start: '2026-03-08T10:00:00', end: '2026-03-12T15:00:00', progress: 60, color: '#06b6d4', dependencies: ['s1'] },
];

export default function InteractionsDemo({ height = 280 }: { height?: number }) {
  const theme = useVpTheme();
  const [tasks, setTasks] = useState(SMOOTH_TASKS);

  return (
    <DemoFrame caption="snapToGrid={false} — bars follow the cursor with sub-day precision.">
      <GanttChart
        tasks={tasks}
        height={height}
        theme={theme}
        zoomLevel="day"
        minDate="2026-03-01"
        maxDate="2026-03-20"
        snapToGrid={false}
        onTasksChange={setTasks}
      />
    </DemoFrame>
  );
}
