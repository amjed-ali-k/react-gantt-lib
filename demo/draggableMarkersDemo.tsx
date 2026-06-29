import { useCallback, useMemo, useState } from 'react';
import { GanttChart } from '../src/GanttChart';
import { format } from '../src/core/dates';
import type {
  DraggableMarker,
  DraggableMarkerSnapPoint,
  GanttTask,
  GanttTheme,
} from '../src/types';
import { DemoSectionShell } from './DemoSectionShell';
import { exampleSources } from './exampleSources';

const DEMO_TASKS: GanttTask[] = [
  { id: 'plan', name: 'Planning', start: '2026-02-02', end: '2026-02-14', progress: 100 },
  { id: 'design', name: 'Design', start: '2026-02-10', end: '2026-02-28', progress: 80, dependencies: ['plan'] },
  { id: 'build', name: 'Build', start: '2026-03-01', end: '2026-03-21', progress: 45, dependencies: ['design'] },
  { id: 'qa', name: 'QA', start: '2026-03-15', end: '2026-03-28', progress: 10, dependencies: ['build'] },
  {
    id: 'ship',
    name: 'Ship',
    start: '2026-03-29',
    end: '2026-03-29',
    type: 'milestone',
    progress: 0,
    dependencies: ['qa'],
  },
];

/** Saved project revisions — invisible snap targets for the scrubber marker. */
const REVISION_SNAP_POINTS: DraggableMarkerSnapPoint[] = [
  { id: 'rev-planning', date: '2026-02-02' },
  { id: 'rev-design', date: '2026-02-14' },
  { id: 'rev-build', date: '2026-03-01' },
  { id: 'rev-qa', date: '2026-03-15' },
  { id: 'rev-ship', date: '2026-03-29' },
];

const INITIAL_MARKER: DraggableMarker = {
  id: 'as-of',
  date: '2026-02-14',
  label: 'As of',
  color: '#6366f1',
};

function formatMarkerDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function DraggableMarkersDemo({
  onLog,
  theme,
}: {
  onLog: (event: string, detail: string) => void;
  theme: GanttTheme;
}) {
  const [tasks] = useState(DEMO_TASKS);
  const [marker, setMarker] = useState(INITIAL_MARKER);
  const [activeRevision, setActiveRevision] = useState(REVISION_SNAP_POINTS[1].id);
  const [history, setHistory] = useState<string[]>([REVISION_SNAP_POINTS[1].id]);

  const draggableMarkers = useMemo(() => [marker], [marker]);

  const handleDrag = useCallback((date: Date) => {
    setMarker((prev) => ({ ...prev, date: formatMarkerDate(date) }));
  }, []);

  return (
    <DemoSectionShell
      title="Draggable markers — revision history scrubber"
      subtitle="Drag the indigo marker — it magnet-snaps to invisible revision dates (phase starts). onDraggableMarkerDragToSnapPoint fires when the active snap target changes."
      badge="draggable markers"
      badgeClassName="demo-badge--sticky"
      sourceCode={exampleSources.draggableMarkers.code}
      sourceFilename={exampleSources.draggableMarkers.filename}
    >
      <div className="demo-chart-wrap">
        <GanttChart
          tasks={tasks}
          height={320}
          theme={theme}
          zoomLevel="week"
          minDate="2026-01-26"
          maxDate="2026-04-05"
          draggableMarkers={draggableMarkers}
          draggableMarkerSnapPoints={REVISION_SNAP_POINTS}
          onDraggableMarkerDrag={(e) => {
            handleDrag(e.date);
          }}
          onDraggableMarkerDragToSnapPoint={(e) => {
            setActiveRevision(e.snapPoint.id);
            handleDrag(e.date);
            if (e.phase === 'end') {
              setHistory((prev) =>
                prev[prev.length - 1] === e.snapPoint.id ? prev : [...prev, e.snapPoint.id],
              );
            }
            onLog(
              'draggableMarkerDragToSnapPoint',
              `${e.phase}: ${e.snapPoint.id} (${formatMarkerDate(e.date)})`,
            );
          }}
        />
      </div>
      <div className="demo-draggable-marker-history">
        <strong>Active revision:</strong> <code>{activeRevision}</code>
        <br />
        <strong>Visited:</strong>{' '}
        {history.length === 0 ? (
          <span>Drag the marker across revision snap points</span>
        ) : (
          history.join(' → ')
        )}
      </div>
    </DemoSectionShell>
  );
}
