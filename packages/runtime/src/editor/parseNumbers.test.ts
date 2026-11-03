import { describe, expect, it } from 'vitest';
import { parseNumbers } from './parseNumbers';

const field = { min: -99, max: 99, minCount: 2, maxCount: 10 };

describe('解析一组数字', () => {
  it('支持中英文逗号、顿号和空格', () => {
    expect(parseNumbers('5, 2，8、1 9', field)).toEqual({ values: [5, 2, 8, 1, 9] });
  });
  it('拒绝非整数', () => {
    expect(parseNumbers('1, a', field)).toHaveProperty('error');
    expect(parseNumbers('1.5, 2', field)).toHaveProperty('error');
  });
  it('检查范围和个数', () => {
    expect(parseNumbers('1, 100', field)).toHaveProperty('error');
    expect(parseNumbers('1', field)).toHaveProperty('error');
    expect(parseNumbers('1,2,3,4,5,6,7,8,9,10,11', field)).toHaveProperty('error');
    expect(parseNumbers('-3, 0', field)).toEqual({ values: [-3, 0] });
  });
});
