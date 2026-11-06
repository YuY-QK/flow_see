import { describe, expect, it } from 'vitest';
import { snapToRange } from './snapToRange';

describe('参数面板里直接输入的数：失焦或回车时按范围收回', () => {
  it('超出范围收回到最小、最大值', () => {
    expect(snapToRange(20, 6, 9, 1)).toBe(9);
    expect(snapToRange(1, 6, 9, 1)).toBe(6);
  });
  it('对齐到步长（从最小值起每 step 一格）', () => {
    expect(snapToRange(7.4, 6, 9, 1)).toBe(7);
    expect(snapToRange(3.2, 2, 10, 2)).toBe(4);
    expect(snapToRange(0.3, 0, 1, 0.1)).toBe(0.3);
  });
});
