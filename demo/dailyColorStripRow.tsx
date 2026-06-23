import { memo, useMemo, useState } from 'react';
import { addDays, endOfDay, startOfDay } from 'date-fns';
import type { CustomRowDefinition } from '../src/types';
import { useGanttTimeline } from '../src/context/GanttChartContext';
import { dateToPixel } from '../src/core/zoom';
import { useBufferedSegmentCache } from '../src/hooks/useBufferedSegmentCache';
import './dailyColorStripRow.css';

function colorForDate(date: Date): string {
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  const hash = (seed * 9301 + 49297) % 233280;
  const hue = hash % 360;
  return `hsl(${hue} 62% 58%)`;
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

interface DaySegment {
  key: number;
  label: string;
  x: number;
  width: number;
  color: string;
}

/** Timeline band — uses `useGanttTimeline()` so it scrolls and zooms with the chart. */
export const DailyColorStrip = memo(function DailyColorStrip() {
  const { range, msPerPixel, timelineWidth, visibleColumns } = useGanttTimeline();
  const [hoveredKey, setHoveredKey] = useState<number | null>(null);

  const dayKeys = useMemo(() => {
    const { startX, endX } = visibleColumns;
    const keys: number[] = [];
    let day = startOfDay(range.start);
    const last = startOfDay(range.end);
    while (day.getTime() <= last.getTime()) {
      const x = dateToPixel(startOfDay(day), range.start, msPerPixel);
      const width = daySegmentWidth(day, range.start, range.end, msPerPixel);
      if (width > 0 && x + width >= startX && x <= endX) {
        keys.push(day.getTime());
      }
      day = addDays(day, 1);
    }
    return keys;
  }, [visibleColumns.startIndex, visibleColumns.endIndex, range.start, range.end, msPerPixel]);

  const segments = useBufferedSegmentCache<number, DaySegment>(
    dayKeys,
    (ms) => {
      const day = new Date(ms);
      return {
        key: ms,
        label: day.toDateString(),
        x: dateToPixel(startOfDay(day), range.start, msPerPixel),
        width: daySegmentWidth(day, range.start, range.end, msPerPixel),
        color: colorForDate(day),
      };
    },
    `${range.start.getTime()}|${range.end.getTime()}|${msPerPixel}`,
  );

  return (
    <div className="pg-daily-strip" style={{ width: timelineWidth }}>
      {segments.map((segment) => (
        <div
          key={segment.key}
          className="pg-daily-strip-cell"
          title={segment.label}
          style={{
            left: segment.x,
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
});

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
