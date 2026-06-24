import { createContext, useContext, type ReactNode } from 'react';
import type { DragPreviewStore } from '../hooks/useDragPreviewStore';

const DragPreviewContext = createContext<DragPreviewStore | null>(null);

export function DragPreviewProvider({
  store,
  children,
}: {
  store: DragPreviewStore;
  children: ReactNode;
}) {
  return (
    <DragPreviewContext.Provider value={store}>{children}</DragPreviewContext.Provider>
  );
}

export function useDragPreviewStoreOptional(): DragPreviewStore | null {
  return useContext(DragPreviewContext);
}
