import { describe, expect, it } from 'vitest';
import {
  canMakeSum,
  greedySumSequence,
  sumResult,
  type SumItem,
} from './sum';

describe('sumResult 凑数判定', () => {
  const items: SumItem[] = [
    { index: 1, value: 5 },
    { index: 2, value: 1 },
    { index: 3, value: 1 },
    { index: 4, value: 1 },
    { index: 5, value: 1 },
    { index: 6, value: 1 },
  ];

  it('柜台里面值之和 = sum → 做对', () => {
    // 5 + 1 + 1 + 1 = 8
    const r1 = sumResult(8, { items, moved: [1, 2, 3, 4] });
    expect(r1.status).toBe('correct');
    expect(r1.correct).toBe(true);
    expect(r1.solved).toBe(true);
    expect(r1.over).toBe(false);
    expect(r1.currentSum).toBe(8);
    expect(r1.targetSum).toBe(8);
    expect(r1.diff).toBe(0);

    // 直接传入当前金额数字
    const r2 = sumResult(8, 8);
    expect(r2.status).toBe('correct');
    expect(r2.correct).toBe(true);
    expect(r2.solved).toBe(true);
  });

  it('柜台里面值之和 > sum → 提示多了（不计做错）', () => {
    // 5 + 1 + 1 + 1 + 1 = 9 > 8
    const r1 = sumResult(8, { items, moved: [1, 2, 3, 4, 5] });
    expect(r1.status).toBe('over');
    expect(r1.correct).toBe(false);
    expect(r1.solved).toBe(false);
    expect(r1.over).toBe(true);
    expect(r1.currentSum).toBe(9);
    expect(r1.targetSum).toBe(8);
    expect(r1.diff).toBe(1);

    const r2 = sumResult(8, 10);
    expect(r2.status).toBe('over');
    expect(r2.over).toBe(true);
    expect(r2.diff).toBe(2);
  });

  it('柜台里面值之和 < sum → 还差 n 元', () => {
    // 5 + 1 = 6 < 8
    const r1 = sumResult(8, { items, moved: [1, 2] });
    expect(r1.status).toBe('under');
    expect(r1.correct).toBe(false);
    expect(r1.solved).toBe(false);
    expect(r1.over).toBe(false);
    expect(r1.currentSum).toBe(6);
    expect(r1.targetSum).toBe(8);
    expect(r1.diff).toBe(2);

    // 未放任何钱：已付 0 元，还差 8 元
    const r2 = sumResult(8, { items, moved: [] });
    expect(r2.status).toBe('under');
    expect(r2.currentSum).toBe(0);
    expect(r2.diff).toBe(8);
  });

  it('支持角、分小数金额并消除浮点误差', () => {
    const coinItems: SumItem[] = [
      { index: 1, value: 0.5 },
      { index: 2, value: 0.5 },
      { index: 3, value: 0.1 },
      { index: 4, value: 0.1 },
      { index: 5, value: 0.05 },
    ];

    // 0.5 + 0.5 = 1.0
    const r1 = sumResult(1, { items: coinItems, moved: [1, 2] });
    expect(r1.status).toBe('correct');
    expect(r1.solved).toBe(true);
    expect(r1.currentSum).toBe(1);

    // 0.5 + 0.1 = 0.6 < 1.0 -> 还差 0.4 元
    const r2 = sumResult(1, { items: coinItems, moved: [1, 3] });
    expect(r2.status).toBe('under');
    expect(r2.currentSum).toBe(0.6);
    expect(r2.diff).toBe(0.4);

    // 0.5 + 0.5 + 0.1 = 1.1 > 1.0 -> 多了 0.1 元
    const r3 = sumResult(1, { items: coinItems, moved: [1, 2, 3] });
    expect(r3.status).toBe('over');
    expect(r3.currentSum).toBe(1.1);
    expect(r3.diff).toBe(0.1);
  });
});

describe('canMakeSum 动态规划面值凑数判定', () => {
  it('能够由面值组合凑出目标金额', () => {
    // 5元 1张、1元 5枚 凑 8元
    expect(canMakeSum(8, [5, 1, 1, 1, 1, 1])).toBe(true);

    // 100, 50, 20, 10, 5, 1 凑 35 (20 + 10 + 5)
    expect(canMakeSum(35, [100, 50, 20, 10, 5, 1])).toBe(true);

    // 角、分组合：两个 5 角凑 1 元
    expect(canMakeSum(1, [0.5, 0.5, 0.1, 0.1])).toBe(true);

    // 1角 10枚 凑 1元
    expect(canMakeSum(1, [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1])).toBe(true);
  });

  it('总额不足或无法凑出时返回 false', () => {
    // 总额不足：5 + 1 + 1 = 7 < 8
    expect(canMakeSum(8, [5, 1, 1])).toBe(false);

    // 总额够但面值无法凑出：两张 5 元无法凑出 8 元
    expect(canMakeSum(8, [5, 5])).toBe(false);

    // 10元一张无法凑出 8元
    expect(canMakeSum(8, [10])).toBe(false);

    // 角分凑不出：0.5 + 0.2 = 0.7 无法凑出 0.8
    expect(canMakeSum(0.8, [0.5, 0.2])).toBe(false);

    // 边界值：目标金额为 0 或负数返回 false
    expect(canMakeSum(0, [1, 2])).toBe(false);
    expect(canMakeSum(-5, [1, 2])).toBe(false);
  });
});

describe('greedySumSequence 贪心演示序列', () => {
  it('买 8 元玩具（钱包 5 元 1 张、1 元 5 枚）：贪心先取 5 元再取 3 枚 1 元', () => {
    const items: SumItem[] = [
      { index: 1, value: 5 },
      { index: 2, value: 1 },
      { index: 3, value: 1 },
      { index: 4, value: 1 },
      { index: 5, value: 1 },
      { index: 6, value: 1 },
    ];
    const seq = greedySumSequence(8, items);
    expect(seq).toEqual([1, 2, 3, 4]);
  });

  it('面值乱序时先从大到小排序再贪心', () => {
    const items: SumItem[] = [
      { index: 1, value: 1 },
      { index: 2, value: 10 },
      { index: 3, value: 5 },
      { index: 4, value: 20 },
    ];
    // 凑 25: 先取 20 (index 4)，再取 5 (index 3)
    const seq = greedySumSequence(25, items);
    expect(seq).toEqual([4, 3]);
  });

  it('角分组合演示序列', () => {
    const items: SumItem[] = [
      { index: 1, value: 0.5 },
      { index: 2, value: 0.5 },
      { index: 3, value: 0.1 },
      { index: 4, value: 0.1 },
    ];
    // 凑 1 元: 先取两张 0.5 (index 1, 2)
    const seq = greedySumSequence(1, items);
    expect(seq).toEqual([1, 2]);
  });

  it('无法凑齐时返回 undefined', () => {
    const items: SumItem[] = [
      { index: 1, value: 5 },
      { index: 2, value: 5 },
    ];
    expect(greedySumSequence(8, items)).toBeUndefined();
  });
});
