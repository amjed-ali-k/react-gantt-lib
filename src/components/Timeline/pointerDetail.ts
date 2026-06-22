import type { GanttPointerDetail, GanttTarget } from '../../types';

export function createPointerDetail(
  target: GanttTarget,
  e: {
    clientX: number;
    clientY: number;
    preventDefault: () => void;
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
  },
): GanttPointerDetail {
  return {
    target,
    clientX: e.clientX,
    clientY: e.clientY,
    ctrlKey: e.ctrlKey,
    metaKey: e.metaKey,
    shiftKey: e.shiftKey,
    preventDefault: () => e.preventDefault(),
  };
}
