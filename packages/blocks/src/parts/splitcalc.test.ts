import { describe, expect, it } from 'vitest';
import { splitCalcLayout, splitCalcPart } from './splitcalc';

// 凑十法 9 + 6：把 6 拆成 1 和 5，9 + 1 = 10，10 + 5 = 15
const makeTen = {
  at: [400, 60],
  a: 9,
  op: '+',
  b: 6,
  split: 'b',
  parts: [1, 5],
  first: { join: ['a', 'p'], op: '+', value: 10 },
  second: { join: ['m', 'q'], op: '+', value: 15 },
  size: 40,
};
// 破十法 25 - 8：把 25 拆成 15 和 10，10 - 8 = 2，15 + 2 = 17
const breakTen = {
  ...makeTen,
  a: 25,
  op: '-',
  b: 8,
  split: 'a',
  parts: [15, 10],
  first: { join: ['q', 'b'], op: '-', value: 2 },
  second: { join: ['p', 'm'], op: '+', value: 17 },
};

describe('拆分算式图', () => {
  it('原题在最上面一行，拆出的两部分在被拆的数下面左右两边', () => {
    const L = splitCalcLayout(makeTen);
    expect(L.tokens.map((t) => t.text)).toEqual(['9', '+', '6', '=', '15']);
    expect(L.nodes.p.x).toBeLessThan(L.tokens[2].x);
    expect(L.nodes.q.x).toBeGreaterThan(L.tokens[2].x);
    expect(L.nodes.p.y).toBeGreaterThan(L.y0);
    // 第一次合并的结果在下面一行，第二次合并在更下面
    expect(L.nodes.m.y).toBeGreaterThan(L.first.y);
    expect(L.second.y).toBeGreaterThan(L.nodes.m.y);
    // 箭头指向得数：第二条横线一直连到得数正下方
    expect(L.second.x2).toBe(L.result.x);
  });

  it('破十法：拆的是第一个数，第一次合并是 10 - 8', () => {
    const L = splitCalcLayout(breakTen);
    expect(L.splitFrom[0]).toBe(L.tokens[0].x);
    expect(L.nodes.m.text).toBe('2');
    expect(L.first.x1).toBe(Math.min(L.nodes.q.x, L.nodes.b.x));
  });

  it('包围盒只包住已经显示的部分，随 show 一步步变大', () => {
    const h = [0, 1, 2, 4].map((show) => splitCalcPart.bbox({ ...makeTen, show }).h);
    expect(h[0]).toBeLessThan(h[1]);
    expect(h[1]).toBeLessThan(h[2]);
    expect(h[2]).toBeLessThan(h[3]);
  });
});
