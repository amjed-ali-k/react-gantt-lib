import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
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
  // Inside a double-quoted attribute selector only `"` and `\` need escaping.
  const id = taskId.replace(/["\\]/g, '\\$&');
  return scrollEl.querySelector<SVGGElement>(`.rg-bar[data-task-id="${id}"]`);
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
  /** Where the link would land: the target's connector point. */
  target?: Point;
  /** The target bar's box — where the type menu opens. */
  targetBox?: { left: number; top: number; bottom: number };
}

/**
 * Preview geometry for a session, in this layer's coordinates, measured from where the bars are
 * drawn now — so sticky rows and scrolling need no extra maths. The ends are the bar shapes' edges,
 * the same points `taskConnectorX` gives drawn links.
 */
function measurePreview(
  session: LinkSession,
  root: HTMLElement,
  scrollEl: HTMLElement,
): LinkPreview | null {
  const fromRect = shapeRect(scrollEl, session.from.taskId);
  if (!fromRect) return null;
  const origin = root.getBoundingClientRect();
  const local = (x: number, y: number): Point => ({ x: x - origin.left, y: y - origin.top });
  const edgePoint = (rect: DOMRect, edge: DependencyEdge) =>
    local(edge === 'start' ? rect.left : rect.right, rect.top + rect.height / 2);

  const source = { ...local(fromRect.left, fromRect.top), width: fromRect.width, height: fromRect.height };
  const from = edgePoint(fromRect, session.from.edge);
  const targetRect =
    session.target && session.target.taskId !== session.from.taskId
      ? shapeRect(scrollEl, session.target.taskId)
      : null;

  let to: Point;
  let toEdge: DependencyEdge;
  if (targetRect) {
    toEdge = session.target!.edge;
    to = edgePoint(targetRect, toEdge);
  } else if (session.mode === 'pointer') {
    to = local(session.clientX, session.clientY);
    // Free end: arrive the way the pointer lies, so the preview does not loop back on itself.
    toEdge = to.x >= from.x ? 'start' : 'end';
  } else {
    return { source };
  }

  const type = dependencyTypeForEdges(session.from.edge, toEdge);
  const points = routeDependency(type, from.x, from.y, to.x, to.y);
  return {
    source,
    d: routeToPath(points),
    head: arrowHeadPoints(points),
    target: targetRect ? to : undefined,
    targetBox: targetRect
      ? {
          left: targetRect.left - origin.left,
          top: targetRect.top - origin.top,
          bottom: targetRect.bottom - origin.top,
        }
      : undefined,
  };
}

interface LinkTypeMenuProps {
  /** The target bar's box, in this layer's coordinates. */
  anchor: { left: number; top: number; bottom: number };
  fromName: string;
  toName: string;
  onChoose: (type: DependencyType) => void;
  /** Closes the menu; `refocus` returns focus to the target bar. */
  onClose: (refocus: boolean) => void;
}

const MENU_GAP = 4;

/** Shift+Enter's menu: the four link types, keyboard first. */
function LinkTypeMenu({ anchor, fromName, toName, onChoose, onClose }: LinkTypeMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<{ left: number; top: number } | null>(null);

  // Below the bar, or above it when it would be cut off; kept inside the layer horizontally.
  useLayoutEffect(() => {
    const menu = ref.current;
    const layer = menu?.parentElement;
    if (!menu || !layer) return;
    const { offsetWidth: width, offsetHeight: height } = menu;
    const below = anchor.bottom + MENU_GAP;
    const top =
      below + height > layer.clientHeight && anchor.top - MENU_GAP - height >= 0
        ? anchor.top - MENU_GAP - height
        : below;
    const left = Math.max(0, Math.min(anchor.left, layer.clientWidth - width));
    setPlacement({ left, top });
  }, [anchor.left, anchor.top, anchor.bottom]);

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
      // First render sits below the bar; the layout effect flips or clamps it before paint.
      style={placement ?? { left: anchor.left, top: anchor.bottom + MENU_GAP }}
      onKeyDown={handleKeyDown}
      // A press inside keeps focus where it is (Safari does not focus clicked buttons, so the
      // menu would otherwise see a blur with nowhere to go and close before the click).
      onPointerDown={(e) => e.preventDefault()}
      onBlur={(e) => {
        const next = e.relatedTarget;
        if (next instanceof Node && !ref.current?.contains(next)) onClose(false);
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

  // Escape cancels; a keyboard session also ends when focus leaves the chart, and only hears
  // Escape from inside it. Any session re-measures when the timeline scrolls under it.
  useEffect(() => {
    const scrollEl = scrollRef.current;
    const chart = rootRef.current?.closest<HTMLElement>('.rg-gantt') ?? null;
    if (!mode || !scrollEl || !chart) return;
    // Shows every linkable bar's handles while a link is drawn (no chart re-render).
    chart.classList.add('rg-gantt--linking');
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (mode === 'keyboard' && !(e.target instanceof Node && chart.contains(e.target))) return;
      e.preventDefault();
      store.cancel();
    };
    const onFocusOut = (e: FocusEvent) => {
      if (mode !== 'keyboard') return;
      const next = e.relatedTarget;
      if (!(next instanceof Node && chart.contains(next))) store.cancel();
    };
    const onScroll = () => setScrollFrame((n) => n + 1);
    document.addEventListener('keydown', onKeyDown);
    chart.addEventListener('focusout', onFocusOut);
    scrollEl.addEventListener('scroll', onScroll);
    return () => {
      chart.classList.remove('rg-gantt--linking');
      document.removeEventListener('keydown', onKeyDown);
      chart.removeEventListener('focusout', onFocusOut);
      scrollEl.removeEventListener('scroll', onScroll);
    };
  }, [mode, store, scrollRef]);

  // A pointer drag: follows the pointer once per frame, and auto-scrolls near the viewport edges
  // unless the pointer is over a handle it could drop on.
  useEffect(() => {
    const scrollEl = scrollRef.current;
    const start = store.session;
    if (mode !== 'pointer' || !scrollEl || start?.mode !== 'pointer') return;
    let pointer = { x: start.clientX, y: start.clientY, target: null as EventTarget | null };
    let raf: number | null = null;

    // The handle under the pointer: hit-tested where the DOM can, else the event's own target.
    const targetAt = (x: number, y: number, fallback: EventTarget | null) => {
      const el = elementAt(x, y);
      return endpointOf(scrollEl, el === undefined ? fallback : el);
    };

    const frame = () => {
      raf = null;
      store.movePointer(pointer.x, pointer.y, targetAt(pointer.x, pointer.y, pointer.target));
      const s = store.session;
      if (s?.mode !== 'pointer' || s.target) return;
      const r = scrollEl.getBoundingClientRect();
      const dx = autoScrollSpeed(pointer.x, r.left, r.right);
      const dy = autoScrollSpeed(pointer.y, r.top + TIMELINE_HEADER_HEIGHT, r.bottom);
      if (dx === 0 && dy === 0) return;
      const { scrollLeft, scrollTop } = scrollEl;
      scrollEl.scrollLeft = scrollLeft + dx;
      scrollEl.scrollTop = scrollTop + dy;
      // At the end of the timeline there is nothing left to scroll; wait for the pointer to move.
      if (scrollEl.scrollLeft === scrollLeft && scrollEl.scrollTop === scrollTop) return;
      raf = requestAnimationFrame(frame);
    };
    const schedule = () => {
      if (raf === null) raf = requestAnimationFrame(frame);
    };

    const onMove = (e: PointerEvent) => {
      pointer = { x: e.clientX, y: e.clientY, target: e.target };
      schedule();
    };
    const onUp = (e: PointerEvent) => store.dropPointer(targetAt(e.clientX, e.clientY, e.target));
    const onCancel = () => store.cancel();

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
    scrollEl.addEventListener('scroll', schedule);
    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onCancel);
      scrollEl.removeEventListener('scroll', schedule);
    };
  }, [mode, store, scrollRef]);

  const root = rootRef.current;
  const scrollEl = scrollRef.current;
  const preview = session && root && scrollEl ? measurePreview(session, root, scrollEl) : null;

  const menuFor = session?.mode === 'keyboard' ? session.menuFor : null;
  let menu = null;
  if (session && menuFor && preview?.targetBox && scrollEl) {
    const refocus = () => barElement(scrollEl, menuFor)?.focus();
    menu = (
      <LinkTypeMenu
        anchor={preview.targetBox}
        fromName={store.name(session.from.taskId)}
        toName={store.name(menuFor)}
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
