import { useState } from 'react';
import { GanttChart } from '@src/GanttChart';
import {
  STICKY_DEMO_CUSTOM_ROWS,
  STICKY_DEMO_MAX_DATE,
  STICKY_DEMO_MIN_DATE,
  STICKY_DEMO_TASKS,
} from '@demo/stickyRowsDemo';
import { DemoFrame } from './DemoFrame';
import { useVpTheme } from './useVpTheme';

export default function StickyRowsDemo({ height = 520 }: { height?: number }) {
  const theme = useVpTheme();
  const [tasks, setTasks] = useState(STICKY_DEMO_TASKS);

  return (
    <DemoFrame caption="Scroll to see the indigo baseline stay pinned at the top and footer rows at the bottom.">
      <GanttChart
        tasks={tasks}
        height={height}
        theme={theme}
        zoomLevel="month"
        minDate={STICKY_DEMO_MIN_DATE}
        maxDate={STICKY_DEMO_MAX_DATE}
        snapToGrid
        customRows={STICKY_DEMO_CUSTOM_ROWS}
        onTasksChange={setTasks}
      />
    </DemoFrame>
  );
}
