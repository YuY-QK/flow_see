import { isValidElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { getTheme } from '@flow-see/core';
import {
  findSubitem,
  numberChartLayout,
  numberChartPart,
} from '../index';

const theme = getTheme('flat');

interface El {
  type: unknown;
  key: string | null;
  props: Record<string, unknown>;
}

function flatten(node: ReactNode, out: El[] = []): El[] {
  if (Array.isArray(node)) {
    node.forEach((n) => flatten(n, out));
  } else if (isValidElement(node)) {
    const el = {
      type: node.type,
      key: node.key,
      props: node.props as Record<string, unknown>,
    };
    out.push(el);
    if (el.props && el.props.children) {
      flatten(el.props.children as ReactNode, out);
    }
  }
  return out;
}

describe('B5 百数表（number-chart）', () => {
  it('n.37 的 box 位置计算与各行各列包围盒', () => {
    // 默认百数表：from: 1, to: 100, cols: 10, cell: 38
    const props = {
      at: [0, 0] as [number, number],
      from: 1,
      to: 100,
      cols: 10,
      cell: 38,
    };
    const layout = numberChartLayout(props);

    // 1..100，共 100 格，10 行 10 列
    expect(layout.rows).toBe(10);
    expect(layout.cols).toBe(10);
    expect(layout.box).toEqual({ x: 0, y: 0, w: 380, h: 380 });

    // 检查 37 这个数：
    // offset = 37 - 1 = 36
    // row 4 (0-based 3), col 7 (0-based 6)
    // x = 6 * 38 = 228, y = 3 * 38 = 114
    const cell37 = layout.cells.find((c) => c.num === 37);
    expect(cell37).toBeDefined();
    expect(cell37?.row).toBe(4);
    expect(cell37?.col).toBe(7);
    expect(cell37?.box).toEqual({ x: 228, y: 114, w: 38, h: 38 });

    // 验证子项 subitem
    const sub37 = findSubitem(numberChartPart, props, 'n.37');
    expect(sub37).toBeDefined();
    expect(!Array.isArray(sub37) && sub37?.name).toBe('n.37');
    expect(!Array.isArray(sub37) && sub37?.value).toBe(37);
    expect(!Array.isArray(sub37) && sub37?.box).toEqual({ x: 228, y: 114, w: 38, h: 38 });

    // 带偏移 at 的情况
    const offsetProps = { ...props, at: [20, 30] as [number, number] };
    const offsetSub37 = findSubitem(numberChartPart, offsetProps, 'n.37');
    expect(!Array.isArray(offsetSub37) && offsetSub37?.box).toEqual({
      x: 20 + 228,
      y: 30 + 114,
      w: 38,
      h: 38,
    });

    // 验证 row.4 和 col.7 子项包围盒
    const subRow4 = findSubitem(numberChartPart, props, 'row.4');
    expect(!Array.isArray(subRow4) && subRow4?.box).toEqual({
      x: 0,
      y: 114,
      w: 380,
      h: 38,
    });

    const subCol7 = findSubitem(numberChartPart, props, 'col.7');
    expect(!Array.isArray(subCol7) && subCol7?.box).toEqual({
      x: 228,
      y: 0,
      w: 38,
      h: 380,
    });

    // 通配符查找
    const allNums = findSubitem(numberChartPart, props, 'n.*');
    expect(Array.isArray(allNums) && allNums.length).toBe(100);

    const allRows = findSubitem(numberChartPart, props, 'row.*');
    expect(Array.isArray(allRows) && allRows.length).toBe(10);

    const allCols = findSubitem(numberChartPart, props, 'col.*');
    expect(Array.isArray(allCols) && allCols.length).toBe(10);
  });

  it('reveal = 1.5 时第 2 组标记只出现一半（按数值从小到大）', () => {
    const props = {
      from: 1,
      to: 100,
      cols: 10,
      cell: 38,
      marks: [
        { multiplesOf: 2, color: 'blue', style: 'fill' as const },
        { multiplesOf: 10, color: 'orange', style: 'circle' as const },
      ],
      reveal: 1.5,
    };
    const layout = numberChartLayout(props);

    // 第 1 组（2 的倍数）：reveal >= 1，整组 50 个数完全出现
    const group0Cells = layout.cells.filter((c) =>
      c.marks.some((m) => m.groupIndex === 0 && m.opacity === 1),
    );
    expect(group0Cells.length).toBe(50);

    // 第 2 组（10 的倍数）：在 1..100 中总共有 10 个：10, 20, 30, 40, 50, 60, 70, 80, 90, 100
    // reveal = 1.5 时，第 2 组只出现一半（按数值从小到大出现前 5 个：10, 20, 30, 40, 50）
    const group1Cells = layout.cells.filter((c) =>
      c.marks.some((m) => m.groupIndex === 1 && m.opacity > 0),
    );
    expect(group1Cells.length).toBe(5);

    // 检查具体出现的数字正是较小的前半部分
    const group1Nums = group1Cells.map((c) => c.num);
    expect(group1Nums).toEqual([10, 20, 30, 40, 50]);

    // 后半部分（60, 70, 80, 90, 100）没有第 2 组标记
    const laterTens = [60, 70, 80, 90, 100];
    for (const n of laterTens) {
      const cell = layout.cells.find((c) => c.num === n);
      expect(cell?.marks.some((m) => m.groupIndex === 1)).toBe(false);
    }
  });

  it('keepSelf 过滤验证（自身数不添加该标记）', () => {
    // 质数筛模式：2、3 的倍数划去，但保留自身
    const props = {
      from: 1,
      to: 20,
      cols: 10,
      marks: [
        { multiplesOf: 2, color: 'gray', style: 'cross' as const, keepSelf: true },
        { multiplesOf: 3, color: 'gray', style: 'cross' as const, keepSelf: true },
      ],
      reveal: 2,
    };
    const layout = numberChartLayout(props);

    // 2 自身保留（不含有 multiplesOf: 2 的标记）
    const cell2 = layout.cells.find((c) => c.num === 2);
    expect(cell2?.marks.some((m) => m.multiplesOf === 2)).toBe(false);

    // 4、6、8 等含有 multiplesOf: 2 的标记
    const cell4 = layout.cells.find((c) => c.num === 4);
    expect(cell4?.marks.some((m) => m.multiplesOf === 2)).toBe(true);

    const cell6 = layout.cells.find((c) => c.num === 6);
    expect(cell6?.marks.some((m) => m.multiplesOf === 2)).toBe(true);

    // 3 自身保留（不含有 multiplesOf: 3 的标记）
    const cell3 = layout.cells.find((c) => c.num === 3);
    expect(cell3?.marks.some((m) => m.multiplesOf === 3)).toBe(false);

    // 6、9 含有 multiplesOf: 3 的标记
    expect(cell6?.marks.some((m) => m.multiplesOf === 3)).toBe(true);
    const cell9 = layout.cells.find((c) => c.num === 9);
    expect(cell9?.marks.some((m) => m.multiplesOf === 3)).toBe(true);
  });

  it('多组叠加与多 style 渲染测试（fill 在底层，circle/cross 在上层）', () => {
    // 数字 20：2 的倍数（fill）、4 的倍数（cross）、10 的倍数（circle）
    const props = {
      from: 1,
      to: 30,
      cols: 10,
      marks: [
        // 注意顺序：先 cross，再 circle，再 fill
        { multiplesOf: 4, color: 'red', style: 'cross' as const },
        { multiplesOf: 10, color: 'orange', style: 'circle' as const },
        { multiplesOf: 2, color: 'blue', style: 'fill' as const },
      ],
      reveal: 3,
    };
    const layout = numberChartLayout(props);

    const cell20 = layout.cells.find((c) => c.num === 20);
    expect(cell20).toBeDefined();
    expect(cell20?.marks.length).toBe(3);

    // 无论 marks 原始传入顺序如何，排序后 fill 必须排在最前（底层）
    expect(cell20?.marks[0].style).toBe('fill');
    expect(cell20?.marks[0].color).toBe('blue');

    // 渲染测试
    const Render = numberChartPart.Render as (p: { p: unknown; ctx: unknown }) => ReactNode;
    const vdom = Render({ p: props, ctx: { theme } });
    const els = flatten(vdom);

    // 找到 key 为 '20' 或包含 20 对应 text 的内层格节点
    const cell20Text = els.find((el) => el.type === 'text' && el.props.children === 20);
    expect(cell20Text).toBeDefined();

    // 找到 key === '20' 的单元格 g 分组
    const cell20Group = els.find((el) => el.type === 'g' && (el.key === '20' || el.key === '.20' || el.key === 20 as unknown as string));
    expect(cell20Group).toBeDefined();

    const cellChildren = Array.isArray(cell20Group?.props.children)
      ? (cell20Group?.props.children as ReactNode[]).flat()
      : [cell20Group?.props.children];
    const flatCellChildren = flatten(cellChildren as ReactNode);

    const rects = flatCellChildren.filter((el) => el.type === 'rect');
    const texts = flatCellChildren.filter((el) => el.type === 'text');
    const circles = flatCellChildren.filter((el) => el.type === 'circle');
    const lines = flatCellChildren.filter((el) => el.type === 'line');

    // 底层边框 rect + fill rect
    expect(rects.length).toBe(2);
    expect(texts.length).toBe(1);
    expect(circles.length).toBe(1);
    expect(lines.length).toBe(1);

    // 在 DOM 顺序中，fill rect 在 circle 和 line 之前渲染
    const fillRectIndex = flatCellChildren.findIndex(
      (el) => el.type === 'rect' && el.props.fillOpacity !== undefined,
    );
    const circleIndex = flatCellChildren.findIndex((el) => el.type === 'circle');
    const crossLineIndex = flatCellChildren.findIndex((el) => el.type === 'line');

    expect(fillRectIndex).toBeGreaterThan(-1);
    expect(circleIndex).toBeGreaterThan(fillRectIndex);
    expect(crossLineIndex).toBeGreaterThan(fillRectIndex);
  });

  it('自定义网格尺寸与范围', () => {
    // 比如 1 到 60，10 列，每格 30
    const props = {
      from: 1,
      to: 60,
      cols: 10,
      cell: 30,
      at: [460, 40] as [number, number],
      size: 14,
    };
    const layout = numberChartLayout(props);
    expect(layout.rows).toBe(6);
    expect(layout.cols).toBe(10);
    expect(layout.box).toEqual({ x: 460, y: 40, w: 300, h: 180 });
    expect(numberChartPart.bbox(props)).toEqual({ x: 460, y: 40, w: 300, h: 180 });

    const sub60 = findSubitem(numberChartPart, props, 'n.60');
    // 60 是第 6 行第 10 列（0-based r=5, c=9）
    // x = 460 + 9 * 30 = 730, y = 40 + 5 * 30 = 190
    expect(!Array.isArray(sub60) && sub60?.box).toEqual({
      x: 730,
      y: 190,
      w: 30,
      h: 30,
    });
  });

  it('边缘与防御性情况处理', () => {
    // 1. from > to 时返回 0 行
    const emptyLayout = numberChartLayout({ from: 10, to: 5 });
    expect(emptyLayout.rows).toBe(0);
    expect(emptyLayout.cells.length).toBe(0);
    expect(emptyLayout.box.h).toBe(0);

    // 2. 异常 marks 过滤（multiplesOf <= 0 或 非对象）
    const malformedLayout = numberChartLayout({
      from: 1,
      to: 10,
      marks: [
        null,
        'invalid',
        { multiplesOf: 0 },
        { multiplesOf: -2 },
        { multiplesOf: 5, style: 'unknown' },
      ],
      reveal: 1,
    });
    expect(malformedLayout.marks.length).toBe(1);
    expect(malformedLayout.marks[0].multiplesOf).toBe(5);
    expect(malformedLayout.marks[0].style).toBe('circle'); // fallback

    // 3. reveal <= 0 时不生成任何标记
    const zeroRevealLayout = numberChartLayout({
      from: 1,
      to: 20,
      marks: [{ multiplesOf: 2, color: 'blue', style: 'fill' }],
      reveal: 0,
    });
    expect(zeroRevealLayout.cells.every((c) => c.marks.length === 0)).toBe(true);

    // 4. reveal 超出组数时 clamp 到完全展示
    const maxRevealLayout = numberChartLayout({
      from: 1,
      to: 20,
      marks: [{ multiplesOf: 5, color: 'blue', style: 'circle' }],
      reveal: 10,
    });
    const cellsWithMark = maxRevealLayout.cells.filter((c) => c.marks.length > 0);
    expect(cellsWithMark.map((c) => c.num)).toEqual([5, 10, 15, 20]);
    expect(cellsWithMark.every((c) => c.marks[0].opacity === 1)).toBe(true);
  });
});
