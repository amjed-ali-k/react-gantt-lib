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
import { formatDisplay, hasDisplayTime } from './displayFormat';

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

export function formatHeader(date: Date, zoom: ZoomLevel, timeZone?: string): string {
  switch (zoom) {
    case 'minute':
      return formatDisplay(date, 'HH:mm', timeZone);
    case 'hour':
      return formatDisplay(date, 'HH:00', timeZone);
    case 'day':
      return formatDisplay(date, 'd', timeZone);
    case 'week':
      return formatDisplay(date, 'MMM d', timeZone);
    case 'month':
      return formatDisplay(date, 'MMM yyyy', timeZone);
    default: {
      const _exhaustive: never = zoom;
      return _exhaustive;
    }
  }
}

export function formatSubHeader(date: Date, zoom: ZoomLevel, timeZone?: string): string {
  switch (zoom) {
    case 'minute':
    case 'hour':
      return formatDisplay(date, 'EEE d MMM', timeZone);
    case 'day':
      return formatDisplay(date, 'MMMM yyyy', timeZone);
    case 'week':
      return formatDisplay(date, 'MMMM yyyy', timeZone);
    case 'month':
      return formatDisplay(date, 'yyyy', timeZone);
    default: {
      const _exhaustive: never = zoom;
      return _exhaustive;
    }
  }
}

/** Human-readable date/time for task tooltips (time omitted at midnight). */
export function formatTaskDateTime(value: Date | string, timeZone?: string): string {
  const d = toDate(value);
  const pattern = hasDisplayTime(d, timeZone) ? 'MMM d, yyyy HH:mm' : 'MMM d, yyyy';
  return formatDisplay(d, pattern, timeZone);
}

export { format, parseISO, isValid };
