import { useCallback, useRef } from 'react';
import type { GanttEventMap, GanttEventName, GanttCallbacks } from '../types';

export type EventEmitter = <K extends GanttEventName>(
  name: K,
  detail: GanttEventMap[K],
) => void;

const CALLBACK_MAP: Record<GanttEventName, keyof GanttCallbacks> = {
  taskClick: 'onTaskClick',
  taskDoubleClick: 'onTaskDoubleClick',
  ganttClick: 'onGanttClick',
  ganttContextMenu: 'onGanttContextMenu',
  ganttHover: 'onGanttHover',
  taskHover: 'onTaskHover',
  taskDragStart: 'onTaskDragStart',
  taskDrag: 'onTaskDrag',
  taskDragEnd: 'onTaskDragEnd',
  taskResizeStart: 'onTaskResizeStart',
  taskResize: 'onTaskResize',
  taskResizeEnd: 'onTaskResizeEnd',
  progressChange: 'onProgressChange',
  draggableMarkerDragStart: 'onDraggableMarkerDragStart',
  draggableMarkerDrag: 'onDraggableMarkerDrag',
  draggableMarkerDragEnd: 'onDraggableMarkerDragEnd',
  draggableMarkerDragToSnapPoint: 'onDraggableMarkerDragToSnapPoint',
  zoomChange: 'onZoomChange',
  scroll: 'onScroll',
  sidebarLayoutChange: 'onSidebarLayoutChange',
  selectionChange: 'onSelectionChange',
  customRowCellReady: 'onCustomRowCellReady',
  customRowCellError: 'onCustomRowCellError',
};

export function useGanttEmitter(callbacks: GanttCallbacks): EventEmitter {
  const ref = useRef(callbacks);
  ref.current = callbacks;

  return useCallback(<K extends GanttEventName>(name: K, detail: GanttEventMap[K]) => {
    const key = CALLBACK_MAP[name];
    const handler = ref.current[key] as ((d: GanttEventMap[K]) => void) | undefined;
    handler?.(detail);
  }, []);
}
