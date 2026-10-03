import { describe, it, expect } from 'vitest';
import {
  buildFinishToStartPath,
  dependencyPathConstants,
} from '../src/components/Timeline/dependencyPaths';

const { MIN_HEAD_RUN } = dependencyPathConstants;

function finalHorizontalRun(d: string): number {
  const match = d.match(/([\d.]+)\s+([\d.]+)\s+L\s+([\d.]+)\s+([\d.]+)$/);
  if (!match) return 0;
  const [, x1, y1, x2, y2] = match.map(Number);
  if (y1 !== y2) return 0;
  return Math.abs(x2 - x1);
}

describe('buildFinishToStartPath', () => {
  it('uses horizontal-vertical-horizontal when successor is far to the right', () => {
    const d = buildFinishToStartPath(100, 20, 200, 60);
    expect(d).toMatch(/^M 100 20/);
    expect(d).toContain('Q');
    expect(d).toMatch(/L 200 60$/);
    expect(finalHorizontalRun(d)).toBeGreaterThanOrEqual(MIN_HEAD_RUN);
  });

  it('loops through the gutter when successor overlaps predecessor', () => {
    const d = buildFinishToStartPath(100, 20, 110, 60);
    expect(d).toMatch(/^M 100 20/);
    expect(d).toContain('Q');
    expect(d).toMatch(/L 110 60$/);
    expect(finalHorizontalRun(d)).toBeGreaterThanOrEqual(MIN_HEAD_RUN);
    expect(d).not.toMatch(/H /);
  });

  it('keeps at least MIN_HEAD_RUN px straight before the arrowhead when close', () => {
    const d = buildFinishToStartPath(100, 20, 105, 60);
    expect(finalHorizontalRun(d)).toBeGreaterThanOrEqual(MIN_HEAD_RUN);
  });
});

import {
  DEPENDENCY_EDGES,
  arrowHeadPoints,
  buildDependencyPath,
  buildFinishToFinishPath,
  buildStartToFinishPath,
  buildStartToStartPath,
  labelAnchor,
  routeDependency,
} from '../src/components/Timeline/dependencyPaths';
import type { DependencyType } from '../src/types';

/** First and last segment of a route: how it leaves the predecessor and arrives at the successor. */
function ends(type: DependencyType, fromX: number, fromY: number, toX: number, toY: number) {
  const pts = routeDependency(type, fromX, fromY, toX, toY);
  const [a, b] = pts;
  const [y, z] = pts.slice(-2);
  return {
    pts,
    start: a,
    end: z,
    exitDir: Math.sign(b.x - a.x),
    entryDir: Math.sign(z.x - y.x),
    finalRun: Math.abs(z.x - y.x),
    leavesHorizontally: a.y === b.y,
    arrivesHorizontally: y.y === z.y,
  };
}

const CASES: Record<string, [number, number, number, number]> = {
  forward: [100, 20, 260, 60],
  backward: [260, 20, 100, 60],
  overlapping: [100, 20, 108, 60],
  upward: [100, 60, 260, 20],
};

describe('routeDependency', () => {
  // exit: +1 leaves an end edge rightwards, -1 leaves a start edge leftwards.
  // entry: +1 arrives at a start edge travelling right, -1 at an end edge travelling left.
  const expected: Record<DependencyType, { exitDir: number; entryDir: number }> = {
    FS: { exitDir: 1, entryDir: 1 },
    SS: { exitDir: -1, entryDir: 1 },
    FF: { exitDir: 1, entryDir: -1 },
    SF: { exitDir: -1, entryDir: -1 },
  };

  for (const type of Object.keys(DEPENDENCY_EDGES) as DependencyType[]) {
    for (const [name, [fx, fy, tx, ty]] of Object.entries(CASES)) {
      it(`${type} ${name}: leaves ${DEPENDENCY_EDGES[type].from}, arrives at ${DEPENDENCY_EDGES[type].to}`, () => {
        const r = ends(type, fx, fy, tx, ty);
        expect(r.start).toEqual({ x: fx, y: fy });
        expect(r.end).toEqual({ x: tx, y: ty });
        expect(r.leavesHorizontally).toBe(true);
        expect(r.arrivesHorizontally).toBe(true);
        expect(r.exitDir).toBe(expected[type].exitDir);
        expect(r.entryDir).toBe(expected[type].entryDir);
        expect(r.finalRun).toBeGreaterThanOrEqual(MIN_HEAD_RUN);
        // Orthogonal only: every segment is horizontal or vertical.
        for (let i = 0; i < r.pts.length - 1; i++) {
          const [p, q] = [r.pts[i], r.pts[i + 1]];
          expect(p.x === q.x || p.y === q.y).toBe(true);
        }
      });
    }
  }

  it('FS keeps its original geometry (Z forward, gutter loop backward)', () => {
    expect(buildFinishToStartPath(100, 20, 200, 60)).toBe(buildDependencyPath('FS', 100, 20, 200, 60));
    expect(routeDependency('FS', 100, 20, 200, 60)).toHaveLength(4);
    expect(routeDependency('FS', 100, 20, 110, 60)).toHaveLength(6);
  });

  it('SF mirrors FS: a Z when the successor end is well left, a gutter loop otherwise', () => {
    expect(routeDependency('SF', 260, 20, 100, 60)).toHaveLength(4);
    expect(routeDependency('SF', 100, 20, 260, 60)).toHaveLength(6);
  });

  it('SS and FF are one C around the outermost edge', () => {
    const ss = routeDependency('SS', 100, 20, 260, 60);
    expect(ss).toHaveLength(4);
    expect(ss[1].x).toBeLessThan(100);
    const ssBack = routeDependency('SS', 260, 20, 100, 60);
    expect(ssBack[1].x).toBeLessThan(100);
    const ff = routeDependency('FF', 100, 20, 260, 60);
    expect(ff[1].x).toBeGreaterThan(260);
    const ffBack = routeDependency('FF', 260, 20, 100, 60);
    expect(ffBack[1].x).toBeGreaterThan(260);
  });

  it('geometry snapshots', () => {
    const snap = Object.fromEntries(
      (Object.keys(DEPENDENCY_EDGES) as DependencyType[]).flatMap((type) =>
        Object.entries(CASES).map(([name, [fx, fy, tx, ty]]) => [
          `${type} ${name}`,
          buildDependencyPath(type, fx, fy, tx, ty),
        ]),
      ),
    );
    expect(snap).toMatchSnapshot();
  });

  it('named builders match buildDependencyPath', () => {
    expect(buildStartToStartPath(1, 2, 3, 40)).toBe(buildDependencyPath('SS', 1, 2, 3, 40));
    expect(buildFinishToFinishPath(1, 2, 3, 40)).toBe(buildDependencyPath('FF', 1, 2, 3, 40));
    expect(buildStartToFinishPath(1, 2, 3, 40)).toBe(buildDependencyPath('SF', 1, 2, 3, 40));
  });
});

describe('arrowHeadPoints', () => {
  it('points right into a start edge and left into an end edge', () => {
    expect(arrowHeadPoints(routeDependency('FS', 0, 0, 100, 40))).toBe('100,40 92,36 92,44');
    expect(arrowHeadPoints(routeDependency('FF', 0, 0, 100, 40))).toBe('100,40 108,36 108,44');
  });
});

describe('labelAnchor', () => {
  it('sits at the middle of the longest vertical run', () => {
    expect(labelAnchor(routeDependency('FS', 0, 0, 100, 40))).toEqual({ x: 86, y: 20 });
  });

  it('falls back to the first segment for a flat route', () => {
    expect(labelAnchor([{ x: 0, y: 5 }, { x: 10, y: 5 }])).toEqual({ x: 5, y: 5 });
  });
});
