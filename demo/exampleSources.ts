import advancedFeaturesDemo from './advancedFeaturesDemo.tsx?raw';
import dailyColorStripRow from './dailyColorStripRow.tsx?raw';
import groupCompletedDemo from './groupCompletedDemo.tsx?raw';
import groupSummaryDemo from './groupSummaryDemo.tsx?raw';
import largeTimelineDemo from './largeTimelineDemo.tsx?raw';
import stickyRowsDemo from './stickyRowsDemo.tsx?raw';
import timezoneDemo from './timezoneDemo.tsx?raw';

export const GRID_SNAP_SOURCE = `<GanttChart
  tasks={tasks}
  height={400}
  zoomLevel="week"
  minDate="2025-12-29"
  maxDate="2026-02-22"
  snapToGrid
  onTasksChange={setTasks}
  onTaskDragEnd={(e) => console.log('moved', e.task.name, e.start, e.end)}
  onTaskResizeEnd={(e) => console.log('resized', e.task.name, e.edge)}
  onProgressChange={(e) => console.log('progress', e.task.name, e.progress)}
/>`;

export const SMOOTH_DRAG_SOURCE = `<GanttChart
  tasks={tasks}
  height={280}
  zoomLevel="day"
  minDate="2026-03-01"
  maxDate="2026-03-20"
  snapToGrid={false}
  onTasksChange={setTasks}
  onTaskDragEnd={(e) => console.log('moved', e.task.name, e.start, e.end)}
/>`;

export const exampleSources = {
  groupCompleted: { code: groupCompletedDemo, filename: 'groupCompletedDemo.tsx' },
  groupSummary: { code: groupSummaryDemo, filename: 'groupSummaryDemo.tsx' },
  stickyRows: { code: stickyRowsDemo, filename: 'stickyRowsDemo.tsx' },
  gridSnap: { code: GRID_SNAP_SOURCE, filename: 'grid-snap example' },
  largeTimeline: { code: largeTimelineDemo, filename: 'largeTimelineDemo.tsx' },
  customRow: { code: dailyColorStripRow, filename: 'dailyColorStripRow.tsx' },
  smoothDrag: { code: SMOOTH_DRAG_SOURCE, filename: 'smooth-drag example' },
  timezone: { code: timezoneDemo, filename: 'timezoneDemo.tsx' },
  advancedFeatures: { code: advancedFeaturesDemo, filename: 'advancedFeaturesDemo.tsx' },
} as const;
