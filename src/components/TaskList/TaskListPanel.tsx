import { memo } from 'react';
import type { CustomRowDefinition, GanttColumn, ResolvedTask } from '../../types';
import type { RowLayout } from '../../core/rowLayout';
import type { EventEmitter } from '../../hooks/useGanttEmitter';
import type { CustomRowMetrics } from '../CustomRows/customRowMetrics';
import { CustomRowLeftRows, CustomRowMiddleRows } from '../CustomRows/CustomRowSidebarRows';

interface TaskListPanelProps {
  tasks: ResolvedTask[];
  columns: GanttColumn[];
  rowHeight: number;
  rowLayouts?: RowLayout[];
  width: number;
  selectedTaskIds?: string[];
  emit: EventEmitter;
  customRows?: CustomRowDefinition[];
  customRowMetrics?: CustomRowMetrics;
}

function rowHeightForTask(
  _task: ResolvedTask,
  index: number,
  rowHeight: number,
  rowLayouts?: RowLayout[],
): number {
  return rowLayouts?.[index]?.height ?? rowHeight;
}

export const TaskListPanel = memo(function TaskListPanel({
  tasks,
  columns,
  rowHeight,
  rowLayouts,
  width,
  selectedTaskIds,
  emit,
  customRows = [],
  customRowMetrics,
}: TaskListPanelProps) {
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
        {tasks.map((task, index) => {
          const h = rowHeightForTask(task, index, rowHeight, rowLayouts);
          const selected = selectedTaskIds?.includes(task.id) ?? false;
          return (
            <div
              key={task.id}
              data-task-id={task.id}
              className={`rg-task-row ${selected ? 'rg-task-row--selected' : ''}`}
              style={{ height: h, paddingLeft: 8 + task._level * 16 }}
              onMouseEnter={(e) =>
                emit('taskHover', {
                  task,
                  rowIndex: task._rowIndex,
                  clientX: e.clientX,
                  clientY: e.clientY,
                })
              }
              onMouseMove={(e) =>
                emit('taskHover', {
                  task,
                  rowIndex: task._rowIndex,
                  clientX: e.clientX,
                  clientY: e.clientY,
                })
              }
              onMouseLeave={() => emit('taskHover', { task: null, rowIndex: null })}
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
              {columns.map((col) => (
                <div
                  key={col.key}
                  className="rg-task-cell"
                  style={{ flex: col.flex ?? 1, minWidth: col.minWidth }}
                >
                  {col.render
                    ? col.render({ task, rowIndex: task._rowIndex, columnKey: col.key })
                    : col.key === 'name'
                      ? task.name
                      : col.key === 'progress'
                        ? `${task.progress ?? 0}%`
                        : null}
                </div>
              ))}
            </div>
          );
        })}
        {customRowMetrics && (
          <CustomRowLeftRows
            rows={customRows}
            columns={columns}
            rowHeight={rowHeight}
            metrics={customRowMetrics}
            emit={emit}
          />
        )}
      </div>
    </div>
  );
});

interface MiddlePanelProps {
  tasks: ResolvedTask[];
  columns: GanttColumn[];
  rowHeight: number;
  rowLayouts?: RowLayout[];
  width: number;
  customRows?: CustomRowDefinition[];
  customRowMetrics?: CustomRowMetrics;
  columnOffset?: number;
  emit: EventEmitter;
}

export const MiddlePanel = memo(function MiddlePanel({
  tasks,
  columns,
  rowHeight,
  rowLayouts,
  width,
  customRows = [],
  customRowMetrics,
  columnOffset = 0,
  emit,
}: MiddlePanelProps) {
  if (columns.length === 0) return null;

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
        {tasks.map((task, index) => (
          <div
            key={task.id}
            data-task-id={task.id}
            className="rg-task-row"
            style={{ height: rowHeightForTask(task, index, rowHeight, rowLayouts) }}
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
                    ? task._start.toLocaleDateString()
                    : col.key === 'end'
                      ? task._end.toLocaleDateString()
                      : null}
              </div>
            ))}
          </div>
        ))}
        {customRowMetrics && (
          <CustomRowMiddleRows
            rows={customRows}
            columns={columns}
            rowHeight={rowHeight}
            metrics={customRowMetrics}
            columnOffset={columnOffset}
            emit={emit}
          />
        )}
      </div>
    </div>
  );
});
