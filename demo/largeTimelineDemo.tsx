import { memo, useMemo } from 'react';
import type { CustomRowDefinition, GanttTask } from '../src/types';
import { useGanttTimeline } from '../src/context/GanttChartContext';
import './largeTimelineDemo.css';

export const BAND_COUNT = 12;

/** Interpolate hue from indigo (238) to rose (340) across 12 bands. */
export function bandColor(index: number): string {
  const t = index / (BAND_COUNT - 1);
  const hue = 238 + t * 102;
  const lightness = 52 + t * 8;
  return `hsl(${hue.toFixed(1)} 68% ${lightness.toFixed(1)}%)`;
}

export const TwelveBandStrip = memo(function TwelveBandStrip() {
  const { timelineWidth, visibleColumns } = useGanttTimeline();

  const bands = useMemo(() => {
    const bandWidth = timelineWidth / BAND_COUNT;
    const { startX, endX } = visibleColumns;
    const items: { index: number; x: number; width: number; color: string }[] = [];

    for (let i = 0; i < BAND_COUNT; i++) {
      const x = i * bandWidth;
      const width = i === BAND_COUNT - 1 ? timelineWidth - x : bandWidth;
      if (x + width < startX || x > endX) continue;
      items.push({ index: i, x, width, color: bandColor(i) });
    }

    return items;
  }, [timelineWidth, visibleColumns]);

  return (
    <div className="pg-twelve-band" style={{ width: timelineWidth }}>
      {bands.map((band) => (
        <div
          key={band.index}
          className="pg-twelve-band-cell"
          style={{
            left: band.x,
            width: band.width,
            backgroundColor: band.color,
          }}
          title={`Band ${band.index + 1} of ${BAND_COUNT}`}
        />
      ))}
    </div>
  );
});

export const TWELVE_BAND_ROW: CustomRowDefinition = {
  id: 'twelve-band-strip',
  meta: { label: '12-band interpolated gradient' },
  height: 32,
  cells: {
    name: async () => <span className="pg-twelve-band-label">12-band gradient</span>,
    start: async () => '—',
    end: async () => '—',
    __timeline__: async () => <TwelveBandStrip />,
  },
};

function monthOffset(year: number, month: number, day: number, monthDelta: number): string {
  const d = new Date(year, month - 1 + monthDelta, day);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Tasks spread across a multi-year program — timeline width comes from min/max dates. */
export const LARGE_TIMELINE_TASKS: GanttTask[] = [
  { id: 'lt-1', name: 'Discovery & alignment', start: '2024-01-08', end: '2024-04-30', progress: 100 },
  { id: 'lt-2', name: 'Architecture', start: '2024-03-01', end: '2024-07-15', progress: 100, dependencies: ['lt-1'] },
  { id: 'lt-3', name: 'Platform foundation', start: '2024-06-01', end: '2024-11-30', progress: 85, dependencies: ['lt-2'] },
  { id: 'lt-4', name: 'Core services', start: '2024-09-01', end: '2025-03-31', progress: 70, dependencies: ['lt-3'] },
  { id: 'lt-5', name: 'Integration wave 1', start: '2025-01-15', end: '2025-06-30', progress: 55, dependencies: ['lt-4'] },
  { id: 'lt-6', name: 'Integration wave 2', start: '2025-05-01', end: '2025-10-31', progress: 40, dependencies: ['lt-5'] },
  { id: 'lt-7', name: 'Regional rollout — NA', start: '2025-08-01', end: '2026-02-28', progress: 30, dependencies: ['lt-6'] },
  { id: 'lt-8', name: 'Regional rollout — EU', start: '2025-10-01', end: '2026-04-30', progress: 25, dependencies: ['lt-6'] },
  { id: 'lt-9', name: 'Regional rollout — APAC', start: '2026-01-01', end: '2026-07-31', progress: 15, dependencies: ['lt-7', 'lt-8'] },
  { id: 'lt-10', name: 'Hardening & SRE', start: '2026-04-01', end: '2026-09-30', progress: 10, dependencies: ['lt-9'] },
  { id: 'lt-11', name: 'Compliance audit', start: '2026-07-01', end: '2026-12-15', progress: 5, dependencies: ['lt-10'] },
  { id: 'lt-12', name: 'Sunset legacy stack', start: monthOffset(2026, 6, 1, 0), end: monthOffset(2027, 3, 31, 0), progress: 0, dependencies: ['lt-10'] },
  { id: 'lt-13', name: 'Program closeout', start: '2027-06-01', end: '2027-06-01', type: 'milestone', progress: 0, dependencies: ['lt-11', 'lt-12'] },
];

export const LARGE_TIMELINE_MIN_DATE = '2024-01-01';
export const LARGE_TIMELINE_MAX_DATE = '2027-12-31';
