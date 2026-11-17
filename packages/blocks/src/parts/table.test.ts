import { isValidElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { getTheme } from '@flow-see/core';
import {
  color,
  findSubitem,
  tableLayout,
  tablePart,
  type Props,
} from '../index';
import { BlankBox } from './mark';

const theme = getTheme('flat');

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
      if (el.type !== BlankBox) {
        flatten((el.type as (p: unknown) => ReactNode)(el.props), out);
      }
    }
  }
  return out;
}

const render = (p: Props): El[] => {
  const Render = tablePart.Render as unknown as (a: {
    p: Props;
    ctx: { theme: typeof theme };
  }) => ReactNode;
  return flatten(Render({ p, ctx: { theme } }));
};

describe('B7 表格与正字记录零件（table）', () => {
  describe('1. 3 × 4 表的单元格 box 计算与子项查询', () => {
    const p: Props = {
      at: [50, 100] as [number, number],
      rows: [
        ['A1', 'B1', 'C1', 'D1'],
        ['A2', 'B2', 'C2', 'D2'],
        ['A3', 'B3', 'C3', 'D3'],
      ],
      colWidth: 80,
      rowHeight: 40,
    };

    it('整体 bbox 计算正确（3行4列）', () => {
      const bbox = tablePart.bbox(p);
      expect(bbox).toEqual({
        x: 50,
        y: 100,
        w: 320,
        h: 120,
      });
    });

    it('单元格 box 计算正确', () => {
      const layout = tableLayout(p);
      expect(layout.cells).toHaveLength(12);

      // cell.1.1 (第 1 行第 1 列)
      const c11 = layout.cells.find((c) => c.rowNumber === 1 && c.colNumber === 1);
      expect(c11?.box).toEqual({ x: 50, y: 100, w: 80, h: 40 });

      // cell.2.3 (第 2 行第 3 列)
      const c23 = layout.cells.find((c) => c.rowNumber === 2 && c.colNumber === 3);
      expect(c23?.box).toEqual({ x: 50 + 2 * 80, y: 100 + 1 * 40, w: 80, h: 40 });
      expect(c23?.text).toBe('C2');

      // cell.3.4 (第 3 行第 4 列)
      const c34 = layout.cells.find((c) => c.rowNumber === 3 && c.colNumber === 4);
      expect(c34?.box).toEqual({ x: 50 + 3 * 80, y: 100 + 2 * 40, w: 80, h: 40 });
      expect(c34?.text).toBe('D3');
    });

    it('各行和各列的 box 计算正确', () => {
      const layout = tableLayout(p);
      expect(layout.rows).toHaveLength(3);
      expect(layout.cols).toHaveLength(4);

      expect(layout.rows[1].box).toEqual({ x: 50, y: 140, w: 320, h: 40 });
      expect(layout.cols[2].box).toEqual({ x: 210, y: 100, w: 80, h: 120 });
    });

    it('subitems 支持 cell.<行>.<列>、row.<n>、col.<n> 查询', () => {
      const c23 = findSubitem(tablePart, p, 'cell.2.3');
      expect(c23).toMatchObject({
        name: 'cell.2.3',
        box: { x: 210, y: 140, w: 80, h: 40 },
        label: 'C2',
      });

      const r2 = findSubitem(tablePart, p, 'row.2');
      expect(r2).toMatchObject({
        name: 'row.2',
        box: { x: 50, y: 140, w: 320, h: 40 },
      });

      const col3 = findSubitem(tablePart, p, 'col.3');
      expect(col3).toMatchObject({
        name: 'col.3',
        box: { x: 210, y: 100, w: 80, h: 120 },
      });
    });

    it('subitems 支持通配符 * 查询', () => {
      const allCells = findSubitem(tablePart, p, 'cell.*') as unknown[];
      expect(allCells).toHaveLength(12);

      const allRows = findSubitem(tablePart, p, 'row.*') as unknown[];
      expect(allRows).toHaveLength(3);

      const allCols = findSubitem(tablePart, p, 'col.*') as unknown[];
      expect(allCols).toHaveLength(4);
    });

    it('支持 colWidth 数组定义不同列宽', () => {
      const pVar: Props = {
        at: [100, 200] as [number, number],
        rows: [
          ['Col1', 'Col2', 'Col3'],
          ['1', '2', '3'],
        ],
        colWidth: [60, 90, 120],
        rowHeight: 50,
      };
      const layout = tableLayout(pVar);
      expect(layout.box).toEqual({ x: 100, y: 200, w: 270, h: 100 });

      const c1 = layout.cols[0].box;
      const c2 = layout.cols[1].box;
      const c3 = layout.cols[2].box;
      expect(c1).toEqual({ x: 100, y: 200, w: 60, h: 100 });
      expect(c2).toEqual({ x: 160, y: 200, w: 90, h: 100 });
      expect(c3).toEqual({ x: 250, y: 200, w: 120, h: 100 });
    });
  });

  describe('2. diagonal 斜线与两个文字的位置验证', () => {
    it('diagonal: [文字1, 文字2] 正确计算斜线与两文字坐标', () => {
      const p: Props = {
        at: [0, 0] as [number, number],
        diagonal: ['学科', '姓名'],
        rows: [
          ['', '语文', '数学'],
          ['小明', '95', '100'],
        ],
        colWidth: 96,
        rowHeight: 48,
      };

      const layout = tableLayout(p);
      expect(layout.diagonal).toBeDefined();

      const diag = layout.diagonal!;
      // 斜线从 (0, 0) 到 (96, 48)
      expect(diag.line).toEqual({ x1: 0, y1: 0, x2: 96, y2: 48 });

      // 右上文字：位于右上三角重心 (x + 2/3*w, y + 1/3*h) = (64, 16)
      expect(diag.topRight.text).toBe('学科');
      expect(diag.topRight.x).toBeCloseTo(64);
      expect(diag.topRight.y).toBeCloseTo(16);

      // 左下文字：位于左下三角重心 (x + 1/3*w, y + 2/3*h) = (32, 32)
      expect(diag.bottomLeft.text).toBe('姓名');
      expect(diag.bottomLeft.x).toBeCloseTo(32);
      expect(diag.bottomLeft.y).toBeCloseTo(32);
    });

    it('diagonal 在渲染时输出斜线与文字', () => {
      const p: Props = {
        at: [10, 20] as [number, number],
        diagonal: ['科目', '学生'],
        rows: [
          ['', '物理'],
          ['张三', '90'],
        ],
        colWidth: 90,
        rowHeight: 60,
      };

      const els = render(p);
      const lines = els.filter((e) => e.type === 'line');
      const diagLine = lines.find(
        (l) => l.props.x1 === 10 && l.props.y1 === 20 && l.props.x2 === 100 && l.props.y2 === 80,
      );
      expect(diagLine).toBeDefined();

      const texts = els.filter((e) => e.type === 'text');
      const topRight = texts.find((t) => t.props.children === '科目');
      const bottomLeft = texts.find((t) => t.props.children === '学生');
      expect(topRight).toBeDefined();
      expect(bottomLeft).toBeDefined();
    });
  });

  describe('3. tally: 7 = 一个完整正 + 两个笔画绘制测试', () => {
    it('数字 7 生成 1 个完整正字 (5画) 和 1 个余数正字 (2画)，共 7 画', () => {
      const p: Props = {
        at: [0, 0] as [number, number],
        rows: [
          ['水果', '票数'],
          ['苹果', '7'],
        ],
        header: true,
        headerCol: false,
        tally: true,
        size: 24,
      };

      const layout = tableLayout(p);
      const tallyCell = layout.cells.find((c) => c.rowNumber === 2 && c.colNumber === 2);
      expect(tallyCell).toBeDefined();
      expect(tallyCell?.tally).toBeDefined();

      const strokes = tallyCell!.tally!.strokes;
      expect(strokes).toHaveLength(7);

      // 第 1 个字符：5 画完整“正”
      const char0Strokes = strokes.filter((s) => s.charIndex === 0);
      expect(char0Strokes).toHaveLength(5);
      expect(char0Strokes.map((s) => s.strokeIndex)).toEqual([0, 1, 2, 3, 4]);

      // 第 2 个字符：2 画（上横、中竖）
      const char1Strokes = strokes.filter((s) => s.charIndex === 1);
      expect(char1Strokes).toHaveLength(2);
      expect(char1Strokes.map((s) => s.strokeIndex)).toEqual([0, 1]);

      // 验证第 1 笔是横线（y1 === y2），第 2 笔是竖线（x1 === x2）
      expect(char1Strokes[0].y1).toBe(char1Strokes[0].y2); // 上横
      expect(char1Strokes[1].x1).toBe(char1Strokes[1].x2); // 中竖
    });

    it('SVG 渲染包含 7 条线宽为 3 的正字线段', () => {
      const p: Props = {
        at: [100, 100] as [number, number],
        rows: [
          ['类别', '数量'],
          ['红花', '7'],
        ],
        tally: true,
      };

      const els = render(p);
      const tallyLines = els.filter(
        (e) => e.type === 'line' && e.props.strokeWidth === 3 && e.props.strokeLinecap === 'round',
      );
      expect(tallyLines).toHaveLength(7);
      expect(tallyLines[0].props.stroke).toBe(color('ink', theme));
    });

    it('表头单元格与非数字单元格不绘制正字', () => {
      const p: Props = {
        at: [0, 0] as [number, number],
        rows: [
          ['水果', '记录'],
          ['苹果', '5'],
        ],
        header: true,
        headerCol: true,
        tally: true,
      };

      const layout = tableLayout(p);
      // 第 1 行是表头，不画正字
      expect(layout.cells[0].tally).toBeUndefined();
      expect(layout.cells[1].tally).toBeUndefined();
      // 第 2 行第 1 列（'苹果'）是表头列，不画正字
      expect(layout.cells[2].tally).toBeUndefined();
      // 第 2 行第 2 列是 5，画正字
      expect(layout.cells[3].tally?.strokes).toHaveLength(5);
    });
  });

  describe('4. show 部分显示单元格测试', () => {
    it('show: 3 时仅前 3 个单元格可见，后续单元格不可见', () => {
      const p: Props = {
        at: [0, 0] as [number, number],
        rows: [
          ['1', '2', '3', '4'],
          ['5', '6', '7', '8'],
          ['9', '10', '11', '12'],
        ],
        show: 3,
      };

      const layout = tableLayout(p);
      expect(layout.cells).toHaveLength(12);

      // 前 3 个单元格 visible = true
      expect(layout.cells[0].visible).toBe(true);
      expect(layout.cells[1].visible).toBe(true);
      expect(layout.cells[2].visible).toBe(true);
      expect(layout.cells[0].opacity).toBe(1);

      // 第 4 到 12 个单元格 visible = false
      for (let i = 3; i < 12; i++) {
        expect(layout.cells[i].visible).toBe(false);
        expect(layout.cells[i].opacity).toBe(0);
      }
    });

    it('show 控制渲染输出与 subitems disabled 状态', () => {
      const p: Props = {
        at: [0, 0] as [number, number],
        rows: [
          ['A', 'B'],
          ['C', 'D'],
        ],
        show: 2,
      };

      const els = render(p);
      const texts = els.filter((e) => e.type === 'text');
      const textContents = texts.map((t) => t.props.children);
      expect(textContents).toContain('A');
      expect(textContents).toContain('B');
      expect(textContents).not.toContain('C');
      expect(textContents).not.toContain('D');

      const subs = tablePart.subitems!(p);
      const subA = subs.find((s) => s.name === 'cell.1.1');
      const subC = subs.find((s) => s.name === 'cell.2.1');
      expect(subA?.disabled).toBe(false);
      expect(subC?.disabled).toBe(true);
    });

    it('show 连续浮点值时过渡单元格具有部分透明度', () => {
      const p: Props = {
        at: [0, 0] as [number, number],
        rows: [
          ['1', '2'],
          ['3', '4'],
        ],
        show: 1.5,
      };

      const layout = tableLayout(p);
      expect(layout.cells[0].opacity).toBe(1);
      expect(layout.cells[1].opacity).toBe(0.5);
      expect(layout.cells[2].opacity).toBe(0);
    });
  });

  describe('5. tallyShow 逐步书写正字笔画测试', () => {
    it('单个单元格 7 笔随 tallyShow 逐笔呈现', () => {
      const base: Props = {
        at: [0, 0] as [number, number],
        rows: [['苹果'], ['7']],
        header: false,
        tally: true,
      };

      // tallyShow: 0 -> 0 画
      const l0 = tableLayout({ ...base, tallyShow: 0 });
      expect(l0.cells[1].tally!.strokes.filter((s) => s.visible)).toHaveLength(0);

      // tallyShow: 1 -> 1 画 (第 1 笔上横)
      const l1 = tableLayout({ ...base, tallyShow: 1 });
      const s1 = l1.cells[1].tally!.strokes.filter((s) => s.visible);
      expect(s1).toHaveLength(1);
      expect(s1[0].strokeIndex).toBe(0);

      // tallyShow: 5 -> 5 画 (第 1 个正字写完)
      const l5 = tableLayout({ ...base, tallyShow: 5 });
      const s5 = l5.cells[1].tally!.strokes.filter((s) => s.visible);
      expect(s5).toHaveLength(5);
      expect(s5.every((s) => s.charIndex === 0)).toBe(true);

      // tallyShow: 6 -> 6 画 (第 2 个正字开始写第 1 笔)
      const l6 = tableLayout({ ...base, tallyShow: 6 });
      const s6 = l6.cells[1].tally!.strokes.filter((s) => s.visible);
      expect(s6).toHaveLength(6);
      expect(s6[5].charIndex).toBe(1);
      expect(s6[5].strokeIndex).toBe(0);

      // tallyShow: 7 -> 全部 7 画
      const l7 = tableLayout({ ...base, tallyShow: 7 });
      expect(l7.cells[1].tally!.strokes.filter((s) => s.visible)).toHaveLength(7);
    });

    it('多个单元格按顺序连续书写正字笔画', () => {
      const pMulti: Props = {
        at: [0, 0] as [number, number],
        rows: [
          ['苹果', '香蕉', '草莓'],
          ['7', '4', '5'],
        ],
        header: true,
        tally: true,
        tallyShow: 9, // 苹果 7 笔写完，香蕉写 2 笔
      };

      const layout = tableLayout(pMulti);
      const appleCell = layout.cells.find((c) => c.colNumber === 1 && c.rowNumber === 2);
      const bananaCell = layout.cells.find((c) => c.colNumber === 2 && c.rowNumber === 2);
      const strawCell = layout.cells.find((c) => c.colNumber === 3 && c.rowNumber === 2);

      const appleVisible = appleCell!.tally!.strokes.filter((s) => s.visible);
      const bananaVisible = bananaCell!.tally!.strokes.filter((s) => s.visible);
      const strawVisible = strawCell!.tally!.strokes.filter((s) => s.visible);

      expect(appleVisible).toHaveLength(7);
      expect(bananaVisible).toHaveLength(2);
      expect(strawVisible).toHaveLength(0);
    });

    it('tallyShow 为小数时最后一笔按比例平滑长出', () => {
      const p: Props = {
        at: [0, 0] as [number, number],
        rows: [['5']],
        header: false,
        tally: true,
        tallyShow: 0.5,
      };

      const layout = tableLayout(p);
      const stroke0 = layout.cells[0].tally!.strokes[0];
      expect(stroke0.visible).toBe(true);
      expect(stroke0.progress).toBe(0.5);

      const els = render(p);
      const line = els.find((e) => e.type === 'line' && e.props.strokeWidth === 3);
      expect(line).toBeDefined();
      // x2 应该在 x1 和目标 x2 中间
      const expectedX2 = stroke0.x1 + 0.5 * (stroke0.x2 - stroke0.x1);
      expect(line?.props.x2).toBeCloseTo(expectedX2);
    });
  });

  describe('6. 富文本语法与表头样式', () => {
    it('支持 blank、frac、sup 和颜色富文本语法', () => {
      const p: Props = {
        at: [0, 0] as [number, number],
        rows: [
          ['[填空](blank)', '[1/2](frac)'],
          ['cm[2](sup)', '[红色](red)'],
        ],
        header: false,
      };

      const els = render(p);
      // blank 渲染为 BlankBox
      const blanks = els.filter((e) => e.type === BlankBox);
      expect(blanks.length).toBeGreaterThanOrEqual(1);

      // frac 分数包含分数线
      const fracLines = els.filter(
        (e) => e.type === 'line' && e.props.strokeLinecap === 'round' && e.props.strokeWidth !== 3,
      );
      expect(fracLines.length).toBeGreaterThanOrEqual(1);

      // 颜色覆盖
      const redText = els.find((e) => e.type === 'text' && e.props.children === '红色');
      expect(redText?.props.fill).toBe(color('red', theme));
    });

    it('header: true 与 headerCol: true 正确渲染加粗文字与底色', () => {
      const p: Props = {
        at: [0, 0] as [number, number],
        rows: [
          ['表头', '项目'],
          ['序号', '内容'],
        ],
        header: true,
        headerCol: true,
      };

      const els = render(p);
      const rects = els.filter((e) => e.type === 'rect');
      // header 底色为 line 0.25 opacity
      const headerBgs = rects.filter(
        (r) => r.props.fill === color('line', theme) && r.props.fillOpacity === 0.25,
      );
      // 第一行两格 + 第二行第一格 = 3 个表头单元格
      expect(headerBgs).toHaveLength(3);
    });
  });
});
