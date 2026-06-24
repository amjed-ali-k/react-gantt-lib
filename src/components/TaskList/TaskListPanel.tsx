import { memo } from 'react';
import type { CSSProperties } from 'react';
import type { CustomRowDefinition, GanttColumn, GanttTask, ResolvedTask } from '../../types';
import type { RowLayout } from '../../core/rowLayout';
import type { EventEmitter } from '../../hooks/useGanttEmitter';
import type { CustomRowMetrics } from '../CustomRows/customRowMetrics';
import { taskSupportsCollapse } from '../../core/groupTasks';
import { formatDisplayDate } from '../../core/displayFormat';
import { useGanttDisplayTimezone } from '../../context/GanttDisplayContext';
import { CustomRowLeftRows, CustomRowMiddleRows } from '../CustomRows/CustomRowSidebarRows';
import { useTaskTooltipOptional } from '../Tooltip/TaskTooltipLayer';
import type { StickyPosition } from '../../core/stickyRows';

interface StickyTaskSections {
  top: ResolvedTask[];
  scroll: ResolvedTask[];
  bottom: ResolvedTask[];
}

interface StickyCustomRowSections {
  top: CustomRowDefinition[];
  inline: CustomRowDefinition[];
  bottom: CustomRowDefinition[];
}

interface StickyOffsets {
  topTasks: number[];
  scrollTasks: number[];
  bottomTasks: number[];
  topCustomRows: number[];
  bottomCustomRows: number[];
}

interface TaskListPanelProps {
  tasks: ResolvedTask[];
  stickyTasks?: StickyTaskSections;
  sourceTasks: GanttTask[];
  columns: GanttColumn[];
  rowHeight: number;
  rowLayouts?: RowLayout[];
  stickyRowLayouts?: {
    top: RowLayout[];
    scroll: RowLayout[];
    bottom: RowLayout[];
  };
  width: number;
  selectedTaskIds?: string[];
  onToggleCollapse?: (taskId: string) => void;
  emit: EventEmitter;
  customRows?: CustomRowDefinition[];
  stickyCustomRows?: StickyCustomRowSections;
  customRowMetrics?: CustomRowMetrics;
  stickyOffsets?: StickyOffsets;
}

function rowHeightForTask(
  _task: ResolvedTask,
  index: number,
  rowHeight: number,
  rowLayouts?: RowLayout[],
): number {
  return rowLayouts?.[index]?.height ?? rowHeight;
}

function stickyRowStyle(
  position: StickyPosition | undefined,
  offset: number | undefined,
): CSSProperties | undefined {
  if (!position || offset === undefined) return undefined;
  return position === 'top'
    ? {
        position: 'sticky',
        top: offset,
        zIndex: 2,
        background: 'var(--rg-sticky-row-bg, var(--rg-surface))',
      }
    : {
        position: 'sticky',
        bottom: offset,
        zIndex: 2,
        background: 'var(--rg-sticky-row-bg, var(--rg-surface))',
      };
}

interface TaskRowsProps {
  tasks: ResolvedTask[];
  sourceTasks: GanttTask[];
  columns: GanttColumn[];
  rowHeight: number;
  rowLayouts?: RowLayout[];
  selectedTaskIds?: string[];
  onToggleCollapse?: (taskId: string) => void;
  emit: EventEmitter;
  tooltip: ReturnType<typeof useTaskTooltipOptional>;
  stickyPosition?: StickyPosition;
  stickyOffsets?: number[];
}

function TaskRows({
  tasks,
  sourceTasks,
  columns,
  rowHeight,
  rowLayouts,
  selectedTaskIds,
  onToggleCollapse,
  emit,
  tooltip,
  stickyPosition,
  stickyOffsets,
}: TaskRowsProps) {
  return (
    <>
      {tasks.map((task, index) => {
        const h = rowHeightForTask(task, index, rowHeight, rowLayouts);
        const selected = selectedTaskIds?.includes(task.id) ?? false;
        return (
          <div
            key={task.id}
            data-task-id={task.id}
            data-sticky={stickyPosition}
            className={`rg-task-row ${selected ? 'rg-task-row--selected' : ''}${stickyPosition ? ' rg-row--sticky' : ''}`}
            style={{
              height: h,
              paddingLeft: 8 + task._level * 16,
              ...stickyRowStyle(stickyPosition, stickyOffsets?.[index]),
            }}
            onMouseEnter={(e) => {
              emit('taskHover', {
                task,
                rowIndex: task._rowIndex,
                clientX: e.clientX,
                clientY: e.clientY,
              });
              tooltip?.show(task, e.clientX, e.clientY);
            }}
            onMouseMove={(e) => tooltip?.move(e.clientX, e.clientY)}
            onMouseLeave={() => {
              emit('taskHover', { task: null, rowIndex: null });
              tooltip?.hide();
            }}
            onClick={(e) =>
              emit('taskClick', {
                task,
                rowIndex: task._rowIndex,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey,
                shiftKey: e.shiftKey,
              })
            }
          >
            {columns.map((col, colIndex) => {
              const showCollapse =
                colIndex === 0 &&
                !!onToggleCollapse &&
                taskSupportsCollapse(task, sourceTasks);
              const cellContent = col.render
                ? col.render({ task, rowIndex: task._rowIndex, columnKey: col.key })
                : col.key === 'name'
                  ? task.name
                  : col.key === 'progress'
                    ? `${task.progress ?? 0}%`
                    : null;

              return (
                <div
                  key={col.key}
                  className="rg-task-cell"
                  style={{ flex: col.flex ?? 1, minWidth: col.minWidth }}
                >
                  {showCollapse && (
                    <button
                      type="button"
                      className="rg-task-collapse"
                      aria-expanded={!task.collapsed}
                      aria-label={task.collapsed ? 'Expand group' : 'Collapse group'}
                      title={task.collapsed ? 'Expand' : 'Collapse'}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleCollapse!(task.id);
                      }}
                    >
                      <span className="rg-task-collapse-icon" aria-hidden>
                        {task.collapsed ? '▸' : '▾'}
                      </span>
                    </button>
                  )}
                  {cellContent}
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

export const TaskListPanel = memo(function TaskListPanel({
  tasks,
  stickyTasks,
  sourceTasks,
  columns,
  rowHeight,
  rowLayouts,
  stickyRowLayouts,
  width,
  selectedTaskIds,
  onToggleCollapse,
  emit,
  customRows = [],
  stickyCustomRows,
  customRowMetrics,
  stickyOffsets,
}: TaskListPanelProps) {
  const tooltip = useTaskTooltipOptional();

  const topTasks = stickyTasks?.top ?? [];
  const scrollTasks = stickyTasks?.scroll ?? tasks;
  const bottomTasks = stickyTasks?.bottom ?? [];
  const topCustomRows = stickyCustomRows?.top ?? [];
  const inlineCustomRows = stickyCustomRows?.inline ?? customRows;
  const bottomCustomRows = stickyCustomRows?.bottom ?? [];

  return (
    <div className="rg-task-list" style={{ width }} data-testid="task-list-left">
      <div className="rg-task-list-header">
        {columns.map((col) => (
          <div
            key={col.key}
            className="rg-task-list-header-cell"
            style={{ flex: col.flex ?? 1, minWidth: col.minWidth }}
          >
            {col.title}
          </div>
        ))}
      </div>
      <div className="rg-task-list-body">
        <TaskRows
          tasks={topTasks}
          sourceTasks={sourceTasks}
          columns={columns}
          rowHeight={rowHeight}
          rowLayouts={stickyRowLayouts?.top}
          selectedTaskIds={selectedTaskIds}
          onToggleCollapse={onToggleCollapse}
          emit={emit}
          tooltip={tooltip}
          stickyPosition="top"
          stickyOffsets={stickyOffsets?.topTasks}
        />
        {customRowMetrics && topCustomRows.length > 0 && (
          <CustomRowLeftRows
            rows={topCustomRows}
            columns={columns}
            rowHeight={rowHeight}
            metrics={customRowMetrics}
            emit={emit}
            stickyPosition="top"
            stickyOffsets={stickyOffsets?.topCustomRows}
          />
        )}
        <TaskRows
          tasks={scrollTasks}
          sourceTasks={sourceTasks}
          columns={columns}
          rowHeight={rowHeight}
          rowLayouts={stickyRowLayouts?.scroll ?? rowLayouts}
          selectedTaskIds={selectedTaskIds}
          onToggleCollapse={onToggleCollapse}
          emit={emit}
          tooltip={tooltip}
        />
        {customRowMetrics && inlineCustomRows.length > 0 && (
          <CustomRowLeftRows
            rows={inlineCustomRows}
            columns={columns}
            rowHeight={rowHeight}
            metrics={customRowMetrics}
            emit={emit}
          />
        )}
        {customRowMetrics && bottomCustomRows.length > 0 && (
          <CustomRowLeftRows
            rows={bottomCustomRows}
            columns={columns}
            rowHeight={rowHeight}
            metrics={customRowMetrics}
            emit={emit}
            stickyPosition="bottom"
            stickyOffsets={stickyOffsets?.bottomCustomRows}
          />
        )}
        <TaskRows
          tasks={bottomTasks}
          sourceTasks={sourceTasks}
          columns={columns}
          rowHeight={rowHeight}
          rowLayouts={stickyRowLayouts?.bottom}
          selectedTaskIds={selectedTaskIds}
          onToggleCollapse={onToggleCollapse}
          emit={emit}
          tooltip={tooltip}
          stickyPosition="bottom"
          stickyOffsets={stickyOffsets?.bottomTasks}
        />
      </div>
    </div>
  );
});

interface MiddlePanelProps {
  tasks: ResolvedTask[];
  stickyTasks?: StickyTaskSections;
  columns: GanttColumn[];
  rowHeight: number;
  rowLayouts?: RowLayout[];
  stickyRowLayouts?: {
    top: RowLayout[];
    scroll: RowLayout[];
    bottom: RowLayout[];
  };
  width: number;
  customRows?: CustomRowDefinition[];
  stickyCustomRows?: StickyCustomRowSections;
  customRowMetrics?: CustomRowMetrics;
  columnOffset?: number;
  emit: EventEmitter;
  stickyOffsets?: StickyOffsets;
}

function MiddleTaskRows({
  tasks,
  columns,
  rowHeight,
  rowLayouts,
  stickyPosition,
  stickyOffsets,
}: {
  tasks: ResolvedTask[];
  columns: GanttColumn[];
  rowHeight: number;
  rowLayouts?: RowLayout[];
  stickyPosition?: StickyPosition;
  stickyOffsets?: number[];
}) {
  const timezone = useGanttDisplayTimezone();

  return (
    <>
      {tasks.map((task, index) => (
        <div
          key={task.id}
          data-task-id={task.id}
          data-sticky={stickyPosition}
          className={`rg-task-row${stickyPosition ? ' rg-row--sticky' : ''}`}
          style={{
            height: rowHeightForTask(task, index, rowHeight, rowLayouts),
            ...stickyRowStyle(stickyPosition, stickyOffsets?.[index]),
          }}
        >
          {columns.map((col) => (
            <div
              key={col.key}
              className="rg-task-cell"
              style={{ flex: col.flex ?? 1, minWidth: col.minWidth }}
            >
              {col.render
                ? col.render({ task, rowIndex: task._rowIndex, columnKey: col.key })
                : col.key === 'start'
                  ? formatDisplayDate(task._start, timezone)
                  : col.key === 'end'
                    ? formatDisplayDate(task._end, timezone)
                    : null}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

export const MiddlePanel = memo(function MiddlePanel({
  tasks,
  stickyTasks,
  columns,
  rowHeight,
  rowLayouts,
  stickyRowLayouts,
  width,
  customRows = [],
  stickyCustomRows,
  customRowMetrics,
  columnOffset = 0,
  emit,
  stickyOffsets,
}: MiddlePanelProps) {
  if (columns.length === 0) return null;

  const topTasks = stickyTasks?.top ?? [];
  const scrollTasks = stickyTasks?.scroll ?? tasks;
  const bottomTasks = stickyTasks?.bottom ?? [];
  const topCustomRows = stickyCustomRows?.top ?? [];
  const inlineCustomRows = stickyCustomRows?.inline ?? customRows;
  const bottomCustomRows = stickyCustomRows?.bottom ?? [];

  return (
    <div className="rg-task-list rg-task-list--middle" style={{ width }} data-testid="task-list-middle">
      <div className="rg-task-list-header">
        {columns.map((col) => (
          <div
            key={col.key}
            className="rg-task-list-header-cell"
            style={{ flex: col.flex ?? 1, minWidth: col.minWidth }}
          >
            {col.title}
          </div>
        ))}
      </div>
      <div className="rg-task-list-body">
        <MiddleTaskRows
          tasks={topTasks}
          columns={columns}
          rowHeight={rowHeight}
          rowLayouts={stickyRowLayouts?.top}
          stickyPosition="top"
          stickyOffsets={stickyOffsets?.topTasks}
        />
        {customRowMetrics && topCustomRows.length > 0 && (
          <CustomRowMiddleRows
            rows={topCustomRows}
            columns={columns}
            rowHeight={rowHeight}
            metrics={customRowMetrics}
            columnOffset={columnOffset}
            emit={emit}
            stickyPosition="top"
            stickyOffsets={stickyOffsets?.topCustomRows}
          />
        )}
        <MiddleTaskRows
          tasks={scrollTasks}
          columns={columns}
          rowHeight={rowHeight}
          rowLayouts={stickyRowLayouts?.scroll ?? rowLayouts}
        />
        {customRowMetrics && inlineCustomRows.length > 0 && (
          <CustomRowMiddleRows
            rows={inlineCustomRows}
            columns={columns}
            rowHeight={rowHeight}
            metrics={customRowMetrics}
            columnOffset={columnOffset}
            emit={emit}
          />
        )}
        {customRowMetrics && bottomCustomRows.length > 0 && (
          <CustomRowMiddleRows
            rows={bottomCustomRows}
            columns={columns}
            rowHeight={rowHeight}
            metrics={customRowMetrics}
            columnOffset={columnOffset}
            emit={emit}
            stickyPosition="bottom"
            stickyOffsets={stickyOffsets?.bottomCustomRows}
          />
        )}
        <MiddleTaskRows
          tasks={bottomTasks}
          columns={columns}
          rowHeight={rowHeight}
          rowLayouts={stickyRowLayouts?.bottom}
          stickyPosition="bottom"
          stickyOffsets={stickyOffsets?.bottomTasks}
        />
      </div>
    </div>
  );
});
