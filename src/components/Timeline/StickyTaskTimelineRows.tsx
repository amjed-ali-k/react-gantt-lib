import { memo, useMemo } from 'react';
import type { GroupSummaryRollup, ResolvedTask, TimelineRange } from '../../types';
import type { ViewScale } from '../../core/scale';
import type { TimelineBounds } from '../../core/zoom';
import type { TaskStore } from '../../hooks/useTaskStore';
import type { EventEmitter } from '../../hooks/useGanttEmitter';
import { computeBarXExact, computeBarWidthExact } from '../../core/zoom';
import {
  getTaskBarHeight,
  getTaskBarPad,
  taskHasBarBaseline,
  type RowLayout,
} from '../../core/rowLayout';
import { computeMilestoneGeometry } from './milestoneGeometry';
import { TaskBar } from './TaskBar';
import { shouldRenderTaskBar, resolveTaskInteractionFlags } from '../../core/groupTasks';
import type { StickyPosition } from '../../core/stickyRows';

interface StickyTaskTimelineRowsProps {
  tasks: ResolvedTask[];
  rowLayouts: RowLayout[];
  allTasks: ResolvedTask[];
  position: StickyPosition;
  stickyOffsets: number[];
  range: TimelineRange;
  scale: ViewScale;
  columnWidth: number;
  store: TaskStore;
  enableDrag?: boolean;
  enableResize?: boolean;
  enableProgressDrag?: boolean;
  groupSummaryRollup?: GroupSummaryRollup;
  snapToGrid?: boolean;
  timelineBounds?: TimelineBounds;
  showBaseline?: boolean;
  selectedTaskIds?: string[];
  emit: EventEmitter;
  onTaskUpdate: (taskId: string, patch: { start?: Date; end?: Date; progress?: number }) => void;
}

export const StickyTaskTimelineRows = memo(function StickyTaskTimelineRows({
  tasks,
  rowLayouts,
  allTasks,
  position,
  stickyOffsets,
  range,
  scale,
  columnWidth,
  store,
  enableDrag,
  enableResize,
  enableProgressDrag,
  groupSummaryRollup,
  snapToGrid = true,
  timelineBounds,
  showBaseline = true,
  selectedTaskIds,
  emit,
  onTaskUpdate,
}: StickyTaskTimelineRowsProps) {
  const geometries = useMemo(() => {
    return tasks.map((task, i) => {
      const row = rowLayouts[i]!;
      const hasBarBaseline = taskHasBarBaseline(task, showBaseline);
      const barHeight = getTaskBarHeight(task, row.height, hasBarBaseline);
      const barPad = getTaskBarPad(task, row.height, barHeight, hasBarBaseline);

      if (task.type === 'milestone') {
        return {
          taskId: task.id,
          ...computeMilestoneGeometry(
            task._start,
            0,
            row.height,
            range.start,
            scale,
            columnWidth,
            barHeight,
          ),
        };
      }
      return {
        taskId: task.id,
        x: computeBarXExact(task._start, range.start, scale, columnWidth),
        width: computeBarWidthExact(task._start, task._end, scale, columnWidth, range.start),
        y: barPad,
        height: barHeight,
      };
    });
  }, [tasks, range.start, scale, columnWidth, rowLayouts, showBaseline]);

  if (tasks.length === 0) return null;

  return (
    <>
      {tasks.map((task, i) => {
        if (!shouldRenderTaskBar(task, allTasks)) return null;
        const row = rowLayouts[i]!;
        const g = geometries[i]!;
        const flags = resolveTaskInteractionFlags(task, {
          enableDrag: enableDrag ?? true,
          enableResize: enableResize ?? true,
          enableProgressDrag: enableProgressDrag ?? true,
          groupSummaryRollup,
        });
        const stickyOffset = stickyOffsets[i] ?? 0;

        return (
          <div
            key={task.id}
            className="rg-sticky-task-timeline-row"
            style={{
              height: row.height,
              width: '100%',
              position: 'sticky',
              top: position === 'top' ? stickyOffset : undefined,
              bottom: position === 'bottom' ? stickyOffset : undefined,
              zIndex: 4,
            }}
            data-task-id={task.id}
            data-sticky={position}
            data-testid={i === 0 ? `sticky-task-timeline-${position}` : undefined}
          >
            <svg className="rg-sticky-task-timeline-bars" width="100%" height={row.height}>
              <TaskBar
                task={task}
                geometry={{ x: g.x, y: g.y, width: g.width, height: g.height }}
                columnWidth={columnWidth}
                scale={scale}
                rangeStart={range.start}
                store={store}
                selected={selectedTaskIds?.includes(task.id) ?? false}
                enableDrag={flags.enableDrag}
                enableResize={flags.enableResize}
                enableProgressDrag={flags.enableProgressDrag}
                snapToGrid={snapToGrid}
                timelineBounds={timelineBounds}
                emit={emit}
                onTaskUpdate={onTaskUpdate}
              />
            </svg>
          </div>
        );
      })}
    </>
  );
});
