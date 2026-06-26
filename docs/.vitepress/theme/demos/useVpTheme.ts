import { useEffect, useState } from 'react';
import type { GanttTheme } from '@src/types';

function readVpTheme(): GanttTheme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/** Sync Gantt theme with VitePress light/dark toggle. */
export function useVpTheme(): GanttTheme {
  const [theme, setTheme] = useState<GanttTheme>(readVpTheme);

  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(readVpTheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  return theme;
}
