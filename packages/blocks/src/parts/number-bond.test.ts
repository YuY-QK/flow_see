import { isValidElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { getTheme } from '@flow-see/core';
import {
  findSubitem,
  numberBondLayout,
  numberBondPart,
  type Subitem,
} from '../index';
import { BlankBox } from './mark';

const theme = getTheme('cute');

interface El {
  type: unknown;
  props: Record<string, unknown>;
}

function flatten(node: ReactNode, out: El[] = []): El[] {
  if (Array.isArray(node)) {
    node.forEach((n) => flatten(n, out));
  } else if (isValidElement(node)) {
    const el = node as unknown as El;
    out.push(el);
    if (el.props && el.props.children) {
      flatten(el.props.children as ReactNode, out);
    }
  }
  return out;
}

describe('B2 分合图（number-bond）', () => {
  it('dir down / up 的位置', () => {
    const at: [number, number] = [400, 200];
    const size = 40;

    // 1. dir: 'down'（默认：整体在上、两部分在下）
    const downLayout = numberBondLayout({
      at,
      whole: 7,
      parts: [3, 4],
      dir: 'down',
      size,
    });

    expect(downLayout.nodes.whole.at).toEqual([400, 200]);
    // p: cx - size * 1.6 = 400 - 64 = 336; cy + size * 2.2 = 200 + 88 = 288
    expect(downLayout.nodes.p.at).toEqual([336, 288]);
    // q: cx + size * 1.6 = 400 + 64 = 464; cy + size * 2.2 = 200 + 88 = 288
    expect(downLayout.nodes.q.at).toEqual([464, 288]);

    // 框高 = size * 1.4 = 56
    const boxH = size * 1.4;
    expect(downLayout.nodes.whole.box.h).toBe(boxH);
    expect(downLayout.nodes.p.box.h).toBe(boxH);
    expect(downLayout.nodes.q.box.h).toBe(boxH);

    // down 时分叉线：从整体底边中点到两部分顶边中点
    expect(downLayout.lineStart).toEqual([400, 200 + boxH / 2]);
    expect(downLayout.pEnd).toEqual([336, 288 - boxH / 2]);
    expect(downLayout.qEnd).toEqual([464, 288 - boxH / 2]);

    // 2. dir: 'up'（两部分在上、整体在下）
    const upLayout = numberBondLayout({
      at,
      whole: 7,
      parts: [3, 4],
      dir: 'up',
      size,
    });

    expect(upLayout.nodes.whole.at).toEqual([400, 200]);
    // p: cx - size * 1.6 = 336; cy - size * 2.2 = 200 - 88 = 112
    expect(upLayout.nodes.p.at).toEqual([336, 112]);
    // q: cx + size * 1.6 = 464; cy - size * 2.2 = 200 - 88 = 112
    expect(upLayout.nodes.q.at).toEqual([464, 112]);

    // up 时分叉线：从整体顶边中点到两部分底边中点
    expect(upLayout.lineStart).toEqual([400, 200 - boxH / 2]);
    expect(upLayout.pEnd).toEqual([336, 112 + boxH / 2]);
    expect(upLayout.qEnd).toEqual([464, 112 + boxH / 2]);
  });

  it('show = 1.5 时数字半透明', () => {
    const props = {
      at: [400, 200],
      whole: 7,
      parts: [3, 4],
      show: 1.5,
      size: 40,
    };

    const layout = numberBondLayout(props);
    expect(layout.lineProgress).toBe(1);
    expect(layout.partsOpacity).toBeCloseTo(0.5, 6);
    expect(layout.nodes.p.opacity).toBeCloseTo(0.5, 6);
    expect(layout.nodes.q.opacity).toBeCloseTo(0.5, 6);

    // 渲染测试
    const Render = numberBondPart.Render as (p: { p: unknown; ctx: unknown }) => ReactNode;
    const rendered = Render({ p: props, ctx: { theme } });
    const els = flatten(rendered);

    // 两个部分的 g 容器透明度为 0.5
    const partGroups = els.filter(
      (e) => e.type === 'g' && typeof e.props.opacity === 'number',
    );
    expect(partGroups.length).toBeGreaterThanOrEqual(2);
    expect(partGroups[0].props.opacity).toBeCloseTo(0.5, 6);
    expect(partGroups[1].props.opacity).toBeCloseTo(0.5, 6);

    // show = 0 时只有整体，不画线也不画两部分
    const layout0 = numberBondLayout({ ...props, show: 0 });
    expect(layout0.lineProgress).toBe(0);
    expect(layout0.partsOpacity).toBe(0);
    const rendered0 = Render({ p: { ...props, show: 0 }, ctx: { theme } });
    const els0 = flatten(rendered0);
    const lines0 = els0.filter((e) => e.type === 'line');
    expect(lines0).toHaveLength(0);
    const texts0 = els0.filter((e) => e.type === 'text');
    expect(texts0).toHaveLength(1);
    expect(texts0[0].props.children).toBe('7');

    // show = 1 时画出两条分叉线，两部分仍不画
    const layout1 = numberBondLayout({ ...props, show: 1 });
    expect(layout1.lineProgress).toBe(1);
    expect(layout1.partsOpacity).toBe(0);
    const rendered1 = Render({ p: { ...props, show: 1 }, ctx: { theme } });
    const els1 = flatten(rendered1);
    const lines1 = els1.filter((e) => e.type === 'line');
    expect(lines1).toHaveLength(2);
    const texts1 = els1.filter((e) => e.type === 'text');
    expect(texts1).toHaveLength(1);
  });

  it('blank [q] 时 q 画空框', () => {
    const props = {
      at: [400, 200],
      whole: 7,
      parts: [3, 4],
      show: 2,
      blank: ['q'],
      size: 40,
    };

    const Render = numberBondPart.Render as (p: { p: unknown; ctx: unknown }) => ReactNode;
    const rendered = Render({ p: props, ctx: { theme } });
    const els = flatten(rendered);

    // blank 元素存在且为 1 个
    const blanks = els.filter(
      (e) => e.type === BlankBox || (e.props && 'data-blank' in e.props),
    );
    expect(blanks).toHaveLength(1);

    // 渲染出的文本只包含 7 和 3，不包含 4
    const texts = els.filter((e) => e.type === 'text').map((e) => String(e.props.children));
    expect(texts).toContain('7');
    expect(texts).toContain('3');
    expect(texts).not.toContain('4');

    // blank 为空时，3 个数字全部写出，无空框
    const renderedFilled = Render({ p: { ...props, blank: [] }, ctx: { theme } });
    const elsFilled = flatten(renderedFilled);
    const blanksFilled = elsFilled.filter(
      (e) => e.type === BlankBox || (e.props && 'data-blank' in e.props),
    );
    expect(blanksFilled).toHaveLength(0);
    const textsFilled = elsFilled
      .filter((e) => e.type === 'text')
      .map((e) => String(e.props.children));
    expect(textsFilled).toContain('7');
    expect(textsFilled).toContain('3');
    expect(textsFilled).toContain('4');
  });

  it('包围盒与子项测试', () => {
    const props = {
      at: [400, 200],
      whole: 10,
      parts: [3, 7],
      show: 2,
      size: 44,
    };

    const layout = numberBondLayout(props);
    const bbox = numberBondPart.bbox(props);
    expect(bbox.w).toBeGreaterThan(layout.nodes.whole.box.w);
    expect(bbox.h).toBeGreaterThan(layout.nodes.whole.box.h);
    expect(bbox.x).toBeLessThanOrEqual(layout.nodes.p.box.x);
    expect(bbox.x + bbox.w).toBeGreaterThanOrEqual(
      layout.nodes.q.box.x + layout.nodes.q.box.w,
    );

    const subWhole = findSubitem(numberBondPart, props, 'whole') as Subitem;
    expect(subWhole).toBeDefined();
    expect(subWhole?.box).toEqual(layout.nodes.whole.box);
    expect(subWhole?.value).toBe(10);

    const subP = findSubitem(numberBondPart, props, 'p') as Subitem;
    expect(subP).toBeDefined();
    expect(subP?.box).toEqual(layout.nodes.p.box);
    expect(subP?.value).toBe(3);

    const subQ = findSubitem(numberBondPart, props, 'q') as Subitem;
    expect(subQ).toBeDefined();
    expect(subQ?.box).toEqual(layout.nodes.q.box);
    expect(subQ?.value).toBe(7);
  });
});
