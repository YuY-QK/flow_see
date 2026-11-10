import { isValidElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { getTheme } from '@flow-see/core';
import { findSubitem, fractionBarPart, fractionCirclePart } from '../index';

const theme = getTheme('cute');
const ctx = { theme };

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

function renderCircle(p: Record<string, unknown>): El[] {
  const Render = fractionCirclePart.Render as unknown as (a: { p: unknown; ctx: unknown }) => ReactNode;
  return flatten(Render({ p, ctx }));
}

function renderBar(p: Record<string, unknown>): El[] {
  const Render = fractionBarPart.Render as unknown as (a: { p: unknown; ctx: unknown }) => ReactNode;
  return flatten(Render({ p, ctx }));
}

describe('X6 分数条 / 分数圆扩展', () => {
  describe('1. wholes = 2、parts = 4、take = 7 的涂色', () => {
    it('分数圆：前一个圆涂满 4 份，后一个圆涂 3 份，共 7 份涂色', () => {
      const p = {
        at: [200, 200],
        radius: 80,
        wholes: 2,
        parts: 4,
        take: 7,
      };
      const els = renderCircle(p);

      // 扇形填充 path
      const filledSlices = els.filter(
        (el) => el.type === 'path' && typeof el.props.d === 'string' && el.props.opacity === 1,
      );
      expect(filledSlices).toHaveLength(7);

      // 第一个整体（wi = 0）内有 4 份填充，第二个整体（wi = 1）内有 3 份填充
      // 检查坐标：两圆圆心分别为 x0 和 x0 + pitch
      const pitch = 2 * 80 + 80 * 0.3; // 184
      const x0 = 200 - pitch / 2; // 108
      const x1 = 200 + pitch / 2; // 292

      const whole1Slices = filledSlices.filter((el) => {
        const d = String(el.props.d);
        return d.startsWith(`M${x0},200`);
      });
      const whole2Slices = filledSlices.filter((el) => {
        const d = String(el.props.d);
        return d.startsWith(`M${x1},200`);
      });

      expect(whole1Slices).toHaveLength(4);
      expect(whole2Slices).toHaveLength(3);
    });

    it('分数条：第一个条涂满 4 份，第二个条涂 3 份，共 7 份涂色', () => {
      const p = {
        at: [200, 200],
        width: 400,
        height: 50,
        wholes: 2,
        parts: 4,
        take: 7,
      };
      const els = renderBar(p);

      // 矩形填充（排除背景 rect 和外框 rect）
      const filledRects = els.filter(
        (el) =>
          el.type === 'rect' &&
          el.props.opacity === 1 &&
          typeof el.props.width === 'number' &&
          el.props.width === 400 / 4,
      );
      expect(filledRects).toHaveLength(7);

      // 竖排两长条 y 坐标：
      // pitch = 50 + 50 * 0.4 = 70
      // y0 = 200 - 35 = 165, yW0 = 165 - 25 = 140
      // y1 = 200 + 35 = 235, yW1 = 235 - 25 = 210
      const whole1Rects = filledRects.filter((el) => el.props.y === 140);
      const whole2Rects = filledRects.filter((el) => el.props.y === 210);

      expect(whole1Rects).toHaveLength(4);
      expect(whole2Rects).toHaveLength(3);
    });

    it('连续变化的 take：正在变的那一份半透明', () => {
      const p = {
        at: [200, 200],
        width: 400,
        height: 50,
        wholes: 2,
        parts: 4,
        take: 4.5,
      };
      const els = renderBar(p);

      const partRects = els.filter(
        (el) =>
          el.type === 'rect' &&
          typeof el.props.width === 'number' &&
          el.props.width === 400 / 4 &&
          typeof el.props.opacity === 'number' &&
          el.props.opacity > 0,
      );
      // 前 4 个 opacity = 1，第 5 个 opacity = 0.5
      expect(partRects).toHaveLength(5);
      expect(partRects[4].props.opacity).toBeCloseTo(0.5);
    });
  });

  describe('2. subdivide 1→2 中途的线长', () => {
    it('分数条：subdivide = 1.5 时，细分线长为全长的一半 (0.5 * h)', () => {
      const h = 60;
      const p = {
        at: [200, 200],
        width: 400,
        height: h,
        parts: 2,
        subdivide: 1.5,
      };
      const els = renderBar(p);

      const subLines = els.filter(
        (el) => el.type === 'line' && el.props['data-subdivide-line'] === 'true',
      );
      // parts = 2, targetDiv = 2, 每个 part 有 1 条细分线，共 2 条
      expect(subLines).toHaveLength(2);

      for (const line of subLines) {
        const y1 = Number(line.props.y1);
        const y2 = Number(line.props.y2);
        const len = Math.abs(y2 - y1);
        expect(len).toBeCloseTo(h * 0.5);
      }
    });

    it('分数条：subdivide = 2 时，细分线长为全长 (1.0 * h)', () => {
      const h = 60;
      const p = {
        at: [200, 200],
        width: 400,
        height: h,
        parts: 2,
        subdivide: 2,
      };
      const els = renderBar(p);

      const subLines = els.filter(
        (el) => el.type === 'line' && el.props['data-subdivide-line'] === 'true',
      );
      expect(subLines).toHaveLength(2);

      for (const line of subLines) {
        const y1 = Number(line.props.y1);
        const y2 = Number(line.props.y2);
        const len = Math.abs(y2 - y1);
        expect(len).toBeCloseTo(h * 1.0);
      }
    });

    it('分数圆：subdivide = 1.5 时，细分线长为全长的一半 (0.5 * radius)', () => {
      const r = 100;
      const p = {
        at: [200, 200],
        radius: r,
        parts: 2,
        subdivide: 1.5,
      };
      const els = renderCircle(p);

      const subLines = els.filter(
        (el) => el.type === 'line' && el.props['data-subdivide-line'] === 'true',
      );
      // parts = 2, targetDiv = 2, 每个 part 有 1 条细分线，共 2 条
      expect(subLines).toHaveLength(2);

      for (const line of subLines) {
        const x1 = Number(line.props.x1);
        const y1 = Number(line.props.y1);
        const x2 = Number(line.props.x2);
        const y2 = Number(line.props.y2);
        const len = Math.hypot(x2 - x1, y2 - y1);
        expect(len).toBeCloseTo(r * 0.5);
      }
    });

    it('分数圆：subdivide = 2 时，细分线长为全长 (1.0 * radius)', () => {
      const r = 100;
      const p = {
        at: [200, 200],
        radius: r,
        parts: 2,
        subdivide: 2,
      };
      const els = renderCircle(p);

      const subLines = els.filter(
        (el) => el.type === 'line' && el.props['data-subdivide-line'] === 'true',
      );
      expect(subLines).toHaveLength(2);

      for (const line of subLines) {
        const x1 = Number(line.props.x1);
        const y1 = Number(line.props.y1);
        const x2 = Number(line.props.x2);
        const y2 = Number(line.props.y2);
        const len = Math.hypot(x2 - x1, y2 - y1);
        expect(len).toBeCloseTo(r * 1.0);
      }
    });
  });

  describe('3. 子项个数与查找', () => {
    it('分数圆：wholes = 2, parts = 4 时共 10 个子项（2 个 whole + 8 个 part）', () => {
      const p = { at: [200, 200], radius: 80, wholes: 2, parts: 4 };
      const subs = fractionCirclePart.subitems?.(p) ?? [];
      expect(subs).toHaveLength(10);

      const wholes = findSubitem(fractionCirclePart, p, 'whole.*');
      expect(Array.isArray(wholes)).toBe(true);
      expect(wholes).toHaveLength(2);
      expect((wholes as any[]).map((w) => w.name)).toEqual(['whole.1', 'whole.2']);

      const parts = findSubitem(fractionCirclePart, p, 'part.*');
      expect(Array.isArray(parts)).toBe(true);
      expect(parts).toHaveLength(8);
      expect((parts as any[]).map((pt) => pt.name)).toEqual([
        'part.1',
        'part.2',
        'part.3',
        'part.4',
        'part.5',
        'part.6',
        'part.7',
        'part.8',
      ]);

      const part7 = findSubitem(fractionCirclePart, p, 'part.7');
      expect(part7).toBeDefined();
      expect(Array.isArray(part7)).toBe(false);
      expect((part7 as any).name).toBe('part.7');
    });

    it('分数条：wholes = 2, parts = 4 时共 10 个子项（2 个 whole + 8 个 part）', () => {
      const p = { at: [200, 200], width: 400, height: 50, wholes: 2, parts: 4 };
      const subs = fractionBarPart.subitems?.(p) ?? [];
      expect(subs).toHaveLength(10);

      const wholes = findSubitem(fractionBarPart, p, 'whole.*');
      expect(Array.isArray(wholes)).toBe(true);
      expect(wholes).toHaveLength(2);
      expect((wholes as any[]).map((w) => w.name)).toEqual(['whole.1', 'whole.2']);

      const parts = findSubitem(fractionBarPart, p, 'part.*');
      expect(Array.isArray(parts)).toBe(true);
      expect(parts).toHaveLength(8);
      expect((parts as any[]).map((pt) => pt.name)).toEqual([
        'part.1',
        'part.2',
        'part.3',
        'part.4',
        'part.5',
        'part.6',
        'part.7',
        'part.8',
      ]);

      const part7 = findSubitem(fractionBarPart, p, 'part.7');
      expect(part7).toBeDefined();
      expect(Array.isArray(part7)).toBe(false);
      expect((part7 as any).name).toBe('part.7');
      expect((part7 as any).box).toEqual({
        x: 200 - 400 / 2 + (7 - 5) * (400 / 4), // wi = 1, pj = 2 -> 0 + 200 = 200
        y: 200 + (50 + 50 * 0.4) / 2 - 25, // cy1 - 25 = 235 - 25 = 210
        w: 100,
        h: 50,
      });
    });

    it('细分下的子项个数：wholes = 1, parts = 3, subdivide = 2 时共 7 个子项（1 个 whole + 6 个 part）', () => {
      const circleP = { at: [200, 200], radius: 80, wholes: 1, parts: 3, subdivide: 2 };
      const circleSubs = fractionCirclePart.subitems?.(circleP) ?? [];
      expect(circleSubs).toHaveLength(7);

      const barP = { at: [200, 200], width: 300, height: 40, wholes: 1, parts: 3, subdivide: 2 };
      const barSubs = fractionBarPart.subitems?.(barP) ?? [];
      expect(barSubs).toHaveLength(7);
    });
  });

  describe('4. 包围盒 bbox', () => {
    it('分数圆：多整体横排，间距 = 半径 × 0.3', () => {
      const r = 100;
      const b1 = fractionCirclePart.bbox({ at: [200, 200], radius: r, wholes: 1 });
      expect(b1).toEqual({ x: 100 - 4, y: 100 - 4, w: 200 + 8, h: 200 + 8 });

      const b2 = fractionCirclePart.bbox({ at: [200, 200], radius: r, wholes: 2 });
      const expectedW = 2 * 200 + 1 * (r * 0.3); // 430
      expect(b2).toEqual({
        x: 200 - (expectedW + 8) / 2,
        y: 200 - (200 + 8) / 2,
        w: expectedW + 8,
        h: 200 + 8,
      });
    });

    it('分数条：多整体竖排，间距 = 高 × 0.4', () => {
      const w = 400;
      const h = 50;
      const b1 = fractionBarPart.bbox({ at: [200, 200], width: w, height: h, wholes: 1 });
      expect(b1).toEqual({ x: 200 - (w + 6) / 2, y: 200 - (h + 6) / 2, w: w + 6, h: h + 6 });

      const b2 = fractionBarPart.bbox({ at: [200, 200], width: w, height: h, wholes: 2 });
      const expectedH = 2 * h + 1 * (h * 0.4); // 120
      expect(b2).toEqual({
        x: 200 - (w + 6) / 2,
        y: 200 - (expectedH + 6) / 2,
        w: w + 6,
        h: expectedH + 6,
      });
    });
  });
});
