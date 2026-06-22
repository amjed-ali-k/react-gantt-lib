import { useMemo, useState } from 'react';
import { addDays, endOfDay, startOfDay } from 'date-fns';
import type { CustomRowDefinition } from '../src/types';
import { useGanttTimeline } from '../src/context/GanttChartContext';
import './dailyColorStripRow.css';

function colorForDate(date: Date): string {
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  const hash = (seed * 9301 + 49297) % 233280;
  const hue = hash % 360;
  return `hsl(${hue} 62% 58%)`;
}

function eachDayInRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  let day = startOfDay(start);
  const last = startOfDay(end);
  while (day.getTime() <= last.getTime()) {
    days.push(day);
    day = addDays(day, 1);
  }
  return days;
}

function daySegmentWidth(
  day: Date,
  rangeStart: Date,
  rangeEnd: Date,
  msPerPixel: number,
): number {
  const segmentStart = Math.max(startOfDay(day).getTime(), rangeStart.getTime());
  const segmentEnd = Math.min(endOfDay(day).getTime(), rangeEnd.getTime());
  if (segmentEnd <= segmentStart) return 0;
  return (segmentEnd - segmentStart) / msPerPixel;
}

/** Timeline band — uses `useGanttTimeline()` so it scrolls and zooms with the chart. */
export function DailyColorStrip() {
  const { range, msPerPixel } = useGanttTimeline();
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const segments = useMemo(() => {
    return eachDayInRange(range.start, range.end)
      .map((day) => {
        const width = daySegmentWidth(day, range.start, range.end, msPerPixel);
        return {
          key: day.toISOString(),
          label: day.toDateString(),
          width,
          color: colorForDate(day),
        };
      })
      .filter((segment) => segment.width > 0);
  }, [range.start, range.end, msPerPixel]);

  const totalWidth = segments.reduce((sum, segment) => sum + segment.width, 0);

  return (
    <div className="pg-daily-strip" style={{ width: Math.max(totalWidth, 1) }}>
      {segments.map((segment) => (
        <div
          key={segment.key}
          className="pg-daily-strip-cell"
          title={segment.label}
          style={{
            width: segment.width,
            backgroundColor: segment.color,
            opacity: hoveredKey === segment.key ? 0.9 : 1,
          }}
          onMouseEnter={() => setHoveredKey(segment.key)}
          onMouseLeave={() => setHoveredKey(null)}
        />
      ))}
    </div>
  );
}

export const DAILY_COLOR_STRIP_ROW: CustomRowDefinition = {
  id: 'daily-color-strip',
  meta: { label: 'Random daily colors demo' },
  cells: {
    name: async () => <span className="pg-daily-strip-label">Daily colors</span>,
    start: async () => '—',
    end: async () => '—',
    __timeline__: async () => <DailyColorStrip />,
  },
};
