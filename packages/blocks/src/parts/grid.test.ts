import { isValidElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { getTheme } from '@flow-see/core';
import { color, findSubitem, gridPart } from '../index';

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
    if (typeof el.type === 'string') {
      flatten(el.props.children as ReactNode, out);
    } else if (typeof el.type === 'function') {
      flatten((el.type as (p: unknown) => ReactNode)(el.props), out);
    }
  }
  return out;
}

const render = (p: Record<string, unknown>): El[] => {
  const Render = gridPart.Render as unknown as (a: { p: unknown; ctx: unknown }) => ReactNode;
  return flatten(Render({ p, ctx: { theme } }));
};

describe('方格扩展 (任务卡 X8)', () => {
  describe('cells 涂色位置', () => {
    it('按 [[行, 列], …] 精确指定涂色的格子位置', () => {
      const p = {
        at: [100, 200],
        rows: 3,
        cols: 4,
        cell: 40,
        cells: [
          [1, 1],
          [2, 3],
          [3, 4],
        ],
        color: 'green',
      };
      const els = render(p);

      // 全部 rect 元素：3 * 4 = 12 个背景网格 + 3 个涂色格子 = 15 个 rect
      const rects = els.filter((e) => e.type === 'rect');
      expect(rects).toHaveLength(12 + 3);

      // 区分背景格和涂色格：涂色格有 rx={4}，宽高为 cell - 6 = 34
      const filledRects = rects.filter((r) => r.props.rx === 4);
      expect(filledRects).toHaveLength(3);

      // 验证第 1 行第 1 列 [1, 1]：x = 100 + 3 = 103, y = 200 + 3 = 203
      const c11 = filledRects.find((r) => r.props.x === 103 && r.props.y === 203);
      expect(c11).toBeDefined();
      expect(c11?.props.width).toBe(34);
      expect(c11?.props.height).toBe(34);
      expect(c11?.props.opacity).toBe(1);
      expect(c11?.props.fill).toBe(color('green', theme));

      // 验证第 2 行第 3 列 [2, 3]：x = 100 + (3 - 1) * 40 + 3 = 183, y = 200 + (2 - 1) * 40 + 3 = 243
      const c23 = filledRects.find((r) => r.props.x === 183 && r.props.y === 243);
      expect(c23).toBeDefined();
      expect(c23?.props.width).toBe(34);
      expect(c23?.props.height).toBe(34);
      expect(c23?.props.opacity).toBe(1);

      // 验证第 3 行第 4 列 [3, 4]：x = 100 + (4 - 1) * 40 + 3 = 223, y = 200 + (3 - 1) * 40 + 3 = 283
      const c34 = filledRects.find((r) => r.props.x === 223 && r.props.y === 283);
      expect(c34).toBeDefined();
      expect(c34?.props.width).toBe(34);
      expect(c34?.props.height).toBe(34);
      expect(c34?.props.opacity).toBe(1);
    });

    it('cells 为空列表时不涂任何格子', () => {
      const p = {
        at: [100, 200],
        rows: 2,
        cols: 2,
        cell: 40,
        cells: [],
      };
      const els = render(p);
      const filledRects = els.filter((e) => e.type === 'rect' && e.props.rx === 4);
      expect(filledRects).toHaveLength(0);
    });

    it('未指定 cells 时回退到 filled 涂色逻辑', () => {
      const p = {
        at: [100, 200],
        rows: 2,
        cols: 3,
        cell: 40,
        filled: 2,
      };
      const els = render(p);
      const filledRects = els.filter((e) => e.type === 'rect' && e.props.rx === 4);
      expect(filledRects).toHaveLength(2);
      // 第一行前两格 [1, 1], [1, 2]
      expect(filledRects[0].props.x).toBe(103);
      expect(filledRects[0].props.y).toBe(203);
      expect(filledRects[1].props.x).toBe(143);
      expect(filledRects[1].props.y).toBe(203);
    });

    it('子项变色 _subColors 优先作用于对应单元格', () => {
      const p = {
        at: [100, 200],
        rows: 2,
        cols: 2,
        cell: 40,
        cells: [
          [1, 1],
          [2, 2],
        ],
        color: 'green',
        _subColors: {
          'cell.1.1': 'red',
        },
      };
      const els = render(p);
      const filledRects = els.filter((e) => e.type === 'rect' && e.props.rx === 4);
      const c11 = filledRects.find((r) => r.props.x === 103 && r.props.y === 203);
      const c22 = filledRects.find((r) => r.props.x === 143 && r.props.y === 243);
      expect(c11?.props.fill).toBe(color('red', theme));
      expect(c22?.props.fill).toBe(color('green', theme));
    });
  });

  describe('子项与包围盒', () => {
    it('bbox 计算基于 rows、cols 与 cell', () => {
      const p = { at: [50, 60], rows: 4, cols: 5, cell: 30 };
      expect(gridPart.bbox(p)).toEqual({
        x: 50,
        y: 60,
        w: 150,
        h: 120,
      });
    });

    it('subitems 支持 cell.<行>.<列>、row.<n>、col.<n>', () => {
      const p = { at: [100, 100], rows: 3, cols: 3, cell: 40 };
      const c22 = findSubitem(gridPart, p, 'cell.2.2');
      expect(c22).toMatchObject({
        name: 'cell.2.2',
        box: { x: 140, y: 140, w: 40, h: 40 },
      });

      const r2 = findSubitem(gridPart, p, 'row.2');
      expect(r2).toMatchObject({
        name: 'row.2',
        box: { x: 100, y: 140, w: 120, h: 40 },
      });

      const col3 = findSubitem(gridPart, p, 'col.3');
      expect(col3).toMatchObject({
        name: 'col.3',
        box: { x: 180, y: 100, w: 40, h: 120 },
      });
    });
  });
});
