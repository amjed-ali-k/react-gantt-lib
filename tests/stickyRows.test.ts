import { describe, expect, it } from 'vitest';
import {
  partitionTasksBySticky,
  partitionCustomRowsBySticky,
  computeStickyTopOffsets,
  computeStickyBottomOffsets,
  totalStickyTimelineBodyHeight,
} from '../src/core/stickyRows';
import type { CustomRowDefinition, ResolvedTask } from '../src/types';

function task(id: string, sticky?: 'top' | 'bottom'): ResolvedTask {
  return {
    id,
    name: id,
    start: new Date('2026-01-01'),
    end: new Date('2026-01-10'),
    _start: new Date('2026-01-01'),
    _end: new Date('2026-01-10'),
    _rowIndex: 0,
    _level: 0,
    _visible: true,
    sticky,
  };
}

describe('sticky rows', () => {
  it('partitions tasks by sticky position', () => {
    const tasks = [task('a', 'top'), task('b'), task('c', 'bottom'), task('d')];
    const { top, scroll, bottom } = partitionTasksBySticky(tasks);
    expect(top.map((t) => t.id)).toEqual(['a']);
    expect(scroll.map((t) => t.id)).toEqual(['b', 'd']);
    expect(bottom.map((t) => t.id)).toEqual(['c']);
  });

  it('partitions custom rows by sticky position', () => {
    const rows: CustomRowDefinition[] = [
      { id: 'top', sticky: 'top', cells: {} },
      { id: 'inline', cells: {} },
      { id: 'bottom', sticky: 'bottom', cells: {} },
    ];
    const { top, inline, bottom } = partitionCustomRowsBySticky(rows);
    expect(top.map((r) => r.id)).toEqual(['top']);
    expect(inline.map((r) => r.id)).toEqual(['inline']);
    expect(bottom.map((r) => r.id)).toEqual(['bottom']);
  });

  it('stacks sticky top offsets below the header', () => {
    expect(computeStickyTopOffsets([36, 40], 52)).toEqual([52, 88]);
  });

  it('stacks sticky bottom offsets from the viewport bottom', () => {
    expect(computeStickyBottomOffsets([32, 28])).toEqual([28, 0]);
  });

  it('sums all sticky section heights for timeline body', () => {
    const top = [task('top', 'top')];
    const scroll = [task('scroll'), task('scroll2')];
    const bottom = [task('bottom', 'bottom')];
    const topCustom: CustomRowDefinition[] = [{ id: 'ct', sticky: 'top', height: 20, cells: {} }];
    const inlineCustom: CustomRowDefinition[] = [{ id: 'ci', height: 30, cells: {} }];
    const bottomCustom: CustomRowDefinition[] = [
      { id: 'cb1', sticky: 'bottom', height: 32, cells: {} },
      { id: 'cb2', sticky: 'bottom', height: 28, cells: {} },
    ];

    const height = totalStickyTimelineBodyHeight(
      top,
      scroll,
      bottom,
      topCustom,
      inlineCustom,
      bottomCustom,
      36,
      false,
    );

    expect(height).toBe(36 + 20 + 36 * 2 + 30 + 32 + 28 + 36);
  });
});
