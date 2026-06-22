import { useCallback, useState } from 'react';
import { GanttChart } from '../src/GanttChart';
import type { BlockDateRange, GanttEventMap, GanttTask } from '../src/types';

export const ADVANCED_FEATURES_TASKS: GanttTask[] = [
  {
    id: 'pour-phase',
    name: 'Pour phase',
    type: 'group',
    showSummaryBar: false,
    start: '2026-04-01',
    end: '2026-04-01',
  },
  {
    id: 'pour-a',
    name: 'Pour slab A',
    parentId: 'pour-phase',
    start: '2026-04-02',
    end: '2026-04-06',
    progress: 100,
    readOnly: true,
    color: '#22c55e',
  },
  {
    id: 'pour-b',
    name: 'Pour slab B',
    parentId: 'pour-phase',
    start: '2026-04-08',
    end: '2026-04-12',
    progress: 40,
    color: '#3b82f6',
  },
  {
    id: 'envelope',
    name: 'Building envelope',
    type: 'group',
    start: '2026-04-16',
    end: '2026-04-16',
    color: '#6366f1',
  },
  {
    id: 'envelope-roof',
    name: 'Roofing',
    parentId: 'envelope',
    start: '2026-04-16',
    end: '2026-04-17',
    progress: 30,
    color: '#818cf8',
  },
  {
    id: 'envelope-seal',
    name: 'Waterproofing',
    parentId: 'envelope',
    start: '2026-04-17',
    end: '2026-04-18',
    progress: 10,
    color: '#818cf8',
  },
  {
    id: 'staging',
    name: 'Staging folder',
    type: 'group',
    showSummaryBar: false,
    start: '2026-04-01',
    end: '2026-04-01',
  },
  {
    id: 'staging-work',
    name: 'Material prep',
    parentId: 'staging',
    start: '2026-04-03',
    end: '2026-04-05',
    progress: 25,
    color: '#f59e0b',
  },
  {
    id: 'inspection',
    name: 'Final inspection',
    start: '2026-04-14',
    end: '2026-04-15',
    progress: 0,
    color: '#8b5cf6',
  },
];

export const ADVANCED_BLOCK_DATES: BlockDateRange[] = [
  {
    start: '2026-04-07',
    end: '2026-04-07',
    label: 'Concrete curing — no pours',
  },
  {
    start: '2026-04-10',
    end: '2026-04-11',
    label: 'Site safety drill',
  },
];

interface AdvancedFeaturesDemoProps {
  onLog: (event: string, detail: string) => void;
}

export function AdvancedFeaturesDemo({ onLog }: AdvancedFeaturesDemoProps) {
  const [tasks, setTasks] = useState(ADVANCED_FEATURES_TASKS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [blockHoverLabel, setBlockHoverLabel] = useState<string | null>(null);

  const selectedNames = selectedIds
    .map((id) => tasks.find((t) => t.id === id)?.name)
    .filter(Boolean)
    .join(', ');

  const handleGanttHover = useCallback(
    (detail: GanttEventMap['ganttHover']) => {
      if (detail.target?.type === 'blockDate') {
        const label = detail.target.range.label ?? 'Blocked period';
        if (detail.phase === 'leave') {
          setBlockHoverLabel(null);
          onLog('ganttHover', 'leave blockDate');
        } else {
          setBlockHoverLabel(label);
          if (detail.phase === 'enter') {
            onLog('ganttHover', label);
          }
        }
      }
    },
    [onLog],
  );

  return (
    <section className="demo-section">
      <div className="demo-section-header">
        <div>
          <h2>Advanced interactions</h2>
          <p>
            Multi-select with Ctrl/⌘+click, group summary rows, per-task read-only, blocked-date
            hover tooltips, and <code>data-task-id</code> on sidebar rows for testing.
          </p>
        </div>
        <span className="demo-badge demo-badge--smooth">no snap</span>
      </div>

      <div className="demo-stats demo-stats--advanced">
        <div className="demo-stat">
          <strong>Selected ({selectedIds.length})</strong>
          {selectedNames || 'Click tasks — Ctrl/⌘+click to multi-select'}
        </div>
        <div className="demo-stat">
          <strong>Block hover</strong>
          {blockHoverLabel ?? 'Hover rose blocked regions (gaps between bars)'}
        </div>
        <div className="demo-stat">
          <strong>Read-only</strong>
          &quot;Pour slab A&quot; cannot be dragged or resized
        </div>
        <div className="demo-stat">
          <strong>Groups</strong>
          Pour phase = sidebar folder; Building envelope = summary bar
        </div>
      </div>

      <div className="demo-chart-wrap">
        <GanttChart
          tasks={tasks}
          height={380}
          zoomLevel="week"
          minDate="2026-04-01"
          maxDate="2026-04-20"
          snapToGrid={false}
          blockDates={ADVANCED_BLOCK_DATES}
          selectedTaskIds={selectedIds}
          onTasksChange={setTasks}
          onSelectionChange={({ selectedIds: ids }) => setSelectedIds(ids)}
          onTaskClick={({ task, ctrlKey, metaKey }) => {
            const mods = [ctrlKey && 'ctrl', metaKey && 'meta'].filter(Boolean).join('+');
            onLog('taskClick', `${task.name}${mods ? ` (${mods})` : ''}`);
          }}
          onGanttHover={handleGanttHover}
          onGanttClick={({ target }) => {
            if (target.type === 'blockDate') {
              onLog('ganttClick', target.range.label ?? 'blockDate');
            }
          }}
          onTaskDragEnd={(e) =>
            onLog('taskDragEnd', `${e.task.name} → ${e.start.toLocaleDateString()}`)
          }
        />
      </div>
    </section>
  );
}
