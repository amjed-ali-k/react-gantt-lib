import { useState } from 'react';
import { GanttChart } from '@src/GanttChart';
import { DemoFrame } from './DemoFrame';
import { useVpTheme } from './useVpTheme';

const INITIAL_TASKS = [
  { id: '1', name: 'Design', start: '2026-01-01', end: '2026-01-15', progress: 65 },
  { id: '2', name: 'Build', start: '2026-01-10', end: '2026-02-01', progress: 20, dependencies: ['1'] },
  { id: '3', name: 'Launch', start: '2026-02-05', end: '2026-02-05', type: 'milestone' as const, progress: 0 },
];

export default function QuickStartDemo({ height = 320 }: { height?: number }) {
  const theme = useVpTheme();
  const [tasks, setTasks] = useState(INITIAL_TASKS);

  return (
    <DemoFrame caption="Drag bars, resize edges on hover, and zoom with the toolbar.">
      <GanttChart
        tasks={tasks}
        height={height}
        theme={theme}
        zoomLevel="week"
        minDate="2025-12-29"
        maxDate="2026-02-15"
        onTasksChange={setTasks}
      />
    </DemoFrame>
  );
}
