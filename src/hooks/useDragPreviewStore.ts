import { useSyncExternalStore } from 'react';

type Listener = () => void;

export interface DragPreviewDates {
  start: Date;
  end: Date;
}

export interface DragPreviewSnapshot {
  taskId: string | null;
  dates: DragPreviewDates | null;
  version: number;
}

const EMPTY_SNAPSHOT: DragPreviewSnapshot = {
  taskId: null,
  dates: null,
  version: 0,
};

/** Ephemeral drag dates for dependency rendering — does not mutate task store. */
export class DragPreviewStore {
  private taskId: string | null = null;
  private dates: DragPreviewDates | null = null;
  private version = 0;
  private snapshot: DragPreviewSnapshot = EMPTY_SNAPSHOT;
  private listeners = new Set<Listener>();

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): DragPreviewSnapshot => this.snapshot;

  getVersion(): number {
    return this.version;
  }

  getPreview(taskId: string): DragPreviewDates | null {
    if (this.taskId !== taskId || !this.dates) return null;
    return this.dates;
  }

  setPreview(taskId: string, start: Date, end: Date): void {
    if (
      this.taskId === taskId &&
      this.dates &&
      this.dates.start.getTime() === start.getTime() &&
      this.dates.end.getTime() === end.getTime()
    ) {
      return;
    }
    this.taskId = taskId;
    this.dates = { start, end };
    this.version++;
    this.snapshot = { taskId, dates: this.dates, version: this.version };
    this.notify();
  }

  clear(taskId?: string): void {
    if (!this.dates) return;
    if (taskId !== undefined && this.taskId !== taskId) return;
    this.taskId = null;
    this.dates = null;
    this.version++;
    this.snapshot = { taskId: null, dates: null, version: this.version };
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}

export function useDragPreviewSnapshot(store: DragPreviewStore): DragPreviewSnapshot {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
