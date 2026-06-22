import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { GanttTheme } from '../src/types';

export type DemoThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'rg-demo-theme';

export function readDemoThemePreference(): DemoThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

export function applyDocumentTheme(preference: DemoThemePreference) {
  const root = document.documentElement;
  root.classList.remove('demo-theme-light', 'demo-theme-dark');
  if (preference === 'light') root.classList.add('demo-theme-light');
  else if (preference === 'dark') root.classList.add('demo-theme-dark');
}

export function resolveGanttTheme(preference: DemoThemePreference): GanttTheme {
  if (preference === 'light') return 'light';
  if (preference === 'dark') return 'dark';
  return 'auto';
}

/** Call before React mount to avoid flash of wrong theme. */
export function initDemoTheme() {
  applyDocumentTheme(readDemoThemePreference());
}

const DemoThemeContext = createContext<{
  preference: DemoThemePreference;
  chartTheme: GanttTheme;
  setPreference: (preference: DemoThemePreference) => void;
  cyclePreference: () => void;
} | null>(null);

export function DemoThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<DemoThemePreference>(readDemoThemePreference);

  const setPreference = useCallback((next: DemoThemePreference) => {
    setPreferenceState(next);
    applyDocumentTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const cyclePreference = useCallback(() => {
    const order: DemoThemePreference[] = ['system', 'light', 'dark'];
    const index = order.indexOf(preference);
    setPreference(order[(index + 1) % order.length]);
  }, [preference, setPreference]);

  const chartTheme = useMemo(() => resolveGanttTheme(preference), [preference]);

  useEffect(() => {
    applyDocumentTheme(preference);
  }, [preference]);

  return (
    <DemoThemeContext.Provider value={{ preference, chartTheme, setPreference, cyclePreference }}>
      {children}
    </DemoThemeContext.Provider>
  );
}

export function useDemoTheme() {
  const ctx = useContext(DemoThemeContext);
  if (!ctx) {
    throw new Error('useDemoTheme must be used within DemoThemeProvider');
  }
  return ctx;
}
