import { useSyncExternalStore } from 'react';
import type { DependencyType } from '../types';
import { dependencyTypeForEdges, type LinkEndpoint } from '../core/dependencyLinking';
import { DEPENDENCY_TYPE_NAMES } from '../components/Timeline/dependencyLinks';

/**
 * A link being drawn: dragged from a connector handle, or started with `L` on a focused bar.
 * `target` is the handle under the pointer, or (keyboard) the focused bar's start edge.
 */
export type LinkSession =
  | { mode: 'pointer'; from: LinkEndpoint; target: LinkEndpoint | null; clientX: number; clientY: number }
  | {
      mode: 'keyboard';
      /** The source's end edge: the keyboard links finish to start unless the menu says otherwise. */
      from: LinkEndpoint;
      target: LinkEndpoint | null;
      /** The bar whose link-type menu is open (Shift+Enter). */
      menuFor: string | null;
    };

/** What the chart supplies: task names for announcements, and the report of a finished link. */
export interface DependencyLinkHandlers {
  nameOf: (taskId: string) => string | undefined;
  /** Speaks progress to assistive tech. */
  announce: (message: string) => void;
  /** Reports a link (never to itself); false when either task no longer exists. */
  create: (
    fromId: string,
    toId: string,
    type: DependencyType,
    source: 'pointer' | 'keyboard',
  ) => boolean;
}

type Listener = () => void;

/**
 * The chart's one in-flight link. Bars start a session and feed it keys; the link layer follows
 * the pointer, draws the preview and the type menu, and ends pointer sessions. No validation
 * beyond "not to itself": cycles and duplicates are the consumer's call.
 */
export class DependencyLinkStore {
  private current: LinkSession | null = null;
  private listeners = new Set<Listener>();
  constructor(readonly handlers: DependencyLinkHandlers) {}

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): LinkSession | null => this.current;

  get session(): LinkSession | null {
    return this.current;
  }

  private set(session: LinkSession | null, message?: string): void {
    this.current = session;
    for (const listener of this.listeners) listener();
    if (message) this.handlers.announce(message);
  }

  /** A task's name for announcements, or its id. */
  name(taskId: string): string {
    return this.handlers.nameOf(taskId) ?? taskId;
  }

  beginPointer(from: LinkEndpoint, clientX: number, clientY: number): void {
    this.set({ mode: 'pointer', from, clientX, clientY, target: null });
  }

  movePointer(clientX: number, clientY: number, target: LinkEndpoint | null): void {
    const s = this.session;
    if (s?.mode !== 'pointer') return;
    const sameTarget = s.target?.taskId === target?.taskId && s.target?.edge === target?.edge;
    if (s.clientX === clientX && s.clientY === clientY && sameTarget) return;
    this.set({ ...s, clientX, clientY, target: sameTarget ? s.target : target });
  }

  /** Ends a drag: links when dropped on another task's handle, otherwise cancels silently. */
  dropPointer(target: LinkEndpoint | null): void {
    const s = this.session;
    if (s?.mode !== 'pointer') return;
    if (!target || target.taskId === s.from.taskId) this.set(null);
    else this.finish(s.from.taskId, target.taskId, dependencyTypeForEdges(s.from.edge, target.edge), 'pointer');
  }

  beginKeyboard(fromId: string): void {
    this.set(
      { mode: 'keyboard', from: { taskId: fromId, edge: 'end' }, target: null, menuFor: null },
      `Linking from ${this.name(fromId)}. Move to another task and press Enter to link finish to start, or Shift+Enter to choose the type. Escape cancels.`,
    );
  }

  /** A bar took focus: during a keyboard session another task becomes the target. */
  focusBar(taskId: string): void {
    const s = this.session;
    if (s?.mode !== 'keyboard' || s.menuFor || s.target?.taskId === taskId) return;
    this.set({ ...s, target: taskId === s.from.taskId ? null : { taskId, edge: 'start' } });
  }

  /**
   * A key on a linkable bar. `L` starts linking; during a keyboard session Enter links to this
   * bar (FS) and Shift+Enter opens the type menu. Returns whether the key was used.
   */
  handleBarKey(
    taskId: string,
    e: { key: string; shiftKey: boolean; ctrlKey: boolean; metaKey: boolean; altKey: boolean },
  ): boolean {
    const s = this.session;
    if (!s && (e.key === 'l' || e.key === 'L') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      this.beginKeyboard(taskId);
      return true;
    }
    if (s?.mode !== 'keyboard' || e.key !== 'Enter') return false;
    const fromId = s.from.taskId;
    if (taskId === fromId) {
      this.set(s, 'Choose a different task to link to.');
    } else if (e.shiftKey) {
      this.set(
        { ...s, target: { taskId, edge: 'start' }, menuFor: taskId },
        `Choose the link type from ${this.name(fromId)} to ${this.name(taskId)}.`,
      );
    } else {
      this.finish(fromId, taskId, 'FS', 'keyboard');
    }
    return true;
  }

  /** Closes the type menu and keeps linking. */
  closeMenu(): void {
    const s = this.session;
    if (s?.mode === 'keyboard' && s.menuFor) this.set({ ...s, menuFor: null });
  }

  /** Picks a type in the menu. */
  chooseType(type: DependencyType): void {
    const s = this.session;
    if (s?.mode === 'keyboard' && s.menuFor) this.finish(s.from.taskId, s.menuFor, type, 'keyboard');
  }

  cancel(): void {
    if (!this.session) return;
    this.set(null, 'Linking cancelled.');
  }

  private finish(fromId: string, toId: string, type: DependencyType, source: 'pointer' | 'keyboard'): void {
    // Cleared first, so a consumer that re-renders from the callback sees no session.
    this.set(null);
    // A request, not a result: the consumer decides whether the link may exist.
    if (this.handlers.create(fromId, toId, type, source)) {
      this.handlers.announce(
        `Requested a ${DEPENDENCY_TYPE_NAMES[type]} link from ${this.name(fromId)} to ${this.name(toId)}.`,
      );
    }
  }
}

export function useLinkSession(store: DependencyLinkStore): LinkSession | null {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
