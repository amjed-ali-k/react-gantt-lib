import { memo, useMemo } from 'react';
import type { BlockDateRange, DateMarkingLayers, GroupSummaryRollup, ResolvedTask, TimelineRange } from '../../types';
import type { ViewScale } from '../../core/scale';
import type { VisibleColumnRange } from '../../core/visibleColumns';
import type { TimelineBounds } from '../../core/zoom';
import type { TaskStore } from '../../hooks/useTaskStore';
import type { DragPreviewStore } from '../../hooks/useDragPreviewStore';
import type { EventEmitter } from '../../hooks/useGanttEmitter';
import { computeBarXExact, computeBarWidthExact } from '../../core/zoom';
import {
  getTaskBarHeight,
  getTaskBarPad,
  taskHasBarBaseline,
  totalRowLayoutHeight,
  type RowLayout,
} from '../../core/rowLayout';
import { computeMilestoneGeometry } from './milestoneGeometry';
import { TaskBar } from './TaskBar';
import { TimelineGrid } from './TimelineGrid';
import { DependencyLayer, type DependencyLagFormatter } from './DependencyLayer';
import { DependencyHitTargets } from './DependencyHitTargets';
import { BaselineLayer } from './BaselineLayer';
import { DateMarkingInteractionLayer } from './DateMarkingInteractionLayer';
import { TimelineHitLayer } from './TimelineHitLayer';
import { shouldRenderTaskBar, resolveTaskInteractionFlags } from '../../core/groupTasks';

interface TimelineBodyProps {
  tasks: ResolvedTask[];
  range: TimelineRange;
  scale: ViewScale;
  columnWidth: number;
  rowLayouts: RowLayout[];
  visibleColumns: VisibleColumnRange;
  store: TaskStore;
  enableDrag?: boolean;
  enableResize?: boolean;
  enableProgressDrag?: boolean;
  groupSummaryRollup?: GroupSummaryRollup;
  snapToGrid?: boolean;
  timelineBounds?: TimelineBounds;
  dateMarkings?: DateMarkingLayers;
  blockDates?: BlockDateRange[];
  showBaseline?: boolean;
  selectedTaskIds?: string[];
  selectedDependencyIds?: string[];
  formatDependencyLag?: DependencyLagFormatter;
  /** When set, links are interactive (hover, click/keyboard select) and this selects one. */
  onDependencySelect?: (id: string, multi: boolean) => void;
  interactionsEnabled?: boolean;
  emit: EventEmitter;
  dragPreviewStore: DragPreviewStore;
  onTaskUpdate: (taskId: string, patch: { start?: Date; end?: Date; progress?: number }) => void;
}

export const TimelineBody = memo(function TimelineBody({
  tasks,
  range,
  scale,
  columnWidth,
  rowLayouts,
  visibleColumns,
  store,
  enableDrag,
  enableResize,
  enableProgressDrag,
  groupSummaryRollup,
  snapToGrid = true,
  timelineBounds,
  dateMarkings,
  blockDates,
  showBaseline = true,
  selectedTaskIds,
  selectedDependencyIds,
  formatDependencyLag,
  onDependencySelect,
  interactionsEnabled = false,
  emit,
  dragPreviewStore,
  onTaskUpdate,
}: TimelineBodyProps) {
  const geometries = useMemo(() => {
    return tasks.map((task, i) => {
      const row = rowLayouts[i];
      const hasBarBaseline = taskHasBarBaseline(task, showBaseline);
      const barHeight = getTaskBarHeight(task, row.height, hasBarBaseline);
      const barPad = getTaskBarPad(task, row.height, barHeight, hasBarBaseline);

      if (task.type === 'milestone') {
        return {
          taskId: task.id,
          ...computeMilestoneGeometry(
            task._start,
            row.y,
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
        y: row.y + barPad,
        height: barHeight,
      };
    });
  }, [tasks, range.start, scale, columnWidth, rowLayouts, showBaseline]);

  const totalHeight = totalRowLayoutHeight(rowLayouts);

  return (
    <div className="rg-timeline-body" data-testid="timeline-body">
      <TimelineGrid
        range={range}
        scale={scale}
        columnWidth={columnWidth}
        rowLayouts={rowLayouts}
        visibleColumns={visibleColumns}
        dateMarkings={dateMarkings}
      />
      <TimelineHitLayer
        range={range}
        scale={scale}
        columnWidth={columnWidth}
        rowLayouts={rowLayouts}
        height={totalHeight}
        interactive={interactionsEnabled}
        emit={emit}
      />
      <DateMarkingInteractionLayer
        dateMarkings={dateMarkings}
        blockDates={blockDates}
        height={totalHeight}
        interactive={interactionsEnabled}
        emit={emit}
      />
      <DependencyLayer
        tasks={tasks}
        range={range}
        scale={scale}
        columnWidth={columnWidth}
        rowLayouts={rowLayouts}
        showBaseline={showBaseline}
        dragPreviewStore={dragPreviewStore}
        selectedDependencyIds={selectedDependencyIds}
        formatLag={formatDependencyLag}
      />
      {showBaseline && (
        <BaselineLayer
          tasks={tasks}
          barGeometries={geometries.map((g) => ({
            x: g.x,
            y: g.y,
            width: g.width,
            height: g.height,
          }))}
          rowLayouts={rowLayouts}
          rangeStart={range.start}
          scale={scale}
          columnWidth={columnWidth}
          totalHeight={totalHeight}
          showBaseline={showBaseline}
          interactive={interactionsEnabled}
          emit={emit}
        />
      )}
      <svg className="rg-timeline-bars" width="100%" height={totalHeight}>
        {onDependencySelect && (
          <DependencyHitTargets
            tasks={tasks}
            range={range}
            scale={scale}
            columnWidth={columnWidth}
            rowLayouts={rowLayouts}
            showBaseline={showBaseline}
            dragPreviewStore={dragPreviewStore}
            selectedDependencyIds={selectedDependencyIds}
            formatLag={formatDependencyLag}
            emit={emit}
            onSelect={onDependencySelect}
          />
        )}
        {tasks.map((task, i) => {
          if (!shouldRenderTaskBar(task, tasks)) return null;
          const g = geometries[i];
          const flags = resolveTaskInteractionFlags(task, {
            enableDrag: enableDrag ?? true,
            enableResize: enableResize ?? true,
            enableProgressDrag: enableProgressDrag ?? true,
            groupSummaryRollup,
          });
          return (
            <TaskBar
              key={task.id}
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
          );
        })}
      </svg>
    </div>
  );
});
