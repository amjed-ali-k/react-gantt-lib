import { useSyncExternalStore } from 'react';

type Listener = () => void;

/**
 * Roving tabindex for one set of items: exactly one is a tab stop — the last one focused, or the
 * first while none has been (or the focused one is gone). Items subscribe to their own "am I the
 * tab stop" bit, so moving focus re-renders two items, not the list.
 */
export class RovingFocus {
  private ids: readonly string[] = [];
  private active: string | null = null;
  private listeners = new Set<Listener>();

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** The item that is the tab stop. */
  tabStop(): string | null {
    return this.active !== null && this.ids.includes(this.active) ? this.active : (this.ids[0] ?? null);
  }

  /** The items, in navigation order. */
  setIds(ids: readonly string[]): void {
    const before = this.tabStop();
    this.ids = ids;
    if (this.tabStop() !== before) this.notify();
  }

  setActive(id: string): void {
    if (this.active === id) return;
    const before = this.tabStop();
    this.active = id;
    if (this.tabStop() !== before) this.notify();
  }

  /** The item `delta` places from `id` (clamped to the ends), or null when `id` is unknown. */
  step(id: string, delta: number): string | null {
    const index = this.ids.indexOf(id);
    if (index < 0) return null;
    return this.ids[Math.max(0, Math.min(this.ids.length - 1, index + delta))] ?? null;
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}

/** Whether `id` is the tab stop of `store`. */
export function useIsTabStop(store: RovingFocus, id: string): boolean {
  return useSyncExternalStore(
    store.subscribe,
    () => store.tabStop() === id,
    () => false,
  );
}
