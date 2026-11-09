import { describe, expect, it } from 'vitest';
import { fillParams } from './fill';
import {
  clampParams,
  evalExpr,
  exploreCombos,
  exprNames,
  range,
  resolveParams,
  type ExploreControl,
} from './params';

describe('算式', () => {
  it('四则运算、括号、函数、变量（a 或 {a}）', () => {
    expect(evalExpr('10 - a', { a: 8 })).toBe(2);
    expect(evalExpr('{b} - {gap}', { b: 6, gap: 2 })).toBe(4);
    expect(evalExpr('(1 + 2) * 3 - -1')).toBe(10);
    expect(evalExpr('max(a, 3) + min(1, 2)', { a: 5 })).toBe(6);
    expect(evalExpr(7)).toBe(7);
    expect(evalExpr('a % 12 + 1', { a: 12 })).toBe(1);
  });

  it('写错、变量不存在、除以 0 时返回 undefined', () => {
    expect(evalExpr('10 -')).toBeUndefined();
    expect(evalExpr('x + 1', {})).toBeUndefined();
    expect(evalExpr('1 / 0')).toBeUndefined();
    expect(evalExpr('a $ 2', { a: 1 })).toBeUndefined();
    expect(exprNames('11 - a + {b}')).toEqual(['a', 'b']);
    expect(exprNames('1 +')).toBeUndefined();
  });
});

describe('派生值与动手试一试', () => {
  const derived = { gap: '10 - a', rest: 'b - gap', sum: 'a + b' };
  const controls: ExploreControl[] = [
    { param: 'a', control: 'slider', label: 'a', min: 6, max: 9 },
    { param: 'b', control: 'slider', label: 'b', min: '11 - a', max: 9 },
  ];

  it('派生值按顺序计算，后面的可以用前面的', () => {
    expect(resolveParams({ a: 8, b: 6 }, derived)).toMatchObject({ gap: 2, rest: 4, sum: 14 });
  });

  it('取值超出范围时收回；范围随其他参数变化', () => {
    expect(clampParams(controls, { a: 12, b: 3 }, derived)).toMatchObject({ a: 9, b: 3 });
    // a 改成 6 后，b 至少是 5
    expect(clampParams(controls, { a: 6, b: 3 }, derived)).toMatchObject({ a: 6, b: 5 });
    expect(clampParams(controls, { a: 6.4, b: 'x' }, derived)).toMatchObject({ a: 6, b: 5 });
  });

  it('按钮组的值不在选项里时取第一项；开关转成布尔值', () => {
    const cs: ExploreControl[] = [
      {
        param: 'shape',
        control: 'buttons',
        label: '',
        options: [{ value: 'circle', label: '圆' }],
      },
      { param: 'on', control: 'switch', label: '' },
    ];
    expect(clampParams(cs, { shape: 'x', on: 1 })).toEqual({ shape: 'circle', on: true });
  });

  it('列出所有合法组合', () => {
    const all = exploreCombos(controls, { a: 9, b: 4 }, derived);
    // a = 6..9，b = (11-a)..9：5 + 6 + 7 + 8 = 26 组，且都在范围内
    expect(all).toHaveLength(26);
    expect(all.every((p) => (p.b as number) >= 11 - (p.a as number))).toBe(true);
  });
});

describe('列表生成（range）', () => {
  it('range(from, to, step) 生成包含两端的数组；步长正且 from > to 时为空', () => {
    expect(range(1, 5, 1)).toEqual([1, 2, 3, 4, 5]);
    expect(range(2, 8, 2)).toEqual([2, 4, 6, 8]);
    expect(range(5, 1, 1)).toEqual([]);
  });

  it('fillParams 识别整个字符串是 {range(...)} 时返回数组', () => {
    expect(fillParams('{range(2, 2 * n, 2)}', { n: 4 })).toEqual([2, 4, 6, 8]);
    expect(fillParams('{range(1, 5, 1)}', {})).toEqual([1, 2, 3, 4, 5]);
    expect(fillParams('{range(5, 1, 1)}', {})).toEqual([]);
    // 不是整个字符串时保持原样
    expect(fillParams('prefix {range(1, 5, 1)} suffix', {})).toBe('prefix {range(1, 5, 1)} suffix');
  });
});
