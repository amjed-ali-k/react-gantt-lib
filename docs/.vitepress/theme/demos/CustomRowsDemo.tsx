import { useState } from 'react';
import { GanttChart } from '@src/GanttChart';
import type { GanttTask } from '@src/types';
import { DAILY_COLOR_STRIP_ROW } from '@demo/dailyColorStripRow';
import { DemoFrame } from './DemoFrame';
import { useVpTheme } from './useVpTheme';

const TASKS: GanttTask[] = [
  { id: 'a', name: 'Sprint planning', start: '2026-01-06', end: '2026-01-08', progress: 100 },
  { id: 'b', name: 'Implementation', start: '2026-01-09', end: '2026-01-20', progress: 55 },
  { id: 'c', name: 'Review', start: '2026-01-21', end: '2026-01-24', progress: 10, dependencies: ['b'] },
];

export default function CustomRowsDemo({ height = 400 }: { height?: number }) {
  const theme = useVpTheme();
  const [tasks, setTasks] = useState(TASKS);

  return (
    <DemoFrame caption="Footer row uses useGanttTimeline() — scrolls and zooms with the chart.">
      <GanttChart
        tasks={tasks}
        height={height}
        theme={theme}
        zoomLevel="week"
        minDate="2025-12-29"
        maxDate="2026-02-01"
        snapToGrid
        customRows={[DAILY_COLOR_STRIP_ROW]}
        onTasksChange={setTasks}
      />
    </DemoFrame>
  );
}
