import {
  addMinutes,
  addHours,
  addDays,
  addWeeks,
  addMonths,
  startOfMinute,
  startOfHour,
  startOfDay,
  startOfWeek,
  startOfMonth,
  endOfMinute,
  endOfHour,
  endOfDay,
  endOfWeek,
  endOfMonth,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  format,
  parseISO,
  isValid,
} from 'date-fns';
import type { ZoomLevel } from '../types';

export function toDate(value: Date | string): Date {
  if (value instanceof Date) return value;
  const parsed = parseISO(value);
  if (isValid(parsed)) return parsed;
  const fallback = new Date(value);
  if (isValid(fallback)) return fallback;
  throw new Error(`Invalid date: ${value}`);
}

export function startOfUnit(date: Date, zoom: ZoomLevel): Date {
  switch (zoom) {
    case 'minute':
      return startOfMinute(date);
    case 'hour':
      return startOfHour(date);
    case 'day':
      return startOfDay(date);
    case 'week':
      return startOfWeek(date, { weekStartsOn: 1 });
    case 'month':
      return startOfMonth(date);
    default: {
      const _exhaustive: never = zoom;
      return _exhaustive;
    }
  }
}

export function endOfUnit(date: Date, zoom: ZoomLevel): Date {
  switch (zoom) {
    case 'minute':
      return endOfMinute(date);
    case 'hour':
      return endOfHour(date);
    case 'day':
      return endOfDay(date);
    case 'week':
      return endOfWeek(date, { weekStartsOn: 1 });
    case 'month':
      return endOfMonth(date);
    default: {
      const _exhaustive: never = zoom;
      return _exhaustive;
    }
  }
}

export function addUnit(date: Date, amount: number, zoom: ZoomLevel): Date {
  switch (zoom) {
    case 'minute':
      return addMinutes(date, amount);
    case 'hour':
      return addHours(date, amount);
    case 'day':
      return addDays(date, amount);
    case 'week':
      return addWeeks(date, amount);
    case 'month':
      return addMonths(date, amount);
    default: {
      const _exhaustive: never = zoom;
      return _exhaustive;
    }
  }
}

export function diffUnits(later: Date, earlier: Date, zoom: ZoomLevel): number {
  switch (zoom) {
    case 'minute':
      return differenceInMinutes(later, earlier);
    case 'hour':
      return differenceInHours(later, earlier);
    case 'day':
      return differenceInDays(later, earlier);
    case 'week':
      return differenceInWeeks(later, earlier);
    case 'month':
      return differenceInMonths(later, earlier);
    default: {
      const _exhaustive: never = zoom;
      return _exhaustive;
    }
  }
}

export function formatHeader(date: Date, zoom: ZoomLevel): string {
  switch (zoom) {
    case 'minute':
      return format(date, 'HH:mm');
    case 'hour':
      return format(date, 'HH:00');
    case 'day':
      return format(date, 'd');
    case 'week':
      return format(date, 'MMM d');
    case 'month':
      return format(date, 'MMM yyyy');
    default: {
      const _exhaustive: never = zoom;
      return _exhaustive;
    }
  }
}

export function formatSubHeader(date: Date, zoom: ZoomLevel): string {
  switch (zoom) {
    case 'minute':
    case 'hour':
      return format(date, 'EEE d MMM');
    case 'day':
      return format(date, 'MMMM yyyy');
    case 'week':
      return format(date, 'MMMM yyyy');
    case 'month':
      return format(date, 'yyyy');
    default: {
      const _exhaustive: never = zoom;
      return _exhaustive;
    }
  }
}

/** Human-readable date/time for task tooltips (time omitted at midnight). */
export function formatTaskDateTime(value: Date | string): string {
  const d = toDate(value);
  const hasTime =
    d.getHours() !== 0 ||
    d.getMinutes() !== 0 ||
    d.getSeconds() !== 0 ||
    d.getMilliseconds() !== 0;
  return format(d, hasTime ? 'MMM d, yyyy HH:mm' : 'MMM d, yyyy');
}

export { format, parseISO, isValid };
