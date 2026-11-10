import { isValidElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { getTheme } from '@flow-see/core';
import {
  findSubitem,
  isDarkBackground,
  moneyLayout,
  moneyPart,
  parseDenomination,
} from '../index';

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

describe('B8 人民币（money）', () => {
  it('各面值尺寸', () => {
    // 硬币直径：1 分 30、2 分 34、5 分 38、1 角 40、5 角 44、1 元 50
    expect(parseDenomination(0.01)).toMatchObject({ isNote: false, width: 30, height: 30 });
    expect(parseDenomination(0.02)).toMatchObject({ isNote: false, width: 34, height: 34 });
    expect(parseDenomination(0.05)).toMatchObject({ isNote: false, width: 38, height: 38 });
    expect(parseDenomination(0.1)).toMatchObject({ isNote: false, width: 40, height: 40 });
    expect(parseDenomination(0.5)).toMatchObject({ isNote: false, width: 44, height: 44 });
    expect(parseDenomination(1)).toMatchObject({ isNote: false, width: 50, height: 50 });

    // 纸币宽高：1 元 120 × 60、5 元 128 × 64、10 元 136 × 68、20 元 144 × 72、50 元 152 × 76、100 元 160 × 80
    expect(parseDenomination('1n')).toMatchObject({ isNote: true, width: 120, height: 60 });
    expect(parseDenomination(5)).toMatchObject({ isNote: true, width: 128, height: 64 });
    expect(parseDenomination('5n')).toMatchObject({ isNote: true, width: 128, height: 64 });
    expect(parseDenomination(10)).toMatchObject({ isNote: true, width: 136, height: 68 });
    expect(parseDenomination(20)).toMatchObject({ isNote: true, width: 144, height: 72 });
    expect(parseDenomination(50)).toMatchObject({ isNote: true, width: 152, height: 76 });
    expect(parseDenomination(100)).toMatchObject({ isNote: true, width: 160, height: 80 });

    // size 整体缩放测试
    const layout = moneyLayout({
      at: [0, 0],
      items: [0.01, '1n', 100],
      size: 2,
    });
    expect(layout.slots[0].box).toMatchObject({ w: 60, h: 60 });
    expect(layout.slots[1].box).toMatchObject({ w: 240, h: 120 });
    expect(layout.slots[2].box).toMatchObject({ w: 320, h: 160 });
  });

  it('0.5 显示“5 角”', () => {
    const denom = parseDenomination(0.5);
    expect(denom.digits).toBe('5');
    expect(denom.unitKey).toBe('jiao');

    const props = {
      at: [0, 0],
      items: [0.5],
      labels: { jiao: '角' },
    };
    const Render = moneyPart.Render as (p: { p: unknown; ctx: unknown }) => ReactNode;
    const rendered = Render({ p: props, ctx: { theme } });
    const els = flatten(rendered);
    const texts = els
      .filter((e) => e.type === 'text')
      .map((e) => e.props.children);

    expect(texts).toContain('5');
    expect(texts).toContain('角');
  });

  it('\'1n\' 是纸币', () => {
    // 1 是硬币，'1n' 是纸币
    const coinDenom = parseDenomination(1);
    expect(coinDenom.isNote).toBe(false);
    expect(coinDenom.width).toBe(50);
    expect(coinDenom.height).toBe(50);

    const noteDenom = parseDenomination('1n');
    expect(noteDenom.isNote).toBe(true);
    expect(noteDenom.width).toBe(120);
    expect(noteDenom.height).toBe(60);

    const Render = moneyPart.Render as (p: { p: unknown; ctx: unknown }) => ReactNode;

    // 渲染硬币：包含 circle
    const coinRender = Render({ p: { at: [0, 0], items: [1] }, ctx: { theme } });
    const coinEls = flatten(coinRender);
    expect(coinEls.some((e) => e.type === 'circle')).toBe(true);

    // 渲染纸币：包含 rect
    const noteRender = Render({ p: { at: [0, 0], items: ['1n'] }, ctx: { theme } });
    const noteEls = flatten(noteRender);
    expect(noteEls.some((e) => e.type === 'rect')).toBe(true);
  });

  it('亮度选字色', () => {
    // 深色面值用白色，浅色用 ink
    // 黄色 (#ca8a04) 亮度 > 140 -> 浅色 -> 选 ink
    expect(isDarkBackground('#ca8a04')).toBe(false);
    // 灰色 (#6b7280) 亮度 < 140 -> 深色 -> 选白色
    expect(isDarkBackground('#6b7280')).toBe(true);
    // 红色 (#dc2626) -> 深色 -> 选白色
    expect(isDarkBackground('#dc2626')).toBe(true);
    // 纯白 (#ffffff) -> 浅色
    expect(isDarkBackground('#ffffff')).toBe(false);
    // 纯黑 (#000000) -> 深色
    expect(isDarkBackground('#000000')).toBe(true);

    const Render = moneyPart.Render as (p: { p: unknown; ctx: unknown }) => ReactNode;

    // 0.5 (默认黄色) 渲染数字的字色为 ink
    const yellowRender = Render({
      p: { at: [0, 0], items: [0.5], colors: { '0.5': 'yellow' } },
      ctx: { theme },
    });
    const yellowTexts = flatten(yellowRender).filter(
      (e) => e.type === 'text' && e.props.children === '5',
    );
    expect(yellowTexts[0].props.fill).toBe(theme.ink);

    // 100 (默认红色) 渲染数字的字色为白色
    const redRender = Render({
      p: { at: [0, 0], items: [100], colors: { '100': 'red' } },
      ctx: { theme },
    });
    const redTexts = flatten(redRender).filter(
      (e) => e.type === 'text' && e.props.children === '100',
    );
    expect(redTexts[0].props.fill?.toString().toLowerCase()).toBe('#ffffff');
  });

  it('row / grid / pile 布局与位置计算', () => {
    const at: [number, number] = [10, 20];
    const items = [1, 1, 1, 1, 1]; // 5 个 1 元硬币（直径 50）
    const gap = 10;

    // 1. row 布局
    const rowLayout = moneyLayout({ at, items, layout: 'row', gap });
    expect(rowLayout.slots[0].box).toMatchObject({ x: 10, y: 20, w: 50, h: 50 });
    expect(rowLayout.slots[1].box).toMatchObject({ x: 10 + 50 + 10, y: 20, w: 50, h: 50 });
    expect(rowLayout.slots[4].box).toMatchObject({ x: 10 + 4 * 60, y: 20, w: 50, h: 50 });

    // 2. grid 布局（cols: 2）
    const gridLayout = moneyLayout({ at, items, layout: 'grid', cols: 2, gap });
    // 第 1 个: col 0, row 0 -> (10, 20)
    expect(gridLayout.slots[0].box).toMatchObject({ x: 10, y: 20 });
    // 第 2 个: col 1, row 0 -> (70, 20)
    expect(gridLayout.slots[1].box).toMatchObject({ x: 70, y: 20 });
    // 第 3 个: col 0, row 1 -> (10, 80)
    expect(gridLayout.slots[2].box).toMatchObject({ x: 10, y: 80 });

    // 3. pile 布局
    const pileLayout = moneyLayout({ at, items, layout: 'pile', gap });
    expect(pileLayout.slots).toHaveLength(5);
    // 散点在 grid 基础上有固定偏移
    expect(pileLayout.slots[0].box.x).not.toBe(10);
  });

  it('show 3.5 时画 4 个且第 4 个半透明', () => {
    const props = {
      at: [0, 0],
      items: [1, 1, 1, 1, 1],
      show: 3.5,
    };
    const layout = moneyLayout(props);
    const visibleSlots = layout.slots.filter((s) => s.visible && s.opacity > 0);
    expect(visibleSlots).toHaveLength(4);
    expect(visibleSlots[0].opacity).toBe(1);
    expect(visibleSlots[1].opacity).toBe(1);
    expect(visibleSlots[2].opacity).toBe(1);
    expect(visibleSlots[3].opacity).toBeCloseTo(0.5, 6);

    const Render = moneyPart.Render as (p: { p: unknown; ctx: unknown }) => ReactNode;
    const rendered = Render({ p: props, ctx: { theme } });
    const els = flatten(rendered);
    const groups = els.filter(
      (e) => e.type === 'g' && typeof e.props.opacity === 'number',
    );
    expect(groups).toHaveLength(4);
    expect(groups[3].props.opacity).toBeCloseTo(0.5, 6);
  });

  it('hiddenItems 隐藏的项不画且子项 disabled', () => {
    const props = {
      at: [0, 0],
      items: [100, 50, 20, 10, 5],
      hiddenItems: [2, 4],
    };
    const layout = moneyLayout(props);
    expect(layout.slots[1].hidden).toBe(true);
    expect(layout.slots[1].visible).toBe(false);
    expect(layout.slots[3].hidden).toBe(true);
    expect(layout.slots[3].visible).toBe(false);

    const Render = moneyPart.Render as (p: { p: unknown; ctx: unknown }) => ReactNode;
    const rendered = Render({ p: props, ctx: { theme } });
    const groups = flatten(rendered).filter(
      (e) => e.type === 'g' && typeof e.props.opacity === 'number',
    );
    expect(groups).toHaveLength(3); // 只有 1, 3, 5

    const subs = moneyPart.subitems?.(props);
    expect(subs).toHaveLength(5);
    const sub2 = findSubitem(moneyPart, props, '2');
    const sub4 = findSubitem(moneyPart, props, '4');
    const sub1 = findSubitem(moneyPart, props, '1');

    expect(sub2).toBeDefined();
    expect((sub2 as { disabled?: boolean }).disabled).toBe(true);
    expect((sub4 as { disabled?: boolean }).disabled).toBe(true);
    expect((sub1 as { disabled?: boolean }).disabled).toBe(false);
  });

  it('子项包含正确的面值（元）', () => {
    const props = {
      at: [0, 0],
      items: [100, '1n', 0.5, 0.1, 0.01],
    };
    const subs = moneyPart.subitems?.(props);
    expect(subs).toBeDefined();
    expect(subs![0].value).toBe(100);
    expect(subs![1].value).toBe(1);
    expect(subs![2].value).toBe(0.5);
    expect(subs![3].value).toBe(0.1);
    expect(subs![4].value).toBe(0.01);
  });

  it('包围盒正确包住全部可见内容', () => {
    const props = {
      at: [100, 100],
      items: [100, 50],
      layout: 'row',
      gap: 12,
    };
    const bbox = moneyPart.bbox(props);
    expect(bbox.x).toBe(100);
    expect(bbox.y).toBe(100);
    // 100元宽 160，高 80；50元宽 152，高 76
    // 总宽 = 160 + 12 + 152 = 324；总高 = 80
    expect(bbox.w).toBe(324);
    expect(bbox.h).toBe(80);
  });
});
