import { format } from 'date-fns';

type DisplayPattern =
  | 'HH:mm'
  | 'HH:00'
  | 'd'
  | 'MMM d'
  | 'MMM yyyy'
  | 'EEE d MMM'
  | 'MMMM yyyy'
  | 'yyyy'
  | 'MMM d, yyyy HH:mm'
  | 'MMM d, yyyy';

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function cachedFormatter(timeZone: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${timeZone}\0${JSON.stringify(options)}`;
  let fmt = formatterCache.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', { ...options, timeZone });
    formatterCache.set(key, fmt);
  }
  return fmt;
}

function partMap(
  date: Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const p of cachedFormatter(timeZone, options).formatToParts(date)) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  return map;
}

/** Date-only string for sidebar middle columns. */
export function formatDisplayDate(date: Date, timeZone?: string): string {
  if (!timeZone) return date.toLocaleDateString();
  return date.toLocaleDateString('en-US', { timeZone });
}

/** True when the instant has a non-midnight clock time in the display timezone. */
export function hasDisplayTime(date: Date, timeZone?: string): boolean {
  if (!timeZone) {
    return (
      date.getHours() !== 0 ||
      date.getMinutes() !== 0 ||
      date.getSeconds() !== 0 ||
      date.getMilliseconds() !== 0
    );
  }
  const p = partMap(date, timeZone, {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });
  return Number(p.hour) !== 0 || Number(p.minute) !== 0 || Number(p.second) !== 0;
}

/** Format a date for on-screen labels. Falls back to date-fns in the browser timezone when `timeZone` is omitted. */
export function formatDisplay(date: Date, pattern: DisplayPattern, timeZone?: string): string {
  if (!timeZone) return format(date, pattern);

  switch (pattern) {
    case 'HH:mm': {
      const p = partMap(date, timeZone, { hour: '2-digit', minute: '2-digit', hour12: false });
      return `${p.hour}:${p.minute}`;
    }
    case 'HH:00': {
      const p = partMap(date, timeZone, { hour: '2-digit', hour12: false });
      return `${p.hour}:00`;
    }
    case 'd':
      return partMap(date, timeZone, { day: 'numeric' }).day;
    case 'MMM d': {
      const p = partMap(date, timeZone, { month: 'short', day: 'numeric' });
      return `${p.month} ${p.day}`;
    }
    case 'MMM yyyy': {
      const p = partMap(date, timeZone, { month: 'short', year: 'numeric' });
      return `${p.month} ${p.year}`;
    }
    case 'EEE d MMM': {
      const p = partMap(date, timeZone, { weekday: 'short', day: 'numeric', month: 'short' });
      return `${p.weekday} ${p.day} ${p.month}`;
    }
    case 'MMMM yyyy': {
      const p = partMap(date, timeZone, { month: 'long', year: 'numeric' });
      return `${p.month} ${p.year}`;
    }
    case 'yyyy':
      return partMap(date, timeZone, { year: 'numeric' }).year;
    case 'MMM d, yyyy': {
      const p = partMap(date, timeZone, { month: 'short', day: 'numeric', year: 'numeric' });
      return `${p.month} ${p.day}, ${p.year}`;
    }
    case 'MMM d, yyyy HH:mm': {
      const p = partMap(date, timeZone, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      return `${p.month} ${p.day}, ${p.year} ${p.hour}:${p.minute}`;
    }
    default:
      return format(date, pattern);
  }
}
