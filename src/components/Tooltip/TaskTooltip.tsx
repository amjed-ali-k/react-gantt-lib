import type { GanttTask } from '../../types';
import { formatTaskDateTime, toDate } from '../../core/dates';

interface TaskTooltipProps {
  task: GanttTask;
  x: number;
  y: number;
}

export function TaskTooltip({ task, x, y }: TaskTooltipProps) {
  const start = toDate(task.start);
  const end = toDate(task.end);

  return (
    <div
      className="rg-task-tooltip"
      style={{ left: x + 12, top: y + 12 }}
      role="tooltip"
    >
      <div className="rg-task-tooltip-name">{task.name}</div>
      <div className="rg-task-tooltip-row">
        <span className="rg-task-tooltip-label">Start</span>
        <span>{formatTaskDateTime(start)}</span>
      </div>
      <div className="rg-task-tooltip-row">
        <span className="rg-task-tooltip-label">End</span>
        <span>{formatTaskDateTime(end)}</span>
      </div>
    </div>
  );
}
