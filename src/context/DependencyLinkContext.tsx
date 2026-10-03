import { createContext, useContext } from 'react';
import type { DependencyLinkStore } from '../hooks/useDependencyLinkStore';

export interface DependencyLinkContextValue {
  store: DependencyLinkStore;
  /** The chart's `enableDependencyCreate`; a task's own flag overrides it. */
  enabledByDefault: boolean;
}

/** Set only when some task can be linked, so charts without drag-to-link render as before. */
export const DependencyLinkContext = createContext<DependencyLinkContextValue | null>(null);

export function useDependencyLinkOptional(): DependencyLinkContextValue | null {
  return useContext(DependencyLinkContext);
}
