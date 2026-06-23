import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBufferedSegmentCache } from '../src/hooks/useBufferedSegmentCache';

describe('useBufferedSegmentCache', () => {
  it('only computes newly added keys', () => {
    const compute = vi.fn((key: number) => key * 2);
    const { result, rerender } = renderHook(
      ({ keys }) => useBufferedSegmentCache(keys, compute, 'reset'),
      { initialProps: { keys: [1, 2, 3] } },
    );

    expect(result.current).toEqual([2, 4, 6]);
    expect(compute).toHaveBeenCalledTimes(3);

    rerender({ keys: [1, 2, 3, 4] });
    expect(result.current).toEqual([2, 4, 6, 8]);
    expect(compute).toHaveBeenCalledTimes(4);

    rerender({ keys: [1, 2, 3, 4] });
    expect(compute).toHaveBeenCalledTimes(4);
  });

  it('clears cache when resetKey changes', () => {
    const compute = vi.fn((key: number) => key);
    const { result, rerender } = renderHook(
      ({ resetKey }) => useBufferedSegmentCache([5], compute, resetKey),
      { initialProps: { resetKey: 'a' } },
    );

    expect(result.current).toEqual([5]);
    expect(compute).toHaveBeenCalledTimes(1);

    rerender({ resetKey: 'b' });
    expect(result.current).toEqual([5]);
    expect(compute).toHaveBeenCalledTimes(2);
  });
});
