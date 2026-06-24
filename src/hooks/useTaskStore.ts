import { useCallback, useRef, useSyncExternalStore } from 'react';
import type { GanttTask } from '../types';
import { updateTaskInList } from '../core/zoom';

type Listener = () => void;

/** External store for granular task updates — only subscribers to changed task re-render */
export class TaskStore {
  private tasks: GanttTask[];
  private version = 0;
  private taskVersions = new Map<string, number>();
  private listeners = new Set<Listener>();

  constructor(initial: GanttTask[]) {
    this.tasks = initial;
    for (const t of initial) this.taskVersions.set(t.id, 0);
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): GanttTask[] => this.tasks;

  getVersion = (): number => this.version;

  getTaskVersion(taskId: string): number {
    return this.taskVersions.get(taskId) ?? 0;
  }

  private notify(): void {
    this.version++;
    for (const l of this.listeners) l();
  }

  private bumpTask(taskId: string): void {
    this.taskVersions.set(taskId, (this.taskVersions.get(taskId) ?? 0) + 1);
  }

  setTasks(tasks: GanttTask[]): void {
    this.tasks = tasks;
    for (const t of tasks) {
      if (!this.taskVersions.has(t.id)) this.taskVersions.set(t.id, 0);
    }
    this.notify();
  }

  updateTask(taskId: string, patch: Partial<GanttTask>): void {
    this.tasks = updateTaskInList(this.tasks, taskId, patch);
    this.bumpTask(taskId);
    this.notify();
  }

  private applyReplace(tasks: GanttTask[]): boolean {
    const changed = new Set<string>();
    const oldMap = new Map(this.tasks.map((t) => [t.id, t]));
    for (const t of tasks) {
      const old = oldMap.get(t.id);
      if (!old || JSON.stringify(old) !== JSON.stringify(t)) changed.add(t.id);
    }
    const lengthChanged = tasks.length !== oldMap.size;
    if (changed.size === 0 && !lengthChanged) return false;

    this.tasks = tasks;
    for (const id of changed) this.bumpTask(id);
    return true;
  }

  replaceTasks(tasks: GanttTask[]): void {
    if (this.applyReplace(tasks)) this.notify();
  }

  /**
   * Sync tasks from props *during render*. Updates the snapshot and per-task
   * versions immediately so the owning component renders fresh data, but does
   * NOT call listeners — notifying here would trigger setState in subscribed
   * descendants (e.g. TaskBar) while the parent is still rendering, which React
   * forbids ("Cannot update a component while rendering a different one").
   *
   * No deferred notify is needed: the owning component re-renders with the new
   * snapshot and hands each TaskBar its updated task object, and TaskBar's memo
   * comparator inspects the rendered task fields, so changed bars re-render and
   * unchanged bars stay memoised.
   */
  syncExternalTasks(tasks: GanttTask[]): void {
    this.applyReplace(tasks);
  }
}

export function useTaskStore(externalTasks: GanttTask[]) {
  const storeRef = useRef<TaskStore | null>(null);
  if (!storeRef.current) storeRef.current = new TaskStore(externalTasks);

  const store = storeRef.current;
  const prevExternal = useRef(externalTasks);

  if (prevExternal.current !== externalTasks) {
    store.syncExternalTasks(externalTasks);
    prevExternal.current = externalTasks;
  }

  const tasks = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  const updateTask = useCallback(
    (taskId: string, patch: Partial<GanttTask>) => store.updateTask(taskId, patch),
    [store],
  );

  return { tasks, updateTask, store };
}

export function useTaskVersion(store: TaskStore, taskId: string): number {
  return useSyncExternalStore(
    store.subscribe,
    () => store.getTaskVersion(taskId),
    () => store.getTaskVersion(taskId),
  );
}

export function useTasksSnapshot(store: TaskStore): GanttTask[] {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
