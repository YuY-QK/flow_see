import { isValidElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { getTheme } from '@flow-see/core';
import {
  findSubitem,
  itemSetLayout,
  itemSetPart,
  type ItemSetItem,
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

describe('B1 物品组（item-set）', () => {
  const items12: ItemSetItem[] = Array.from({ length: 12 }, (_, i) => ({
    shape: 'circle',
    value: i + 1,
  }));

  it('row / grid / pile 下第 1、6、12 个的位置', () => {
    const at: [number, number] = [100, 200];
    const size = 56;
    const gap = 12;
    const step = size + gap; // 68

    // 1. row 布局：一排，cols = 物品数 (12)
    const rowLayout = itemSetLayout({ at, items: items12, layout: 'row', size, gap });
    expect(rowLayout.slots[0].at).toEqual([100, 200]); // n = 1
    expect(rowLayout.slots[5].at).toEqual([100 + 5 * step, 200]); // n = 6 -> [440, 200]
    expect(rowLayout.slots[11].at).toEqual([100 + 11 * step, 200]); // n = 12 -> [848, 200]

    // 2. grid 布局：默认 cols = 5
    const gridLayout = itemSetLayout({ at, items: items12, layout: 'grid', cols: 5, size, gap });
    // n = 1: col = 0, row = 0
    expect(gridLayout.slots[0].at).toEqual([100, 200]);
    // n = 6: col = 0, row = 1 -> [100, 200 + 68] = [100, 268]
    expect(gridLayout.slots[5].at).toEqual([100, 268]);
    // n = 12: col = 1, row = 2 -> [100 + 68, 200 + 2 * 68] = [168, 336]
    expect(gridLayout.slots[11].at).toEqual([168, 336]);

    // 3. pile 布局：cols = ceil(sqrt(12)) = 4
    // 叠加偏移 (sin(n * 2.4) * size * 0.35, cos(n * 1.7) * size * 0.25)
    const pileLayout = itemSetLayout({ at, items: items12, layout: 'pile', size, gap });
    expect(pileLayout.cols).toBe(4);

    // n = 1: base = [100, 200]
    const dx1 = Math.sin(1 * 2.4) * size * 0.35;
    const dy1 = Math.cos(1 * 1.7) * size * 0.25;
    expect(pileLayout.slots[0].at[0]).toBeCloseTo(100 + dx1, 6);
    expect(pileLayout.slots[0].at[1]).toBeCloseTo(200 + dy1, 6);

    // n = 6: col = 1, row = 1 -> base = [168, 268]
    const dx6 = Math.sin(6 * 2.4) * size * 0.35;
    const dy6 = Math.cos(6 * 1.7) * size * 0.25;
    expect(pileLayout.slots[5].at[0]).toBeCloseTo(168 + dx6, 6);
    expect(pileLayout.slots[5].at[1]).toBeCloseTo(268 + dy6, 6);

    // n = 12: col = 3, row = 2 -> base = [100 + 3 * 68, 200 + 2 * 68] = [304, 336]
    const dx12 = Math.sin(12 * 2.4) * size * 0.35;
    const dy12 = Math.cos(12 * 1.7) * size * 0.25;
    expect(pileLayout.slots[11].at[0]).toBeCloseTo(304 + dx12, 6);
    expect(pileLayout.slots[11].at[1]).toBeCloseTo(336 + dy12, 6);
  });

  it('show 3.5 时画 4 个且第 4 个半透明', () => {
    const props = {
      at: [0, 0],
      items: items12,
      show: 3.5,
    };
    const layout = itemSetLayout(props);
    const visibleSlots = layout.slots.filter((s) => s.visible && s.opacity > 0);
    expect(visibleSlots).toHaveLength(4);
    expect(visibleSlots[0].opacity).toBe(1);
    expect(visibleSlots[1].opacity).toBe(1);
    expect(visibleSlots[2].opacity).toBe(1);
    expect(visibleSlots[3].opacity).toBeCloseTo(0.5, 6);

    const Render = itemSetPart.Render as (p: { p: unknown; ctx: unknown }) => ReactNode;
    const rendered = Render({ p: props, ctx: { theme } });
    const els = flatten(rendered);
    // 渲染出的物品包裹组为 4 个
    const itemGroups = els.filter(
      (e) => e.type === 'g' && typeof e.props.opacity === 'number',
    );
    expect(itemGroups).toHaveLength(4);
    expect(itemGroups[0].props.opacity).toBe(1);
    expect(itemGroups[1].props.opacity).toBe(1);
    expect(itemGroups[2].props.opacity).toBe(1);
    expect(itemGroups[3].props.opacity).toBeCloseTo(0.5, 6);
  });

  it('hiddenItems 后被隐藏的不画、子项仍存在但不可点', () => {
    const props = {
      at: [0, 0],
      items: items12.slice(0, 5),
      hiddenItems: [2, 4],
    };
    const layout = itemSetLayout(props);
    // 槽位状态
    expect(layout.slots[1].hidden).toBe(true);
    expect(layout.slots[1].visible).toBe(false);
    expect(layout.slots[3].hidden).toBe(true);
    expect(layout.slots[3].visible).toBe(false);

    // 渲染检查：第 2 和第 4 项未渲染
    const Render = itemSetPart.Render as (p: { p: unknown; ctx: unknown }) => ReactNode;
    const rendered = Render({ p: props, ctx: { theme } });
    const els = flatten(rendered);
    const itemGroups = els.filter(
      (e) => e.type === 'g' && typeof e.props.opacity === 'number',
    );
    expect(itemGroups).toHaveLength(3); // 只有 1, 3, 5

    // 子项检查：1 到 5 均存在，但 2 和 4 disabled 为 true（不可点）
    const subs = itemSetPart.subitems?.(props);
    expect(subs).toHaveLength(5);
    const sub2 = findSubitem(itemSetPart, props, '2');
    const sub4 = findSubitem(itemSetPart, props, '4');
    const sub1 = findSubitem(itemSetPart, props, '1');

    expect(sub2).toBeDefined();
    expect(Array.isArray(sub2)).toBe(false);
    expect((sub2 as { disabled?: boolean }).disabled).toBe(true);

    expect(sub4).toBeDefined();
    expect((sub4 as { disabled?: boolean }).disabled).toBe(true);

    expect(sub1).toBeDefined();
    expect((sub1 as { disabled?: boolean }).disabled).toBe(false);
  });

  it('包围盒包含 label', () => {
    const baseProps = {
      at: [100, 100],
      size: 56,
      items: [{ shape: 'circle' as const }],
    };
    const bboxNoLabel = itemSetPart.bbox(baseProps);
    expect(bboxNoLabel).toEqual({ x: 100, y: 100, w: 56, h: 56 });

    const propsWithLabel = {
      at: [100, 100],
      size: 56,
      items: [{ shape: 'circle' as const, label: '苹果' }],
    };
    const bboxWithLabel = itemSetPart.bbox(propsWithLabel);

    // label 位于格子下方 8px，字号 20
    // 格子底端 y = 100 + 56 = 156
    // label 底端 y = 156 + 8 + 20 = 184
    expect(bboxWithLabel.y).toBe(100);
    expect(bboxWithLabel.y + bboxWithLabel.h).toBeGreaterThanOrEqual(184);
    expect(bboxWithLabel.h).toBeGreaterThanOrEqual(84);
  });

  it('支持多种图形（circle、square、triangle、star）和素材占位', () => {
    const props = {
      at: [0, 0],
      size: 60,
      items: [
        { shape: 'circle' as const, color: 'blue' },
        { shape: 'square' as const, color: 'orange' },
        { shape: 'triangle' as const, color: 'red' },
        { shape: 'star' as const, color: 'yellow' },
        { asset: 'apple' },
      ],
    };
    const Render = itemSetPart.Render as (p: { p: unknown; ctx: unknown }) => ReactNode;
    const rendered = Render({
      p: props,
      ctx: {
        theme,
        assetUrl: (id: string) => (id === 'apple' ? '/assets/apple.svg' : undefined),
      },
    });
    const els = flatten(rendered);

    expect(els.some((e) => e.type === 'circle')).toBe(true);
    expect(els.some((e) => e.type === 'rect' && e.props.rx)).toBe(true);
    expect(els.some((e) => e.type === 'path')).toBe(true);
    expect(els.some((e) => e.type === 'image' && e.props.href === '/assets/apple.svg')).toBe(true);
  });

  it('子项携带 value 和 tags，并支持通配符查找', () => {
    const props = {
      at: [0, 0],
      items: [
        { shape: 'circle' as const, value: 5, tags: { kind: 'fruit' } },
        { shape: 'square' as const, value: 10, tags: { kind: 'toy' } },
      ],
    };
    const sub1 = findSubitem(itemSetPart, props, '1');
    expect(sub1).toMatchObject({
      name: '1',
      value: 5,
      tags: { kind: 'fruit' },
    });

    const all = findSubitem(itemSetPart, props, '*');
    expect(Array.isArray(all)).toBe(true);
    expect(all).toHaveLength(2);
  });
});
