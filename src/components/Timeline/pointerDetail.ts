import type { GanttPointerDetail, GanttTarget } from '../../types';

export function createPointerDetail(
  target: GanttTarget,
  e: { clientX: number; clientY: number; preventDefault: () => void },
): GanttPointerDetail {
  return {
    target,
    clientX: e.clientX,
    clientY: e.clientY,
    preventDefault: () => e.preventDefault(),
  };
}
