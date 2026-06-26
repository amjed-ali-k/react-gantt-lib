import { useState } from 'react';
import { GanttChart } from '../src/GanttChart';
import type { GanttColumn, GanttTask, GanttTheme } from '../src/types';
import { DemoSectionShell } from './DemoSectionShell';
import { exampleSources } from './exampleSources';

export const GROUP_COMPLETED_MIN_DATE = '2026-03-01';
export const GROUP_COMPLETED_MAX_DATE = '2026-03-31';

const GROUP_COLOR = '#6366f1';

/** One expanded group with 5 child tasks — two are 100% complete. */
export const GROUP_COMPLETED_TASKS: GanttTask[] = [
  {
    id: 'g-sprint',
    name: 'Sprint 1',
    type: 'group',
    start: '2026-03-01',
    end: '2026-03-01',
    color: GROUP_COLOR,
  },
  {
    id: 't-done-a',
    name: 'Done task A',
    parentId: 'g-sprint',
    start: '2026-03-03',
    end: '2026-03-05',
    progress: 100,
    color: GROUP_COLOR,
  },
  {
    id: 't-done-b',
    name: 'Done task B',
    parentId: 'g-sprint',
    start: '2026-03-06',
    end: '2026-03-08',
    progress: 100,
    color: GROUP_COLOR,
  },
  {
    id: 't-active',
    name: 'In progress',
    parentId: 'g-sprint',
    start: '2026-03-09',
    end: '2026-03-12',
    progress: 45,
    color: GROUP_COLOR,
  },
  {
    id: 't-pending-a',
    name: 'Not started A',
    parentId: 'g-sprint',
    start: '2026-03-13',
    end: '2026-03-15',
    progress: 0,
    color: GROUP_COLOR,
  },
  {
    id: 't-pending-b',
    name: 'Not started B',
    parentId: 'g-sprint',
    start: '2026-03-16',
    end: '2026-03-18',
    progress: 0,
    color: GROUP_COLOR,
  },
];

const MIDDLE_COLUMNS: GanttColumn[] = [
  { key: 'start', title: 'Start', flex: 1, minWidth: 90 },
  { key: 'end', title: 'End', flex: 1, minWidth: 90 },
  {
    key: 'progress',
    title: '%',
    width: 44,
    minWidth: 44,
    render: ({ task }) => `${task.progress ?? 0}%`,
  },
];

interface GroupCompletedDemoProps {
  onLog: (event: string, detail: string) => void;
  theme: GanttTheme;
}

export function GroupCompletedDemo({ onLog, theme }: GroupCompletedDemoProps) {
  const [tasks, setTasks] = useState(GROUP_COMPLETED_TASKS);

  return (
    <DemoSectionShell
      title="Group with completed tasks"
      subtitle={
        <>
          One expanded group with 5 child tasks — <strong>Done task A</strong> and{' '}
          <strong>Done task B</strong> are at <code>progress: 100</code>. Each child row should
          show a fully filled bar on the timeline and <code>100%</code> in the sidebar. Progress
          uses a <code>0–100</code> scale (not <code>0–1</code>).
        </>
      }
      badge="group + progress"
      badgeClassName="demo-badge--group"
      sourceCode={exampleSources.groupCompleted.code}
      sourceFilename={exampleSources.groupCompleted.filename}
    >
      <div className="demo-stats demo-stats--advanced">
        <div className="demo-stat">
          <strong>5 children</strong>
          Two at 100%, one in progress, two not started
        </div>
        <div className="demo-stat">
          <strong>Summary bar</strong>
          Group row rolls up dates and duration-weighted progress
        </div>
        <div className="demo-stat">
          <strong>Check</strong>
          Completed bars should be fully filled — not empty or missing
        </div>
      </div>

      <div className="demo-chart-wrap">
        <GanttChart
          tasks={tasks}
          height={360}
          theme={theme}
          zoomLevel="week"
          minDate={GROUP_COMPLETED_MIN_DATE}
          maxDate={GROUP_COMPLETED_MAX_DATE}
          middleColumns={MIDDLE_COLUMNS}
          snapToGrid
          onTasksChange={setTasks}
          onTaskDragEnd={(e) =>
            onLog('taskDragEnd', `${e.task.name} → ${e.start.toLocaleDateString()}`)
          }
          onProgressChange={(e) => onLog('progressChange', `${e.task.name}: ${e.progress}%`)}
        />
      </div>
    </DemoSectionShell>
  );
}
