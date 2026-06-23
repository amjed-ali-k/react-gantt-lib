import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { GanttTask, TaskTooltipChangeHandler, TaskTooltipRenderer } from '../../types';
import { TaskTooltipContent } from './TaskTooltip';
import { createTaskTooltipController, type TaskTooltipController } from './taskTooltipController';

const TaskTooltipContext = createContext<TaskTooltipController | null>(null);

export function useTaskTooltipOptional(): TaskTooltipController | null {
  return useContext(TaskTooltipContext);
}

function TaskTooltipOverlay({
  controller,
  renderTaskTooltip,
  onTaskChange,
}: {
  controller: ReturnType<typeof createTaskTooltipController>;
  renderTaskTooltip?: TaskTooltipRenderer;
  onTaskChange: (taskId: string, patch: Partial<GanttTask>) => void;
}) {
  const [task, setTask] = useState<GanttTask | null>(null);
  const taskRef = useRef<GanttTask | null>(null);
  const renderTaskTooltipRef = useRef(renderTaskTooltip);
  const onTaskChangeRef = useRef(onTaskChange);
  renderTaskTooltipRef.current = renderTaskTooltip;
  onTaskChangeRef.current = onTaskChange;

  const setVisibleTask = useCallback(
    (next: GanttTask | null) => {
      taskRef.current = next;
      setTask(next);
    },
    [],
  );

  const shellRef = useCallback(
    (node: HTMLDivElement | null) => {
      controller.register(node, setVisibleTask);
    },
    [controller, setVisibleTask],
  );

  const stableOnChange = useCallback<TaskTooltipChangeHandler>((patch) => {
    const current = taskRef.current;
    if (!current) return;
    onTaskChangeRef.current(current.id, patch);
    const merged: GanttTask = { ...current, ...patch };
    taskRef.current = merged;
    controller.refreshTask(merged);
  }, [controller]);

  const content = useMemo(() => {
    if (!task) return null;
    const render = renderTaskTooltipRef.current;
    return render ? render(task, stableOnChange) : <TaskTooltipContent task={task} />;
  }, [task, stableOnChange]);

  const custom = !!renderTaskTooltip;

  return (
    <div
      ref={shellRef}
      className={custom ? 'rg-task-tooltip-shell' : 'rg-task-tooltip'}
      style={{ display: 'none' }}
      role="tooltip"
    >
      {content}
    </div>
  );
}

export function TaskTooltipProvider({
  enabled,
  renderTaskTooltip,
  onTaskChange,
  children,
}: {
  enabled: boolean;
  renderTaskTooltip?: TaskTooltipRenderer;
  onTaskChange: (taskId: string, patch: Partial<GanttTask>) => void;
  children: ReactNode;
}) {
  const controllerRef = useRef<ReturnType<typeof createTaskTooltipController>>();
  if (!controllerRef.current) {
    controllerRef.current = createTaskTooltipController();
  }
  const controller = controllerRef.current;
  const onTaskChangeRef = useRef(onTaskChange);
  onTaskChangeRef.current = onTaskChange;

  const handleTaskChange = useCallback((taskId: string, patch: Partial<GanttTask>) => {
    onTaskChangeRef.current(taskId, patch);
  }, []);

  useEffect(() => {
    if (!enabled) controller.hide();
  }, [enabled, controller]);

  return (
    <TaskTooltipContext.Provider value={enabled ? controller : null}>
      {children}
      {enabled && (
        <TaskTooltipOverlay
          controller={controller}
          renderTaskTooltip={renderTaskTooltip}
          onTaskChange={handleTaskChange}
        />
      )}
    </TaskTooltipContext.Provider>
  );
}
