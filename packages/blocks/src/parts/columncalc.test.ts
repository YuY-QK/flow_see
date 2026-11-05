import { describe, expect, it } from 'vitest';
import { columnCalcPart, columnCalcPlan } from './columncalc';

const m = { at: [400, 200], a: 38, b: 27, op: '×', size: 44 };

describe('竖式', () => {
  it('两位数乘两位数：每行从被乘数的个位乘起，进位逐步产生', () => {
    const plan = columnCalcPlan(m);
    // 8×7=56 → 写 6 进 5；3×7=21+5=26 → 写 6、进到百位的 2；8×2=16 → 写 6 进 1；3×2=6+1=7
    const mul = plan.steps.filter((s) => s.phase !== 'add');
    expect(mul).toHaveLength(4);
    expect(mul[0].cells).toEqual([{ row: 0, col: 0, digit: 6 }]);
    expect(mul[0].carry).toEqual({ col: 1, digit: 5 });
    expect(mul[1].cells.map((c) => c.digit)).toEqual([6, 2]);
    expect(mul[1].carry).toBeUndefined();
    // 第二行向左空一位：8×2 写在十位列
    expect(mul[2].cells[0]).toEqual({ row: 1, col: 1, digit: 6 });
    expect(mul[3].cells[0]).toEqual({ row: 1, col: 2, digit: 7 });
  });

  it('相加：266 + 760 = 1026，逐位写出，满十进位', () => {
    const plan = columnCalcPlan(m);
    const add = plan.steps.filter((s) => s.phase === 'add');
    expect(add.map((s) => s.cells[0].digit)).toEqual([6, 2, 0, 1]);
    expect(add.map((s) => s.carry?.digit)).toEqual([undefined, 1, 1, undefined]);
    expect(plan.result).toBe(1026);
    expect(plan.ncols).toBe(4);
  });

  it('乘数是一位数时没有相加那一步，部分积就是得数', () => {
    const plan = columnCalcPlan({ ...m, a: 36, b: 4 });
    expect(plan.hasAdd).toBe(false);
    expect(plan.steps).toHaveLength(2);
    const digits = plan.steps.flatMap((s) => s.cells.map((c) => c.digit));
    expect(digits).toEqual([4, 4, 1]);
  });

  it('加法：两个数上下对齐逐位加', () => {
    const plan = columnCalcPlan({ ...m, op: '+', a: 478, b: 256 });
    expect(plan.rows).toBe(0);
    expect(plan.steps.map((s) => s.cells[0].digit)).toEqual([4, 3, 7]);
    expect(plan.result).toBe(734);
  });

  it('包围盒只包住已经写出的部分，随 show 一步步变大', () => {
    const h = [0, 1, 3, 5].map((show) => columnCalcPart.bbox({ ...m, show }).h);
    expect(h[0]).toBeLessThan(h[1]);
    expect(h[1]).toBeLessThan(h[2]);
    expect(h[2]).toBeLessThan(h[3]);
  });
});
