import { isValidElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { getTheme } from '@flow-see/core';
import {
  color,
  coordinateGridLayout,
  coordinateGridPart,
  findSubitem,
  gridPoint,
  type Props,
} from '../index';

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

const render = (p: Props, themeName = 'cute'): El[] => {
  const theme = getTheme(themeName);
  const Render = coordinateGridPart.Render as unknown as (a: {
    p: Props;
    ctx: { theme: typeof theme };
  }) => ReactNode;
  return flatten(Render({ p, ctx: { theme } }));
};

describe('方格纸与数对格零件 coordinate-grid (任务卡 B16)', () => {
  describe('gridPoint 纯坐标换算函数', () => {
    it('bottom-left 原点下 (3, 2) 的数值验证（默认 10 列 8 行，每格 40，at=[0,0]）', () => {
      const p = { cols: 10, rows: 8, cell: 40, origin: 'bottom-left' };
      const pt = gridPoint(p, 3, 2);
      // x = 0 + 3 * 40 = 120
      // y = 0 + (8 - 2) * 40 = 240
      expect(pt).toEqual([120, 240]);
    });

    it('top-left 原点下 (3, 2) 的数值验证（默认 10 列 8 行，每格 40，at=[0,0]）', () => {
      const p = { cols: 10, rows: 8, cell: 40, origin: 'top-left' };
      const pt = gridPoint(p, 3, 2);
      // x = 0 + 3 * 40 = 120
      // y = 0 + 2 * 40 = 80
      expect(pt).toEqual([120, 80]);
    });

    it('支持带舞台偏移与自定义行列数', () => {
      const p = {
        at: [100, 60],
        cols: 8,
        rows: 6,
        cell: 50,
        origin: 'bottom-left',
      };
      // (3, 2)
      // x = 100 + 3 * 50 = 250
      // y = 60 + (6 - 2) * 50 = 260
      expect(gridPoint(p, 3, 2)).toEqual([250, 260]);

      // (0, 0) 原点：左下角 [100, 360]
      expect(gridPoint(p, 0, 0)).toEqual([100, 360]);

      // (8, 6) 右上角 [500, 60]
      expect(gridPoint(p, 8, 6)).toEqual([500, 60]);
    });
  });

  describe('labels 为 true/false 时的布局尺寸与数字文本', () => {
    it('labels 为 false 时，包围盒严格等于网格本身尺寸，无数字标签', () => {
      const p = { at: [50, 30], cols: 10, rows: 8, cell: 40, labels: false };
      const layout = coordinateGridLayout(p);

      expect(layout.gridBox).toEqual({ x: 50, y: 30, w: 400, h: 320 });
      expect(layout.box).toEqual({ x: 50, y: 30, w: 400, h: 320 });
      expect(layout.labelItems).toHaveLength(0);

      const els = render(p);
      const textEls = els.filter((e) => e.type === 'text');
      expect(textEls).toHaveLength(0);
    });

    it('labels 为 true 时，包含底部列号、左侧行号及外扩包围盒', () => {
      const p = {
        at: [100, 50],
        cols: 6,
        rows: 4,
        cell: 40,
        labels: true,
        origin: 'bottom-left',
      };
      const layout = coordinateGridLayout(p);

      // 列号 0..6 (7 个)，行号 0..4 (5 个)，合计 12 个标签
      expect(layout.labelItems).toHaveLength(7 + 5);

      const colLabels = layout.labelItems.filter((it) => it.kind === 'col');
      expect(colLabels).toHaveLength(7);
      expect(colLabels.map((l) => l.text)).toEqual(['0', '1', '2', '3', '4', '5', '6']);

      const rowLabels = layout.labelItems.filter((it) => it.kind === 'row');
      expect(rowLabels).toHaveLength(5);
      expect(rowLabels.map((l) => l.text)).toEqual(['0', '1', '2', '3', '4']);

      // 验证第 3 列列号的 x 坐标：100 + 3 * 40 = 220
      const col3 = colLabels.find((l) => l.text === '3');
      expect(col3?.x).toBe(220);
      expect(col3?.y).toBe(50 + 4 * 40 + 20); // 230

      // 验证第 2 行行号的 y 坐标 (bottom-left): 50 + (4 - 2) * 40 = 130
      const row2 = rowLabels.find((l) => l.text === '2');
      expect(row2?.y).toBe(130);
      expect(row2?.x).toBe(100 - 16);

      // 包围盒尺寸大于 gridBox
      expect(layout.box.w).toBeGreaterThan(layout.gridBox.w);
      expect(layout.box.h).toBeGreaterThan(layout.gridBox.h);
      expect(layout.box.x).toBeLessThan(layout.gridBox.x);

      // 渲染验证：应包含 12 个文本元素，字号 18
      const els = render(p);
      const textEls = els.filter((e) => e.type === 'text');
      expect(textEls).toHaveLength(12);
      expect(textEls.every((t) => t.props.fontSize === 18)).toBe(true);
    });

    it('包含 axisLabels 时，渲染轴名且包围盒适度外扩', () => {
      const p = {
        at: [100, 50],
        cols: 6,
        rows: 4,
        cell: 40,
        labels: true,
        axisLabels: ['列', '行'],
      };
      const layout = coordinateGridLayout(p);

      const axisCol = layout.labelItems.find((it) => it.kind === 'axis-col');
      const axisRow = layout.labelItems.find((it) => it.kind === 'axis-row');

      expect(axisCol?.text).toBe('列');
      expect(axisRow?.text).toBe('行');
      expect(axisCol?.x).toBe(100 + 6 * 40 + 24);
      expect(axisRow?.y).toBe(50 - 18);
    });
  });

  describe('points 实心点与文本位置', () => {
    it('正确计算实心圆点与右上角文本位置', () => {
      const p = {
        at: [100, 50],
        cols: 8,
        rows: 6,
        cell: 50,
        origin: 'bottom-left',
        points: [
          { at: [3, 2], label: 'A(3,2)', color: 'red' },
          { at: [0, 0], color: 'blue' },
        ],
      };
      const layout = coordinateGridLayout(p);

      expect(layout.points).toHaveLength(2);

      const ptA = layout.points[0];
      // (3, 2): x = 100 + 3 * 50 = 250, y = 50 + (6 - 2) * 50 = 250
      expect(ptA.x).toBe(250);
      expect(ptA.y).toBe(250);
      expect(ptA.label).toBe('A(3,2)');
      expect(ptA.color).toBe('red');

      const ptOrigin = layout.points[1];
      // (0, 0): x = 100, y = 50 + 6 * 50 = 350
      expect(ptOrigin.x).toBe(100);
      expect(ptOrigin.y).toBe(350);
      expect(ptOrigin.label).toBeUndefined();

      // Render 元素验证
      const theme = getTheme('cute');
      const els = render(p, 'cute');
      const circles = els.filter((e) => e.type === 'circle');
      expect(circles).toHaveLength(2);

      // 半径严格为 7
      expect(circles[0].props.r).toBe(7);
      expect(circles[0].props.cx).toBe(250);
      expect(circles[0].props.cy).toBe(250);
      expect(circles[0].props.fill).toBe(color('red', theme));

      // 文本字号 20，位于点上方/右上方 (x + 10, y - 10)
      const texts = els.filter((e) => e.type === 'text');
      const labelA = texts.find((t) => t.props.children === 'A(3,2)');
      expect(labelA).toBeDefined();
      expect(labelA?.props.fontSize).toBe(20);
      expect(labelA?.props.x).toBe(260);
      expect(labelA?.props.y).toBe(240);
    });
  });

  describe('子项（subitems）与通配符', () => {
    it('严格验证 (cols + 1) * (rows + 1) 个格点子项', () => {
      const p = { cols: 10, rows: 8, cell: 40 };
      const allGridPoints = findSubitem(coordinateGridPart, p, 'pt.*') as unknown[];

      // (10 + 1) * (8 + 1) = 11 * 9 = 99
      expect(allGridPoints).toHaveLength(99);
    });

    it('格点子项名称与包围盒验证（以格点为中心，24×24 包围盒）', () => {
      const p = {
        at: [100, 60],
        cols: 8,
        rows: 6,
        cell: 50,
        origin: 'bottom-left',
      };
      const pt32 = findSubitem(coordinateGridPart, p, 'pt.3.2');
      // 格点坐标为 (250, 260)
      // 包围盒应为 24×24，中心在 (250, 260) -> [238, 248, 24, 24]
      expect(pt32).toMatchObject({
        name: 'pt.3.2',
        box: {
          x: 238,
          y: 248,
          w: 24,
          h: 24,
        },
      });
    });

    it('单元格子项查询与包围盒验证（cols * rows 个格子）', () => {
      const p = {
        at: [100, 60],
        cols: 4,
        rows: 3,
        cell: 50,
        origin: 'bottom-left',
      };
      const allCells = findSubitem(coordinateGridPart, p, 'cell.*') as unknown[];
      expect(allCells).toHaveLength(12);

      // 第一列第一行格子 cell.1.1（bottom-left 下为最底下一行第一列）：
      // x = 100, y = 60 + (3 - 1) * 50 = 160
      const c11 = findSubitem(coordinateGridPart, p, 'cell.1.1');
      expect(c11).toMatchObject({
        name: 'cell.1.1',
        box: {
          x: 100,
          y: 160,
          w: 50,
          h: 50,
        },
      });

      // 第二列第三行格子 cell.2.3（bottom-left 下为最顶上一行第二列）：
      // x = 100 + 1 * 50 = 150, y = 60 + (3 - 3) * 50 = 60
      const c23 = findSubitem(coordinateGridPart, p, 'cell.2.3');
      expect(c23).toMatchObject({
        name: 'cell.2.3',
        box: {
          x: 150,
          y: 60,
          w: 50,
          h: 50,
        },
      });
    });

    it('top-left 原点下的单元格子项验证', () => {
      const p = {
        at: [100, 60],
        cols: 4,
        rows: 3,
        cell: 50,
        origin: 'top-left',
      };
      // top-left 下第一行第一列 y = 60
      const c11 = findSubitem(coordinateGridPart, p, 'cell.1.1');
      expect(c11).toMatchObject({
        name: 'cell.1.1',
        box: {
          x: 100,
          y: 60,
          w: 50,
          h: 50,
        },
      });
    });
  });

  describe('网格线与外边框渲染', () => {
    it('内格线线宽为 1，外边框线宽为 2，颜色跟随主题', () => {
      const p = { at: [0, 0], cols: 5, rows: 4, cell: 40, color: 'line' };
      const theme = getTheme('chalk');
      const els = render(p, 'chalk');

      const lines = els.filter((e) => e.type === 'line');
      // 内垂直线: 5 - 1 = 4；内水平线: 4 - 1 = 3；共 7 条内格线
      expect(lines).toHaveLength(7);
      expect(lines.every((l) => l.props.strokeWidth === 1)).toBe(true);
      expect(lines.every((l) => l.props.stroke === color('line', theme))).toBe(true);

      const rects = els.filter((e) => e.type === 'rect');
      // 外边框为 rect，线宽 2
      expect(rects).toHaveLength(1);
      expect(rects[0].props.strokeWidth).toBe(2);
      expect(rects[0].props.stroke === color('line', theme)).toBe(true);
    });
  });
});
