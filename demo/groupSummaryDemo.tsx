import { useState } from 'react';
import { GanttChart } from '../src/GanttChart';
import type { GanttColumn, GanttTask, GanttTheme } from '../src/types';
import { DemoSectionShell } from './DemoSectionShell';
import { exampleSources } from './exampleSources';

export const GROUP_SUMMARY_MIN_DATE = '2026-06-01';
export const GROUP_SUMMARY_MAX_DATE = '2026-08-15';

const GROUP_COLORS = {
  foundation: '#6366f1',
  structure: '#0ea5e9',
  mep: '#10b981',
  envelope: '#f59e0b',
  finish: '#ec4899',
} as const;

/** 20 leaf tasks in 5 summary groups (4 each), with cross-group dependencies and baselines. */
export const GROUP_SUMMARY_TASKS: GanttTask[] = [
  {
    id: 'g-foundation',
    name: 'Foundation',
    type: 'group',
    start: '2026-06-01',
    end: '2026-06-01',
    color: GROUP_COLORS.foundation,
  },
  {
    id: 't01',
    name: 'Site survey',
    parentId: 'g-foundation',
    start: '2026-06-02',
    end: '2026-06-04',
    progress: 100,
    color: GROUP_COLORS.foundation,
    baseline: { start: '2026-06-01', end: '2026-06-03' },
  },
  {
    id: 't02',
    name: 'Excavation',
    parentId: 'g-foundation',
    start: '2026-06-05',
    end: '2026-06-09',
    progress: 85,
    dependencies: ['t01'],
    color: GROUP_COLORS.foundation,
    baseline: { start: '2026-06-04', end: '2026-06-08' },
  },
  {
    id: 't03',
    name: 'Pour footings',
    parentId: 'g-foundation',
    start: '2026-06-10',
    end: '2026-06-14',
    progress: 55,
    dependencies: ['t02'],
    color: GROUP_COLORS.foundation,
  },
  {
    id: 't04',
    name: 'Curing',
    parentId: 'g-foundation',
    start: '2026-06-15',
    end: '2026-06-18',
    progress: 25,
    dependencies: ['t03'],
    color: GROUP_COLORS.foundation,
  },

  {
    id: 'g-structure',
    name: 'Structure',
    type: 'group',
    start: '2026-06-17',
    end: '2026-06-17',
    color: GROUP_COLORS.structure,
  },
  {
    id: 't05',
    name: 'Steel frame',
    parentId: 'g-structure',
    start: '2026-06-17',
    end: '2026-06-22',
    progress: 40,
    dependencies: ['t04'],
    color: GROUP_COLORS.structure,
    baseline: { start: '2026-06-16', end: '2026-06-21' },
  },
  {
    id: 't06',
    name: 'Floor decking',
    parentId: 'g-structure',
    start: '2026-06-20',
    end: '2026-06-25',
    progress: 30,
    dependencies: ['t05'],
    color: GROUP_COLORS.structure,
  },
  {
    id: 't07',
    name: 'Core walls',
    parentId: 'g-structure',
    start: '2026-06-23',
    end: '2026-06-28',
    progress: 15,
    dependencies: ['t05'],
    color: GROUP_COLORS.structure,
  },
  {
    id: 't08',
    name: 'Structural sign-off',
    parentId: 'g-structure',
    start: '2026-06-29',
    end: '2026-06-29',
    type: 'milestone',
    progress: 0,
    dependencies: ['t06', 't07'],
    color: GROUP_COLORS.structure,
  },

  {
    id: 'g-mep',
    name: 'MEP rough-in',
    type: 'group',
    start: '2026-07-01',
    end: '2026-07-01',
    progress: 12,
    color: GROUP_COLORS.mep,
  },
  {
    id: 't09',
    name: 'Electrical',
    parentId: 'g-mep',
    start: '2026-07-01',
    end: '2026-07-06',
    progress: 20,
    dependencies: ['t05'],
    color: GROUP_COLORS.mep,
    baseline: { start: '2026-06-30', end: '2026-07-05' },
  },
  {
    id: 't10',
    name: 'Plumbing',
    parentId: 'g-mep',
    start: '2026-07-03',
    end: '2026-07-08',
    progress: 10,
    color: GROUP_COLORS.mep,
  },
  {
    id: 't11',
    name: 'HVAC',
    parentId: 'g-mep',
    start: '2026-07-06',
    end: '2026-07-12',
    progress: 5,
    dependencies: ['t10'],
    color: GROUP_COLORS.mep,
  },
  {
    id: 't12',
    name: 'MEP coordination',
    parentId: 'g-mep',
    start: '2026-07-13',
    end: '2026-07-15',
    progress: 0,
    dependencies: ['t09', 't11'],
    color: GROUP_COLORS.mep,
  },

  {
    id: 'g-envelope',
    name: 'Building envelope',
    type: 'group',
    start: '2026-07-10',
    end: '2026-07-10',
    collapsed: true,
    color: GROUP_COLORS.envelope,
  },
  {
    id: 't13',
    name: 'Cladding',
    parentId: 'g-envelope',
    start: '2026-07-10',
    end: '2026-07-15',
    progress: 0,
    color: GROUP_COLORS.envelope,
    baseline: { start: '2026-07-09', end: '2026-07-14' },
  },
  {
    id: 't14',
    name: 'Glazing',
    parentId: 'g-envelope',
    start: '2026-07-14',
    end: '2026-07-19',
    progress: 0,
    dependencies: ['t13'],
    color: GROUP_COLORS.envelope,
  },
  {
    id: 't15',
    name: 'Roofing',
    parentId: 'g-envelope',
    start: '2026-07-16',
    end: '2026-07-21',
    progress: 0,
    color: GROUP_COLORS.envelope,
  },
  {
    id: 't16',
    name: 'Waterproofing',
    parentId: 'g-envelope',
    start: '2026-07-20',
    end: '2026-07-23',
    progress: 0,
    dependencies: ['t15'],
    color: GROUP_COLORS.envelope,
    baseline: { start: '2026-07-19', end: '2026-07-22' },
  },

  {
    id: 'g-finish',
    name: 'Finishes',
    type: 'group',
    start: '2026-07-22',
    end: '2026-07-22',
    color: GROUP_COLORS.finish,
  },
  {
    id: 't17',
    name: 'Interior fit-out',
    parentId: 'g-finish',
    start: '2026-07-22',
    end: '2026-07-28',
    progress: 0,
    dependencies: ['t12'],
    color: GROUP_COLORS.finish,
  },
  {
    id: 't18',
    name: 'Flooring',
    parentId: 'g-finish',
    start: '2026-07-26',
    end: '2026-07-31',
    progress: 0,
    dependencies: ['t17'],
    color: GROUP_COLORS.finish,
  },
  {
    id: 't19',
    name: 'Paint & fixtures',
    parentId: 'g-finish',
    start: '2026-08-01',
    end: '2026-08-05',
    progress: 0,
    dependencies: ['t18'],
    color: GROUP_COLORS.finish,
  },
  {
    id: 't20',
    name: 'Handover',
    parentId: 'g-finish',
    start: '2026-08-08',
    end: '2026-08-08',
    type: 'milestone',
    progress: 0,
    dependencies: ['t16', 't19'],
    color: GROUP_COLORS.finish,
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

interface GroupSummaryDemoProps {
  onLog: (event: string, detail: string) => void;
  theme: GanttTheme;
}

export function GroupSummaryDemo({ onLog, theme }: GroupSummaryDemoProps) {
  const [tasks, setTasks] = useState(GROUP_SUMMARY_TASKS);

  return (
    <DemoSectionShell
      title="Group summary bars"
      subtitle={
        <>
          20 tasks in 5 groups of 4 — each group has a summary bar plus child task bars when
          expanded. Roll-up covers dates, duration-weighted progress, and baselines.{' '}
          &quot;MEP rough-in&quot; uses an explicit <code>progress</code> override;{' '}
          &quot;Building envelope&quot; starts collapsed. Dependencies chain across groups.
        </>
      }
      badge="group rollup"
      badgeClassName="demo-badge--group"
      sourceCode={exampleSources.groupSummary.code}
      sourceFilename={exampleSources.groupSummary.filename}
    >
      <div className="demo-stats demo-stats--advanced">
        <div className="demo-stat">
          <strong>5 groups × 4 tasks</strong>
          Group summary bar plus child bars on each row
        </div>
        <div className="demo-stat">
          <strong>Roll-up</strong>
          Dates, progress, and baseline from descendants
        </div>
        <div className="demo-stat">
          <strong>Override</strong>
          MEP group shows <code>progress: 12</code> instead of child average
        </div>
        <div className="demo-stat">
          <strong>Collapsed</strong>
          Expand &quot;Building envelope&quot; to reveal its 4 child rows
        </div>
      </div>

      <div className="demo-chart-wrap">
        <GanttChart
          tasks={tasks}
          height={480}
          theme={theme}
          zoomLevel="week"
          minDate={GROUP_SUMMARY_MIN_DATE}
          maxDate={GROUP_SUMMARY_MAX_DATE}
          middleColumns={MIDDLE_COLUMNS}
          showBaseline
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
