import { describe, it, expect, vi } from 'vitest';
import {
  AUTO_SCROLL_MAX_SPEED,
  AUTO_SCROLL_ZONE,
  autoScrollSpeed,
  dependencyTypeForEdges,
} from '../src/core/dependencyLinking';
import { DEPENDENCY_EDGES } from '../src/components/Timeline/dependencyPaths';
import { DependencyLinkStore } from '../src/hooks/useDependencyLinkStore';
import type { DependencyType } from '../src/types';

describe('dependencyTypeForEdges', () => {
  it.each([
    ['end', 'start', 'FS'],
    ['start', 'start', 'SS'],
    ['end', 'end', 'FF'],
    ['start', 'end', 'SF'],
  ] as const)('%s → %s is %s', (from, to, type) => {
    expect(dependencyTypeForEdges(from, to)).toBe(type);
  });

  it('is the inverse of DEPENDENCY_EDGES', () => {
    for (const type of Object.keys(DEPENDENCY_EDGES) as DependencyType[]) {
      const { from, to } = DEPENDENCY_EDGES[type];
      expect(dependencyTypeForEdges(from, to)).toBe(type);
    }
  });
});

describe('autoScrollSpeed', () => {
  it('is 0 away from the edges', () => {
    expect(autoScrollSpeed(500, 0, 1000)).toBe(0);
    expect(autoScrollSpeed(AUTO_SCROLL_ZONE, 0, 1000)).toBe(0);
  });

  it('scrolls back near the leading edge and forward near the trailing one, faster closer in', () => {
    expect(autoScrollSpeed(30, 0, 1000)).toBeLessThan(0);
    expect(autoScrollSpeed(970, 0, 1000)).toBeGreaterThan(0);
    expect(autoScrollSpeed(995, 0, 1000)).toBeGreaterThan(autoScrollSpeed(970, 0, 1000));
  });

  it('caps at the max speed at and past the edge', () => {
    expect(autoScrollSpeed(1000, 0, 1000)).toBe(AUTO_SCROLL_MAX_SPEED);
    expect(autoScrollSpeed(1400, 0, 1000)).toBe(AUTO_SCROLL_MAX_SPEED);
    expect(autoScrollSpeed(-50, 0, 1000)).toBe(-AUTO_SCROLL_MAX_SPEED);
  });

  it('narrows the zone on a small viewport, and does nothing on an empty one', () => {
    expect(autoScrollSpeed(50, 0, 90)).toBe(0);
    expect(autoScrollSpeed(5, 0, 90)).toBeLessThan(0);
    expect(autoScrollSpeed(0, 0, 0)).toBe(0);
  });
});

describe('DependencyLinkStore', () => {
  function storeWith(create = vi.fn(() => true)) {
    const said: string[] = [];
    const store = new DependencyLinkStore({
      nameOf: (id) => id.toUpperCase(),
      create,
      announce: (message) => said.push(message),
    });
    const lastSaid = () => said.at(-1) ?? '';
    return { store, create, said, lastSaid };
  }
  const keys = { shiftKey: false, ctrlKey: false, metaKey: false, altKey: false };

  it('a pointer drop on another handle creates the link and ends the session', () => {
    const { store, create, lastSaid } = storeWith();
    store.beginPointer({ taskId: 'a', edge: 'start' }, 0, 0);
    store.dropPointer({ taskId: 'b', edge: 'end' });
    expect(create).toHaveBeenCalledWith('a', 'b', 'SF', 'pointer');
    expect(store.session).toBeNull();
    expect(lastSaid()).toBe('Requested a start to finish link from A to B.');
  });

  it('a pointer drop on nothing, or on the task it started from, ends the session without a link', () => {
    const { store, create } = storeWith();
    store.beginPointer({ taskId: 'a', edge: 'end' }, 0, 0);
    store.dropPointer(null);
    expect(store.session).toBeNull();
    store.beginPointer({ taskId: 'a', edge: 'end' }, 0, 0);
    store.dropPointer({ taskId: 'a', edge: 'start' });
    expect(store.session).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });

  it('a keyboard session targets the focused bar\'s start, never the source', () => {
    const { store } = storeWith();
    store.beginKeyboard('a');
    store.focusBar('b');
    expect(store.session).toMatchObject({ from: { taskId: 'a', edge: 'end' }, target: { taskId: 'b', edge: 'start' } });
    store.focusBar('a');
    expect(store.session).toMatchObject({ target: null });
  });

  it('movePointer keeps the same snapshot when nothing changed', () => {
    const { store } = storeWith();
    store.beginPointer({ taskId: 'a', edge: 'end' }, 1, 2);
    const before = store.getSnapshot();
    store.movePointer(1, 2, null);
    expect(store.getSnapshot()).toBe(before);
    store.movePointer(1, 2, { taskId: 'b', edge: 'start' });
    expect(store.getSnapshot()).not.toBe(before);
  });

  it('L starts a keyboard session; Enter on the source asks for another task', () => {
    const { store, create, lastSaid } = storeWith();
    expect(store.handleBarKey('a', { ...keys, key: 'l' })).toBe(true);
    expect(store.session).toMatchObject({ mode: 'keyboard', from: { taskId: 'a' } });
    expect(store.handleBarKey('a', { ...keys, key: 'Enter' })).toBe(true);
    expect(create).not.toHaveBeenCalled();
    expect(lastSaid()).toBe('Choose a different task to link to.');
  });

  it('ignores L with a modifier, and other keys outside a session', () => {
    const { store } = storeWith();
    expect(store.handleBarKey('a', { ...keys, key: 'l', ctrlKey: true })).toBe(false);
    expect(store.handleBarKey('a', { ...keys, key: 'Enter' })).toBe(false);
    expect(store.session).toBeNull();
  });

  it('Shift+Enter opens the type menu; choosing a type creates that link', () => {
    const { store, create } = storeWith();
    store.beginKeyboard('a');
    store.handleBarKey('b', { ...keys, key: 'Enter', shiftKey: true });
    expect(store.session).toMatchObject({ mode: 'keyboard', menuFor: 'b' });
    store.closeMenu();
    expect(store.session).toMatchObject({ mode: 'keyboard', menuFor: null });
    store.handleBarKey('b', { ...keys, key: 'Enter', shiftKey: true });
    store.chooseType('FF');
    expect(create).toHaveBeenCalledWith('a', 'b', 'FF', 'keyboard');
  });

  it('cancel announces only when a session was running', () => {
    const { store, said, lastSaid } = storeWith();
    store.cancel();
    expect(said).toEqual([]);
    store.beginKeyboard('a');
    store.cancel();
    expect(store.session).toBeNull();
    expect(lastSaid()).toBe('Linking cancelled.');
  });

  it('says nothing about a link the chart refused', () => {
    const { store, lastSaid } = storeWith(vi.fn(() => false));
    store.beginKeyboard('a');
    store.handleBarKey('b', { ...keys, key: 'Enter' });
    expect(lastSaid()).toMatch(/^Linking from/);
  });
});
