import { createContext, useContext } from 'react';
import type { RovingFocus } from '../hooks/useRovingFocus';

/** What a focused bar's keys reach beyond the bar itself. Stable for the chart's lifetime. */
export interface TimelineKeyboard {
  /** The bars' roving tabindex, in row order. */
  focus: RovingFocus;
  /** Moves focus `delta` rows from `taskId` (Up/Down). */
  moveFocus: (taskId: string, delta: number) => void;
  /** Scrolls the timeline to its start or end (Home/End). */
  scrollToEdge: (edge: 'start' | 'end') => void;
  /** One zoom step (`+` / `-`). */
  zoom: (direction: 'in' | 'out') => void;
  announce: (message: string) => void;
  /** A task's name, for "depends on …" in a bar's accessible name. */
  nameOf: (taskId: string) => string | undefined;
}

export const TimelineKeyboardContext = createContext<TimelineKeyboard | null>(null);

export function useTimelineKeyboardOptional(): TimelineKeyboard | null {
  return useContext(TimelineKeyboardContext);
}
