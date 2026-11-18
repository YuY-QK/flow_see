import { describe, expect, it } from 'vitest';
import {
  angleLayout,
  anglePart,
  anglePoint,
  getAngleKind,
  defaultAngleLabels,
} from './angle';
import type { Theme } from '@flow-see/core';
import type { PartContext } from '../base';

const dummyTheme: Theme = {
  id: 'flat',
  name: '扁平',
  stageBg: '#ffffff',
  stageBorder: '#e2e8f0',
  ink: '#1e293b',
  dim: '#64748b',
  accent: '#f59e0b',
  line: '#94a3b8',
  labelBg: '#f1f5f9',
  palette: ['#3b82f6', '#f97316', '#10b981'],
  elementInk: '#ffffff',
  radius: 8,
  font: 'sans-serif',
};

const dummyCtx: PartContext = { theme: dummyTheme };

describe('angle 零件（任务卡 B14）', () => {
  describe('1. 基础几何与角度转换', () => {
    it('anglePoint：0 水平向右，逆时针为正，y 轴向下', () => {
      const cx = 100;
      const cy = 200;
      const r = 50;

      // 0°: 水平向右 (cx + r, cy)
      const p0 = anglePoint(cx, cy, r, 0);
      expect(p0[0]).toBeCloseTo(150);
      expect(p0[1]).toBeCloseTo(200);

      // 90°: 逆时针 90°，向上 (cx, cy - r)
      const p90 = anglePoint(cx, cy, r, 90);
      expect(p90[0]).toBeCloseTo(100);
      expect(p90[1]).toBeCloseTo(150);

      // 180°: 水平向左 (cx - r, cy)
      const p180 = anglePoint(cx, cy, r, 180);
      expect(p180[0]).toBeCloseTo(50);
      expect(p180[1]).toBeCloseTo(200);

      // 270°: 向下 (cx, cy + r)
      const p270 = anglePoint(cx, cy, r, 270);
      expect(p270[0]).toBeCloseTo(100);
      expect(p270[1]).toBeCloseTo(250);
    });
  });

  describe('2. 画法分支：30°、90°、120°、180°、360°', () => {
    it('size = 30（锐角）：画普通角弧，扇形劣弧（largeArc = 0）', () => {
      const p = { at: [200, 200], from: 0, size: 30, length: 100 };
      const L = angleLayout(p);

      expect(L.kind).toBe('acute');
      expect(L.isRight).toBe(false);
      expect(L.isStraight).toBe(false);
      expect(L.isRound).toBe(false);
      expect(L.showArc).toBe(true);
      expect(L.arcD).toBeDefined();
      // SVG 弧指令：A 36 36 0 0 0 endX endY
      expect(L.arcD).toContain('A 36 36 0 0 0');
    });

    it('size = 90（直角）：替换为边长 16 的直角折线符号', () => {
      const p = { at: [200, 200], from: 0, size: 90, length: 100 };
      const L = angleLayout(p);

      expect(L.kind).toBe('right');
      expect(L.isRight).toBe(true);
      expect(L.rightAnglePts).toBeDefined();

      const [pt1, pt2, pt3] = L.rightAnglePts!;
      // 起始边水平向右：pt1 = (200 + 16, 200) = (216, 200)
      expect(pt1[0]).toBeCloseTo(216);
      expect(pt1[1]).toBeCloseTo(200);

      // 第二条边正上方：pt3 = (200, 200 - 16) = (200, 184)
      expect(pt3[0]).toBeCloseTo(200);
      expect(pt3[1]).toBeCloseTo(184);

      // 折角顶点：pt2 = (216, 184)
      expect(pt2[0]).toBeCloseTo(216);
      expect(pt2[1]).toBeCloseTo(184);

      // 折线路径 M pt1 L pt2 L pt3
      expect(L.arcD).toBe(`M ${pt1[0]} ${pt1[1]} L ${pt2[0]} ${pt2[1]} L ${pt3[0]} ${pt3[1]}`);
    });

    it('size = 120（钝角）：普通圆弧', () => {
      const p = { at: [200, 200], from: 0, size: 120, length: 100 };
      const L = angleLayout(p);

      expect(L.kind).toBe('obtuse');
      expect(L.isRight).toBe(false);
      expect(L.isStraight).toBe(false);
      expect(L.isRound).toBe(false);
      expect(L.showArc).toBe(true);
      expect(L.arcD).toContain('A 36 36 0 0 0');
    });

    it('size = 180（平角）：两边成一条直线，角弧为完整半圆', () => {
      const p = { at: [200, 200], from: 0, size: 180, length: 100 };
      const L = angleLayout(p);

      expect(L.kind).toBe('straight');
      expect(L.isStraight).toBe(true);

      // 边 1 终点向右 100，边 2 终点向左 100
      expect(L.side1End).toEqual([300, 200]);
      expect(L.side2End).toEqual([100, 200]);

      // 两边中心对称，与顶点共线
      expect((L.side1End[0] + L.side2End[0]) / 2).toBeCloseTo(200);
      expect((L.side1End[1] + L.side2End[1]) / 2).toBeCloseTo(200);

      // 半圆弧
      expect(L.arcD).toBeDefined();
      expect(L.arcD).toContain('A 36 36 0 0 0');
    });

    it('size = 360（周角）：第二条边与第一条边重合，角弧为整圆带旋转小箭头', () => {
      const p = { at: [200, 200], from: 0, size: 360, length: 100 };
      const L = angleLayout(p);

      expect(L.kind).toBe('round');
      expect(L.isRound).toBe(true);

      // 两条边完全重合
      expect(L.side1End[0]).toBeCloseTo(L.side2End[0]);
      expect(L.side1End[1]).toBeCloseTo(L.side2End[1]);

      // 旋转方向小箭头
      expect(L.roundArrow).toBeDefined();
      const arrow = L.roundArrow!;
      // 尖端在起始边方向圆周处 (200 + 36, 200)
      expect(arrow.tip[0]).toBeCloseTo(236);
      expect(arrow.tip[1]).toBeCloseTo(200);
      // 逆时针旋转在 (236, 200) 处的切线向上，所以翼点 y 偏下方
      expect(arrow.p1[1]).toBeGreaterThan(200);
      expect(arrow.p2[1]).toBeGreaterThan(200);
    });

    it('size = 0（零角）：不画角弧，两边重合', () => {
      const p = { at: [200, 200], from: 0, size: 0, length: 100 };
      const L = angleLayout(p);

      expect(L.isZero).toBe(true);
      expect(L.showArc).toBe(false);
      expect(L.side1End[0]).toBeCloseTo(L.side2End[0]);
      expect(L.side1End[1]).toBeCloseTo(L.side2End[1]);
    });
  });

  describe('3. kindLabel 判定与边界', () => {
    it('89.9° 锐角、90° 直角、90.1° 钝角、180° 平角、360° 周角', () => {
      expect(getAngleKind(89.9)).toBe('acute');
      expect(getAngleKind(90)).toBe('right');
      expect(getAngleKind(90.1)).toBe('obtuse');
      expect(getAngleKind(179.9)).toBe('obtuse');
      expect(getAngleKind(180)).toBe('straight');
      expect(getAngleKind(360)).toBe('round');
      expect(getAngleKind(0)).toBeUndefined();
      expect(getAngleKind(200)).toBeUndefined();
    });

    it('默认 labels 文本正确映射', () => {
      const labels = defaultAngleLabels();
      expect(labels.acute).toBe('锐角');
      expect(labels.right).toBe('直角');
      expect(labels.obtuse).toBe('钝角');
      expect(labels.straight).toBe('平角');
      expect(labels.round).toBe('周角');

      const LRight = angleLayout({ size: 90, kindLabel: true });
      expect(LRight.kindText).toBe('直角');
      expect(LRight.showKindLabel).toBe(true);

      const LAcute = angleLayout({ size: 45, kindLabel: true });
      expect(LAcute.kindText).toBe('锐角');

      const LObtuse = angleLayout({ size: 135, kindLabel: true });
      expect(LObtuse.kindText).toBe('钝角');
    });

    it('支持自定义 labels 覆盖', () => {
      const p = {
        size: 90,
        kindLabel: true,
        labels: { right: 'Right' },
      };
      const L = angleLayout(p);
      expect(L.kindText).toBe('Right');
    });
  });

  describe('4. Handle size 的 valueAt 几何逆解计算', () => {
    it('from = 0 时，不同象限光标逆解正确（0°、45°、90°、180°、270°）', () => {
      const p = { at: [200, 200], from: 0, size: 60, length: 100 };
      const handles = anglePart.handles?.(p);
      expect(handles).toHaveLength(1);

      const h = handles![0];
      expect(h.prop).toBe('size');
      expect(h.kind).toBe('rotate');
      expect(h.center).toEqual([200, 200]);
      expect(h.min).toBe(0);
      expect(h.max).toBe(360);
      expect(h.at).toEqual(angleLayout(p).side2End);

      // 水平向右 (0°)
      expect(h.valueAt([300, 200])).toBe(0);

      // 45° 方向
      expect(h.valueAt([200 + 100, 200 - 100])).toBeCloseTo(45);

      // 正上方 (90°)
      expect(h.valueAt([200, 100])).toBe(90);

      // 水平向左 (180°)
      expect(h.valueAt([100, 200])).toBe(180);

      // 正下方 (270°)
      expect(h.valueAt([200, 300])).toBe(270);
    });

    it('from = 30 时，相对于 from 的逆时针夹角计算', () => {
      const p = { at: [200, 200], from: 30, size: 45, length: 100 };
      const h = anglePart.handles!(p)[0];

      // 指针在正上方 (90° 方向)，相对于 from=30 是 60°
      expect(h.valueAt([200, 100])).toBe(60);

      // 指针在 30° 方向，返回 0
      const p30 = anglePoint(200, 200, 100, 30);
      expect(h.valueAt(p30)).toBe(0);
    });

    it('光标在中心重合时返回原 size', () => {
      const p = { at: [200, 200], from: 0, size: 75 };
      const h = anglePart.handles!(p)[0];
      expect(h.valueAt([200, 200])).toBe(75);
    });

    it('大角度接近 360 时平滑返回 360', () => {
      const p = { at: [200, 200], from: 0, size: 350 };
      const h = anglePart.handles!(p)[0];
      expect(h.valueAt([300, 200])).toBe(360);
    });
  });

  describe('5. 子项（subitems）与包围盒（bbox）', () => {
    it('提供 vertex、side1、side2 三个子项', () => {
      const p = { at: [200, 200], from: 0, size: 60, length: 100 };
      const items = anglePart.subitems?.(p);
      expect(items).toBeDefined();
      expect(items).toHaveLength(3);

      const names = items!.map((it) => it.name);
      expect(names).toContain('vertex');
      expect(names).toContain('side1');
      expect(names).toContain('side2');

      const v = items!.find((it) => it.name === 'vertex')!;
      expect(v.box).toEqual({ x: 200 - 12, y: 200 - 12, w: 24, h: 24 });

      const s1 = items!.find((it) => it.name === 'side1')!;
      // side1 从 (200, 200) 到 (300, 200)，加 padding 12
      expect(s1.box).toEqual({ x: 200 - 12, y: 200 - 12, w: 100 + 24, h: 24 });
    });

    it('bbox 完整包裹所有几何与文字', () => {
      const p = {
        at: [200, 200],
        from: 0,
        size: 90,
        length: 100,
        label: true,
        kindLabel: true,
      };
      const bbox = anglePart.bbox(p);
      const L = angleLayout(p);

      // 顶点和两边终点必须在 bbox 内
      expect(L.cx).toBeGreaterThanOrEqual(bbox.x);
      expect(L.cx).toBeLessThanOrEqual(bbox.x + bbox.w);
      expect(L.cy).toBeGreaterThanOrEqual(bbox.y);
      expect(L.cy).toBeLessThanOrEqual(bbox.y + bbox.h);

      expect(L.side1End[0]).toBeGreaterThanOrEqual(bbox.x);
      expect(L.side1End[0]).toBeLessThanOrEqual(bbox.x + bbox.w);
      expect(L.side2End[1]).toBeGreaterThanOrEqual(bbox.y);
      expect(L.side2End[1]).toBeLessThanOrEqual(bbox.y + bbox.h);

      // 标签必须在 bbox 内
      expect(L.labelPos[0]).toBeGreaterThanOrEqual(bbox.x);
      expect(L.labelPos[1]).toBeGreaterThanOrEqual(bbox.y);
      expect(L.kindLabelPos[0]).toBeLessThanOrEqual(bbox.x + bbox.w);
      expect(L.kindLabelPos[1]).toBeGreaterThanOrEqual(bbox.y);
    });
  });

  describe('6. rays 射线与 VNode 渲染测试', () => {
    it('rays: true 时生成射线箭头几何与路径', () => {
      const p = { at: [200, 200], from: 0, size: 60, length: 100, rays: true };
      const L = angleLayout(p);
      expect(L.ray1).toBeDefined();
      expect(L.ray2).toBeDefined();
      expect(L.ray1!.tip).toEqual(L.side1End);
      expect(L.ray2!.tip).toEqual(L.side2End);
    });

    it('Render 正确返回 React VNode 树且无报错', () => {
      const p = {
        at: [200, 200],
        from: 0,
        size: 90,
        length: 100,
        arc: true,
        label: true,
        kindLabel: true,
        rays: true,
      };
      const Render = anglePart.Render as unknown as (a: { p: unknown; ctx: unknown }) => {
        type: string;
        props: { children: unknown };
      };
      const vnode = Render({ p, ctx: dummyCtx });
      expect(vnode).toBeDefined();
      expect(vnode.type).toBe('g');
    });

    it('arc: false 时不渲染角弧', () => {
      const p = { at: [200, 200], from: 0, size: 90, length: 100, arc: false };
      const L = angleLayout(p);
      expect(L.showArc).toBe(false);
      expect(L.arcD).toBeUndefined();
    });
  });
});
