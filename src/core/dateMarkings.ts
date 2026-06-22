import { addDays, endOfDay, format, startOfDay } from 'date-fns';
import type { BlockDateRange, DateMarkingLayers, DateMarkingRect, HolidayMarking } from '../types';
import { toDate } from './dates';
import type { ViewScale } from './scale';
import { dateToPixel, getMsPerPixel, resolveTimelineWidth } from './zoom';
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
  msPerPixel: number,
  timelineWidth: number,
): { x: number; width: number } | null {
  const startMs = Math.max(segmentStart.getTime(), rangeStart.getTime());
  const endMs = Math.min(segmentEnd.getTime(), rangeEnd.getTime());
  if (startMs >= endMs) return null;

  const x = Math.max(0, dateToPixel(new Date(startMs), rangeStart, msPerPixel));
  const xEnd = Math.min(timelineWidth, dateToPixel(new Date(endMs), rangeStart, msPerPixel));
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
): Map<string, string | undefined> {
  const map = new Map<string, string | undefined>();
  if (!dates) return map;

  for (const entry of dates) {
    if (typeof entry === 'string' || entry instanceof Date) {
      map.set(dateKey(entry), undefined);
      continue;
    }
    map.set(dateKey(entry.date), entry.label);
  }
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
  const msPerPixel = getMsPerPixel(scale, columnWidth);
  const holidayColor = holidays?.color ?? DEFAULT_HOLIDAY_COLOR;
  const isWeekend = holidays?.isWeekend ?? defaultIsWeekend;
  const holidayDateMap = normalizeHolidayDates(holidays?.dates);

  const holidayRects: DateMarkingRect[] = [];
  const seenHolidayDays = new Set<string>();

  const pushHolidayDay = (day: Date, label?: string) => {
    const key = dateKey(day);
    if (seenHolidayDays.has(key)) return;
    seenHolidayDays.add(key);

    const geom = clipToTimelinePixels(
      startOfDay(day),
      endOfDay(day),
      range.start,
      range.end,
      msPerPixel,
      timelineWidth,
    );
    if (!geom) return;

    holidayRects.push({
      key: `holiday-${key}`,
      x: geom.x,
      width: geom.width,
      color: holidayColor,
      kind: 'holiday',
      label,
    });
  };

  if (holidays?.weekends || holidayDateMap.size > 0) {
    eachCalendarDay(range.start, range.end, (day) => {
      const key = dateKey(day);
      if (holidays?.weekends && isWeekend(day)) {
        pushHolidayDay(day, 'Weekend');
        return;
      }
      const label = holidayDateMap.get(key);
      if (holidayDateMap.has(key)) {
        pushHolidayDay(day, label);
      }
    });
  }

  const blockRects: DateMarkingRect[] = [];
  for (const block of blockDates ?? []) {
    const blockStart = startOfDay(toDate(block.start));
    const blockEnd = endOfDay(toDate(block.end));
    const geom = clipToTimelinePixels(
      blockStart,
      blockEnd,
      range.start,
      range.end,
      msPerPixel,
      timelineWidth,
    );
    if (!geom) continue;

    blockRects.push({
      key: `block-${dateKey(block.start)}-${dateKey(block.end)}-${block.label ?? ''}`,
      x: geom.x,
      width: geom.width,
      color: block.color ?? DEFAULT_BLOCK_COLOR,
      kind: 'block',
      label: block.label,
    });
  }

  return { holidays: holidayRects, blocks: blockRects };
}
