import { useSyncExternalStore } from 'react';
import type { DependencyType } from '../types';
import { resolveLinkDrop, type LinkEndpoint } from '../core/dependencyLinking';
import { DEPENDENCY_TYPE_NAMES } from '../components/Timeline/dependencyLinks';

/** A link being drawn: dragged from a connector handle, or started with `L` on a focused bar. */
export type LinkSession =
  | {
      mode: 'pointer';
      from: LinkEndpoint;
      clientX: number;
      clientY: number;
      /** The connector handle under the pointer, if any. */
      target: LinkEndpoint | null;
    }
  | {
      mode: 'keyboard';
      fromId: string;
      /** The focused bar — where Enter would link to. */
      targetId: string | null;
      /** The bar whose link-type menu is open (Shift+Enter). */
      menuFor: string | null;
    };

export interface DependencyLinkSnapshot {
  session: LinkSession | null;
  /** Text for the chart's live region. */
  message: string;
}

/** What the chart supplies: task names for announcements, and the report of a finished link. */
export interface DependencyLinkHandlers {
  nameOf: (taskId: string) => string | undefined;
  /** Reports a link; false when either task no longer exists. */
  create: (
    fromId: string,
    toId: string,
    type: DependencyType,
    source: 'pointer' | 'keyboard',
  ) => boolean;
}

type Listener = () => void;

const IDLE: DependencyLinkSnapshot = { session: null, message: '' };

/**
 * The chart's one in-flight link. Bars start a session and feed it keys; the link layer follows
 * the pointer, draws the preview and the type menu, and ends pointer sessions. No validation
 * beyond "not to itself": cycles and duplicates are the consumer's call.
 */
export class DependencyLinkStore {
  private snapshot: DependencyLinkSnapshot = IDLE;
  private listeners = new Set<Listener>();
  handlers: DependencyLinkHandlers = { nameOf: () => undefined, create: () => false };

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): DependencyLinkSnapshot => this.snapshot;

  get session(): LinkSession | null {
    return this.snapshot.session;
  }

  private set(session: LinkSession | null, message = this.snapshot.message): void {
    this.snapshot = { session, message };
    for (const listener of this.listeners) listener();
  }

  private name(taskId: string): string {
    return this.handlers.nameOf(taskId) ?? taskId;
  }

  beginPointer(from: LinkEndpoint, clientX: number, clientY: number): void {
    this.set({ mode: 'pointer', from, clientX, clientY, target: null }, '');
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
    const link = resolveLinkDrop(s.from, target);
    if (link) this.finish(link.fromId, link.toId, link.type, 'pointer');
    else this.set(null);
  }

  beginKeyboard(fromId: string): void {
    this.set(
      { mode: 'keyboard', fromId, targetId: fromId, menuFor: null },
      `Linking from ${this.name(fromId)}. Move to another task and press Enter to link finish to start, or Shift+Enter to choose the type. Escape cancels.`,
    );
  }

  /** A bar took focus: during a keyboard session it becomes the target. */
  focusBar(taskId: string): void {
    const s = this.session;
    if (s?.mode !== 'keyboard' || s.menuFor || s.targetId === taskId) return;
    this.set({ ...s, targetId: taskId });
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
    if (taskId === s.fromId) {
      this.set(s, 'Choose a different task to link to.');
    } else if (e.shiftKey) {
      this.set(
        { ...s, targetId: taskId, menuFor: taskId },
        `Choose the link type from ${this.name(s.fromId)} to ${this.name(taskId)}.`,
      );
    } else {
      this.finish(s.fromId, taskId, 'FS', 'keyboard');
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
    if (s?.mode === 'keyboard' && s.menuFor) this.finish(s.fromId, s.menuFor, type, 'keyboard');
  }

  cancel(): void {
    if (!this.session) return;
    this.set(null, 'Linking cancelled.');
  }

  private finish(fromId: string, toId: string, type: DependencyType, source: 'pointer' | 'keyboard'): void {
    // Cleared first, so a consumer that re-renders from the callback sees no session.
    this.set(null, '');
    const created = this.handlers.create(fromId, toId, type, source);
    this.set(
      null,
      created ? `Linked ${this.name(fromId)} to ${this.name(toId)}, ${DEPENDENCY_TYPE_NAMES[type]}.` : '',
    );
  }
}

/** The current session's mode — a primitive, so subscribers re-render only on start and end. */
export function useLinkingMode(store: DependencyLinkStore): LinkSession['mode'] | null {
  return useSyncExternalStore(
    store.subscribe,
    () => store.getSnapshot().session?.mode ?? null,
    () => null,
  );
}

export function useDependencyLinkSnapshot(store: DependencyLinkStore): DependencyLinkSnapshot {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
