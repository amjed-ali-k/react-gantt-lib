import { describe, it, expect } from 'vitest';
import {
  collectDependencyTargets,
  computeDependencyLinks,
  defaultDependencyLagLabel,
  dependencyAccessibleName,
  dependencyId,
  normalizeDependency,
} from '../src/components/Timeline/dependencyLinks';
import { taskConnectorX, MILESTONE_DIAMOND_SIZE } from '../src/components/Timeline/milestoneGeometry';
import { resolveScale } from '../src/core/scale';
import { computeBarXExact } from '../src/core/zoom';
import type { DependencyType, GanttDependency, ResolvedTask } from '../src/types';

const scale = resolveScale('day');
const rangeStart = new Date('2026-01-01T00:00:00');
const COL = 40;
const rowLayouts = [0, 1, 2].map((i) => ({ y: i * 36, height: 36 }));

function task(
  id: string,
  row: number,
  start: string,
  end: string,
  deps?: (GanttDependency | string)[],
  type?: ResolvedTask['type'],
): ResolvedTask {
  return {
    id,
    name: id.toUpperCase(),
    start,
    end,
    type,
    _start: new Date(`${start}T00:00:00`),
    _end: new Date(`${end}T00:00:00`),
    _rowIndex: row,
    _level: 0,
    _visible: true,
    dependencies: deps as GanttDependency[] | undefined,
  };
}

function links(tasks: ResolvedTask[]) {
  return computeDependencyLinks({
    tasks,
    taskIndexMap: new Map(tasks.map((t) => [t.id, t._rowIndex])),
    rowLayouts,
    rangeStart,
    scale,
    columnWidth: COL,
    showBaseline: false,
  });
}

const x = (d: string) => computeBarXExact(new Date(`${d}T00:00:00`), rangeStart, scale, COL);

describe('computeDependencyLinks', () => {
  // a: Jan 3–6, b: Jan 8–10 (forward); c: Jan 1–2 (b's successor, backwards).
  const edgeCases: { type: DependencyType; fromX: string; toX: string }[] = [
    { type: 'FS', fromX: '2026-01-06', toX: '2026-01-08' },
    { type: 'SS', fromX: '2026-01-03', toX: '2026-01-08' },
    { type: 'FF', fromX: '2026-01-06', toX: '2026-01-10' },
    { type: 'SF', fromX: '2026-01-03', toX: '2026-01-10' },
  ];

  for (const { type, fromX, toX } of edgeCases) {
    it(`${type} runs from the ${type[0] === 'F' ? 'end' : 'start'} of the predecessor to the ${type[1] === 'S' ? 'start' : 'end'} of the successor`, () => {
      const [link] = links([
        task('a', 0, '2026-01-03', '2026-01-06'),
        task('b', 1, '2026-01-08', '2026-01-10', [{ id: 'a', type }]),
      ]);
      expect(link.type).toBe(type);
      expect(link.points[0]).toEqual({ x: x(fromX), y: 18 });
      expect(link.points.at(-1)).toEqual({ x: x(toX), y: 36 + 18 });
    });
  }

  it('handles backwards links (successor left of the predecessor) for every type', () => {
    for (const type of ['FS', 'SS', 'FF', 'SF'] as DependencyType[]) {
      const [link] = links([
        task('a', 0, '2026-01-08', '2026-01-10'),
        task('c', 1, '2026-01-01', '2026-01-02', [{ id: 'a', type }]),
      ]);
      const toX = type[1] === 'S' ? x('2026-01-01') : x('2026-01-02');
      expect(link.points.at(-1)).toEqual({ x: toX, y: 54 });
    }
  });

  it('attaches to a milestone diamond tip, on the side the type names', () => {
    const m = task('m', 0, '2026-01-05', '2026-01-05', undefined, 'milestone');
    const center = x('2026-01-05');
    const half = MILESTONE_DIAMOND_SIZE / 2;
    for (const [type, fromX] of [
      ['FS', center + half],
      ['SS', center - half],
    ] as const) {
      const [link] = links([m, task('b', 1, '2026-01-08', '2026-01-10', [{ id: 'm', type }])]);
      expect(link.points[0].x).toBe(fromX);
      expect(taskConnectorX(m, type === 'FS' ? 'end' : 'start', rangeStart, scale, COL)).toBe(fromX);
    }
    // Into a milestone: FF arrives at its right tip.
    const [into] = links([
      task('a', 0, '2026-01-01', '2026-01-02'),
      { ...m, _rowIndex: 1, dependencies: [{ id: 'a', type: 'FF' }] },
    ]);
    expect(into.points.at(-1)?.x).toBe(center + half);
  });

  it('follows the drag preview', () => {
    const tasks = [
      task('a', 0, '2026-01-03', '2026-01-06'),
      task('b', 1, '2026-01-08', '2026-01-10', ['a']),
    ];
    const [moved] = computeDependencyLinks({
      tasks,
      taskIndexMap: new Map(tasks.map((t) => [t.id, t._rowIndex])),
      rowLayouts,
      rangeStart,
      scale,
      columnWidth: COL,
      showBaseline: false,
      preview: {
        taskId: 'a',
        dates: { start: new Date('2026-01-04T00:00:00'), end: new Date('2026-01-07T00:00:00') },
      },
    });
    expect(moved.points[0].x).toBe(x('2026-01-07'));
  });

  it('ids links by predecessor and successor and normalises type and lag', () => {
    const [link] = links([
      task('a', 0, '2026-01-03', '2026-01-06'),
      task('b', 1, '2026-01-08', '2026-01-10', [{ id: 'a', lag: 2, critical: true }]),
    ]);
    expect(link.id).toBe(dependencyId('a', 'b'));
    expect(link.target).toMatchObject({
      type: 'dependency',
      id: 'a->b',
      from: { id: 'a' },
      to: { id: 'b' },
      dependency: { id: 'a', type: 'FS', lag: 2, critical: true },
    });
  });

  it('skips links whose predecessor is not rendered', () => {
    expect(links([task('b', 0, '2026-01-08', '2026-01-10', ['missing'])])).toEqual([]);
  });
});

describe('collectDependencyTargets', () => {
  const tasks = [
    task('a', 0, '2026-01-03', '2026-01-06'),
    task('b', 1, '2026-01-08', '2026-01-10', ['a']),
    task('c', 2, '2026-01-08', '2026-01-10', [{ id: 'b', type: 'SS' }, 'gone']),
  ];

  it('returns every resolvable link, or only the requested ids', () => {
    expect(collectDependencyTargets(tasks).map((t) => t.id)).toEqual(['a->b', 'b->c']);
    expect(collectDependencyTargets(tasks, new Set(['b->c']))).toEqual([
      expect.objectContaining({ id: 'b->c', dependency: { id: 'b', type: 'SS', lag: 0 } }),
    ]);
  });
});

describe('labels', () => {
  it('formats lag as signed days', () => {
    expect(defaultDependencyLagLabel(2)).toBe('+2d');
    expect(defaultDependencyLagLabel(-1)).toBe('-1d');
  });

  it('normalises the string form to FS with no lag', () => {
    expect(normalizeDependency('a')).toEqual({ id: 'a', type: 'FS', lag: 0 });
  });

  it('names a link for assistive tech', () => {
    const [link] = links([
      task('a', 0, '2026-01-03', '2026-01-06'),
      task('b', 1, '2026-01-08', '2026-01-10', [{ id: 'a', type: 'SF' }]),
    ]);
    expect(dependencyAccessibleName(link, '+1d')).toBe('Dependency: A start to finish B, lag +1d');
    expect(dependencyAccessibleName(link, '')).toBe('Dependency: A start to finish B');
  });
});
