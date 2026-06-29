import { useCallback, useEffect, useMemo, useState } from 'react';
import { GanttChart } from '../src/GanttChart';
import type { CustomRowDefinition, GanttTask, GanttTheme, HolidayMarking, ViewScaleId } from '../src/types';
import { DAILY_COLOR_STRIP_ROW } from './dailyColorStripRow';
import {
  CALCULATED_COLUMN_ROW,
  GRADIENT_BAND_ROW,
  LARGE_TIMELINE_MAX_DATE,
  LARGE_TIMELINE_MIN_DATE,
  LARGE_TIMELINE_TASKS,
  LARGE_TIMELINE_US_HOLIDAYS,
} from './largeTimelineDemo';
import { useDemoTheme } from './chartTheme';
import { AdvancedFeaturesDemo } from './advancedFeaturesDemo';
import { DraggableMarkersDemo } from './draggableMarkersDemo';
import { GroupCompletedDemo } from './groupCompletedDemo';
import { GroupSummaryDemo } from './groupSummaryDemo';
import { TimezoneDemo } from './timezoneDemo';
import { PlaygroundApp } from './playground';
import {
  STICKY_DEMO_CUSTOM_ROWS,
  STICKY_DEMO_MAX_DATE,
  STICKY_DEMO_MIN_DATE,
  STICKY_DEMO_TASKS,
} from './stickyRowsDemo';
import { DemoThemeProvider } from './chartTheme';
import { DemoSectionShell } from './DemoSectionShell';
import { exampleSources } from './exampleSources';
import { ThemeToggle } from './ThemeToggle';
import './demo.css';
import './playground.css';
import './dailyColorStripRow.css';
import './largeTimelineDemo.css';
import './stickyRowsDemo.css';

const SNAPPED_TASKS: GanttTask[] = [
  { id: 'phase-1', name: 'Discovery', start: '2026-01-06', end: '2026-01-17', progress: 100 },
  {
    id: 'task-1',
    name: 'User research',
    start: '2026-01-06',
    end: '2026-01-10',
    progress: 100,
    parentId: 'phase-1',
    dependencies: ['task-0'],
  },
  { id: 'task-0', name: 'Kickoff', start: '2026-01-02', end: '2026-01-05', progress: 100 },
  {
    id: 'task-2',
    name: 'Wireframes',
    start: '2026-01-11',
    end: '2026-01-17',
    progress: 80,
    parentId: 'phase-1',
    dependencies: ['task-1'],
  },
  { id: 'phase-2', name: 'Build', start: '2026-01-20', end: '2026-02-14', progress: 45 },
  {
    id: 'task-3',
    name: 'Frontend',
    start: '2026-01-20',
    end: '2026-02-07',
    progress: 55,
    parentId: 'phase-2',
    dependencies: ['task-2'],
  },
  {
    id: 'task-4',
    name: 'Backend API',
    start: '2026-01-22',
    end: '2026-02-10',
    progress: 40,
    parentId: 'phase-2',
    dependencies: ['task-2'],
  },
  {
    id: 'task-5',
    name: 'QA & polish',
    start: '2026-02-08',
    end: '2026-02-14',
    progress: 10,
    parentId: 'phase-2',
    dependencies: ['task-3', 'task-4'],
  },
  {
    id: 'launch',
    name: 'Go live',
    start: '2026-02-15',
    end: '2026-02-15',
    type: 'milestone',
    progress: 0,
    dependencies: ['task-5'],
  },
];

const SMOOTH_TASKS: GanttTask[] = [
  {
    id: 'smooth-1',
    name: 'Smooth drag me',
    start: '2026-03-02T09:00:00',
    end: '2026-03-06T17:30:00',
    progress: 35,
    color: '#8b5cf6',
  },
  {
    id: 'smooth-2',
    name: 'Resize my edges',
    start: '2026-03-08T10:00:00',
    end: '2026-03-12T15:00:00',
    progress: 60,
    color: '#06b6d4',
    dependencies: ['smooth-1'],
  },
  {
    id: 'smooth-3',
    name: 'Sub-hour precision',
    start: '2026-03-14T13:15:00',
    end: '2026-03-14T18:45:00',
    progress: 20,
    color: '#f59e0b',
  },
];

type LogEntry = { id: number; event: string; detail: string };
type DemoTab = 'examples' | 'playground';

const DOCS_URL = 'https://amjed-ali-k.github.io/react-gantt-lib/';

let logId = 0;

function readTabFromLocation(): DemoTab {
  const hash = window.location.hash;
  if (hash === '#playground') return 'playground';
  if (window.location.pathname.endsWith('playground.html')) return 'playground';
  return 'examples';
}

function ChartSection({
  title,
  subtitle,
  badge,
  tasks,
  onTasksChange,
  zoomLevel,
  onZoomChange,
  snapToGrid,
  minDate,
  maxDate,
  onLog,
  height = 360,
  customRows,
  holidays,
  timezone,
  theme,
  badgeClassName,
  columnScrollBufferPercent,
  sourceCode,
  sourceFilename,
}: {
  title: string;
  subtitle: string;
  badge: string;
  tasks: GanttTask[];
  onTasksChange: (tasks: GanttTask[]) => void;
  zoomLevel: ViewScaleId | string;
  onZoomChange: (level: string) => void;
  snapToGrid: boolean;
  minDate: string;
  maxDate: string;
  onLog: (event: string, detail: string) => void;
  height?: number;
  customRows?: CustomRowDefinition[];
  holidays?: HolidayMarking;
  timezone?: string;
  theme: GanttTheme;
  badgeClassName?: string;
  columnScrollBufferPercent?: number;
  sourceCode?: string;
  sourceFilename?: string;
}) {
  return (
    <DemoSectionShell
      title={title}
      subtitle={subtitle}
      badge={badge}
      badgeClassName={badgeClassName ?? (snapToGrid ? 'demo-badge--snap' : 'demo-badge--smooth')}
      sourceCode={sourceCode}
      sourceFilename={sourceFilename}
    >
      <div className="demo-chart-wrap">
        <GanttChart
          tasks={tasks}
          height={height}
          theme={theme}
          zoomLevel={zoomLevel}
          minDate={minDate}
          maxDate={maxDate}
          snapToGrid={snapToGrid}
          customRows={customRows}
          holidays={holidays}
          timezone={timezone}
          onTasksChange={onTasksChange}
          onZoomChange={(e) => onZoomChange(e.zoomLevel)}
          columnScrollBufferPercent={columnScrollBufferPercent}
          onTaskDragEnd={(e) =>
            onLog('taskDragEnd', `${e.task.name} → ${e.start.toISOString()}`)
          }
          onTaskResizeEnd={(e) =>
            onLog('taskResizeEnd', `${e.task.name} (${e.edge})`)
          }
          onProgressChange={(e) => onLog('progressChange', `${e.task.name}: ${e.progress}%`)}
        />
      </div>
    </DemoSectionShell>
  );
}

function ExamplesDemo() {
  const { chartTheme } = useDemoTheme();
  const [snappedTasks, setSnappedTasks] = useState(SNAPPED_TASKS);
  const [smoothTasks, setSmoothTasks] = useState(SMOOTH_TASKS);
  const [largeTasks, setLargeTasks] = useState(LARGE_TIMELINE_TASKS);
  const [stickyTasks, setStickyTasks] = useState(STICKY_DEMO_TASKS);
  const [snappedZoom, setSnappedZoom] = useState<string>('week');
  const [smoothZoom, setSmoothZoom] = useState<string>('day');
  const [largeZoom, setLargeZoom] = useState<string>('week');
  const [stickyZoom, setStickyZoom] = useState<string>('month');
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const log = useCallback((event: string, detail: string) => {
    setLogs((prev) => [{ id: ++logId, event, detail }, ...prev].slice(0, 20));
  }, []);

  const largeCustomRows = useMemo(
    () => [GRADIENT_BAND_ROW, CALCULATED_COLUMN_ROW],
    [],
  );

  return (
    <>
      <header className="demo-header">
        <h2>Examples</h2>
        <p>
          Group summary bars, grid snapping, sticky rows, large timelines, and more. Hover a bar to
          reveal edge handles — drag the left/right grips to resize.
        </p>
      </header>

      <GroupCompletedDemo onLog={log} theme={chartTheme} />

      <GroupSummaryDemo onLog={log} theme={chartTheme} />

      <ChartSection
        title="Sticky rows — pinned top bar + bottom custom rows"
        subtitle="The indigo baseline bar stays pinned below the header while you scroll 32 work packages. Two custom footer rows stick to the bottom of the viewport."
        badge="sticky rows"
        badgeClassName="demo-badge--sticky"
        sourceCode={exampleSources.stickyRows.code}
        sourceFilename={exampleSources.stickyRows.filename}
        tasks={stickyTasks}
        onTasksChange={setStickyTasks}
        zoomLevel={stickyZoom}
        onZoomChange={setStickyZoom}
        minDate={STICKY_DEMO_MIN_DATE}
        maxDate={STICKY_DEMO_MAX_DATE}
        snapToGrid
        onLog={log}
        height={520}
        customRows={STICKY_DEMO_CUSTOM_ROWS}
        theme={chartTheme}
      />

      <ChartSection
        title="Grid snap (default)"
        subtitle="Fixed timeline Jan–Feb 2026. Drag tasks — the grid stays put; dates clamp at the edges."
        badge="snap on release"
        sourceCode={exampleSources.gridSnap.code}
        sourceFilename={exampleSources.gridSnap.filename}
        tasks={snappedTasks}
        onTasksChange={setSnappedTasks}
        zoomLevel={snappedZoom}
        onZoomChange={setSnappedZoom}
        minDate="2025-12-29"
        maxDate="2026-02-22"
        snapToGrid
        onLog={log}
        height={400}
        theme={chartTheme}
      />

      <ChartSection
        title="Large timeline — 50 rows + 32-band grid"
        subtitle="Four-year range, 50 workstreams, column virtualization. Footer rows use 32 interpolated bands with 1px gaps; per-column cache only computes newly scrolled columns."
        badge="virtualized columns"
        badgeClassName="demo-badge--perf"
        sourceCode={exampleSources.largeTimeline.code}
        sourceFilename={exampleSources.largeTimeline.filename}
        tasks={largeTasks}
        onTasksChange={setLargeTasks}
        zoomLevel={largeZoom}
        onZoomChange={setLargeZoom}
        minDate={LARGE_TIMELINE_MIN_DATE}
        maxDate={LARGE_TIMELINE_MAX_DATE}
        snapToGrid
        onLog={log}
        height={720}
        customRows={largeCustomRows}
        holidays={LARGE_TIMELINE_US_HOLIDAYS}
        timezone="America/New_York"
        columnScrollBufferPercent={10}
        theme={chartTheme}
      />

      <ChartSection
        title="Custom row + useGanttTimeline()"
        subtitle="Footer row renders inside the timeline scroll area. DailyColorStrip uses the useGanttTimeline() hook — it scrolls and zooms with the chart."
        badge="custom hook"
        sourceCode={exampleSources.customRow.code}
        sourceFilename={exampleSources.customRow.filename}
        tasks={snappedTasks}
        onTasksChange={setSnappedTasks}
        zoomLevel={snappedZoom}
        onZoomChange={setSnappedZoom}
        minDate="2025-12-29"
        maxDate="2026-02-22"
        snapToGrid
        onLog={log}
        height={440}
        customRows={[DAILY_COLOR_STRIP_ROW]}
        theme={chartTheme}
      />

      <ChartSection
        title="Smooth — no snapping"
        subtitle="Fixed Mar 2026 window. Smooth pixel drag with sub-day precision; timeline never grows."
        badge="no snap"
        sourceCode={exampleSources.smoothDrag.code}
        sourceFilename={exampleSources.smoothDrag.filename}
        tasks={smoothTasks}
        onTasksChange={setSmoothTasks}
        zoomLevel={smoothZoom}
        onZoomChange={setSmoothZoom}
        minDate="2026-03-01"
        maxDate="2026-03-20"
        snapToGrid={false}
        onLog={log}
        height={280}
        theme={chartTheme}
      />

      <TimezoneDemo onLog={log} theme={chartTheme} />

      <AdvancedFeaturesDemo onLog={log} theme={chartTheme} />

      <DraggableMarkersDemo onLog={log} theme={chartTheme} />

      <div className="demo-panels">
        <div className="demo-tips">
          <h3>Try it</h3>
          <ul>
            <li>
              <strong>Group completed:</strong> 5 tasks in one group — two at{' '}
              <code>progress: 100</code>; verify bars are fully filled (use 0–100, not 0–1)
            </li>
            <li>
              <strong>Group summary:</strong> 20 tasks in 5 groups — rolled-up dates, progress,
              baselines; collapse/expand with ▸/▾
            </li>
            <li>Sticky rows: baseline bar pinned top; two custom rows pinned bottom while scrolling</li>
            <li>Hover a bar — blue edge handles appear for resize</li>
            <li>Drag the bar body to move; drag edges to change start/end</li>
            <li>Bottom chart: no grid snap — bars follow the cursor smoothly</li>
            <li>Top chart: snaps to week boundaries when you release</li>
            <li>Large timeline: 50 rows, 32-band gradient footer with 1px column gaps</li>
            <li>Custom row example: daily color strip synced via <code>useGanttTimeline()</code></li>
            <li>
              <strong>Display timezone:</strong> pick a zone — headers, columns, and tooltips all
              match; drag callbacks still emit UTC instants
            </li>
            <li>
              <strong>Advanced interactions:</strong> Ctrl/⌘+click multi-select, group summary
              bars, read-only tasks, <code>onGanttHover</code> on blocked dates
            </li>
            <li>
              <strong>Draggable markers:</strong> scrub the indigo line — snaps to invisible revision dates via{' '}
              <code>draggableMarkerSnapPoints</code> and <code>onDraggableMarkerDragToSnapPoint</code>
            </li>
            <li>Sidebar rows expose <code>data-task-id</code> for E2E selectors</li>
            <li>Switch to the <strong>Playground</strong> tab for date range + zoom level controls</li>
            <li>Read the full <strong><a href={DOCS_URL} target="_blank" rel="noreferrer">documentation site</a></strong> — guides, API, and live examples</li>
            <li>Use the <strong>Code</strong> toggle on any example to view its source</li>
          </ul>
        </div>

        <div className="demo-log">
          <h3>Event log</h3>
          {logs.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Interact with a chart…</p>
          ) : (
            <ul>
              {logs.map((entry) => (
                <li key={entry.id}>
                  <span className="event-name">{entry.event}</span> — {entry.detail}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

export function App() {
  const [tab, setTab] = useState<DemoTab>(readTabFromLocation);

  useEffect(() => {
    const onHashChange = () => setTab(readTabFromLocation());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const selectTab = (next: DemoTab) => {
    setTab(next);
    const path = window.location.pathname.replace(/\/$/, '');
    const base = path.endsWith('playground.html') ? '/index.html' : path || '/';
    const hash = next === 'playground' ? '#playground' : '';
    window.history.replaceState(null, '', hash ? `${base}${hash}` : base);
  };

  return (
    <DemoThemeProvider>
      <div className="demo-page">
        <header className="demo-topbar">
          <h1>react-gantt-lib</h1>
          <div className="demo-topbar-actions">
            <ThemeToggle />
            <nav className="demo-tabs" aria-label="Demo sections">
          <button
            type="button"
            className={`demo-tab ${tab === 'examples' ? 'demo-tab--active' : ''}`}
            onClick={() => selectTab('examples')}
          >
            Examples
          </button>
          <button
            type="button"
            className={`demo-tab ${tab === 'playground' ? 'demo-tab--active' : ''}`}
            onClick={() => selectTab('playground')}
          >
            Playground
            <span className="demo-tab-badge">controls</span>
          </button>
          <a
            className="demo-tab demo-tab--link"
            href={DOCS_URL}
            target="_blank"
            rel="noreferrer"
          >
            Docs
            <span className="demo-tab-badge">↗</span>
          </a>
          </nav>
        </div>
      </header>

      {tab === 'examples' ? <ExamplesDemo /> : <PlaygroundApp />}
      </div>
    </DemoThemeProvider>
  );
}
