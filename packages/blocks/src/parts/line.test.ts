import { isValidElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { getTheme } from '@flow-see/core';
import type { PartContext } from '../base';
import {
  distanceToStageBoundary,
  lineLayout,
  linePart,
  arrowPart,
} from '../index';

const theme = getTheme('cute');
const dummyCtx: PartContext = { theme };

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
    if (typeof el.type === 'function') {
      flatten((el.type as (p: unknown) => ReactNode)(el.props), out);
    } else if (el.props && el.props.children) {
      flatten(el.props.children as ReactNode, out);
    }
  }
  return out;
}

function render(part: typeof linePart, p: Record<string, unknown>, ctx = dummyCtx): El[] {
  const Render = part.Render as unknown as (a: { p: unknown; ctx: PartContext }) => ReactNode;
  return flatten(Render({ p, ctx }));
}

describe('X7 线段扩展（端点样式与延长）', () => {
  const stage = { width: 800, height: 450 };

  describe('1. distanceToStageBoundary 边界距离几何计算', () => {
    it('水平正向 (1, 0) 到右边界', () => {
      // (560, 220) 向右到 800，距离为 240
      const d = distanceToStageBoundary(560, 220, 1, 0, 800, 450);
      expect(d).toBeCloseTo(240);
    });

    it('水平反向 (-1, 0) 到左边界', () => {
      // (240, 220) 向左到 0，距离为 240
      const d = distanceToStageBoundary(240, 220, -1, 0, 800, 450);
      expect(d).toBeCloseTo(240);
    });

    it('竖直正向 (0, 1) 到下边界', () => {
      // (400, 300) 向下到 450，距离为 150
      const d = distanceToStageBoundary(400, 300, 0, 1, 800, 450);
      expect(d).toBeCloseTo(150);
    });

    it('竖直反向 (0, -1) 到上边界', () => {
      // (400, 100) 向上到 0，距离为 100
      const d = distanceToStageBoundary(400, 100, 0, -1, 800, 450);
      expect(d).toBeCloseTo(100);
    });

    it('斜向射线正确取最近相交边界', () => {
      // 从 (200, 150) 沿 (3/sqrt(10), 1/sqrt(10)) 到 (500, 250)
      // dx=300, dy=100.
      // 从 (500, 250) 向前: tx = (800-500)/(3/sqrt(10)) = 100*sqrt(10) ≈ 316.2277
      // ty = (450-250)/(1/sqrt(10)) = 200*sqrt(10) ≈ 632.4555
      // 最近为 tx
      const ux = 3 / Math.sqrt(10);
      const uy = 1 / Math.sqrt(10);
      const d = distanceToStageBoundary(500, 250, ux, uy, 800, 450);
      expect(d).toBeCloseTo(100 * Math.sqrt(10));
    });
  });

  describe('2. 两种端点（point 与 open）及实心端点绘制', () => {
    it('ends: [point, point] 两端都画实心端点，半径 = 线宽 × 1.5', () => {
      const props = {
        from: [240, 120],
        to: [560, 120],
        ends: ['point', 'point'],
        width: 4,
      };
      const L = lineLayout(props, stage);
      expect(L.leftEnd).toBe('point');
      expect(L.rightEnd).toBe('point');
      expect(L.hasLeftPoint).toBe(true);
      expect(L.hasRightPoint).toBe(true);
      expect(L.pointRadius).toBe(6); // 4 * 1.5 = 6

      const els = render(linePart, props);
      const circles = els.filter((e) => e.type === 'circle');
      expect(circles).toHaveLength(2);
      expect(circles[0].props.cx).toBe(240);
      expect(circles[0].props.cy).toBe(120);
      expect(circles[0].props.r).toBe(6);
      expect(circles[1].props.cx).toBe(560);
      expect(circles[1].props.cy).toBe(120);
      expect(circles[1].props.r).toBe(6);
    });

    it('ends: [point, open] 射线：起点实心圆点，终点不画端点', () => {
      const props = {
        from: [240, 220],
        to: [560, 220],
        ends: ['point', 'open'],
        width: 4,
      };
      const L = lineLayout(props, stage);
      expect(L.leftEnd).toBe('point');
      expect(L.rightEnd).toBe('open');
      expect(L.hasLeftPoint).toBe(true);
      expect(L.hasRightPoint).toBe(false);

      const els = render(linePart, props);
      const circles = els.filter((e) => e.type === 'circle');
      expect(circles).toHaveLength(1);
      expect(circles[0].props.cx).toBe(240);
      expect(circles[0].props.cy).toBe(220);
      expect(circles[0].props.r).toBe(6);
    });

    it('ends: [open, open] 两端都不画实心圆点', () => {
      const props = {
        from: [240, 320],
        to: [560, 320],
        ends: ['open', 'open'],
        width: 4,
      };
      const L = lineLayout(props, stage);
      expect(L.leftEnd).toBe('open');
      expect(L.rightEnd).toBe('open');
      expect(L.hasLeftPoint).toBe(false);
      expect(L.hasRightPoint).toBe(false);

      const els = render(linePart, props);
      const circles = els.filter((e) => e.type === 'circle');
      expect(circles).toHaveLength(0);
    });

    it('不同线宽对应端点半径 = 线宽 × 1.5', () => {
      const L1 = lineLayout({ from: [0, 0], to: [100, 0], ends: ['point', 'point'], width: 6 });
      expect(L1.pointRadius).toBe(9);
      const L2 = lineLayout({ from: [0, 0], to: [100, 0], ends: ['point', 'point'], width: 2 });
      expect(L2.pointRadius).toBe(3);
    });
  });

  describe('3. extend 0.5 的长度与坐标计算', () => {
    it('射线 [point, open]：extend 0.5 时只有 open 端向外延长', () => {
      // 舞台 800 × 450，from [240, 220]，to [560, 220]
      // left 是 point：不延长，原端点 240
      // right 是 open：向右到 800 距离 240，extend 0.5 延长 120 到 680
      const props = {
        from: [240, 220],
        to: [560, 220],
        ends: ['point', 'open'],
        extend: 0.5,
        width: 4,
      };
      const L = lineLayout(props, stage);
      expect(L.start).toEqual([240, 220]);
      expect(L.end).toEqual([680, 220]);
      expect(L.length).toBeCloseTo(440); // 320 + 120 = 440
      expect(L.rightDistance).toBeCloseTo(240);
    });

    it('直线 [open, open]：extend 0.5 时两端均向外延长', () => {
      // from [240, 320]，to [560, 320]
      // left: 240 - 120 = 120
      // right: 560 + 120 = 680
      const props = {
        from: [240, 320],
        to: [560, 320],
        ends: ['open', 'open'],
        extend: 0.5,
        width: 4,
      };
      const L = lineLayout(props, stage);
      expect(L.start).toEqual([120, 320]);
      expect(L.end).toEqual([680, 320]);
      expect(L.length).toBeCloseTo(560); // 320 + 240 = 560
    });

    it('线段 [point, point]：extend 0.5 时两端为 point 都不延长', () => {
      const props = {
        from: [240, 120],
        to: [560, 120],
        ends: ['point', 'point'],
        extend: 0.5,
        width: 4,
      };
      const L = lineLayout(props, stage);
      expect(L.start).toEqual([240, 120]);
      expect(L.end).toEqual([560, 120]);
      expect(L.length).toBeCloseTo(320);
    });

    it('斜向线段 extend 0.5 几何长度与端点精准计算', () => {
      // from [200, 100]，to [400, 200]，舞台 800 × 400
      // 方向 (2/sqrt(5), 1/sqrt(5))
      // 右端到 (800, 400) 距离 200*sqrt(5)
      // extend 0.5 增加 100*sqrt(5)，终点变为 (600, 300)
      const props = {
        from: [200, 100],
        to: [400, 200],
        ends: ['point', 'open'],
        extend: 0.5,
      };
      const L = lineLayout(props, { width: 800, height: 400 });
      expect(L.start).toEqual([200, 100]);
      expect(L.end[0]).toBeCloseTo(600);
      expect(L.end[1]).toBeCloseTo(300);
      expect(L.length).toBeCloseTo(200 * Math.sqrt(5)); // 原长 100*sqrt(5) + 延长 100*sqrt(5)
    });
  });

  describe('4. extend = 1 到舞台边界与边缘 30px 渐隐', () => {
    it('extend = 1 时端点到达舞台边界', () => {
      const props = {
        from: [240, 220],
        to: [560, 220],
        ends: ['open', 'open'],
        extend: 1,
      };
      const L = lineLayout(props, stage);
      expect(L.start).toEqual([0, 220]);
      expect(L.end).toEqual([800, 220]);
      expect(L.length).toBeCloseTo(800);
      expect(L.fadeLeft).toBe(true);
      expect(L.fadeRight).toBe(true);
    });

    it('extend = 1 时生成渐变且边缘最后 30 像素透明度从 1 到 0', () => {
      const props = {
        id: 'full',
        from: [240, 220],
        to: [560, 220],
        ends: ['open', 'open'],
        extend: 1,
        width: 4,
      };
      const els = render(linePart, props);
      const grads = els.filter((e) => e.type === 'linearGradient');
      expect(grads).toHaveLength(1);
      const grad = grads[0];
      expect(grad.props.x1).toBe(0);
      expect(grad.props.y1).toBe(220);
      expect(grad.props.x2).toBe(800);
      expect(grad.props.y2).toBe(220);

      const stops = els.filter((e) => e.type === 'stop');
      expect(stops.length).toBeGreaterThanOrEqual(4);
      // 起点边缘: offset 0 为 opacity 0, offset 30/800 为 opacity 1
      expect(stops[0].props.offset).toBe('0');
      expect(stops[0].props.stopOpacity).toBe(0);
      expect(stops[1].props.offset).toBeCloseTo(30 / 800);
      expect(stops[1].props.stopOpacity).toBe(1);

      // 终点边缘: offset (800-30)/800 为 opacity 1, offset 1 为 opacity 0
      expect(stops[2].props.offset).toBeCloseTo((800 - 30) / 800);
      expect(stops[2].props.stopOpacity).toBe(1);
      expect(stops[3].props.offset).toBe('1');
      expect(stops[3].props.stopOpacity).toBe(0);

      // line 引用此渐变
      const lines = els.filter((e) => e.type === 'line');
      expect(lines).toHaveLength(1);
      expect(lines[0].props.stroke).toBe(`url(#line-grad-full)`);
    });

    it('extend < 1 时不渐隐，使用正常 stroke 颜色', () => {
      const props = {
        from: [240, 220],
        to: [560, 220],
        ends: ['open', 'open'],
        extend: 0.5,
      };
      const els = render(linePart, props);
      const grads = els.filter((e) => e.type === 'linearGradient');
      expect(grads).toHaveLength(0);
      const lines = els.filter((e) => e.type === 'line');
      expect(lines[0].props.stroke).toBe(theme.ink);
    });

    it('单端 open 渐隐：[point, open] extend: 1 只有终点渐隐', () => {
      const props = {
        from: [240, 220],
        to: [560, 220],
        ends: ['point', 'open'],
        extend: 1,
      };
      const els = render(linePart, props);
      const stops = els.filter((e) => e.type === 'stop');
      expect(stops).toHaveLength(3);
      expect(stops[0].props.offset).toBe('0');
      expect(stops[0].props.stopOpacity).toBe(1); // 起点是 point，不渐隐
      expect(stops[1].props.stopOpacity).toBe(1);
      expect(stops[2].props.offset).toBe('1');
      expect(stops[2].props.stopOpacity).toBe(0); // 终点是 open 到边缘，渐隐
    });
  });

  describe('5. 包围盒与已上线知识点画面不变（回归）', () => {
    it('ends 不写时不画端点，extend 不写时不延长，完全回归兼容现有配置', () => {
      // 现有知识点写法：无 ends，无 extend
      const props = {
        from: [100, 140],
        to: [400, 140],
        width: 4,
      };
      const L = lineLayout(props, stage);
      expect(L.hasLeftPoint).toBe(false);
      expect(L.hasRightPoint).toBe(false);
      expect(L.start).toEqual([100, 140]);
      expect(L.end).toEqual([400, 140]);
      expect(L.fadeLeft).toBe(false);
      expect(L.fadeRight).toBe(false);

      const els = render(linePart, props);
      const circles = els.filter((e) => e.type === 'circle');
      expect(circles).toHaveLength(0);
      const grads = els.filter((e) => e.type === 'linearGradient');
      expect(grads).toHaveLength(0);
      const line = els.find((e) => e.type === 'line');
      expect(line).toBeDefined();
      expect(line!.props.x1).toBe(100);
      expect(line!.props.y1).toBe(140);
      expect(line!.props.x2).toBe(400);
      expect(line!.props.y2).toBe(140);
      expect(line!.props.stroke).toBe(theme.ink);
    });

    it('默认包围盒计算与原有逻辑保持像素级完全一致', () => {
      const props = {
        from: [120, 150],
        to: [500, 300],
        width: 4,
      };
      const b = linePart.bbox(props);
      // 原逻辑: x = min(120, 500) - 12 = 108
      // y = min(150, 300) - 12 = 138
      // w = |500 - 120| + 24 = 404
      // h = |300 - 150| + 24 = 174
      expect(b).toEqual({
        x: 108,
        y: 138,
        w: 404,
        h: 174,
      });
    });

    it('延长后包围盒自动包住延长部分与端点', () => {
      const props = {
        from: [240, 220],
        to: [560, 220],
        ends: ['open', 'open'],
        extend: 0.5,
        width: 4,
      };
      const b = linePart.bbox(props);
      // start: [120, 220], end: [680, 220]
      expect(b.x).toBe(120 - 12);
      expect(b.w).toBe(560 + 24);
    });

    it('arrow 零件继承 linePart 扩展且保持原有箭头功能', () => {
      const props = {
        from: [100, 100],
        to: [300, 100],
        width: 4,
      };
      const els = render(arrowPart, props);
      const arrowPath = els.find((e) => e.type === 'path');
      expect(arrowPath).toBeDefined();
      const line = els.find((e) => e.type === 'line');
      expect(line).toBeDefined();
    });
  });
});
