import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type RefObject,
} from 'react';
import type { SidebarLayoutState } from '../types';

export interface UseSidebarLayoutOptions {
  defaultLeftWidth?: number;
  defaultMiddleWidth?: number;
  minPanelWidth?: number;
  onLayoutChange?: (layout: SidebarLayoutState) => void;
}

export function useSidebarLayout(
  containerRef: RefObject<HTMLElement | null>,
  options: UseSidebarLayoutOptions = {},
) {
  const {
    defaultLeftWidth = 220,
    defaultMiddleWidth = 180,
    minPanelWidth = 80,
    onLayoutChange,
  } = options;

  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [middleWidth, setMiddleWidth] = useState(defaultMiddleWidth);
  const [totalWidth, setTotalWidth] = useState(0);
  const dragRef = useRef<{
    divider: 'left' | 'middle';
    startX: number;
    startLeft: number;
    startMiddle: number;
  } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? el.clientWidth;
      setTotalWidth(w);
    });
    ro.observe(el);
    setTotalWidth(el.clientWidth);
    return () => ro.disconnect();
  }, [containerRef]);

  const timelineLeft = leftWidth + middleWidth;
  const rightWidth = Math.max(0, totalWidth - timelineLeft);

  const layout: SidebarLayoutState = {
    leftWidth,
    middleWidth,
    rightWidth,
    timelineLeft,
    totalWidth,
  };

  const onLayoutChangeRef = useRef(onLayoutChange);
  onLayoutChangeRef.current = onLayoutChange;

  const lastEmittedRef = useRef<SidebarLayoutState | null>(null);

  useEffect(() => {
    const last = lastEmittedRef.current;
    if (
      last &&
      last.leftWidth === leftWidth &&
      last.middleWidth === middleWidth &&
      last.totalWidth === totalWidth
    ) {
      return;
    }
    const next: SidebarLayoutState = {
      leftWidth,
      middleWidth,
      rightWidth,
      timelineLeft,
      totalWidth,
    };
    lastEmittedRef.current = next;
    onLayoutChangeRef.current?.(next);
  }, [leftWidth, middleWidth, totalWidth, rightWidth, timelineLeft]);

  const onDividerPointerDown = useCallback(
    (divider: 'left' | 'middle') => (e: React.PointerEvent) => {
      e.preventDefault();
      dragRef.current = {
        divider,
        startX: e.clientX,
        startLeft: leftWidth,
        startMiddle: middleWidth,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [leftWidth, middleWidth],
  );

  const onDividerPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.startX;

      if (drag.divider === 'left') {
        const maxLeft = totalWidth - minPanelWidth * 2;
        setLeftWidth(
          Math.max(minPanelWidth, Math.min(maxLeft, drag.startLeft + dx)),
        );
      } else {
        const maxMiddle = totalWidth - drag.startLeft - minPanelWidth;
        setMiddleWidth(
          Math.max(minPanelWidth, Math.min(maxMiddle, drag.startMiddle + dx)),
        );
      }
    },
    [totalWidth, minPanelWidth],
  );

  const onDividerPointerUp = useCallback((e: React.PointerEvent) => {
    dragRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  }, []);

  return {
    layout,
    leftWidth,
    middleWidth,
    timelineLeft,
    onDividerPointerDown,
    onDividerPointerMove,
    onDividerPointerUp,
    setLeftWidth,
    setMiddleWidth,
  };
}
