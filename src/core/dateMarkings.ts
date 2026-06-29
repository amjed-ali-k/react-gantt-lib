import { addDays, endOfDay, format, startOfDay } from 'date-fns';
import type { BlockDateRange, DateMarkingLayers, DateMarkingRect, HolidayMarking } from '../types';
import { toDate } from './dates';
import type { ViewScale } from './scale';
import { dateToScalePixel, resolveTimelineWidth } from './zoom';
import type { TimelineRange } from '../types';

export const DEFAULT_HOLIDAY_COLOR = '#f2f2f2';
export const DEFAULT_BLOCK_COLOR = 'rgba(251, 207, 232, 0.55)';

export function defaultIsWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function dateKey(value: Date | string): string {
  return format(toDate(value), 'yyyy-MM-dd');
}

function clipToTimelinePixels(
  segmentStart: Date,
  segmentEnd: Date,
  rangeStart: Date,
  rangeEnd: Date,
  scale: ViewScale,
  columnWidth: number,
  timelineWidth: number,
): { x: number; width: number } | null {
  const startMs = Math.max(segmentStart.getTime(), rangeStart.getTime());
  const endMs = Math.min(segmentEnd.getTime(), rangeEnd.getTime());
  if (startMs >= endMs) return null;

  const x = Math.max(0, dateToScalePixel(new Date(startMs), rangeStart, scale, columnWidth));
  const xEnd = Math.min(
    timelineWidth,
    dateToScalePixel(new Date(endMs), rangeStart, scale, columnWidth),
  );
  const width = xEnd - x;
  if (width <= 0) return null;
  return { x, width };
}

function eachCalendarDay(rangeStart: Date, rangeEnd: Date, visit: (day: Date) => void): void {
  let day = startOfDay(rangeStart);
  const last = startOfDay(rangeEnd);
  while (day.getTime() <= last.getTime()) {
    visit(day);
    day = addDays(day, 1);
  }
}

function normalizeHolidayDates(
  dates: HolidayMarking['dates'],
): Map<string, { label?: string; index: number }> {
  const map = new Map<string, { label?: string; index: number }>();
  if (!dates) return map;

  dates.forEach((entry, index) => {
    if (typeof entry === 'string' || entry instanceof Date) {
      map.set(dateKey(entry), { index });
      return;
    }
    map.set(dateKey(entry.date), { label: entry.label, index });
  });
  return map;
}

export function computeDateMarkingRects(
  range: TimelineRange,
  scale: ViewScale,
  columnWidth: number,
  holidays?: HolidayMarking,
  blockDates?: BlockDateRange[],
): DateMarkingLayers {
  const timelineWidth = resolveTimelineWidth(range, columnWidth);
  const holidayColor = holidays?.color;
  const isWeekend = holidays?.isWeekend ?? defaultIsWeekend;
  const holidayDateMap = normalizeHolidayDates(holidays?.dates);

  const holidayRects: DateMarkingRect[] = [];
  const seenHolidayDays = new Set<string>();

  const pushHolidayDay = (day: Date, label?: string, sourceIndex?: number) => {
    const key = dateKey(day);
    if (seenHolidayDays.has(key)) return;
    seenHolidayDays.add(key);

    const geom = clipToTimelinePixels(
      startOfDay(day),
      endOfDay(day),
      range.start,
      range.end,
      scale,
      columnWidth,
      timelineWidth,
    );
    if (!geom) return;

    holidayRects.push({
      key: `holiday-${key}`,
      x: geom.x,
      width: geom.width,
      ...(holidayColor ? { color: holidayColor } : {}),
      kind: 'holiday',
      label,
      date: day,
      sourceIndex,
    });
  };

  if (holidays?.weekends || holidayDateMap.size > 0) {
    eachCalendarDay(range.start, range.end, (day) => {
      const key = dateKey(day);
      if (holidays?.weekends && isWeekend(day)) {
        pushHolidayDay(day, 'Weekend');
        return;
      }
      const entry = holidayDateMap.get(key);
      if (entry) {
        pushHolidayDay(day, entry.label, entry.index);
      }
    });
  }

  const blockRects: DateMarkingRect[] = [];
  (blockDates ?? []).forEach((block, index) => {
    const blockStart = toDate(block.start);
    const blockEnd = toDate(block.end);
    const geom = clipToTimelinePixels(
      blockStart,
      blockEnd,
      range.start,
      range.end,
      scale,
      columnWidth,
      timelineWidth,
    );
    if (!geom) return;

    blockRects.push({
      key: `block-${blockStart.getTime()}-${blockEnd.getTime()}-${block.label ?? ''}`,
      x: geom.x,
      width: geom.width,
      ...(block.color ? { color: block.color } : {}),
      kind: 'block',
      label: block.label,
      sourceIndex: index,
    });
  });

  return { holidays: holidayRects, blocks: blockRects };
}
