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
