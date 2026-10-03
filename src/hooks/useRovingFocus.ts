import { useCallback, useSyncExternalStore } from 'react';

type Listener = () => void;

/**
 * Roving tabindex for one set of items: exactly one is a tab stop — the last one focused, or the
 * first while none has been (or the focused one is gone). Each item subscribes to its own id, and a
 * change wakes only the old and new tab stop, so moving focus costs O(1) however many items there are.
 */
export class RovingFocus {
  private ids: readonly string[] = [];
  private known = new Set<string>();
  private active: string | null = null;
  private current: string | null = null;
  private listeners = new Map<string, Set<Listener>>();

  subscribe(id: string, listener: Listener): () => void {
    let set = this.listeners.get(id);
    if (!set) this.listeners.set(id, (set = new Set()));
    set.add(listener);
    return () => {
      set.delete(listener);
      if (set.size === 0) this.listeners.delete(id);
    };
  }

  /** The item that is the tab stop. */
  tabStop(): string | null {
    return this.current;
  }

  /** The items, in navigation order. */
  setIds(ids: readonly string[]): void {
    this.ids = ids;
    this.known = new Set(ids);
    this.update();
  }

  setActive(id: string): void {
    this.active = id;
    this.update();
  }

  /** The item `delta` places from `id` (clamped to the ends), or null when `id` is unknown. */
  step(id: string, delta: number): string | null {
    const index = this.ids.indexOf(id);
    if (index < 0) return null;
    return this.ids[Math.max(0, Math.min(this.ids.length - 1, index + delta))] ?? null;
  }

  private update(): void {
    const next =
      this.active !== null && this.known.has(this.active) ? this.active : (this.ids[0] ?? null);
    if (next === this.current) return;
    const before = this.current;
    this.current = next;
    for (const id of [before, next]) {
      if (id !== null) this.listeners.get(id)?.forEach((listener) => listener());
    }
  }
}

/** Whether `id` is the tab stop of `store`. */
export function useIsTabStop(store: RovingFocus, id: string): boolean {
  const subscribe = useCallback((listener: Listener) => store.subscribe(id, listener), [store, id]);
  return useSyncExternalStore(
    subscribe,
    () => store.tabStop() === id,
    () => false,
  );
}
