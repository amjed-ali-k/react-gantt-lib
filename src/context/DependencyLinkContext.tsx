import { createContext, useContext } from 'react';
import type { DependencyLinkStore } from '../hooks/useDependencyLinkStore';

/** Set only when some task can be linked, so charts without drag-to-link render as before. */
export const DependencyLinkContext = createContext<DependencyLinkStore | null>(null);

export function useDependencyLinkStoreOptional(): DependencyLinkStore | null {
  return useContext(DependencyLinkContext);
}
