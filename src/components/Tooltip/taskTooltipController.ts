import type { GanttTask } from '../../types';

const OFFSET = 12;

function positionTooltip(el: HTMLDivElement | null, x: number, y: number): void {
  if (!el) return;
  el.style.left = `${x + OFFSET}px`;
  el.style.top = `${y + OFFSET}px`;
}

export function isTooltipTaskChanged(prev: GanttTask | null, next: GanttTask): boolean {
  if (!prev) return true;
  return (
    prev.id !== next.id ||
    prev.start !== next.start ||
    prev.end !== next.end ||
    prev.name !== next.name ||
    prev.progress !== next.progress
  );
}

export interface TaskTooltipController {
  show: (task: GanttTask, x: number, y: number) => void;
  move: (x: number, y: number) => void;
  hide: () => void;
  refreshTask: (task: GanttTask) => void;
}

export function createTaskTooltipController(): TaskTooltipController & {
  register: (
    shell: HTMLDivElement | null,
    setVisibleTask: (task: GanttTask | null) => void,
  ) => void;
} {
  let shell: HTMLDivElement | null = null;
  let setVisibleTask: (task: GanttTask | null) => void = () => {};
  let activeTask: GanttTask | null = null;

  const applyTask = (task: GanttTask | null) => {
    activeTask = task;
    setVisibleTask(task);
  };

  return {
    register(nextShell, nextSetVisibleTask) {
      shell = nextShell;
      setVisibleTask = nextSetVisibleTask;
    },
    show(task, x, y) {
      if (isTooltipTaskChanged(activeTask, task)) applyTask(task);
      else activeTask = task;
      if (shell) shell.style.display = '';
      positionTooltip(shell, x, y);
    },
    move(x, y) {
      if (!activeTask) return;
      positionTooltip(shell, x, y);
    },
    hide() {
      applyTask(null);
      if (shell) shell.style.display = 'none';
    },
    refreshTask(task) {
      if (!activeTask || activeTask.id !== task.id) return;
      if (isTooltipTaskChanged(activeTask, task)) applyTask(task);
      else activeTask = task;
    },
  };
}
