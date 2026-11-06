import { isValidElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { getTheme } from '@flow-see/core';
import { sceneStyle } from '../style';
import { textWidth } from '../base';
import { BlankBox } from './mark';
import { blankRect, markRect } from './markRect';
import { richSpans, textPart } from './text';
import { splitCalcPart } from './splitcalc';

const theme = getTheme('cute');
/** 把零件的画面展开成元素列表（不需要 DOM）：BlankBox 保留为一个元素，不再往里展开 */
interface El {
  type: unknown;
  props: Record<string, unknown>;
}
function flatten(node: ReactNode, out: El[] = []): El[] {
  if (Array.isArray(node)) node.forEach((n) => flatten(n, out));
  else if (isValidElement(node)) {
    const el = node as unknown as El;
    out.push(el);
    if (typeof el.type === 'string') flatten(el.props.children as ReactNode, out);
    // 自己写的函数组件（如 RichLine，没有 hooks）展开；BlankBox 保留为一个元素
    else if (typeof el.type === 'function' && el.type !== BlankBox)
      flatten((el.type as (p: unknown) => ReactNode)(el.props), out);
  }
  return out;
}
/** 画出来的元素：part.Render 本身是函数组件，调一次拿到它返回的元素树 */
const render = (part: typeof textPart, p: Record<string, unknown>): El[] => {
  const Render = part.Render as unknown as (a: { p: unknown; ctx: unknown }) => ReactNode;
  return flatten(Render({ p, ctx: { theme } }));
};
const blanks = (els: El[]) => els.filter((e) => e.type === BlankBox);
/** 画出来的文字（text 元素里的字） */
const words = (els: El[]) =>
  els
    .filter((e) => e.type === 'text')
    .map((e) => String(e.props.children))
    .join('|');

describe('文字宽度估算：系数来自 site.yaml 的 scene.textMetrics', () => {
  it('数字、空格、运算符、汉字各按自己的系数算', () => {
    const m = sceneStyle().textMetrics;
    expect(textWidth('4', 10)).toBeCloseTo(m.digit * 10);
    expect(textWidth(' ', 10)).toBeCloseTo(m.space * 10);
    expect(textWidth('×', 10)).toBeCloseTo(m.operator * 10);
    expect(textWidth('−', 10)).toBeCloseTo(m.operator * 10);
    expect(textWidth('共', 10)).toBeCloseTo(m.wide * 10);
    expect(textWidth('ab', 10)).toBeCloseTo(m.latin * 20);
    expect(textWidth('12 + 3', 10)).toBeCloseTo(
      (2 * m.digit + 2 * m.space + m.operator + m.digit) * 10,
    );
  });
});

describe('颜色标记底块、空框：间距来自 site.yaml 的 scene.highlight / scene.blank', () => {
  it('底块以文字中心为中心，横向多出 markPadX、纵向多出 markPadY', () => {
    const { markPadX, markPadY, markRadius } = sceneStyle().highlight;
    const r = markRect(100, 50, 24, 40);
    expect(r.x + r.width / 2).toBeCloseTo(100);
    expect(r.y + r.height / 2).toBeCloseTo(50);
    expect(r.width).toBeCloseTo(24 + 40 * markPadX * 2);
    expect(r.height).toBeCloseTo(40 * (1 + markPadY * 2));
    expect(r.rx).toBeCloseTo(40 * markRadius);
  });
  it('空框和数字同高、同中心', () => {
    const b = blankRect(100, 50, 24, 40);
    const m = markRect(100, 50, 24, 40);
    expect(b.height).toBeCloseTo(m.height);
    expect(b.x + b.width / 2).toBeCloseTo(100);
  });
});

describe('文字里的 [..](blank)：要孩子答的数画成空框', () => {
  it('切出来的段带 blank 标记，颜色仍可以一起写', () => {
    expect(richSpans('= [15](blank)')).toEqual([
      { text: '= ' },
      { text: '15', color: undefined, link: undefined, blank: true },
    ]);
    expect(richSpans('[15](red blank)')[0]).toMatchObject({ color: 'red', blank: true });
  });
  it('画成虚线空框（带闪烁动画），不写数字；填上后才有数字', () => {
    const blank = render(textPart, { at: [100, 50], size: 40, text: '9 + 6 = [15](blank)' });
    expect(blanks(blank)).toHaveLength(1);
    expect(words(blank)).not.toContain('15');
    const filled = render(textPart, { at: [100, 50], size: 40, text: '9 + 6 = 15' });
    expect(blanks(filled)).toHaveLength(0);
    expect(words(filled)).toContain('15');
  });
  it('每一段单独居中：底块和数字用同一个中心', () => {
    const els = render(textPart, {
      at: [100, 50],
      size: 40,
      text: '[4](blue @r1) + [4](blue)',
      refs: { r1: { color: 'blue', highlight: 1 } },
    });
    const rect = els.find((e) => e.type === 'rect')!.props as { x: number; width: number };
    const text = els.find((e) => e.type === 'text')!.props as { x: number; textAnchor: string };
    expect(text.textAnchor).toBe('middle');
    expect(rect.x + rect.width / 2).toBeCloseTo(text.x, 5);
  });
});

describe('拆分算式图的 blank：只把要答的节点画成空框', () => {
  const calc = {
    at: [400, 60],
    a: 9,
    op: '+',
    b: 6,
    split: 'b',
    parts: [1, 5],
    first: { join: ['a', 'p'], op: '+', value: 10 },
    second: { join: ['m', 'q'], op: '+', value: 15 },
    size: 40,
    show: 1,
  };
  it('blank: [q] 时右边的 5 不写，左边的 1 照常画；填上后才有 5', () => {
    const blank = render(splitCalcPart, { ...calc, blank: ['q'] });
    expect(blanks(blank)).toHaveLength(1);
    expect(words(blank).split('|')).toContain('1');
    expect(words(blank).split('|')).not.toContain('5');
    const filled = render(splitCalcPart, { ...calc, blank: [] });
    expect(blanks(filled)).toHaveLength(0);
    expect(words(filled).split('|')).toContain('5');
  });
  it('blank: [r] 时得数的位置画空框，不写 ?', () => {
    const els = render(splitCalcPart, { ...calc, show: 3, blank: ['r'] });
    expect(blanks(els)).toHaveLength(1);
    expect(words(els).split('|')).not.toContain('?');
  });
});
