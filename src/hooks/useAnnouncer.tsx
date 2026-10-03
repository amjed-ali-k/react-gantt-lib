import { useCallback, useRef, useState } from 'react';

/**
 * Screen-reader announcements for the chart. With an `announce` prop the consumer speaks them (into
 * its own live region); otherwise they go to the chart's visually hidden `role="status"` region.
 */
export function useAnnouncer(announceProp?: (message: string) => void) {
  const propRef = useRef(announceProp);
  propRef.current = announceProp;
  const [message, setMessage] = useState('');
  // A repeat of the same text would not change the region; a trailing zero-width space makes it new.
  const repeat = useRef(false);

  const announce = useCallback((text: string) => {
    if (!text) return;
    if (propRef.current) {
      propRef.current(text);
      return;
    }
    repeat.current = !repeat.current;
    setMessage(repeat.current ? text : `${text}​`);
  }, []);

  const region = announceProp ? null : (
    <div className="rg-sr-only" role="status" data-testid="gantt-announcer">
      {message}
    </div>
  );
  return { announce, region };
}
