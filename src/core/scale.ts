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
} from 'date-fns';
import type { ZoomLevel } from '../types';
import { formatDisplay } from './displayFormat';

export interface ViewScale {
  id: string;
  label: string;
  stepAmount: number;
  stepUnit: ZoomLevel;
  columnWidth: number;
}

export const PRESET_SCALES: Record<string, ViewScale> = {
  month: { id: 'month', label: 'Month', stepAmount: 1, stepUnit: 'month', columnWidth: 120 },
  week: { id: 'week', label: 'Week', stepAmount: 1, stepUnit: 'week', columnWidth: 140 },
  day: { id: 'day', label: 'Day', stepAmount: 1, stepUnit: 'day', columnWidth: 48 },
  '2day': { id: '2day', label: '2 Days', stepAmount: 2, stepUnit: 'day', columnWidth: 64 },
  '6hour': { id: '6hour', label: '6 Hours', stepAmount: 6, stepUnit: 'hour', columnWidth: 56 },
  '3hour': { id: '3hour', label: '3 Hours', stepAmount: 3, stepUnit: 'hour', columnWidth: 48 },
  '1hour': { id: '1hour', label: '1 Hour', stepAmount: 1, stepUnit: 'hour', columnWidth: 40 },
  hour: { id: 'hour', label: 'Hour', stepAmount: 1, stepUnit: 'hour', columnWidth: 64 },
  minute: { id: 'minute', label: 'Minute', stepAmount: 1, stepUnit: 'minute', columnWidth: 40 },
};

export const DEFAULT_ZOOM_ORDER = ['month', 'week', 'day', 'hour', 'minute'] as const;

export function resolveScale(id: string): ViewScale {
  return PRESET_SCALES[id] ?? PRESET_SCALES.day;
}

export function resolveScales(ids?: string[]): ViewScale[] {
  const list = ids?.length ? ids : [...DEFAULT_ZOOM_ORDER];
  return list.map((id) => resolveScale(id));
}

export function startOfScaleUnit(date: Date, scale: ViewScale): Date {
  switch (scale.stepUnit) {
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
  }
}

export function endOfScaleUnit(date: Date, scale: ViewScale): Date {
  switch (scale.stepUnit) {
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
  }
}

export function addScaleSteps(date: Date, steps: number, scale: ViewScale): Date {
  const amount = steps * scale.stepAmount;
  switch (scale.stepUnit) {
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
  }
}

export function diffScaleSteps(later: Date, earlier: Date, scale: ViewScale): number {
  let raw: number;
  switch (scale.stepUnit) {
    case 'minute':
      raw = differenceInMinutes(later, earlier);
      break;
    case 'hour':
      raw = differenceInHours(later, earlier);
      break;
    case 'day':
      raw = differenceInDays(later, earlier);
      break;
    case 'week':
      raw = differenceInWeeks(later, earlier);
      break;
    case 'month':
      raw = differenceInMonths(later, earlier);
      break;
  }
  return Math.floor(raw / scale.stepAmount);
}

export function getScaleMsPerPixel(scale: ViewScale): number {
  const anchor = new Date(2020, 5, 15, 12, 0, 0, 0);
  const next = addScaleSteps(anchor, 1, scale);
  return (next.getTime() - anchor.getTime()) / scale.columnWidth;
}

export function formatScaleHeader(date: Date, scale: ViewScale, timeZone?: string): string {
  if (scale.id === '2day') return formatDisplay(date, 'MMM d', timeZone);
  if (scale.stepUnit === 'hour' || scale.stepUnit === 'minute') {
    return formatDisplay(date, 'HH:mm', timeZone);
  }
  switch (scale.stepUnit) {
    case 'day':
      return formatDisplay(date, 'd', timeZone);
    case 'week':
      return formatDisplay(date, 'MMM d', timeZone);
    case 'month':
      return formatDisplay(date, 'MMM yyyy', timeZone);
    default:
      return formatDisplay(date, 'd', timeZone);
  }
}

export function formatScaleSubHeader(date: Date, scale: ViewScale, timeZone?: string): string {
  if (scale.stepUnit === 'hour' || scale.stepUnit === 'minute') {
    return formatDisplay(date, 'EEE d MMM', timeZone);
  }
  if (scale.stepUnit === 'day' || scale.stepUnit === 'week') {
    return formatDisplay(date, 'MMMM yyyy', timeZone);
  }
  return formatDisplay(date, 'yyyy', timeZone);
}

export function nextScaleInList(
  currentId: string,
  available: ViewScale[],
  direction: 'in' | 'out',
): string {
  const idx = available.findIndex((s) => s.id === currentId);
  if (idx === -1) return available[0]?.id ?? 'day';
  if (direction === 'in') return available[Math.min(idx + 1, available.length - 1)].id;
  return available[Math.max(idx - 1, 0)].id;
}
