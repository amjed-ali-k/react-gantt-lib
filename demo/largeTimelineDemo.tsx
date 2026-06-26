import { memo, useMemo } from 'react';
import type { CustomRowDefinition, GanttTask, HolidayMarking } from '../src/types';
import { useGanttTimeline } from '../src/context/GanttChartContext';
import { useVirtualColumnSegments, VirtualColumnCell } from '../src/hooks/useVirtualColumnSegments';
import './largeTimelineDemo.css';

export const BAND_COUNT = 32;
export const BAND_GAP_PX = 1;

/** Interpolate hue from indigo (238) to rose (340) across all bands. */
export function bandColor(index: number, total = BAND_COUNT): string {
  const t = total <= 1 ? 0 : index / (total - 1);
  const hue = 238 + t * 102;
  const lightness = 52 + t * 8;
  return `hsl(${hue.toFixed(1)} 68% ${lightness.toFixed(1)}%)`;
}

function bandLayout(timelineWidth: number, bandCount: number, gapPx: number) {
  const totalGap = gapPx * Math.max(0, bandCount - 1);
  const bandWidth = (timelineWidth - totalGap) / bandCount;
  return { bandWidth, gapPx };
}

function bandX(index: number, bandWidth: number, gapPx: number): number {
  return index * (bandWidth + gapPx);
}

export const GradientBandStrip = memo(function GradientBandStrip() {
  const { timelineWidth, visibleColumns } = useGanttTimeline();

  const bands = useMemo(() => {
    const { bandWidth, gapPx } = bandLayout(timelineWidth, BAND_COUNT, BAND_GAP_PX);
    const { startX, endX } = visibleColumns;
    const items: { index: number; x: number; width: number; color: string }[] = [];

    for (let i = 0; i < BAND_COUNT; i++) {
      const x = bandX(i, bandWidth, gapPx);
      const width = i === BAND_COUNT - 1 ? timelineWidth - x : bandWidth;
      if (x + width < startX || x > endX) continue;
      items.push({ index: i, x, width, color: bandColor(i) });
    }

    return items;
  }, [timelineWidth, visibleColumns.startIndex, visibleColumns.endIndex]);

  return (
    <div className="pg-gradient-band" style={{ width: timelineWidth }}>
      {bands.map((band) => (
        <div
          key={band.index}
          className="pg-gradient-band-cell"
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

interface ColumnCellData {
  color: string;
  label: string;
}

/** Per-column calculated cells — only newly scrolled columns invoke the compute callback. */
export const CalculatedColumnStrip = memo(function CalculatedColumnStrip() {
  const { timelineWidth, scale, columnWidth } = useGanttTimeline();

  const segments = useVirtualColumnSegments<ColumnCellData>(
    (columnIndex) => {
      const bandIndex = columnIndex % BAND_COUNT;
      return {
        color: bandColor(bandIndex),
        label: `Col ${columnIndex}`,
      };
    },
    `${scale.id}|${columnWidth}|${timelineWidth}`,
  );

  const fillWidth = Math.max(1, columnWidth - BAND_GAP_PX);

  return (
    <div className="pg-calculated-columns" style={{ width: timelineWidth }}>
      {segments.map((segment) => (
        <VirtualColumnCell
          key={segment.columnIndex}
          columnIndex={segment.columnIndex}
          x={segment.x}
          width={segment.width}
          className="pg-calculated-column-cell"
          title={segment.data.label}
        >
          <div
            className="pg-calculated-column-fill"
            style={{
              width: fillWidth,
              backgroundColor: segment.data.color,
            }}
          />
        </VirtualColumnCell>
      ))}
    </div>
  );
});

export const GRADIENT_BAND_ROW: CustomRowDefinition = {
  id: 'gradient-band-strip',
  meta: { label: '32-band interpolated gradient' },
  height: 32,
  cells: {
    name: async () => <span className="pg-gradient-band-label">32-band gradient</span>,
    start: async () => '—',
    end: async () => '—',
    __timeline__: async () => <GradientBandStrip />,
  },
};

export const CALCULATED_COLUMN_ROW: CustomRowDefinition = {
  id: 'calculated-columns',
  meta: { label: 'Incremental per-column cells' },
  height: 28,
  cells: {
    name: async () => <span className="pg-gradient-band-label">Column cache</span>,
    start: async () => '—',
    end: async () => '—',
    __timeline__: async () => <CalculatedColumnStrip />,
  },
};

/** @deprecated Use {@link GRADIENT_BAND_ROW} */
export const TWELVE_BAND_ROW = GRADIENT_BAND_ROW;

const WORKSTREAM_AREAS = [
  'API layer',
  'Data pipeline',
  'Auth service',
  'UI shell',
  'Mobile client',
  'Analytics',
  'Search index',
  'Payments',
  'Notifications',
  'Reporting',
  'Admin console',
  'ETL jobs',
  'Cache layer',
  'CDN rollout',
  'Observability',
  'Security review',
  'Load testing',
  'Docs portal',
  'SDK release',
  'Partner integration',
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function addMonths(base: Date, months: number): string {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** 50 tasks spread across the multi-year program window. */
export function generateLargeTimelineTasks(count = 50): GanttTask[] {
  const rangeStart = new Date('2024-01-01');
  const rangeEnd = new Date('2027-12-31');
  const spanMs = rangeEnd.getTime() - rangeStart.getTime();
  const tasks: GanttTask[] = [];

  for (let i = 0; i < count; i++) {
    const slot = i / count;
    const startMs = rangeStart.getTime() + slot * spanMs * 0.85;
    const durationMonths = 1 + (i % 6);
    const startDate = new Date(startMs);
    const endDateStr = addMonths(startDate, durationMonths);
    const area = WORKSTREAM_AREAS[i % WORKSTREAM_AREAS.length];
    const progress = Math.max(0, Math.min(100, Math.round(100 - slot * 95 + (i % 7) * 3)));

    tasks.push({
      id: `lt-${i + 1}`,
      name: `WS-${pad2(i + 1)} ${area}`,
      start: `${startDate.getFullYear()}-${pad2(startDate.getMonth() + 1)}-${pad2(startDate.getDate())}`,
      end: endDateStr,
      progress,
      ...(i > 0 && i % 4 === 0 ? { dependencies: [`lt-${i}`] } : {}),
      ...(i % 11 === 10
        ? { color: `hsl(${(i * 37) % 360} 58% 52%)` }
        : {}),
    });
  }

  tasks.push({
    id: 'lt-closeout',
    name: 'Program closeout',
    start: '2027-11-15',
    end: '2027-11-15',
    type: 'milestone',
    progress: 0,
    dependencies: ['lt-50'],
  });

  return tasks;
}

export const LARGE_TIMELINE_TASKS: GanttTask[] = generateLargeTimelineTasks(50);

export const LARGE_TIMELINE_MIN_DATE = '2024-01-01';
export const LARGE_TIMELINE_MAX_DATE = '2027-12-31';

export const LARGE_TIMELINE_US_HOLIDAYS: HolidayMarking = {
  color: 'rgba(251, 191, 36, 0.24)',
  dates: [
    { date: '2024-01-01', label: "New Year's Day" },
    { date: '2024-01-15', label: 'Martin Luther King Jr. Day' },
    { date: '2024-02-19', label: "Washington's Birthday" },
    { date: '2024-05-27', label: 'Memorial Day' },
    { date: '2024-06-19', label: 'Juneteenth National Independence Day' },
    { date: '2024-07-04', label: 'Independence Day' },
    { date: '2024-09-02', label: 'Labor Day' },
    { date: '2024-10-14', label: 'Columbus Day' },
    { date: '2024-11-11', label: 'Veterans Day' },
    { date: '2024-11-28', label: 'Thanksgiving Day' },
    { date: '2024-12-25', label: 'Christmas Day' },
    { date: '2025-01-01', label: "New Year's Day" },
    { date: '2025-01-20', label: 'Martin Luther King Jr. Day' },
    { date: '2025-02-17', label: "Washington's Birthday" },
    { date: '2025-05-26', label: 'Memorial Day' },
    { date: '2025-06-19', label: 'Juneteenth National Independence Day' },
    { date: '2025-07-04', label: 'Independence Day' },
    { date: '2025-09-01', label: 'Labor Day' },
    { date: '2025-10-13', label: 'Columbus Day' },
    { date: '2025-11-11', label: 'Veterans Day' },
    { date: '2025-11-27', label: 'Thanksgiving Day' },
    { date: '2025-12-25', label: 'Christmas Day' },
    { date: '2026-01-01', label: "New Year's Day" },
    { date: '2026-01-19', label: 'Martin Luther King Jr. Day' },
    { date: '2026-02-16', label: "Washington's Birthday" },
    { date: '2026-05-25', label: 'Memorial Day' },
    { date: '2026-06-19', label: 'Juneteenth National Independence Day' },
    { date: '2026-07-03', label: 'Independence Day (observed)' },
    { date: '2026-09-07', label: 'Labor Day' },
    { date: '2026-10-12', label: 'Columbus Day' },
    { date: '2026-11-11', label: 'Veterans Day' },
    { date: '2026-11-26', label: 'Thanksgiving Day' },
    { date: '2026-12-25', label: 'Christmas Day' },
    { date: '2027-01-01', label: "New Year's Day" },
    { date: '2027-01-18', label: 'Martin Luther King Jr. Day' },
    { date: '2027-02-15', label: "Washington's Birthday" },
    { date: '2027-05-31', label: 'Memorial Day' },
    { date: '2027-06-18', label: 'Juneteenth National Independence Day (observed)' },
    { date: '2027-07-05', label: 'Independence Day (observed)' },
    { date: '2027-09-06', label: 'Labor Day' },
    { date: '2027-10-11', label: 'Columbus Day' },
    { date: '2027-11-11', label: 'Veterans Day' },
    { date: '2027-11-25', label: 'Thanksgiving Day' },
    { date: '2027-12-24', label: 'Christmas Day (observed)' },
    { date: '2027-12-31', label: "New Year's Day 2028 (observed)" },
  ],
};
