import { createContext, useContext, type ReactNode } from 'react';

export interface GanttDisplayContextValue {
  /** IANA timezone for display labels (e.g. `America/New_York`). Undefined uses the browser local timezone. */
  timezone?: string;
}

const GanttDisplayContext = createContext<GanttDisplayContextValue>({});

export function GanttDisplayProvider({
  timezone,
  children,
}: {
  timezone?: string;
  children: ReactNode;
}) {
  return (
    <GanttDisplayContext.Provider value={{ timezone }}>{children}</GanttDisplayContext.Provider>
  );
}

/** Display timezone from `GanttChart`'s `timezone` prop. Undefined means browser local time. */
export function useGanttDisplayTimezone(): string | undefined {
  return useContext(GanttDisplayContext).timezone;
}
