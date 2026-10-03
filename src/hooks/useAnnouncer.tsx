import { useCallback, useRef, useSyncExternalStore } from 'react';

type Listener = () => void;

/** The latest announcement, in a store of its own so speaking re-renders only the region. */
class AnnouncementStore {
  private message = '';
  private repeat = false;
  private listeners = new Set<Listener>();

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): string => this.message;

  say(text: string): void {
    // A repeat of the same text would not change the region; a trailing zero-width space makes it new.
    this.repeat = !this.repeat;
    this.message = this.repeat ? text : `${text}\u200B`;
    for (const listener of this.listeners) listener();
  }
}

function AnnouncerRegion({ store }: { store: AnnouncementStore }) {
  const message = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return (
    <div className="rg-sr-only" role="status" data-testid="gantt-announcer">
      {message}
    </div>
  );
}

/**
 * Screen-reader announcements for the chart. With an `announce` prop the consumer speaks them (into
 * its own live region); otherwise they go to the chart's visually hidden `role="status"` region.
 */
export function useAnnouncer(announceProp?: (message: string) => void) {
  const propRef = useRef(announceProp);
  propRef.current = announceProp;
  const storeRef = useRef<AnnouncementStore | null>(null);
  if (!storeRef.current) storeRef.current = new AnnouncementStore();
  const store = storeRef.current;

  const announce = useCallback(
    (text: string) => {
      if (!text) return;
      if (propRef.current) propRef.current(text);
      else store.say(text);
    },
    [store],
  );

  return { announce, region: announceProp ? null : <AnnouncerRegion store={store} /> };
}
