import { describe, expect, it } from 'vitest';
import {
  getCustomRowHeight,
  totalCustomRowsHeight,
} from '../src/components/CustomRows/customRowMetrics';

describe('custom row height', () => {
  it('uses row height when set', () => {
    expect(getCustomRowHeight({ height: 48 }, 36)).toBe(48);
  });

  it('falls back to default row height', () => {
    expect(getCustomRowHeight({}, 36)).toBe(36);
  });

  it('sums mixed custom row heights', () => {
    const rows = [{ height: 20 }, {}, { height: 60 }];
    expect(totalCustomRowsHeight(rows, 36)).toBe(20 + 36 + 60);
  });
});
