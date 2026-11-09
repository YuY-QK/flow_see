import { isValidElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { getTheme } from '@flow-see/core';
import { checkScene } from '../../../templates/src/scene/check';
import { BlankBox } from './mark';
import { fracMarkRect, markRect } from './markRect';
import { richSpans, textPart, textWidth, labelPart } from './text';

const theme = getTheme('cute');

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
    else if (typeof el.type === 'function' && el.type !== BlankBox)
      flatten((el.type as (p: unknown) => ReactNode)(el.props), out);
  }
  return out;
}

const render = (part: typeof textPart, p: Record<string, unknown>): El[] => {
  const Render = part.Render as unknown as (a: { p: unknown; ctx: unknown }) => ReactNode;
  return flatten(Render({ p, ctx: { theme } }));
};

const blanks = (els: El[]) => els.filter((e) => e.type === BlankBox);
const words = (els: El[]) =>
  els
    .filter((e) => e.type === 'text')
    .map((e) => String(e.props.children))
    .join('|');

describe('文字排版标记 (F4)', () => {
  it('1. richSpans("cm[2](sup)") 得两段，第二段 sup: true', () => {
    const spans = richSpans('cm[2](sup)');
    expect(spans).toHaveLength(2);
    expect(spans[0]).toEqual({ text: 'cm' });
    expect(spans[1]).toMatchObject({ text: '2', sup: true });
  });

  it('2. richSpans("[1 3/4](red frac)") 得 frac: { whole: "1", num: "3", den: "4" }、颜色 red', () => {
    const spans = richSpans('[1 3/4](red frac)');
    expect(spans).toHaveLength(1);
    expect(spans[0]).toMatchObject({
      frac: { whole: '1', num: '3', den: '4' },
      color: 'red',
    });
  });

  it('3. 宽度：textWidth 对含 frac 的文字比同字符数的普通文字窄（分子分母叠放）', () => {
    const size = 20;
    // 分数 [3/4](frac) 的分子分母上下叠放，宽度窄于同字符数的普通文字 3/4
    expect(textWidth('[3/4](frac)', size)).toBeLessThan(textWidth('3/4', size));
    // 带分数 [1 3/4](frac) 窄于同字符数的普通文字 1 3/4
    expect(textWidth('[1 3/4](frac)', size)).toBeLessThan(textWidth('1 3/4', size));
  });

  it('4. 包围盒：含 frac 的 text 零件高度 = size × 1.6', () => {
    const size = 30;
    const boxWithFrac = textPart.bbox({ at: [100, 100], size, text: '[3/4](frac)' });
    expect(boxWithFrac.h).toBeCloseTo(size * 1.6);

    const boxWithoutFrac = textPart.bbox({ at: [100, 100], size, text: '3/4' });
    expect(boxWithoutFrac.h).toBeCloseTo(size * 1.25);
  });

  it('5. check：[3/](frac) 报错并指出位置', () => {
    const issues = checkScene({
      params: {},
      objects: [
        { id: 't1', type: 'text', text: '[3/](frac)', at: [100, 100] },
      ],
      steps: [],
    });
    expect(issues.some((i) => i.path.join('.') === 'objects.0.text')).toBe(true);
    expect(
      issues.some(
        (i) =>
          i.path.join('.') === 'objects.0.text' &&
          i.message.includes('frac 的内容必须是 a/b 或 w a/b（整数）'),
      ),
    ).toBe(true);
  });

  describe('sup 与 frac 的渲染与组合', () => {
    it('sup 渲染字号为 size × 0.6，基线上移 size × 0.4', () => {
      const els = render(textPart, {
        at: [100, 100],
        size: 40,
        text: 'S = πr[2](sup)',
      });
      const supText = els.find((e) => e.type === 'text' && e.props.children === '2');
      expect(supText).toBeDefined();
      expect(supText!.props.fontSize).toBeCloseTo(40 * 0.6);
      expect(supText!.props.y).toBeCloseTo(100 - 40 * 0.4);
    });

    it('frac 正常渲染时画分子、分母、横线；带分数还画整数部分', () => {
      const els = render(textPart, {
        at: [200, 150],
        size: 40,
        text: '[2 1/3](frac)',
      });
      expect(words(els).split('|')).toContain('2');
      expect(words(els).split('|')).toContain('1');
      expect(words(els).split('|')).toContain('3');
      const line = els.find((e) => e.type === 'line');
      expect(line).toBeDefined();
      expect(line!.props.y1).toBeCloseTo(150);
      expect(line!.props.y2).toBeCloseTo(150);
    });

    it('frac 组合 blank 时画分数形状的空框：上下两个小空框 + 横线，不出现数字', () => {
      const els = render(textPart, {
        at: [100, 100],
        size: 40,
        text: '[3/4](frac blank)',
      });
      expect(blanks(els)).toHaveLength(2);
      expect(words(els)).toBe('');
      const line = els.find((e) => e.type === 'line');
      expect(line).toBeDefined();
    });

    it('带分数组合 blank 时画 3 个空框（整数 + 上下两个）', () => {
      const els = render(textPart, {
        at: [100, 100],
        size: 40,
        text: '[1 3/4](frac blank)',
      });
      expect(blanks(els)).toHaveLength(3);
      expect(words(els)).toBe('');
      const line = els.find((e) => e.type === 'line');
      expect(line).toBeDefined();
    });

    it('frac 组合高亮时底块按分数的实际高度画', () => {
      const size = 40;
      const r = fracMarkRect(100, 100, 30, size);
      expect(r.height).toBeCloseTo(markRect(100, 100, 30, size, size * 1.6).height);

      const els = render(textPart, {
        at: [100, 100],
        size,
        text: '[3/4](frac @r1)',
        refs: { r1: { color: 'blue', highlight: 1 } },
      });
      const rect = els.find((e) => e.type === 'rect');
      expect(rect).toBeDefined();
      expect(rect!.props.height).toBeCloseTo(r.height);
    });

    it('labelPart 包含 frac 时包围盒高度相应增加', () => {
      const size = 30;
      const bFrac = labelPart.bbox({ at: [100, 100], size, text: '[3/4](frac)' });
      const bNormal = labelPart.bbox({ at: [100, 100], size, text: '3/4' });
      expect(bFrac.h).toBeGreaterThan(bNormal.h);
      expect(bFrac.h).toBeCloseTo(size * 2.25);
    });

    it('合法的 sup 与 frac 在 checkScene 中不产生问题', () => {
      const issues = checkScene({
        params: {},
        objects: [
          { id: 't1', type: 'text', text: 'S = πr[2](sup)', at: [100, 100] },
          { id: 't2', type: 'text', text: '[3/4](frac) + [1/4](frac) = 1', at: [100, 150] },
          { id: 't3', type: 'text', text: '[2 1/3](frac)', at: [100, 200] },
        ],
        steps: [],
      });
      expect(issues).toEqual([]);
    });
  });
});
