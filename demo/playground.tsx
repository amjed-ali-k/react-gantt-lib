import { useCallback, useMemo, useState } from 'react';
import { GanttChart } from '../src/GanttChart';
import type { BlockDateRange, EventMarker, GanttTask, HolidayDateEntry } from '../src/types';
import { PRESET_SCALES } from '../src/core/scale';
import { PlaygroundSection } from './PlaygroundSection';
import { DAILY_COLOR_STRIP_ROW } from './dailyColorStripRow';
import { useDemoTheme } from './chartTheme';
import './playground.css';

const PLAYGROUND_HOLIDAYS: HolidayDateEntry[] = [
  { date: '2026-04-10', label: 'Public holiday' },
];

const PLAYGROUND_BLOCKS: BlockDateRange[] = [
  { start: '2026-04-14', end: '2026-04-16', label: 'Team offsite' },
];

const PLAYGROUND_EVENTS: EventMarker[] = [
  { id: 'ev1', date: '2026-04-07', label: 'Demand Analysis' },
  { id: 'ev2', date: '2026-04-18T10:00:00', label: 'Design review' },
];

const PLAYGROUND_TASKS: GanttTask[] = [
  { id: 'p1', name: 'Planning', start: '2026-04-01', end: '2026-04-05', progress: 100 },
  {
    id: 'p2',
    name: 'Development',
    start: '2026-04-06',
    end: '2026-04-18',
    progress: 55,
    baseline: { start: '2026-04-04', end: '2026-04-14' },
  },
  {
    id: 'p3',
    name: 'Testing',
    start: '2026-04-15',
    end: '2026-04-22',
    progress: 20,
    dependencies: ['p2'],
    baseline: { start: '2026-04-12', end: '2026-04-20' },
  },
  {
    id: 'p4',
    name: 'Deploy',
    start: '2026-04-22T14:00:00',
    end: '2026-04-22T14:00:00',
    type: 'milestone',
    progress: 0,
    dependencies: ['p3'],
    baseline: { start: '2026-04-20T14:00:00', end: '2026-04-20T14:00:00' },
  },
];

const ZOOM_OPTIONS = [
  { id: 'day', label: 'Day' },
  { id: '2day', label: '2 Day' },
  { id: '6hour', label: '6 Hour' },
  { id: '3hour', label: '3 Hour' },
  { id: '1hour', label: '1 Hour' },
] as const;

type ZoomOptionId = (typeof ZOOM_OPTIONS)[number]['id'];
type SectionKey =
  | 'timeline'
  | 'display'
  | 'holidays'
  | 'blocks'
  | 'events'
  | 'baseline'
  | 'drag'
  | 'zoom'
  | 'customRow';

function toDatetimeLocalValue(iso: string): string {
  if (!iso.includes('T')) return `${iso}T09:00`;
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PlaygroundApp() {
  const { chartTheme } = useDemoTheme();
  const [minDate, setMinDate] = useState('2026-04-01');
  const [maxDate, setMaxDate] = useState('2026-04-30');
  const [enabledZooms, setEnabledZooms] = useState<Record<ZoomOptionId, boolean>>({
    day: true,
    '2day': true,
    '6hour': false,
    '3hour': false,
    '1hour': false,
  });
  const [zoomLevel, setZoomLevel] = useState<string>('day');
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showTaskList, setShowTaskList] = useState(true);
  const [showDateColumns, setShowDateColumns] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  const [highlightWeekends, setHighlightWeekends] = useState(true);
  const [holidayDates, setHolidayDates] = useState<HolidayDateEntry[]>(PLAYGROUND_HOLIDAYS);
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayLabel, setNewHolidayLabel] = useState('');
  const [blockRanges, setBlockRanges] = useState<BlockDateRange[]>(PLAYGROUND_BLOCKS);
  const [blockStart, setBlockStart] = useState('2026-04-20');
  const [blockEnd, setBlockEnd] = useState('2026-04-22');
  const [blockLabel, setBlockLabel] = useState('');
  const [eventMarkers, setEventMarkers] = useState<EventMarker[]>(PLAYGROUND_EVENTS);
  const [newEventDate, setNewEventDate] = useState('2026-04-12T09:00');
  const [newEventLabel, setNewEventLabel] = useState('');
  const [showBaseline, setShowBaseline] = useState(true);
  const [tasks, setTasks] = useState(PLAYGROUND_TASKS);

  const [sectionExpanded, setSectionExpanded] = useState<Record<SectionKey, boolean>>({
    timeline: true,
    display: false,
    holidays: false,
    blocks: false,
    events: true,
    baseline: false,
    drag: false,
    zoom: false,
    customRow: true,
  });

  const [sectionEnabled, setSectionEnabled] = useState<Record<SectionKey, boolean>>({
    timeline: true,
    display: true,
    holidays: true,
    blocks: true,
    events: true,
    baseline: true,
    drag: true,
    zoom: true,
    customRow: true,
  });

  const setExpanded = useCallback((key: SectionKey, expanded: boolean) => {
    setSectionExpanded((prev) => ({ ...prev, [key]: expanded }));
  }, []);

  const setEnabled = useCallback((key: SectionKey, enabled: boolean) => {
    setSectionEnabled((prev) => ({ ...prev, [key]: enabled }));
  }, []);

  const availableZoomLevels = useMemo(
    () =>
      sectionEnabled.zoom
        ? ZOOM_OPTIONS.filter((z) => enabledZooms[z.id]).map((z) => z.id)
        : ZOOM_OPTIONS.map((z) => z.id),
    [enabledZooms, sectionEnabled.zoom],
  );

  const toggleZoom = useCallback((id: ZoomOptionId) => {
    setEnabledZooms((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      const enabled = ZOOM_OPTIONS.filter((z) => next[z.id]).map((z) => z.id);
      if (enabled.length === 0) return prev;
      setZoomLevel((current) => (enabled.includes(current as ZoomOptionId) ? current : enabled[0]));
      return next;
    });
  }, []);

  const addHoliday = useCallback(() => {
    if (!newHolidayDate) return;
    setHolidayDates((prev) => {
      if (prev.some((h) => h.date === newHolidayDate)) return prev;
      return [...prev, { date: newHolidayDate, label: newHolidayLabel || undefined }];
    });
    setNewHolidayDate('');
    setNewHolidayLabel('');
  }, [newHolidayDate, newHolidayLabel]);

  const addBlockRange = useCallback(() => {
    if (!blockStart || !blockEnd || blockStart > blockEnd) return;
    setBlockRanges((prev) => [
      ...prev,
      { start: blockStart, end: blockEnd, label: blockLabel || undefined },
    ]);
    setBlockLabel('');
  }, [blockStart, blockEnd, blockLabel]);

  const addEventMarker = useCallback(() => {
    if (!newEventDate || !newEventLabel.trim()) return;
    const id = `ev-${Date.now()}`;
    setEventMarkers((prev) => [
      ...prev,
      { id, date: newEventDate.length === 10 ? newEventDate : `${newEventDate}:00`, label: newEventLabel.trim() },
    ]);
    setNewEventLabel('');
  }, [newEventDate, newEventLabel]);

  const holidays = useMemo(
    () =>
      sectionEnabled.holidays && (highlightWeekends || holidayDates.length > 0)
        ? { weekends: highlightWeekends, dates: holidayDates, color: '#f2f2f2' }
        : undefined,
    [sectionEnabled.holidays, highlightWeekends, holidayDates],
  );

  const customRows = useMemo(
    () => (sectionEnabled.customRow ? [DAILY_COLOR_STRIP_ROW] : []),
    [sectionEnabled.customRow],
  );

  return (
    <div className="playground-page">
      <header className="demo-header playground-header">
        <h2>Playground</h2>
        <p>
          Enable sections with the checkboxes, expand to edit settings, then interact with the chart.
        </p>
      </header>

      <aside className="playground-controls">
        <PlaygroundSection
          title="Timeline range"
          enabled={sectionEnabled.timeline}
          expanded={sectionExpanded.timeline}
          onEnabledChange={(v) => setEnabled('timeline', v)}
          onExpandedChange={(v) => setExpanded('timeline', v)}
          showEnable={false}
        >
          <label>
            Chart start
            <input type="date" value={minDate} onChange={(e) => setMinDate(e.target.value)} />
          </label>
          <label>
            Chart end
            <input type="date" value={maxDate} onChange={(e) => setMaxDate(e.target.value)} />
          </label>
        </PlaygroundSection>

        <PlaygroundSection
          title="Display"
          enabled={sectionEnabled.display}
          expanded={sectionExpanded.display}
          onEnabledChange={(v) => setEnabled('display', v)}
          onExpandedChange={(v) => setExpanded('display', v)}
        >
          <label className="playground-checkbox">
            <input
              type="checkbox"
              checked={showTaskList}
              onChange={(e) => setShowTaskList(e.target.checked)}
            />
            Task list
          </label>
          <label className="playground-checkbox">
            <input
              type="checkbox"
              checked={showDateColumns}
              onChange={(e) => setShowDateColumns(e.target.checked)}
            />
            Start / end dates
          </label>
          <label className="playground-checkbox">
            <input
              type="checkbox"
              checked={showTooltip}
              onChange={(e) => setShowTooltip(e.target.checked)}
            />
            Task tooltip
          </label>
        </PlaygroundSection>

        <PlaygroundSection
          title="Holidays"
          enabled={sectionEnabled.holidays}
          expanded={sectionExpanded.holidays}
          onEnabledChange={(v) => setEnabled('holidays', v)}
          onExpandedChange={(v) => setExpanded('holidays', v)}
        >
          <label className="playground-checkbox">
            <input
              type="checkbox"
              checked={highlightWeekends}
              onChange={(e) => setHighlightWeekends(e.target.checked)}
            />
            Highlight weekends
          </label>
          <label>
            Add holiday date
            <input type="date" value={newHolidayDate} onChange={(e) => setNewHolidayDate(e.target.value)} />
          </label>
          <label>
            Label (optional)
            <input
              type="text"
              value={newHolidayLabel}
              placeholder="e.g. New Year"
              onChange={(e) => setNewHolidayLabel(e.target.value)}
            />
          </label>
          <button type="button" className="playground-btn" onClick={addHoliday} disabled={!newHolidayDate}>
            Add holiday
          </button>
          {holidayDates.length > 0 && (
            <ul className="playground-list">
              {holidayDates.map((h) => (
                <li key={String(h.date)}>
                  <span>
                    {String(h.date)}
                    {h.label ? ` — ${h.label}` : ''}
                  </span>
                  <button
                    type="button"
                    className="playground-btn playground-btn--ghost"
                    onClick={() => setHolidayDates((prev) => prev.filter((x) => x.date !== h.date))}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </PlaygroundSection>

        <PlaygroundSection
          title="Block dates"
          enabled={sectionEnabled.blocks}
          expanded={sectionExpanded.blocks}
          onEnabledChange={(v) => setEnabled('blocks', v)}
          onExpandedChange={(v) => setExpanded('blocks', v)}
        >
          <p className="playground-field-hint">Unavailable ranges in light rose on the timeline.</p>
          <label>
            Start
            <input type="date" value={blockStart} onChange={(e) => setBlockStart(e.target.value)} />
          </label>
          <label>
            End
            <input type="date" value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)} />
          </label>
          <label>
            Label (optional)
            <input
              type="text"
              value={blockLabel}
              placeholder="e.g. Maintenance window"
              onChange={(e) => setBlockLabel(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="playground-btn"
            onClick={addBlockRange}
            disabled={!blockStart || !blockEnd || blockStart > blockEnd}
          >
            Add block range
          </button>
          {blockRanges.length > 0 && (
            <ul className="playground-list">
              {blockRanges.map((b, i) => (
                <li key={`${b.start}-${b.end}-${i}`}>
                  <span>
                    {String(b.start)} → {String(b.end)}
                    {b.label ? ` — ${b.label}` : ''}
                  </span>
                  <button
                    type="button"
                    className="playground-btn playground-btn--ghost"
                    onClick={() => setBlockRanges((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </PlaygroundSection>

        <PlaygroundSection
          title="Event markers"
          enabled={sectionEnabled.events}
          expanded={sectionExpanded.events}
          onEnabledChange={(v) => setEnabled('events', v)}
          onExpandedChange={(v) => setExpanded('events', v)}
        >
          <p className="playground-field-hint">
            Dashed vertical line at a date/time with a labeled callout.
          </p>
          <label>
            Date & time
            <input
              type="datetime-local"
              value={newEventDate}
              onChange={(e) => setNewEventDate(e.target.value)}
            />
          </label>
          <label>
            Label
            <input
              type="text"
              value={newEventLabel}
              placeholder="e.g. Demand Analysis"
              onChange={(e) => setNewEventLabel(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="playground-btn"
            onClick={addEventMarker}
            disabled={!newEventDate || !newEventLabel.trim()}
          >
            Add event marker
          </button>
          {eventMarkers.length > 0 && (
            <ul className="playground-list">
              {eventMarkers.map((m) => (
                <li key={m.id ?? String(m.date)}>
                  <span>
                    {toDatetimeLocalValue(String(m.date))} — {m.label}
                  </span>
                  <button
                    type="button"
                    className="playground-btn playground-btn--ghost"
                    onClick={() => setEventMarkers((prev) => prev.filter((x) => x.id !== m.id))}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </PlaygroundSection>

        <PlaygroundSection
          title="Baseline"
          enabled={sectionEnabled.baseline}
          expanded={sectionExpanded.baseline}
          onEnabledChange={(v) => setEnabled('baseline', v)}
          onExpandedChange={(v) => setExpanded('baseline', v)}
        >
          <p className="playground-field-hint">
            Amber markers show the original plan from each task&apos;s <code>baseline</code> field.
            Drag tasks to see schedule drift.
          </p>
          <label className="playground-checkbox">
            <input
              type="checkbox"
              checked={showBaseline}
              onChange={(e) => setShowBaseline(e.target.checked)}
            />
            Show baseline markers
          </label>
        </PlaygroundSection>

        <PlaygroundSection
          title="Drag behavior"
          enabled={sectionEnabled.drag}
          expanded={sectionExpanded.drag}
          onEnabledChange={(v) => setEnabled('drag', v)}
          onExpandedChange={(v) => setExpanded('drag', v)}
        >
          <div className="playground-toggle">
            <span className="playground-toggle-label">Snap to grid</span>
            <button
              type="button"
              role="switch"
              aria-checked={snapToGrid}
              className={`playground-toggle-btn ${snapToGrid ? 'playground-toggle-btn--on' : ''}`}
              onClick={() => setSnapToGrid((v) => !v)}
            >
              <span className="playground-toggle-knob" />
              <span className="playground-toggle-text">{snapToGrid ? 'On' : 'Off'}</span>
            </button>
          </div>
          <p className="playground-toggle-hint">
            {snapToGrid
              ? 'Tasks snap to column boundaries when you release a drag.'
              : 'Smooth drag — bars keep sub-column precision on release.'}
          </p>
        </PlaygroundSection>

        <PlaygroundSection
          title="Zoom levels"
          enabled={sectionEnabled.zoom}
          expanded={sectionExpanded.zoom}
          onEnabledChange={(v) => setEnabled('zoom', v)}
          onExpandedChange={(v) => setExpanded('zoom', v)}
        >
          {ZOOM_OPTIONS.map((opt) => (
            <label key={opt.id} className="playground-checkbox">
              <input
                type="checkbox"
                checked={enabledZooms[opt.id]}
                onChange={() => toggleZoom(opt.id)}
              />
              {opt.label}
              <span className="playground-zoom-meta">
                ({PRESET_SCALES[opt.id]?.columnWidth}px/col)
              </span>
            </label>
          ))}
          <p className="playground-hint">
            Active scale: <strong>{PRESET_SCALES[zoomLevel]?.label ?? zoomLevel}</strong>
          </p>
        </PlaygroundSection>

        <PlaygroundSection
          title="Custom row"
          enabled={sectionEnabled.customRow}
          expanded={sectionExpanded.customRow}
          onEnabledChange={(v) => setEnabled('customRow', v)}
          onExpandedChange={(v) => setExpanded('customRow', v)}
        >
          <p className="playground-field-hint">
            Footer row via <code>customRows</code> + <code>useGanttTimeline()</code> — daily color
            bands scroll and zoom with the timeline.
          </p>
        </PlaygroundSection>
      </aside>

      <div className="playground-chart-wrap">
        <GanttChart
          tasks={tasks}
          height={480}
          theme={chartTheme}
          minDate={minDate}
          maxDate={maxDate}
          zoomLevel={zoomLevel}
          availableZoomLevels={availableZoomLevels}
          snapToGrid={sectionEnabled.drag ? snapToGrid : false}
          showTaskList={sectionEnabled.display ? showTaskList : true}
          showDateColumns={sectionEnabled.display ? showDateColumns : true}
          showTooltip={sectionEnabled.display && showTooltip}
          holidays={holidays}
          blockDates={sectionEnabled.blocks && blockRanges.length > 0 ? blockRanges : undefined}
          eventMarkers={sectionEnabled.events && eventMarkers.length > 0 ? eventMarkers : undefined}
          showBaseline={sectionEnabled.baseline && showBaseline}
          customRows={customRows}
          onTasksChange={setTasks}
          onZoomChange={(e) => setZoomLevel(e.scaleId)}
        />
      </div>
    </div>
  );
}
