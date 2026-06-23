import { useEffect, useMemo, useState } from 'react';
import { GanttChart } from '../src/GanttChart';
import type { GanttTask, GanttTheme } from '../src/types';

/** UTC instants that read differently across common office timezones. */
export const TIMEZONE_DEMO_TASKS: GanttTask[] = [
  {
    id: 'ny-standup',
    name: 'NYC standup (09:00 ET)',
    start: '2026-06-23T13:00:00Z',
    end: '2026-06-23T13:30:00Z',
    progress: 100,
    color: '#3b82f6',
  },
  {
    id: 'london-sync',
    name: 'London sync (14:00 BST)',
    start: '2026-06-23T13:00:00Z',
    end: '2026-06-23T14:00:00Z',
    progress: 60,
    color: '#8b5cf6',
  },
  {
    id: 'india-review',
    name: 'India design review (18:30 IST)',
    start: '2026-06-23T13:00:00Z',
    end: '2026-06-23T14:30:00Z',
    progress: 25,
    color: '#f59e0b',
  },
  {
    id: 'tokyo-handoff',
    name: 'Tokyo handoff (23:00 JST)',
    start: '2026-06-23T14:00:00Z',
    end: '2026-06-23T15:00:00Z',
    progress: 0,
    color: '#06b6d4',
  },
  {
    id: 'sydney-overnight',
    name: 'Sydney overnight window',
    start: '2026-06-23T12:00:00Z',
    end: '2026-06-24T02:00:00Z',
    progress: 40,
    color: '#22c55e',
  },
  {
    id: 'utc-cutover',
    name: 'UTC midnight cutover',
    start: '2026-06-23T22:00:00Z',
    end: '2026-06-24T02:00:00Z',
    progress: 10,
    color: '#ef4444',
  },
];

const TIMEZONE_OPTIONS = [
  { value: '', label: 'Browser local (default)' },
  { value: 'America/New_York', label: 'America/New_York (ET)' },
  { value: 'Europe/London', label: 'Europe/London (BST)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST)' },
  { value: 'UTC', label: 'UTC' },
] as const;

function formatClock(now: Date, timeZone?: string): string {
  return now.toLocaleString('en-US', {
    timeZone: timeZone || undefined,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

interface TimezoneDemoProps {
  onLog: (event: string, detail: string) => void;
  theme: GanttTheme;
}

export function TimezoneDemo({ onLog, theme }: TimezoneDemoProps) {
  const [tasks, setTasks] = useState(TIMEZONE_DEMO_TASKS);
  const [timezone, setTimezone] = useState<string | undefined>(undefined);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const timezoneLabel = useMemo(
    () => TIMEZONE_OPTIONS.find((o) => o.value === (timezone ?? ''))?.label ?? timezone,
    [timezone],
  );

  return (
    <section className="demo-section">
      <div className="demo-section-header">
        <div>
          <h2>Display timezone</h2>
          <p>
            Set <code>timezone</code> on <code>GanttChart</code> so every label — headers, start/end
            columns, tooltips — uses the same IANA zone for all viewers. Task data and drag callbacks
            stay in real UTC instants; only formatting changes.
          </p>
        </div>
        <span className="demo-badge demo-badge--timezone">display only</span>
      </div>

      <div className="demo-timezone-controls">
        <label className="demo-timezone-field" htmlFor="demo-timezone-select">
          <span>Chart timezone</span>
          <select
            id="demo-timezone-select"
            value={timezone ?? ''}
            onChange={(e) => {
              const next = e.target.value || undefined;
              setTimezone(next);
              onLog('timezone', next ?? 'browser local');
            }}
          >
            {TIMEZONE_OPTIONS.map((opt) => (
              <option key={opt.value || 'local'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <div className="demo-timezone-clocks">
          <div className="demo-stat">
            <strong>Your browser</strong>
            {formatClock(now)}
          </div>
          <div className="demo-stat">
            <strong>Chart labels</strong>
            {timezone ? formatClock(now, timezone) : formatClock(now)}
            {!timezone && ' (same as browser)'}
          </div>
          <div className="demo-stat">
            <strong>Active zone</strong>
            {timezoneLabel}
          </div>
        </div>
      </div>

      <div className="demo-chart-wrap">
        <GanttChart
          tasks={tasks}
          height={360}
          theme={theme}
          timezone={timezone}
          zoomLevel="6hour"
          availableZoomLevels={['day', '6hour', '3hour', '1hour']}
          minDate="2026-06-22"
          maxDate="2026-06-25"
          snapToGrid={false}
          showTooltip
          onTasksChange={setTasks}
          onTaskDragEnd={(e) =>
            onLog('taskDragEnd', `${e.task.name} → ${e.start.toISOString()} (unchanged instant)`)
          }
        />
      </div>
    </section>
  );
}
