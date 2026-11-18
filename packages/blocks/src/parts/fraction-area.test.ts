import { describe, expect, it } from 'vitest';
import { getTheme, type Theme, type ThemeId } from '@flow-see/core';
import { checkScene } from '../../../templates/src/scene/check';
import {
  FRACTION_AREA_BORDER_WIDTH,
  FRACTION_AREA_COL_OPACITY,
  FRACTION_AREA_GRID_WIDTH,
  FRACTION_AREA_OVERLAP_OPACITY,
  FRACTION_AREA_ROW_OPACITY,
  color,
  findSubitem,
  fractionAreaLayout,
  fractionAreaPart,
  getPart,
  type PartContext,
  type Subitem,
} from '../index';

interface VNode {
  type?: unknown;
  props?: Record<string, unknown>;
}

function renderWithTheme(p: Record<string, unknown>, theme: Theme = getTheme('flat')): VNode {
  const ctx: PartContext = { theme };
  return (fractionAreaPart.Render as unknown as (args: { p: unknown; ctx: unknown }) => VNode)({
    p,
    ctx,
  });
}

function collectByTag(node: unknown, tag: string, out: VNode[] = []): VNode[] {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const child of node) collectByTag(child, tag, out);
    return out;
  }
  const v = node as VNode;
  if (v.type === tag) out.push(v);
  if (v.props && v.props.children !== undefined) {
    collectByTag(v.props.children, tag, out);
  }
  return out;
}

describe('B23 分数/小数面积模型零件 (fraction-area)', () => {
  describe('1. 默认配置与整数涂色重叠区计算', () => {
    it('getPart("fraction-area") 注册完整且默认属性来自 site.yaml', () => {
      const resolved = getPart('fraction-area');
      expect(resolved).toBeDefined();
      expect(resolved!.anchor).toBe('start');
      expect(resolved!.defaults).toMatchObject({
        rows: 3,
        cols: 5,
        shadeRows: 0,
        shadeCols: 0,
        size: 300,
        color: 'blue',
        color2: 'orange',
        overlapColor: 'green',
        grid: true,
      });
    });

    it('rows: 3, cols: 5, size: 300, shadeRows: 2, shadeCols: 3 时重叠区 box 宽 180、高 200，且三块涂色互不重叠', () => {
      const p = {
        at: [60, 80],
        rows: 3,
        cols: 5,
        size: 300,
        shadeRows: 2,
        shadeCols: 3,
      };
      const L = fractionAreaLayout(p);

      expect(L.bbox).toEqual({ x: 60, y: 80, w: 300, h: 300 });
      expect(L.shadeW).toBeCloseTo(180, 6);
      expect(L.shadeH).toBeCloseTo(200, 6);

      // 重叠区域 [at.x, at.y, 180, 200]
      expect(L.overlapBox).toEqual({ x: 60, y: 80, w: 180, h: 200 });

      // 仅行涂色区域 [at.x + 180, at.y, 120, 200]
      expect(L.rowOnlyBox).toEqual({ x: 240, y: 80, w: 120, h: 200 });

      // 仅列涂色区域 [at.x, at.y + 200, 180, 100]
      expect(L.colOnlyBox).toEqual({ x: 60, y: 280, w: 180, h: 100 });

      // 三个区域面积之和恰好等于并集面积 300*200 + 180*100 = 78000，无重复叠层
      const totalPaintedArea =
        L.overlapBox!.w * L.overlapBox!.h +
        L.rowOnlyBox!.w * L.rowOnlyBox!.h +
        L.colOnlyBox!.w * L.colOnlyBox!.h;
      expect(totalPaintedArea).toBeCloseTo(300 * 200 + 180 * 100, 6);

      // 通过 findSubitem 查询 overlap 子项
      const overlapSub = findSubitem(fractionAreaPart, p, 'overlap') as Subitem | undefined;
      expect(overlapSub).toBeDefined();
      expect(overlapSub!.disabled).toBeUndefined();
      expect(overlapSub!.box).toEqual({ x: 60, y: 80, w: 180, h: 200 });
    });
  });

  describe('2. 连续小数值平滑涂色与边界钳制', () => {
    it('shadeRows: 1.5, shadeCols: 2.5 时涂色宽度与高度按比例平滑过渡', () => {
      const L = fractionAreaLayout({
        at: [50, 40],
        rows: 3,
        cols: 5,
        size: 300,
        shadeRows: 1.5,
        shadeCols: 2.5,
      });

      // 1.5 / 3 * 300 = 150；2.5 / 5 * 300 = 150
      expect(L.shadeH).toBeCloseTo(150, 6);
      expect(L.shadeW).toBeCloseTo(150, 6);
      expect(L.overlapBox).toEqual({ x: 50, y: 40, w: 150, h: 150 });
      expect(L.rowOnlyBox).toEqual({ x: 200, y: 40, w: 150, h: 150 });
      expect(L.colOnlyBox).toEqual({ x: 50, y: 190, w: 150, h: 150 });
    });

    it('只涂行或只涂列时不生成 overlapBox，超出范围时自动 clamp 到 [0, rows/cols]', () => {
      const onlyRow = fractionAreaLayout({
        at: [10, 20],
        rows: 4,
        cols: 4,
        size: 200,
        shadeRows: 1.2,
        shadeCols: 0,
      });
      expect(onlyRow.shadeH).toBeCloseTo(60, 6);
      expect(onlyRow.shadeW).toBe(0);
      expect(onlyRow.overlapBox).toBeUndefined();
      expect(onlyRow.colOnlyBox).toBeUndefined();
      expect(onlyRow.rowOnlyBox).toEqual({ x: 10, y: 20, w: 200, h: 60 });

      const clamped = fractionAreaLayout({
        at: [0, 0],
        rows: 3,
        cols: 5,
        size: 300,
        shadeRows: 9,
        shadeCols: -2,
      });
      expect(clamped.shadeRows).toBe(3);
      expect(clamped.shadeCols).toBe(0);
      expect(clamped.shadeH).toBe(300);
      expect(clamped.shadeW).toBe(0);
    });
  });

  describe('3. 格线开关 (grid: true / false)', () => {
    it('grid: true 时生成 (rows - 1) + (cols - 1) 条内部格线，grid: false 时不生成内部格线', () => {
      const withGridProps = {
        at: [60, 60],
        rows: 3,
        cols: 5,
        size: 300,
        shadeRows: 1,
        shadeCols: 2,
        grid: true,
      };
      const LGrid = fractionAreaLayout(withGridProps);
      expect(LGrid.gridLines).toHaveLength(2 + 4);
      const vnodeGrid = renderWithTheme(withGridProps);
      const linesWithGrid = collectByTag(vnodeGrid, 'line');
      expect(linesWithGrid).toHaveLength(6);
      for (const ln of linesWithGrid) {
        expect(ln.props?.strokeWidth).toBe(FRACTION_AREA_GRID_WIDTH);
      }

      const noGridProps = {
        ...withGridProps,
        grid: false,
      };
      const LNoGrid = fractionAreaLayout(noGridProps);
      expect(LNoGrid.gridLines).toHaveLength(0);
      const vnodeNoGrid = renderWithTheme(noGridProps);
      const linesWithoutGrid = collectByTag(vnodeNoGrid, 'line');
      expect(linesWithoutGrid).toHaveLength(0);
    });
  });

  describe('4. 子项 cell.<r>.<c> 与 overlap 查询', () => {
    it('生成 rows * cols 个 cell.<r>.<c> 子项（1 起编号）及 overlap 子项', () => {
      const p = {
        at: [100, 50],
        rows: 3,
        cols: 5,
        size: 300,
        shadeRows: 2,
        shadeCols: 3,
      };

      const allCells = findSubitem(fractionAreaPart, p, 'cell.*') as Subitem[];
      expect(allCells).toHaveLength(15);

      const c11 = findSubitem(fractionAreaPart, p, 'cell.1.1') as Subitem | undefined;
      expect(c11).toBeDefined();
      expect(c11!.box).toEqual({ x: 100, y: 50, w: 60, h: 100 });

      const c35 = findSubitem(fractionAreaPart, p, 'cell.3.5') as Subitem | undefined;
      expect(c35).toBeDefined();
      expect(c35!.box).toEqual({ x: 340, y: 250, w: 60, h: 100 });

      const overlap = findSubitem(fractionAreaPart, p, 'overlap') as Subitem | undefined;
      expect(overlap).toBeDefined();
      expect(overlap!.box).toEqual({ x: 100, y: 50, w: 180, h: 200 });

      // 未涂色时 overlap 保留用于静态检查，但标记 disabled: true
      const overlapEmpty = findSubitem(
        fractionAreaPart,
        { at: [100, 50], rows: 3, cols: 5, size: 300, shadeRows: 0, shadeCols: 0 },
        'overlap',
      ) as Subitem | undefined;
      expect(overlapEmpty).toBeDefined();
      expect(overlapEmpty!.disabled).toBe(true);
    });
  });

  describe('5. 四套动画主题 VNode 渲染与颜色/透明度规范', () => {
    const themeIds: ThemeId[] = ['flat', 'chalk', 'cute', 'pro'];

    it.each(themeIds)('在 %s 主题下正确渲染底板、三块纯色填充、格线与外框', (themeId) => {
      const theme = getTheme(themeId);
      const p = {
        at: [60, 60],
        rows: 4,
        cols: 5,
        size: 200,
        shadeRows: 2,
        shadeCols: 3,
        color: 'blue',
        color2: 'orange',
        overlapColor: 'green',
        grid: true,
      };
      const vnode = renderWithTheme(p, theme);
      const rects = collectByTag(vnode, 'rect');
      const lines = collectByTag(vnode, 'line');

      // 底板 + 行涂色 + 列涂色 + 重叠区 + 外框 = 5 个 rect
      expect(rects).toHaveLength(5);
      // 3 条横线 + 4 条竖线 = 7 条格线
      expect(lines).toHaveLength(7);

      const [bgRect, rowRect, colRect, overlapRect, borderRect] = rects;
      expect(bgRect.props?.fill).toBe(theme.stageBg);

      expect(rowRect.props?.fill).toBe(color('blue', theme));
      expect(rowRect.props?.opacity).toBe(FRACTION_AREA_ROW_OPACITY);

      expect(colRect.props?.fill).toBe(color('orange', theme));
      expect(colRect.props?.opacity).toBe(FRACTION_AREA_COL_OPACITY);

      expect(overlapRect.props?.fill).toBe(color('green', theme));
      expect(overlapRect.props?.opacity).toBe(FRACTION_AREA_OVERLAP_OPACITY);

      expect(borderRect.props?.fill).toBe('none');
      expect(borderRect.props?.stroke).toBe(color('ink', theme));
      expect(borderRect.props?.strokeWidth).toBe(FRACTION_AREA_BORDER_WIDTH);

      for (const ln of lines) {
        expect(ln.props?.stroke).toBe(color('line', theme));
        expect(ln.props?.strokeWidth).toBe(FRACTION_AREA_GRID_WIDTH);
      }
    });
  });

  describe('6. checkScene 配置检查', () => {
    it('合法配置（含参数表达式与步骤中动态涂色后高亮 overlap）检查通过', () => {
      const issues = checkScene({
        params: { x: 3, y: 4 },
        objects: [
          {
            id: 'sq',
            type: 'fraction-area',
            rows: 10,
            cols: 10,
            shadeRows: 0,
            shadeCols: 0,
            size: 300,
            color: 'blue',
            color2: 'orange',
            overlapColor: 'green',
            grid: true,
            at: [60, 60],
          },
        ],
        steps: [
          {
            say: 's1',
            do: [
              { set: { target: 'sq', shadeRows: '{x}', duration: '1s' } },
              { set: { target: 'sq', shadeCols: '{y}', duration: '1s' } },
              { highlight: 'sq.overlap' },
            ],
          },
        ],
      });
      expect(issues).toEqual([]);
    });

    it('非法 rows/cols、size、shadeRows/shadeCols 越界及非法颜色均报错', () => {
      const issues = checkScene({
        params: {},
        objects: [
          {
            id: 'sq1',
            type: 'fraction-area',
            rows: 0,
            cols: 2.5,
            size: -10,
            color2: 'not-a-color',
            overlapColor: 'also-bad',
            grid: 'yes' as unknown as boolean,
            at: [60, 60],
          },
          {
            id: 'sq2',
            type: 'fraction-area',
            rows: 4,
            cols: 5,
            shadeRows: 5,
            shadeCols: -1,
            at: [400, 60],
          },
        ],
        steps: [
          {
            say: 's1',
            do: [{ set: { target: 'sq2', shadeCols: 6 } }],
          },
        ],
      });

      const paths = issues.map((i) => i.path.join('.'));
      expect(paths).toContain('objects.0.rows');
      expect(paths).toContain('objects.0.cols');
      expect(paths).toContain('objects.0.size');
      expect(paths).toContain('objects.0.color2');
      expect(paths).toContain('objects.0.overlapColor');
      expect(paths).toContain('objects.0.grid');
      expect(paths).toContain('objects.1.shadeRows');
      expect(paths).toContain('objects.1.shadeCols');
      expect(paths).toContain('steps.0.do.0.set.shadeCols');
    });
  });
});
