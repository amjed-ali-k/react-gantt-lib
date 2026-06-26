import { useMemo, useState } from 'react';
import { GanttChart } from '@src/GanttChart';
import {
  CALCULATED_COLUMN_ROW,
  GRADIENT_BAND_ROW,
  LARGE_TIMELINE_MAX_DATE,
  LARGE_TIMELINE_MIN_DATE,
  LARGE_TIMELINE_TASKS,
} from '@demo/largeTimelineDemo';
import { DemoFrame } from './DemoFrame';
import { useVpTheme } from './useVpTheme';

export default function LargeTimelineDemo({ height = 640 }: { height?: number }) {
  const theme = useVpTheme();
  const [tasks, setTasks] = useState(LARGE_TIMELINE_TASKS);
  const customRows = useMemo(() => [GRADIENT_BAND_ROW, CALCULATED_COLUMN_ROW], []);

  return (
    <DemoFrame caption="50 workstreams over four years with column virtualization and gradient footer bands.">
      <GanttChart
        tasks={tasks}
        height={height}
        theme={theme}
        zoomLevel="week"
        minDate={LARGE_TIMELINE_MIN_DATE}
        maxDate={LARGE_TIMELINE_MAX_DATE}
        snapToGrid
        customRows={customRows}
        columnScrollBufferPercent={10}
        onTasksChange={setTasks}
      />
    </DemoFrame>
  );
}
