import { memo } from 'react';
import type { CustomRowDefinition, GanttTask } from '../src/types';
import { useGanttTimeline } from '../src/context/GanttChartContext';

export const STICKY_DEMO_MIN_DATE = '2026-01-01';
export const STICKY_DEMO_MAX_DATE = '2026-12-31';

/** Baseline summary bar pinned to the top while scrolling through workstreams. */
export const STICKY_TOP_TASK: GanttTask = {
  id: 'sticky-baseline',
  name: '📌 Project baseline (sticky top)',
  start: STICKY_DEMO_MIN_DATE,
  end: STICKY_DEMO_MAX_DATE,
  progress: 42,
  color: '#6366f1',
  borderColor: '#4f46e5',
  sticky: 'top',
  readOnly: true,
};

function buildStickyDemoTasks(): GanttTask[] {
  const tasks: GanttTask[] = [STICKY_TOP_TASK];
  const streams = [
    'Platform',
    'Mobile',
    'Data',
    'Security',
    'Design',
    'QA',
    'DevOps',
    'Support',
  ];

  for (let i = 0; i < 32; i++) {
    const stream = streams[i % streams.length]!;
    const month = (i % 12) + 1;
    const startDay = 1 + (i % 20);
    const endDay = Math.min(28, startDay + 5 + (i % 10));
    const pad = (n: number) => String(n).padStart(2, '0');
    tasks.push({
      id: `sticky-task-${i + 1}`,
      name: `${stream} — work package ${i + 1}`,
      start: `2026-${pad(month)}-${pad(startDay)}`,
      end: `2026-${pad(month)}-${pad(endDay)}`,
      progress: (i * 17) % 100,
      color: `hsl(${(i * 37) % 360} 60% 55%)`,
    });
  }

  return tasks;
}

export const STICKY_DEMO_TASKS = buildStickyDemoTasks();

const StickyFooterLegend = memo(function StickyFooterLegend() {
  const { timelineWidth } = useGanttTimeline();
  return (
    <div
      className="sticky-demo-footer-legend"
      style={{ width: timelineWidth }}
      aria-hidden
    >
      <span>Sticky footer row — scroll the chart; this band stays pinned to the bottom</span>
    </div>
  );
});

const StickyFooterTotals = memo(function StickyFooterTotals() {
  const { timelineWidth, visibleColumns, columnWidth } = useGanttTimeline();
  const visibleCount = Math.max(0, visibleColumns.endIndex - visibleColumns.startIndex + 1);
  return (
    <div className="sticky-demo-footer-totals" style={{ width: timelineWidth }}>
      <span>
        Visible columns: {visibleCount} × {columnWidth}px
      </span>
      <span className="sticky-demo-footer-totals__hint">Also sticky bottom</span>
    </div>
  );
});

export const STICKY_BOTTOM_ROW_LEGEND: CustomRowDefinition = {
  id: 'sticky-footer-legend',
  height: 32,
  sticky: 'bottom',
  cells: {
    name: () => 'Sticky footer — legend',
    start: () => '—',
    end: () => '—',
    __timeline__: () => <StickyFooterLegend />,
  },
};

export const STICKY_BOTTOM_ROW_TOTALS: CustomRowDefinition = {
  id: 'sticky-footer-totals',
  height: 28,
  sticky: 'bottom',
  cells: {
    name: () => 'Sticky footer — viewport stats',
    start: () => '—',
    end: () => '—',
    __timeline__: () => <StickyFooterTotals />,
  },
};

export const STICKY_DEMO_CUSTOM_ROWS: CustomRowDefinition[] = [
  STICKY_BOTTOM_ROW_LEGEND,
  STICKY_BOTTOM_ROW_TOTALS,
];
