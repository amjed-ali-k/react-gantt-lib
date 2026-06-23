import { useMemo, useRef } from 'react';

/**
 * Incrementally cache computed segments keyed by an id.
 * Only calls `compute` for keys that newly enter the active set.
 * Drops cache entries once they leave the buffered window.
 */
export function useBufferedSegmentCache<K, T>(
  activeKeys: readonly K[],
  compute: (key: K) => T,
  resetKey?: string,
): T[] {
  const cacheRef = useRef(new Map<K, T>());
  const resetRef = useRef(resetKey);

  if (resetRef.current !== resetKey) {
    cacheRef.current.clear();
    resetRef.current = resetKey;
  }

  const keysSignature = activeKeys.join('\0');

  return useMemo(() => {
    const active = new Set(activeKeys);
    const result: T[] = [];

    for (const key of activeKeys) {
      if (!cacheRef.current.has(key)) {
        cacheRef.current.set(key, compute(key));
      }
      result.push(cacheRef.current.get(key)!);
    }

    for (const key of [...cacheRef.current.keys()]) {
      if (!active.has(key)) {
        cacheRef.current.delete(key);
      }
    }

    return result;
    // keysSignature captures activeKeys content without unstable array identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keysSignature, resetKey]);
}
