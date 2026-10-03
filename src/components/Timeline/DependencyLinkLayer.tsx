import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import type { DependencyType } from '../../types';
import { TIMELINE_HEADER_HEIGHT } from '../../core/eventMarkers';
import {
  autoScrollSpeed,
  dependencyTypeForEdges,
  type LinkEndpoint,
} from '../../core/dependencyLinking';
import {
  useDependencyLinkSnapshot,
  type DependencyLinkStore,
  type LinkSession,
} from '../../hooks/useDependencyLinkStore';
import { DEPENDENCY_TYPE_NAMES } from './dependencyLinks';
import {
  arrowHeadPoints,
  routeDependency,
  routeToPath,
  type DependencyEdge,
  type Point,
} from './dependencyPaths';

const MENU_TYPES: DependencyType[] = ['FS', 'SS', 'FF', 'SF'];

/** The bar group of `taskId` inside the timeline (every section: sticky and scrolling rows). */
function barElement(scrollEl: HTMLElement, taskId: string): SVGGElement | null {
  for (const bar of scrollEl.querySelectorAll<SVGGElement>('.rg-bar[data-task-id]')) {
    if (bar.getAttribute('data-task-id') === taskId) return bar;
  }
  return null;
}

/** The drawn shape of a task: a bar's background rect or a milestone's diamond. */
function shapeRect(scrollEl: HTMLElement, taskId: string): DOMRect | null {
  const shape = barElement(scrollEl, taskId)?.querySelector('.rg-bar-bg, .rg-bar-milestone');
  return shape ? shape.getBoundingClientRect() : null;
}

/** The connector handle `el` belongs to, if it is one of this chart's. */
function endpointOf(scrollEl: HTMLElement, el: EventTarget | null): LinkEndpoint | null {
  if (!(el instanceof Element)) return null;
  const hit = el.closest('[data-connector-edge]');
  const bar = hit?.closest('.rg-bar[data-task-id]');
  if (!hit || !bar || !scrollEl.contains(bar)) return null;
  return {
    taskId: bar.getAttribute('data-task-id')!,
    edge: hit.getAttribute('data-connector-edge') as DependencyEdge,
  };
}

/** The element under a point, or `undefined` where the DOM cannot hit-test (jsdom). */
function elementAt(x: number, y: number): Element | null | undefined {
  return typeof document.elementFromPoint === 'function' ? document.elementFromPoint(x, y) : undefined;
}

interface LinkPreview {
  source: { x: number; y: number; width: number; height: number };
  /** Line and arrowhead, when there is somewhere to draw to. */
  d?: string;
  head?: string;
  /** The handle (pointer) or bar edge (keyboard) the link would land on. */
  target?: Point;
}

/** Preview geometry for a session, in this layer's coordinates, from where the bars are drawn now. */
function measurePreview(
  session: LinkSession,
  root: HTMLElement,
  scrollEl: HTMLElement,
): LinkPreview | null {
  const fromId = session.mode === 'pointer' ? session.from.taskId : session.fromId;
  const fromRect = shapeRect(scrollEl, fromId);
  if (!fromRect) return null;
  const origin = root.getBoundingClientRect();
  const local = (x: number, y: number): Point => ({ x: x - origin.left, y: y - origin.top });
  const edgePoint = (rect: DOMRect, edge: DependencyEdge) =>
    local(edge === 'start' ? rect.left : rect.right, rect.top + rect.height / 2);

  const source = {
    ...local(fromRect.left, fromRect.top),
    width: fromRect.width,
    height: fromRect.height,
  };
  const fromEdge: DependencyEdge = session.mode === 'pointer' ? session.from.edge : 'end';
  const from = edgePoint(fromRect, fromEdge);

  let to: Point;
  let toEdge: DependencyEdge;
  let target: Point | undefined;
  const targetId = session.mode === 'pointer' ? session.target?.taskId : session.targetId;
  const targetRect = targetId && targetId !== fromId ? shapeRect(scrollEl, targetId) : null;
  if (targetRect) {
    toEdge = session.mode === 'pointer' ? session.target!.edge : 'start';
    to = target = edgePoint(targetRect, toEdge);
  } else if (session.mode === 'pointer') {
    to = local(session.clientX, session.clientY);
    // Free end: arrive the way the pointer lies, so the preview does not loop back on itself.
    toEdge = to.x >= from.x ? 'start' : 'end';
  } else {
    return { source };
  }

  const points = routeDependency(dependencyTypeForEdges(fromEdge, toEdge), from.x, from.y, to.x, to.y);
  return { source, d: routeToPath(points), head: arrowHeadPoints(points), target };
}

interface LinkTypeMenuProps {
  at: Point;
  fromName: string;
  toName: string;
  onChoose: (type: DependencyType) => void;
  /** Closes the menu; `refocus` returns focus to the target bar. */
  onClose: (refocus: boolean) => void;
}

/** Shift+Enter's menu: the four link types, keyboard first. */
function LinkTypeMenu({ at, fromName, toName, onChoose, onClose }: LinkTypeMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(ref.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    let next = -1;
    if (e.key === 'ArrowDown') next = (index + 1) % items.length;
    else if (e.key === 'ArrowUp') next = (index - 1 + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    else if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      // The chart's Escape would cancel linking altogether; here it only closes the menu.
      e.stopPropagation();
      onClose(true);
      return;
    }
    if (next >= 0) {
      e.preventDefault();
      items[next]?.focus();
    }
  };

  return (
    <div
      ref={ref}
      className="rg-link-menu"
      role="menu"
      aria-label={`Link ${fromName} to ${toName} as`}
      style={{ left: at.x, top: at.y }}
      onKeyDown={handleKeyDown}
      onBlur={(e) => {
        if (!ref.current?.contains(e.relatedTarget as Node | null)) onClose(false);
      }}
    >
      {MENU_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          role="menuitem"
          tabIndex={-1}
          className="rg-link-menu-item"
          onClick={() => onChoose(type)}
        >
          <span className="rg-link-menu-type">{type}</span> {DEPENDENCY_TYPE_NAMES[type]}
        </button>
      ))}
    </div>
  );
}

interface DependencyLinkLayerProps {
  store: DependencyLinkStore;
  /** The timeline's scroll viewport: hit-testing scope and the element auto-scroll moves. */
  scrollRef: RefObject<HTMLDivElement | null>;
}

/**
 * Overlay over the timeline viewport for drawing a new link: follows a handle drag (auto-scrolling
 * near the viewport edges), draws the preview with the same router as real links, hosts the
 * Shift+Enter type menu and announces progress in a live region. Escape cancels any session.
 */
export function DependencyLinkLayer({ store, scrollRef }: DependencyLinkLayerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { session, message } = useDependencyLinkSnapshot(store);
  // Bumped when the viewport scrolls under a drag, so the preview is re-measured.
  const [, setScrollFrame] = useState(0);
  const mode = session?.mode ?? null;

  useEffect(() => {
    if (!mode) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      store.cancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mode, store]);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    const start = store.session;
    if (mode !== 'pointer' || !scrollEl || start?.mode !== 'pointer') return;
    let pointer = { x: start.clientX, y: start.clientY };
    let raf: number | null = null;

    // Where the pointer is, re-probed after a scroll moved the bars under it.
    const reprobe = () => {
      const s = store.session;
      if (s?.mode !== 'pointer') return;
      const el = elementAt(pointer.x, pointer.y);
      store.movePointer(pointer.x, pointer.y, el === undefined ? s.target : endpointOf(scrollEl, el));
    };

    const tick = () => {
      raf = null;
      const r = scrollEl.getBoundingClientRect();
      const dx = autoScrollSpeed(pointer.x, r.left, r.right);
      const dy = autoScrollSpeed(pointer.y, r.top + TIMELINE_HEADER_HEIGHT, r.bottom);
      if (dx === 0 && dy === 0) return;
      const { scrollLeft, scrollTop } = scrollEl;
      scrollEl.scrollLeft = scrollLeft + dx;
      scrollEl.scrollTop = scrollTop + dy;
      // At the end of the timeline there is nothing left to scroll; wait for the pointer to move.
      if (scrollEl.scrollLeft === scrollLeft && scrollEl.scrollTop === scrollTop) return;
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      pointer = { x: e.clientX, y: e.clientY };
      const el = elementAt(e.clientX, e.clientY);
      store.movePointer(e.clientX, e.clientY, endpointOf(scrollEl, el === undefined ? e.target : el));
      if (raf === null) raf = requestAnimationFrame(tick);
    };
    const onUp = (e: PointerEvent) => {
      const el = elementAt(e.clientX, e.clientY);
      store.dropPointer(endpointOf(scrollEl, el === undefined ? e.target : el));
    };
    const onCancel = () => store.cancel();
    const onScroll = () => {
      reprobe();
      setScrollFrame((n) => n + 1);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
    scrollEl.addEventListener('scroll', onScroll);
    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onCancel);
      scrollEl.removeEventListener('scroll', onScroll);
    };
  }, [mode, store, scrollRef]);

  const root = rootRef.current;
  const scrollEl = scrollRef.current;
  const preview = session && root && scrollEl ? measurePreview(session, root, scrollEl) : null;

  const menuFor = session?.mode === 'keyboard' ? session.menuFor : null;
  let menu = null;
  if (session?.mode === 'keyboard' && menuFor && root && scrollEl) {
    const rect = shapeRect(scrollEl, menuFor);
    const origin = root.getBoundingClientRect();
    const refocus = () => barElement(scrollEl, menuFor)?.focus();
    const name = (id: string) => store.handlers.nameOf(id) ?? id;
    menu = (
      <LinkTypeMenu
        at={{
          x: rect ? rect.left - origin.left : 0,
          y: rect ? rect.bottom - origin.top + 4 : 0,
        }}
        fromName={name(session.fromId)}
        toName={name(menuFor)}
        onChoose={(type) => {
          store.chooseType(type);
          refocus();
        }}
        onClose={(shouldRefocus) => {
          store.closeMenu();
          if (shouldRefocus) refocus();
        }}
      />
    );
  }

  return (
    <div ref={rootRef} className="rg-link-layer" data-testid="dependency-link-layer">
      {preview && (
        <svg className="rg-link-preview" width="100%" height="100%" aria-hidden="true">
          <rect
            className="rg-link-source"
            x={preview.source.x - 3}
            y={preview.source.y - 3}
            width={preview.source.width + 6}
            height={preview.source.height + 6}
            rx={5}
          />
          {preview.d && (
            <g
              className={`rg-dependency rg-dependency--preview${preview.target ? ' rg-dependency--preview-target' : ''}`}
            >
              <path d={preview.d} className="rg-dependency-arrow" fill="none" />
              <polygon points={preview.head} className="rg-dependency-arrow-head" />
            </g>
          )}
          {preview.target && (
            <circle className="rg-link-target" cx={preview.target.x} cy={preview.target.y} r={7} />
          )}
        </svg>
      )}
      {menu}
      <div className="rg-sr-only" role="status">
        {message}
      </div>
    </div>
  );
}
