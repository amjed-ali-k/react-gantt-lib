import { createContext, useContext, type ReactNode } from 'react';
import type { TimelineRange } from '../types';
import type { ViewScale } from '../core/scale';

export interface GanttTimelineContextValue {
  zoomLevel: string;
  scale: ViewScale;
  columnWidth: number;
  timelineWidth: number;
  range: TimelineRange;
  rowHeight: number;
  msPerPixel: number;
}

const GanttTimelineContext = createContext<GanttTimelineContextValue | null>(null);

export function GanttTimelineProvider({
  value,
  children,
}: {
  value: GanttTimelineContextValue;
  children: ReactNode;
}) {
  return (
    <GanttTimelineContext.Provider value={value}>{children}</GanttTimelineContext.Provider>
  );
}

/** Timeline scale/range metrics for custom row renderers inside `GanttChart`. */
export function useGanttTimeline(): GanttTimelineContextValue {
  const ctx = useContext(GanttTimelineContext);
  if (!ctx) {
    throw new Error('useGanttTimeline must be used within a GanttChart custom row or child component');
  }
  return ctx;
}

export function useGanttTimelineOptional(): GanttTimelineContextValue | null {
  return useContext(GanttTimelineContext);
}
