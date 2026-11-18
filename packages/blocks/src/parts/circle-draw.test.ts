import { describe, expect, it } from 'vitest';
import { getTheme } from '@flow-see/core';
import { findSubitem, getPart, type PartContext, type Props } from '../index';
import {
  circleDrawLayout,
  circleDrawPart,
  defaultCircleDrawLabels,
} from './circle-draw';

interface VNodeLike {
  type?: unknown;
  props?: Record<string, unknown>;
}

function collectVNodes(node: unknown, out: VNodeLike[] = []): VNodeLike[] {
  if (!node) return out;
  if (Array.isArray(node)) {
    for (const item of node) collectVNodes(item, out);
    return out;
  }
  if (typeof node === 'object') {
    const v = node as VNodeLike;
    out.push(v);
    if (v.props && 'children' in v.props) {
      collectVNodes(v.props.children, out);
    }
  }
  return out;
}

describe('circle-draw 零件（任务卡 B18）', () => {
  describe('1. draw 画圆比例与笔脚位置', () => {
    it('draw = 0 时笔脚在正右方 [cx + r, cy]，不画圆弧且不填充', () => {
      const L = circleDrawLayout({ at: [260, 210], radius: 120, draw: 0 });
      expect(L.cx).toBe(260);
      expect(L.cy).toBe(210);
      expect(L.penTip[0]).toBeCloseTo(380);
      expect(L.penTip[1]).toBeCloseTo(210);
      expect(L.isZeroDraw).toBe(true);
      expect(L.isFullCircle).toBe(false);
      expect(L.arcPath).toBeUndefined();
    });

    it('draw = 0.25 时笔脚从正右方逆时针转 90° 到正上方 [cx, cy - r]', () => {
      const L = circleDrawLayout({ at: [260, 210], radius: 120, draw: 0.25 });
      expect(L.penTip[0]).toBeCloseTo(260);
      expect(L.penTip[1]).toBeCloseTo(90);
      expect(L.isZeroDraw).toBe(false);
      expect(L.isFullCircle).toBe(false);
      expect(L.arcPath).toContain('A 120 120 0 0 0');
    });

    it('draw = 0.5 与 draw = 0.75 时笔脚分别在正左方与正下方，优弧使用 largeArc = 1', () => {
      const L50 = circleDrawLayout({ at: [260, 210], radius: 100, draw: 0.5 });
      expect(L50.penTip[0]).toBeCloseTo(160);
      expect(L50.penTip[1]).toBeCloseTo(210);

      const L75 = circleDrawLayout({ at: [260, 210], radius: 100, draw: 0.75 });
      expect(L75.penTip[0]).toBeCloseTo(260);
      expect(L75.penTip[1]).toBeCloseTo(310);
      expect(L75.arcPath).toContain('A 100 100 0 1 0');
    });

    it('draw = 1 时画满整圆并标记 isFullCircle = true', () => {
      const L = circleDrawLayout({ at: [260, 210], radius: 120, draw: 1 });
      expect(L.penTip[0]).toBeCloseTo(380);
      expect(L.penTip[1]).toBeCloseTo(210);
      expect(L.isFullCircle).toBe(true);
      expect(L.isZeroDraw).toBe(false);
    });
  });

  describe('2. roll 圆滚动几何（圆心右移、红点顺时针旋转、基线与周长）', () => {
    it('roll = 0.5 时当前圆心 x = at.x + πr，红点转到最顶端 [cx, cy - r]', () => {
      const r = 80;
      const L = circleDrawLayout({ at: [120, 200], radius: r, roll: 0.5 });
      expect(L.startCenter).toEqual([120, 200]);
      expect(L.cx).toBeCloseTo(120 + Math.PI * r);
      expect(L.cy).toBe(200);
      expect(L.showRoll).toBe(true);

      // roll = 0.5 时顺时针转 180°，底部切点转到圆最顶端
      expect(L.rollPoint[0]).toBeCloseTo(L.cx);
      expect(L.rollPoint[1]).toBeCloseTo(200 - r);
    });

    it('roll 在 0、0.25、0.75、1 各关键相位下红点顺时针轨迹准确', () => {
      const r = 60;
      const at: [number, number] = [100, 180];

      const L0 = circleDrawLayout({ at, radius: r, roll: 0 });
      expect(L0.cx).toBeCloseTo(100);
      expect(L0.showRoll).toBe(false);
      expect(L0.rollPoint[0]).toBeCloseTo(100);
      expect(L0.rollPoint[1]).toBeCloseTo(240);

      // roll = 0.25：顺时针转 90° 到圆最左端 [cx - r, cy]
      const L25 = circleDrawLayout({ at, radius: r, roll: 0.25 });
      expect(L25.rollPoint[0]).toBeCloseTo(L25.cx - r);
      expect(L25.rollPoint[1]).toBeCloseTo(180);

      // roll = 0.75：顺时针转 270° 到圆最右端 [cx + r, cy]
      const L75 = circleDrawLayout({ at, radius: r, roll: 0.75 });
      expect(L75.rollPoint[0]).toBeCloseTo(L75.cx + r);
      expect(L75.rollPoint[1]).toBeCloseTo(180);

      // roll = 1：滚完一整圈回到最底端切点 [at.x + 2πr, cy + r]
      const L100 = circleDrawLayout({ at, radius: r, roll: 1 });
      expect(L100.cx).toBeCloseTo(100 + 2 * Math.PI * r);
      expect(L100.rollPoint[0]).toBeCloseTo(L100.cx);
      expect(L100.rollPoint[1]).toBeCloseTo(240);
      expect(L100.rollLayout).toBeDefined();
      expect(L100.rollLayout!.baselineStart).toEqual([100, 240]);
      expect(L100.rollLayout!.baselineEnd[0]).toBeCloseTo(100 + 2 * Math.PI * r + 40);
      expect(L100.rollLayout!.rolledEnd[0] - L100.rollLayout!.rolledStart[0]).toBeCloseTo(
        2 * Math.PI * r,
      );
      expect(L100.rollLayout!.circumferenceLabel).toBe('周长');
    });
  });

  describe('3. compass 圆规两脚与铰接点等腰三角形几何', () => {
    it('脚长等于 max(r * 0.75, 160)，铰接点到针脚与笔脚距离严格等于脚长且在中点上方', () => {
      const draws = [0, 0.12, 0.25, 0.4, 0.5, 0.68, 0.75, 0.9, 1];
      for (const d of draws) {
        const L1 = circleDrawLayout({ at: [260, 210], radius: 120, draw: d, compass: true });
        expect(L1.compass).toBeDefined();
        const c1 = L1.compass!;
        expect(c1.legLength).toBe(160);
        expect(c1.needleTip).toEqual([L1.cx, L1.cy]);
        expect(c1.penTip).toEqual(L1.penTip);

        const distNeedle = Math.hypot(
          c1.hinge[0] - c1.needleTip[0],
          c1.hinge[1] - c1.needleTip[1],
        );
        const distPen = Math.hypot(c1.hinge[0] - c1.penTip[0], c1.hinge[1] - c1.penTip[1]);
        expect(distNeedle).toBeCloseTo(160, 5);
        expect(distPen).toBeCloseTo(160, 5);
        expect(c1.hinge[1]).toBeLessThanOrEqual(c1.midpoint[1] + 1e-6);
      }

      // 大半径时脚长按 radius * 0.75 放大
      const L2 = circleDrawLayout({ at: [300, 250], radius: 240, draw: 0.1, compass: true });
      expect(L2.compass!.legLength).toBeCloseTo(180);
      const distNeedle2 = Math.hypot(
        L2.compass!.hinge[0] - L2.compass!.needleTip[0],
        L2.compass!.hinge[1] - L2.compass!.needleTip[1],
      );
      const distPen2 = Math.hypot(
        L2.compass!.hinge[0] - L2.compass!.penTip[0],
        L2.compass!.hinge[1] - L2.compass!.penTip[1],
      );
      expect(distNeedle2).toBeCloseTo(180, 5);
      expect(distPen2).toBeCloseTo(180, 5);
    });
  });

  describe('4. 圆心、多条半径、直径、labels 与子项查询', () => {
    it('radii 均匀分布且第一条指向正右方，radiusLabel 控制 r 标注，diameter 画水平直径与 d 标注', () => {
      const L = circleDrawLayout({
        at: [200, 200],
        radius: 100,
        radii: 4,
        radiusLabel: true,
        diameter: true,
        center: true,
      });

      expect(L.radiiCount).toBe(4);
      expect(L.radiiEnds).toHaveLength(4);
      // 0° 右、90° 上、180° 左、270° 下
      expect(L.radiiEnds[0][0]).toBeCloseTo(300);
      expect(L.radiiEnds[0][1]).toBeCloseTo(200);
      expect(L.radiiEnds[1][0]).toBeCloseTo(200);
      expect(L.radiiEnds[1][1]).toBeCloseTo(100);
      expect(L.radiiEnds[2][0]).toBeCloseTo(100);
      expect(L.radiiEnds[2][1]).toBeCloseTo(200);
      expect(L.radiiEnds[3][0]).toBeCloseTo(200);
      expect(L.radiiEnds[3][1]).toBeCloseTo(300);

      expect(L.showRadiusLabel).toBe(true);
      expect(L.showDiameter).toBe(true);
      expect(L.diameterStart).toEqual([100, 200]);
      expect(L.diameterEnd).toEqual([300, 200]);
      // 同时显示 r 与 d 时左右错开不重叠
      expect(L.radiusLabelPos[0]).toBeGreaterThan(200);
      expect(L.diameterLabelPos[0]).toBeLessThan(200);
    });

    it('radii = 0 时即使 radiusLabel = true 也不显示 r；支持自定义 labels 与默认 labels 读取', () => {
      const def = defaultCircleDrawLabels();
      expect(def).toEqual({ center: 'O', r: 'r', d: 'd', circumference: '周长' });

      const L = circleDrawLayout({
        at: [200, 200],
        radius: 90,
        radii: 0,
        radiusLabel: true,
        center: false,
        labels: { center: 'C', r: 'R', d: 'D', circumference: 'C=2πr' },
      });
      expect(L.showCenter).toBe(false);
      expect(L.showRadiusLabel).toBe(false);
      expect(L.labels).toEqual({ center: 'C', r: 'R', d: 'D', circumference: 'C=2πr' });
    });

    it('subitems 包含 center、radius（第一条半径外扩）、diameter，支持 findSubitem 查询', () => {
      const props = { at: [260, 210], radius: 120, radii: 1, radiusLabel: true, diameter: true };
      const centerSub = findSubitem(circleDrawPart, props, 'center');
      const radiusSub = findSubitem(circleDrawPart, props, 'radius');
      const diameterSub = findSubitem(circleDrawPart, props, 'diameter');
      const allSubs = findSubitem(circleDrawPart, props, '*');

      expect(centerSub).toBeDefined();
      if (centerSub && !Array.isArray(centerSub)) {
        expect(centerSub.box.w).toBeGreaterThanOrEqual(32);
      }

      expect(radiusSub).toBeDefined();
      if (radiusSub && !Array.isArray(radiusSub)) {
        // 覆盖 [260, 210] 到 [380, 210] 并外扩
        expect(radiusSub.box.x).toBeLessThan(260);
        expect(radiusSub.box.x + radiusSub.box.w).toBeGreaterThan(380);
        expect(radiusSub.box.h).toBeGreaterThanOrEqual(28);
      }

      expect(diameterSub).toBeDefined();
      if (diameterSub && !Array.isArray(diameterSub)) {
        // 覆盖 [140, 210] 到 [380, 210] 并外扩
        expect(diameterSub.box.x).toBeLessThan(140);
        expect(diameterSub.box.x + diameterSub.box.w).toBeGreaterThan(380);
      }

      expect(Array.isArray(allSubs) && allSubs.map((s) => s.name)).toEqual([
        'center',
        'radius',
        'diameter',
      ]);
    });
  });

  describe('5. 包围盒 bbox 计算', () => {
    it('默认圆包围盒包含整个圆周', () => {
      const b = circleDrawPart.bbox({ at: [260, 210], radius: 120 });
      expect(b.x).toBeLessThanOrEqual(140);
      expect(b.y).toBeLessThanOrEqual(90);
      expect(b.x + b.w).toBeGreaterThanOrEqual(380);
      expect(b.y + b.h).toBeGreaterThanOrEqual(330);
    });

    it('compass = true 时包围盒包含圆规铰接点与顶部握柄', () => {
      const p = { at: [260, 210], radius: 120, draw: 0, compass: true };
      const L = circleDrawLayout(p);
      expect(L.compass).toBeDefined();
      expect(L.bbox.y).toBeLessThanOrEqual(L.compass!.handleTop[1]);
      expect(L.bbox.y).toBeLessThan(210 - 120);
    });

    it('roll > 0 时包围盒包含整条下方水平线与周长文字', () => {
      const r = 50;
      const p = { at: [120, 200], radius: r, roll: 0.4 };
      const L = circleDrawLayout(p);
      const expectedLineEnd = 120 + 2 * Math.PI * r + 40;
      expect(L.bbox.x).toBeLessThanOrEqual(120);
      expect(L.bbox.x + L.bbox.w).toBeGreaterThanOrEqual(expectedLineEnd);
      // 下方基线 y = 250，周长文字在 y = 274 附近
      expect(L.bbox.y + L.bbox.h).toBeGreaterThan(274);
    });
  });

  describe('6. 注册、SVG 渲染与配置检查', () => {
    it('已注册到 PARTS，可通过 getPart("circle-draw") 获取默认属性並在四个主题下正常渲染', () => {
      const resolved = getPart('circle-draw');
      expect(resolved).toBeDefined();
      expect(resolved?.defaults.radius).toBe(120);
      expect(resolved?.defaults.draw).toBe(1);
      expect(resolved?.defaults.center).toBe(true);

      const Render = circleDrawPart.Render as unknown as (a: {
        p: Props;
        ctx: PartContext;
      }) => VNodeLike;

      for (const themeId of ['flat', 'chalk', 'cute', 'pro'] as const) {
        const ctx: PartContext = { theme: getTheme(themeId) };
        const fullTree = collectVNodes(
          Render({
            p: {
              ...resolved!.defaults,
              at: [300, 220],
              compass: true,
              radii: 3,
              radiusLabel: true,
              diameter: true,
              roll: 0.5,
              _subColors: { radius: 'red' },
            },
            ctx,
          }),
        );
        expect(fullTree.some((n) => n.type === 'circle' && n.props?.fillOpacity === 0.15)).toBe(
          true,
        );
        expect(fullTree.some((n) => n.type === 'text' && n.props?.children === '周长')).toBe(true);

        const partialTree = collectVNodes(
          Render({
            p: { ...resolved!.defaults, at: [300, 220], draw: 0.3, compass: true },
            ctx,
          }),
        );
        expect(partialTree.some((n) => n.type === 'circle' && n.props?.fillOpacity === 0.15)).toBe(
          false,
        );
        expect(partialTree.some((n) => n.type === 'path')).toBe(true);
      }
    });
  });
});
