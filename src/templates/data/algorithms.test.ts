import { describe, expect, it } from 'vitest';
import { generateDataSteps, normalizeParams, resultOf, type DataFrame } from './algorithms';

const ALGOS = ['bubble', 'selection', 'insertion'] as const;
const CASES = [
  [5, 2, 8, 1, 9],
  [1, 2, 3, 4],
  [4, 3, 2, 1],
  [3, 3, 1, 2, 3],
  [7, 1],
];

describe('排序步骤生成', () => {
  for (const algorithm of ALGOS) {
    for (const values of CASES) {
      it(`${algorithm} 从小到大：${values.join(',')}`, () => {
        const steps = generateDataSteps({ values, algorithm, order: 'asc' });
        expect(resultOf(steps)).toEqual([...values].sort((a, b) => a - b));
      });
      it(`${algorithm} 从大到小：${values.join(',')}`, () => {
        const steps = generateDataSteps({ values, algorithm, order: 'desc' });
        expect(resultOf(steps)).toEqual([...values].sort((a, b) => b - a));
      });
    }
  }

  it('每一帧的排列都是原数组的一个排列', () => {
    const steps = generateDataSteps({ values: [5, 2, 8, 1, 9], algorithm: 'bubble' });
    for (const s of steps) {
      const f = s.data as unknown as DataFrame;
      expect([...f.order].sort()).toEqual([0, 1, 2, 3, 4]);
    }
  });

  it('首尾两步是“开始”和“排好了”，最后一步全部标记为已排好', () => {
    const steps = generateDataSteps({ values: [3, 1, 2] });
    expect(steps[0].title).toBe('开始');
    expect(steps[steps.length - 1].title).toBe('排好了！');
    expect((steps[steps.length - 1].data as unknown as DataFrame).sorted).toEqual([0, 1, 2]);
  });

  it('冒泡排序对已排好的数据只扫一轮', () => {
    const steps = generateDataSteps({ values: [1, 2, 3, 4], algorithm: 'bubble' });
    const f = steps[steps.length - 1].data as unknown as DataFrame;
    expect(f.compares).toBe(3);
    expect(f.swaps).toBe(0);
  });

  it('比较和交换次数随步骤递增', () => {
    const steps = generateDataSteps({ values: [4, 3, 2, 1], algorithm: 'insertion' });
    let c = 0;
    let w = 0;
    for (const s of steps) {
      const f = s.data as unknown as DataFrame;
      expect(f.compares).toBeGreaterThanOrEqual(c);
      expect(f.swaps).toBeGreaterThanOrEqual(w);
      c = f.compares;
      w = f.swaps;
    }
    expect(w).toBe(6);
  });

  it('参数缺失或不合法时使用默认值', () => {
    expect(normalizeParams(undefined)).toEqual({
      values: [5, 2, 8, 1, 9],
      algorithm: 'bubble',
      order: 'asc',
    });
    expect(normalizeParams({ values: ['x', 3, 1], algorithm: 'nope', order: 'desc' })).toEqual({
      values: [3, 1],
      algorithm: 'bubble',
      order: 'desc',
    });
  });

  it('只有一个数时也能生成', () => {
    expect(generateDataSteps({ values: [5] })).toHaveLength(1);
  });
});
