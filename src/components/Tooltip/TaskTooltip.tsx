import type { GanttTask } from '../../types';
import { formatTaskDateTime, toDate } from '../../core/dates';
import { useGanttDisplayTimezone } from '../../context/GanttDisplayContext';

/** Tooltip body — position is applied imperatively by `TaskTooltipLayer`. */
export function TaskTooltipContent({ task }: { task: GanttTask }) {
  const timezone = useGanttDisplayTimezone();
  const start = toDate(task.start);
  const end = toDate(task.end);

  return (
    <>
      <div className="rg-task-tooltip-name">{task.name}</div>
      <div className="rg-task-tooltip-row">
        <span className="rg-task-tooltip-label">Start</span>
        <span>{formatTaskDateTime(start, timezone)}</span>
      </div>
      <div className="rg-task-tooltip-row">
        <span className="rg-task-tooltip-label">End</span>
        <span>{formatTaskDateTime(end, timezone)}</span>
      </div>
    </>
  );
}
