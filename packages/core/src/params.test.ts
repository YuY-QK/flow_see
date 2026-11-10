import { describe, expect, it } from 'vitest';
import { fillParams } from './fill';
import {
  allExploreCombos,
  clampParams,
  dec,
  digit,
  evalExpr,
  exploreCombos,
  exprNames,
  gcd,
  isPrime,
  lcm,
  len,
  pow,
  range,
  resolveParams,
  whenCoverage,
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

  describe('新增算式函数（E3）', () => {
    it('digit(n, k)：整数位与小数位、边界与浮点误差', () => {
      // 整数位（k >= 0）
      expect(evalExpr('digit(1234, 0)')).toBe(4);
      expect(evalExpr('digit(1234, 1)')).toBe(3);
      expect(evalExpr('digit(1234, 2)')).toBe(2);
      expect(evalExpr('digit(1234, 3)')).toBe(1);
      expect(evalExpr('digit(1234, 4)')).toBe(0);
      expect(evalExpr('digit(0, 0)')).toBe(0);
      expect(evalExpr('digit(-567, 1)')).toBe(6);
      // 小数位（k < 0）
      expect(evalExpr('digit(3.45, -1)')).toBe(4);
      expect(evalExpr('digit(3.45, -2)')).toBe(5);
      expect(evalExpr('digit(3.45, -3)')).toBe(0);
      expect(evalExpr('digit(3.45, 0)')).toBe(3);
      // 浮点误差处理
      expect(evalExpr('digit(0.1 + 0.2, -1)')).toBe(3);
      expect(evalExpr('digit(0.7 - 0.6, -1)')).toBe(1);
      // 直接调用导出函数
      expect(digit(3.45, -1)).toBe(4);
      expect(digit(0, 0)).toBe(0);
    });

    it('len(n)：整数部分位数、边界 0 与负数', () => {
      expect(evalExpr('len(0)')).toBe(1);
      expect(evalExpr('len(5)')).toBe(1);
      expect(evalExpr('len(9)')).toBe(1);
      expect(evalExpr('len(10)')).toBe(2);
      expect(evalExpr('len(99)')).toBe(2);
      expect(evalExpr('len(100)')).toBe(3);
      expect(evalExpr('len(12345)')).toBe(5);
      expect(evalExpr('len(-123)')).toBe(3);
      expect(evalExpr('len(123.45)')).toBe(3);
      expect(evalExpr('len(0.45)')).toBe(1);
      // 直接调用导出函数
      expect(len(0)).toBe(1);
      expect(len(999999)).toBe(6);
      // 参数名为 len 时不与函数混淆
      expect(evalExpr('len * wid', { len: 5, wid: 4 })).toBe(20);
    });

    it('gcd(a, b)：最大公因数、互质、包含 0 的边界', () => {
      expect(evalExpr('gcd(12, 18)')).toBe(6);
      expect(evalExpr('gcd(18, 12)')).toBe(6);
      expect(evalExpr('gcd(7, 5)')).toBe(1);
      expect(evalExpr('gcd(24, 60)')).toBe(12);
      expect(evalExpr('gcd(0, 5)')).toBe(5);
      expect(evalExpr('gcd(5, 0)')).toBe(5);
      expect(evalExpr('gcd(0, 0)')).toBe(0);
      expect(evalExpr('gcd(17, 17)')).toBe(17);
      // 直接调用导出函数
      expect(gcd(12, 18)).toBe(6);
      expect(gcd(0, 7)).toBe(7);
    });

    it('lcm(a, b)：最小公倍数、包含 0 的边界', () => {
      expect(evalExpr('lcm(4, 6)')).toBe(12);
      expect(evalExpr('lcm(6, 4)')).toBe(12);
      expect(evalExpr('lcm(12, 18)')).toBe(36);
      expect(evalExpr('lcm(7, 5)')).toBe(35);
      expect(evalExpr('lcm(5, 0)')).toBe(0);
      expect(evalExpr('lcm(0, 5)')).toBe(0);
      expect(evalExpr('lcm(0, 0)')).toBe(0);
      expect(evalExpr('lcm(8, 8)')).toBe(8);
      // 直接调用导出函数
      expect(lcm(4, 6)).toBe(12);
      expect(lcm(0, 9)).toBe(0);
    });

    it('isPrime(n)：质数判断、合数、边界 n < 2', () => {
      expect(evalExpr('isPrime(0)')).toBe(0);
      expect(evalExpr('isPrime(1)')).toBe(0);
      expect(evalExpr('isPrime(-7)')).toBe(0);
      expect(evalExpr('isPrime(2)')).toBe(1);
      expect(evalExpr('isPrime(3)')).toBe(1);
      expect(evalExpr('isPrime(4)')).toBe(0);
      expect(evalExpr('isPrime(5)')).toBe(1);
      expect(evalExpr('isPrime(9)')).toBe(0);
      expect(evalExpr('isPrime(13)')).toBe(1);
      expect(evalExpr('isPrime(25)')).toBe(0);
      expect(evalExpr('isPrime(97)')).toBe(1);
      // 直接调用导出函数
      expect(isPrime(2)).toBe(1);
      expect(isPrime(1)).toBe(0);
    });

    it('dec(n, k)：四舍五入保留 k 位、避免 2.345 浮点问题', () => {
      expect(evalExpr('dec(2.345, 2)')).toBe(2.35);
      expect(evalExpr('dec(2.344, 2)')).toBe(2.34);
      expect(evalExpr('dec(2.346, 2)')).toBe(2.35);
      expect(evalExpr('dec(1.005, 2)')).toBe(1.01);
      expect(evalExpr('dec(2.5, 0)')).toBe(3);
      expect(evalExpr('dec(2.4, 0)')).toBe(2);
      expect(evalExpr('dec(0, 2)')).toBe(0);
      expect(evalExpr('dec(-2.345, 2)')).toBe(-2.35);
      expect(evalExpr('dec(3.14159, 3)')).toBe(3.142);
      expect(evalExpr('dec(3.14159, 1)')).toBe(3.1);
      // 直接调用导出函数
      expect(dec(2.345, 2)).toBe(2.35);
      expect(dec(0, 0)).toBe(0);
    });

    it('pow(a, b)：整数次幂、0 次幂、负指数与底数', () => {
      expect(evalExpr('pow(2, 3)')).toBe(8);
      expect(evalExpr('pow(3, 2)')).toBe(9);
      expect(evalExpr('pow(10, 0)')).toBe(1);
      expect(evalExpr('pow(5, 1)')).toBe(5);
      expect(evalExpr('pow(-2, 3)')).toBe(-8);
      expect(evalExpr('pow(-2, 2)')).toBe(4);
      expect(evalExpr('pow(2, -1)')).toBe(0.5);
      expect(evalExpr('pow(0, 3)')).toBe(0);
      // 直接调用导出函数
      expect(pow(2, 3)).toBe(8);
      expect(pow(4, 0)).toBe(1);
    });

    it('比较运算符 > < >= <= == != 结果为 1 / 0，优先级低于加减', () => {
      expect(evalExpr('1 + 2 > 2')).toBe(1);
      expect(evalExpr('1 + 2 > 3')).toBe(0);
      expect(evalExpr('3 >= 3')).toBe(1);
      expect(evalExpr('2 >= 3')).toBe(0);
      expect(evalExpr('2 < 3')).toBe(1);
      expect(evalExpr('3 < 3')).toBe(0);
      expect(evalExpr('3 <= 3')).toBe(1);
      expect(evalExpr('4 <= 3')).toBe(0);
      expect(evalExpr('3 == 3')).toBe(1);
      expect(evalExpr('3 == 4')).toBe(0);
      expect(evalExpr('3 != 4')).toBe(1);
      expect(evalExpr('3 != 3')).toBe(0);
      expect(evalExpr('0.1 + 0.2 == 0.3')).toBe(1);
      expect(evalExpr('0.1 + 0.2 != 0.3')).toBe(0);
      expect(evalExpr('5 - 2 < 2 + 2')).toBe(1);
      expect(evalExpr('1 + 2 == 4 - 1')).toBe(1);
    });

    it('逻辑运算符 && || ! 结果为 1 / 0', () => {
      expect(evalExpr('1 < 2 && 3 < 2')).toBe(0);
      expect(evalExpr('1 < 2 && 2 < 3')).toBe(1);
      expect(evalExpr('0 && 1')).toBe(0);
      expect(evalExpr('1 && 1')).toBe(1);
      expect(evalExpr('1 < 2 || 3 < 2')).toBe(1);
      expect(evalExpr('2 < 1 || 3 < 2')).toBe(0);
      expect(evalExpr('!0')).toBe(1);
      expect(evalExpr('!1')).toBe(0);
      expect(evalExpr('!(1 > 2)')).toBe(1);
      expect(evalExpr('!0 && !0')).toBe(1);
      expect(evalExpr('1 && 0 || 1')).toBe(1);
      expect(evalExpr('0 || 1 && 0')).toBe(0);
      expect(evalExpr('!1 + 2')).toBe(2);
    });

    it('条件运算符 c ? x : y 最低优先级、右结合、短路', () => {
      expect(evalExpr('a > 1 ? 10 : 20', { a: 2 })).toBe(10);
      expect(evalExpr('a > 1 ? 10 : 20', { a: 0 })).toBe(20);
      expect(evalExpr('1 ? 2 : 3')).toBe(2);
      expect(evalExpr('0 ? 2 : 3')).toBe(3);
      // 右结合
      expect(evalExpr('0 ? 1 : 1 ? 2 : 3')).toBe(2);
      expect(evalExpr('0 ? 1 : 0 ? 2 : 3')).toBe(3);
      // 短路：不执行未选中的除以 0 分支
      expect(evalExpr('1 ? 10 : 1 / 0')).toBe(10);
      expect(evalExpr('0 ? 1 / 0 : 20')).toBe(20);
      // 嵌套在表达式中
      expect(evalExpr('(a > 1 ? 10 : 20) + 5', { a: 2 })).toBe(15);
      expect(evalExpr('min(a > 1 ? 10 : 20, 15)', { a: 2 })).toBe(10);
    });

    it('运算符和函数写错时返回 undefined', () => {
      expect(evalExpr('1 >')).toBeUndefined();
      expect(evalExpr('1 +')).toBeUndefined();
      expect(evalExpr('1 &&')).toBeUndefined();
      expect(evalExpr('1 ||')).toBeUndefined();
      expect(evalExpr('1 ? 2')).toBeUndefined();
      expect(evalExpr('? 1 : 2')).toBeUndefined();
      expect(evalExpr('! ')).toBeUndefined();
      expect(evalExpr('unknown(1)')).toBeUndefined();
      expect(evalExpr('digit(1)')).toBeUndefined();
      expect(evalExpr('len()')).toBeUndefined();
      expect(evalExpr('gcd(1)')).toBeUndefined();
      expect(evalExpr('min()')).toBeUndefined();
      expect(evalExpr('1 ==')).toBeUndefined();
      expect(evalExpr('1 = 2')).toBeUndefined();
      expect(evalExpr('1 & 2')).toBeUndefined();
      expect(evalExpr('1 | 2')).toBeUndefined();
    });

    it('exprNames 支持新运算符与函数，写错时返回 undefined', () => {
      expect(exprNames('1 + 2 > 2')).toEqual([]);
      expect(exprNames('a > 1 ? 10 : 20')).toEqual(['a']);
      expect(exprNames('digit(a, i - 1) > 0')).toEqual(['a', 'i']);
      expect(exprNames('1 < 2 && 3 < 2')).toEqual([]);
      expect(exprNames('{carry > 0}')).toEqual(['carry']);
      expect(exprNames('len * wid')).toEqual(['len', 'wid']);
      expect(exprNames('len(n)')).toEqual(['n']);
      expect(exprNames('1 >')).toBeUndefined();
      expect(exprNames('1 +')).toBeUndefined();
      expect(exprNames('1 ? 2')).toBeUndefined();
      expect(exprNames('unknown(a)')).toBeUndefined();
      expect(exprNames('digit(a)')).toBeUndefined();
    });
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

  it('F8: 两个参数各 1–99 组合 9801 个，抽样结果包含两端与标准值组合，其余按间隔抽样', () => {
    const cs: ExploreControl[] = [
      { param: 'a', control: 'slider', label: 'a', min: 1, max: 99 },
      { param: 'b', control: 'slider', label: 'b', min: 1, max: 99 },
    ];
    const std = { a: 20, b: 30 };
    const { total, combos: all } = allExploreCombos(cs, std);
    expect(total).toBe(9801);
    expect(all).toHaveLength(9801);

    const combos = exploreCombos(cs, std);
    expect(combos.length).toBe(400);

    const has = (a: number, b: number) => combos.some((p) => p.a === a && p.b === b);

    // 抽样结果包含 (1, 标准)、(99, 标准)、(标准, 1)、(标准, 99)、(1,1)、(99,99)
    expect(has(1, 30)).toBe(true);
    expect(has(99, 30)).toBe(true);
    expect(has(20, 1)).toBe(true);
    expect(has(20, 99)).toBe(true);
    expect(has(1, 1)).toBe(true);
    expect(has(99, 99)).toBe(true);
  });

  it('F8: whenCoverage 统计每个带 when 的步骤真/假出现次数与正反组合', () => {
    const lesson = {
      params: { a: 10, b: 5 },
      derived: { sum: 'a + b' },
      steps: [
        { say: 'step 1' },
        { when: '{a > 10}', say: 'step 2' },
        { when: '{sum == 15}', say: 'step 3' },
      ],
    };
    const combos = [
      { a: 5, b: 5 },
      { a: 10, b: 5 },
      { a: 15, b: 5 },
    ];
    const cov = whenCoverage(lesson, combos);
    expect(cov).toHaveLength(2);

    expect(cov[0]).toMatchObject({
      stepIndex: 1,
      when: '{a > 10}',
      trueCount: 1,
      falseCount: 2,
    });
    expect(cov[0].trueCombo).toEqual({ a: 15, b: 5 });
    expect(cov[0].falseCombo).toEqual({ a: 5, b: 5 });

    expect(cov[1]).toMatchObject({
      stepIndex: 2,
      when: '{sum == 15}',
      trueCount: 1,
      falseCount: 2,
    });
    expect(cov[1].trueCombo).toEqual({ a: 10, b: 5 });
    expect(cov[1].falseCombo).toEqual({ a: 5, b: 5 });
  });

  it('F8: whenCoverage 支持 repeat 步骤中的 {i} 条件判断', () => {
    const lesson = {
      params: { a: 3 },
      steps: [{ repeat: 3, when: '{i > 1}', say: 'step {i}' }],
    };
    const combos = [{ a: 3 }];
    const cov = whenCoverage(lesson, combos);
    expect(cov).toHaveLength(1);
    expect(cov[0].trueCount).toBe(1);
    expect(cov[0].falseCount).toBe(1);
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
