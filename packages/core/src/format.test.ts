import { describe, expect, it } from 'vitest';
import {
  cn,
  fixed,
  formatNumber,
  hm,
  mixed,
  sel,
  time,
} from './format';
import { fillParams, fillText } from './fill';

describe('F2: 数字格式与文字函数', () => {
  it('1. formatNumber 消除浮点误差、去末尾 0、负号用 −', () => {
    expect(formatNumber(0.1 + 0.2)).toBe('0.3');
    expect(formatNumber(2.5)).toBe('2.5');
    expect(formatNumber(-3)).toBe('−3');
    expect(formatNumber(1e-7)).toBe('0.0000001');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(-0)).toBe('0');
  });

  it('2. 派生值 S: 0.1 + 0.2，讲解 {S} 代入后是 0.3（回归：原来是长串）', () => {
    const params = { S: 0.1 + 0.2 };
    expect(fillText('结果是 {S}', params)).toBe('结果是 0.3');
    expect(fillParams('{S}', params)).toBe(0.3);
  });

  it('3. cn 汉字读法（涵盖小学读数规则及用例）', () => {
    // 基础数与十位读法
    expect(cn(0)).toBe('零');
    expect(cn(5)).toBe('五');
    expect(cn(10)).toBe('十');
    expect(cn(12)).toBe('十二');
    expect(cn(20)).toBe('二十');
    expect(cn(105)).toBe('一百零五');
    expect(cn(110)).toBe('一百一十');

    // 千级
    expect(cn(1000)).toBe('一千');
    expect(cn(1001)).toBe('一千零一');
    expect(cn(1010)).toBe('一千零一十');
    expect(cn(3005)).toBe('三千零五');

    // 万级与亿级
    expect(cn(10000)).toBe('一万');
    expect(cn(40020)).toBe('四万零二十');
    expect(cn(100005)).toBe('十万零五');
    expect(cn(120000)).toBe('十二万');
    expect(cn(1000000)).toBe('一百万');
    expect(cn(10000000)).toBe('一千万');
    expect(cn(100000000)).toBe('一亿');
    expect(cn(230000000)).toBe('两亿三千万');
    expect(cn(305000060)).toBe('三亿零五百万零六十');

    // 小数与负数
    expect(cn(1.25)).toBe('一点二五');
    expect(cn(0.05)).toBe('零点零五');
    expect(cn(-5)).toBe('负五');

    // 两与二的读法规则
    expect(cn(2000)).toBe('两千');
    expect(cn(2700)).toBe('两千七百');
    expect(cn(20000)).toBe('两万');
    expect(cn(22000)).toBe('两万两千');
    expect(cn(200)).toBe('二百');
    expect(cn(120000)).toBe('十二万');
  });

  it('4. fixed、time、hm', () => {
    expect(fixed(2.5, 2)).toBe('2.50');
    expect(fixed(3, 1)).toBe('3.0');

    expect(time(0)).toBe('0:00');
    expect(time(185)).toBe('3:05');
    expect(time(1500)).toBe('1:00');

    expect(hm(180)).toBe('3 时');
    expect(hm(185)).toBe('3 时 05 分');
    expect(hm(5)).toBe('0 时 05 分');
  });

  it('5. mixed 假分数、真分数与整除', () => {
    expect(mixed(7, 4)).toBe('[1 3/4](frac)');
    expect(mixed(8, 4)).toBe('2');
    expect(mixed(3, 4)).toBe('[3/4](frac)');
    expect(mixed(9, 4)).toBe('[2 1/4](frac)');
  });

  it('6. sel 条件选文字与嵌套，以及在 choose.answer 中的应用', () => {
    expect(sel(3 > 2, '>', '<')).toBe('>');
    expect(sel(2 > 3, '>', '<')).toBe('<');

    // 嵌套 sel
    const template = '{sel(a > b, ">", sel(a < b, "<", "="))}';
    expect(fillParams(template, { a: 2, b: 1 })).toBe('>');
    expect(fillParams(template, { a: 1, b: 2 })).toBe('<');
    expect(fillParams(template, { a: 1, b: 1 })).toBe('=');

    // choose.answer 整个值是 {sel(...)}
    const chooseSpec = {
      answer: '{sel(a > b, ">", sel(a < b, "<", "="))}',
      options: ['>', '<', '='],
    };
    expect(fillParams(chooseSpec, { a: 5, b: 5 })).toEqual({
      answer: '=',
      options: ['>', '<', '='],
    });
  });

  it('7. 文字函数不在最外层（{cn(a) + 1}）时保持原样不代入', () => {
    expect(fillText('{cn(a) + 1}', { a: 5 })).toBe('{cn(a) + 1}');
    expect(fillParams('{cn(a) + 1}', { a: 5 })).toBe('{cn(a) + 1}');
    expect(fillText('前缀 {1 + cn(a)} 后缀', { a: 5 })).toBe('前缀 {1 + cn(a)} 后缀');
  });

  it('深度代入：文字函数在 fillText 和 fillParams 中正常求值', () => {
    expect(fillText('现在是 {time(185)}，经过了 {hm(185)}。', {})).toBe(
      '现在是 3:05，经过了 3 时 05 分。',
    );
    expect(fillText('一共有 {cn(count)} 个，价格 {fixed(price, 2)} 元。', { count: 3005, price: 9.9 })).toBe(
      '一共有 三千零五 个，价格 9.90 元。',
    );
    expect(fillParams('{mixed(total, 4)}', { total: 7 })).toBe('[1 3/4](frac)');
  });
});
