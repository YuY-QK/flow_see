import { isValidElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import type { Theme } from '@flow-see/core';
import type { PartContext } from '../base';
import { pathLayout, pathPart } from './path';

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

const dummyCtx: PartContext = {
  theme: dummyTheme,
  assetUrl: (id: string) => `https://assets.local/${id}.svg`,
};

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

function render(part: typeof pathPart, p: Record<string, unknown>, ctx = dummyCtx): El[] {
  const Render = part.Render as unknown as (a: { p: unknown; ctx: PartContext }) => ReactNode;
  return flatten(Render({ p, ctx }));
}

describe('path 路径与路线零件（任务卡 B13）', () => {
  describe('1. 总长度计算：开放路径与闭合路径', () => {
    it('开放路径总长度为各段之和', () => {
      // (0, 0) -> (100, 0) -> (100, 150)
      const props = {
        points: [
          [0, 0],
          [100, 0],
          [100, 150],
        ],
        closed: false,
      };
      const L = pathLayout(props);
      expect(L.segments).toHaveLength(2);
      expect(L.segments[0].len).toBeCloseTo(100);
      expect(L.segments[1].len).toBeCloseTo(150);
      expect(L.totalLength).toBeCloseTo(250);
      expect(L.closed).toBe(false);
    });

    it('闭合路径且末尾未重合时，自动追加连回起点的最后一段并计入总周长', () => {
      // 边长 300, 400 的直角三角形：(0, 0) -> (300, 0) -> (300, 400)
      // closed: true 时追加 (300, 400) -> (0, 0)，长度 500
      const props = {
        points: [
          [0, 0],
          [300, 0],
          [300, 400],
        ],
        closed: true,
      };
      const L = pathLayout(props);
      expect(L.segments).toHaveLength(3);
      expect(L.segments[0].len).toBeCloseTo(300);
      expect(L.segments[1].len).toBeCloseTo(400);
      expect(L.segments[2].len).toBeCloseTo(500);
      expect(L.totalLength).toBeCloseTo(1200);
      expect(L.closed).toBe(true);
    });

    it('闭合路径首尾已相同时不重复添加 0 长度闭合段', () => {
      const props = {
        points: [
          [0, 0],
          [100, 0],
          [100, 100],
          [0, 100],
          [0, 0],
        ],
        closed: true,
      };
      const L = pathLayout(props);
      expect(L.segments).toHaveLength(4);
      expect(L.totalLength).toBeCloseTo(400);
    });
  });

  describe('2. draw: 0.5 时的折线终点坐标与部分路径长度', () => {
    it('draw 为 0.5 时，终点精确落在折线总长度 50% 处', () => {
      // 两段等长线段：(0, 0) -> (100, 0) -> (100, 100)，每段长 100，总长 200
      // draw: 0.5 时，走完第 1 段，刚好到达 (100, 0)
      const props = {
        points: [
          [0, 0],
          [100, 0],
          [100, 100],
        ],
        draw: 0.5,
      };
      const L = pathLayout(props);
      expect(L.drawnLength).toBeCloseTo(100);
      expect(L.currentEnd[0]).toBeCloseTo(100);
      expect(L.currentEnd[1]).toBeCloseTo(0);
      expect(L.drawnPoints).toHaveLength(2);
      expect(L.drawnPoints[0]).toEqual([0, 0]);
      expect(L.drawnPoints[1]).toEqual([100, 0]);
    });

    it('draw 在线段内部截断（如 draw: 0.75）', () => {
      // 总长 200，draw 0.75 => targetLen = 150
      // 第 1 段 100 走完，第 2 段 (100, 0)->(100, 100) 走 50，终点为 (100, 50)
      const props = {
        points: [
          [0, 0],
          [100, 0],
          [100, 100],
        ],
        draw: 0.75,
      };
      const L = pathLayout(props);
      expect(L.drawnLength).toBeCloseTo(150);
      expect(L.currentEnd[0]).toBeCloseTo(100);
      expect(L.currentEnd[1]).toBeCloseTo(50);
      expect(L.drawnPoints).toHaveLength(3);
      expect(L.drawnPoints[2][0]).toBeCloseTo(100);
      expect(L.drawnPoints[2][1]).toBeCloseTo(50);
    });

    it('draw 为 0 时路径不推进，仅保留起点', () => {
      const props = {
        points: [
          [20, 30],
          [120, 30],
        ],
        draw: 0,
      };
      const L = pathLayout(props);
      expect(L.drawnLength).toBe(0);
      expect(L.currentEnd).toEqual([20, 30]);
      expect(L.drawnPoints).toEqual([[20, 30]]);
    });

    it('draw 为 1 时完整画出整条路径', () => {
      const props = {
        points: [
          [0, 0],
          [80, 0],
          [80, 60],
        ],
        draw: 1,
      };
      const L = pathLayout(props);
      expect(L.drawnLength).toBeCloseTo(140);
      expect(L.currentEnd).toEqual([80, 60]);
      expect(L.drawnPoints).toEqual([
        [0, 0],
        [80, 0],
        [80, 60],
      ]);
    });
  });

  describe('3. marker 坐标位置测试（在起点、中点、终点各处）', () => {
    const basePoints = [
      [100, 100],
      [300, 100],
      [300, 200],
    ]; // seg1: 200, seg2: 100, total = 300

    it('marker: dot 在起点（draw: 0）', () => {
      const props = {
        points: basePoints,
        draw: 0,
        marker: 'dot',
      };
      const L = pathLayout(props);
      expect(L.marker).not.toBeNull();
      expect(L.marker?.type).toBe('dot');
      expect(L.marker?.pt[0]).toBeCloseTo(100);
      expect(L.marker?.pt[1]).toBeCloseTo(100);
      expect(L.marker?.size).toBe(16);

      const els = render(pathPart, props);
      const circle = els.find((e) => e.type === 'circle');
      expect(circle).toBeDefined();
      expect(circle?.props.cx).toBeCloseTo(100);
      expect(circle?.props.cy).toBeCloseTo(100);
      expect(circle?.props.r).toBe(8);
    });

    it('marker 在中点（draw: 0.5 走到 150）', () => {
      // 150 落在第 1 段 (100, 100) -> (300, 100) 的 150 处 => x = 250, y = 100
      const props = {
        points: basePoints,
        draw: 0.5,
        marker: 'dot',
      };
      const L = pathLayout(props);
      expect(L.marker?.pt[0]).toBeCloseTo(250);
      expect(L.marker?.pt[1]).toBeCloseTo(100);
    });

    it('marker 在终点（draw: 1）', () => {
      const props = {
        points: basePoints,
        draw: 1,
        marker: 'dot',
      };
      const L = pathLayout(props);
      expect(L.marker?.pt[0]).toBeCloseTo(300);
      expect(L.marker?.pt[1]).toBeCloseTo(200);
    });

    it('素材 marker（如 ant）渲染 image 与旋转 transform', () => {
      const props = {
        points: [
          [50, 50],
          [150, 50],
        ],
        draw: 1,
        marker: 'ant',
        markerSize: 48,
      };
      const L = pathLayout(props);
      expect(L.marker?.type).toBe('asset');
      expect(L.marker?.asset).toBe('ant');
      expect(L.marker?.size).toBe(48);

      const els = render(pathPart, props);
      const img = els.find((e) => e.type === 'image');
      expect(img).toBeDefined();
      expect(img?.props.href).toBe('https://assets.local/ant.svg');
      expect(img?.props.width).toBe(48);
      expect(img?.props.height).toBe(48);

      const g = els.find(
        (e) => e.type === 'g' && typeof e.props.transform === 'string' && e.props.transform.includes('translate'),
      );
      expect(g).toBeDefined();
      expect(g?.props.transform).toContain('translate(150, 50)');
    });

    it('素材 marker 加载失败或无 url 时渲染 fallback rect', () => {
      const props = {
        points: [
          [0, 0],
          [100, 0],
        ],
        marker: 'unknown-asset',
        markerSize: 32,
      };
      const ctxNoAsset: PartContext = {
        theme: dummyTheme,
        assetUrl: () => undefined,
      };
      const els = render(pathPart, props, ctxNoAsset);
      const rect = els.find((e) => e.type === 'rect');
      expect(rect).toBeDefined();
      expect(rect?.props.width).toBe(32);
      expect(rect?.props.height).toBe(32);
    });
  });

  describe('4. lengths 每段中点旁文字的布局坐标', () => {
    it('在每一段线段中点沿法线方向外偏 14px 居中渲染', () => {
      // 水平向右线段：(100, 200) -> (300, 200)
      // 中点 mid = (200, 200)
      // 法线：nx = 0, ny = -1（向上外偏 14px）=> (200, 186)
      const props = {
        points: [
          [100, 200],
          [300, 200],
        ],
        lengths: ['200 米'],
      };
      const L = pathLayout(props);
      expect(L.segments[0].label).toBe('200 米');
      expect(L.segments[0].mid).toEqual([200, 200]);
      expect(L.segments[0].normal[0]).toBeCloseTo(0);
      expect(L.segments[0].normal[1]).toBeCloseTo(-1);
      expect(L.segments[0].labelPos[0]).toBeCloseTo(200);
      expect(L.segments[0].labelPos[1]).toBeCloseTo(186);

      const els = render(pathPart, props);
      const txt = els.find((e) => e.type === 'text');
      expect(txt).toBeDefined();
      expect(txt?.props.x).toBeCloseTo(200);
      expect(txt?.props.y).toBeCloseTo(186);
      expect(txt?.props.children).toBe('200 米');
      expect(txt?.props.textAnchor).toBe('middle');
      expect(txt?.props.dominantBaseline).toBe('central');
    });

    it('闭合多边形各边 lengths 均朝向图形外侧', () => {
      // 顺时针正方形：(100, 100) -> (300, 100) -> (300, 300) -> (100, 300)
      const props = {
        points: [
          [100, 100],
          [300, 100],
          [300, 300],
          [100, 300],
        ],
        closed: true,
        lengths: ['顶边', '右边', '底边', '左边'],
      };
      const L = pathLayout(props);
      // seg 0 (顶边): mid (200, 100), 外法线朝上 => (200, 86)
      expect(L.segments[0].labelPos[0]).toBeCloseTo(200);
      expect(L.segments[0].labelPos[1]).toBeCloseTo(86);

      // seg 1 (右边): mid (300, 200), 外法线朝右 => (314, 200)
      expect(L.segments[1].labelPos[0]).toBeCloseTo(314);
      expect(L.segments[1].labelPos[1]).toBeCloseTo(200);

      // seg 2 (底边): mid (200, 300), 外法线朝下 => (200, 314)
      expect(L.segments[2].labelPos[0]).toBeCloseTo(200);
      expect(L.segments[2].labelPos[1]).toBeCloseTo(314);

      // seg 3 (左边): mid (100, 200), 外法线朝左 => (86, 200)
      expect(L.segments[3].labelPos[0]).toBeCloseTo(86);
      expect(L.segments[3].labelPos[1]).toBeCloseTo(200);
    });
  });

  describe('5. seg.<n> 子项查询与包围盒', () => {
    it('正确生成 seg.1, seg.2, ... 子项及合理包围盒', () => {
      const props = {
        points: [
          [100, 100],
          [200, 100],
          [200, 250],
        ],
        width: 6,
      };
      const subitems = pathPart.subitems?.(props);
      expect(subitems).toBeDefined();
      expect(subitems).toHaveLength(2);
      expect(subitems![0].name).toBe('seg.1');
      expect(subitems![1].name).toBe('seg.2');

      // seg.1 从 (100, 100) 到 (200, 100)，pad = max(6/2, 6) = 6
      const box1 = subitems![0].box;
      expect(box1.x).toBeCloseTo(100 - 6);
      expect(box1.y).toBeCloseTo(100 - 6);
      expect(box1.w).toBeCloseTo(100 + 12);
      expect(box1.h).toBeCloseTo(12);

      // seg.2 从 (200, 100) 到 (200, 250)
      const box2 = subitems![1].box;
      expect(box2.x).toBeCloseTo(200 - 6);
      expect(box2.y).toBeCloseTo(100 - 6);
      expect(box2.w).toBeCloseTo(12);
      expect(box2.h).toBeCloseTo(150 + 12);
    });
  });

  describe('6. dashed 虚线状态与 VNode 渲染', () => {
    it('dashed: false 时为实线（strokeDasharray 为 undefined）', () => {
      const props = {
        points: [
          [10, 10],
          [100, 10],
        ],
        dashed: false,
      };
      const els = render(pathPart, props);
      const pathEl = els.find((e) => e.type === 'path');
      expect(pathEl).toBeDefined();
      expect(pathEl?.props.strokeDasharray).toBeUndefined();
    });

    it('dashed: true 时渲染虚线（strokeDasharray 为 "8 6"）', () => {
      const props = {
        points: [
          [10, 10],
          [100, 10],
        ],
        dashed: true,
      };
      const els = render(pathPart, props);
      const pathEl = els.find((e) => e.type === 'path');
      expect(pathEl).toBeDefined();
      expect(pathEl?.props.strokeDasharray).toBe('8 6');
    });
  });

  describe('7. PartDef 规格与属性配置', () => {
    it('PartDef 设置 rotatesPoints: true 且无 at', () => {
      expect(pathPart.type).toBe('path');
      expect(pathPart.rotatesPoints).toBe(true);
      expect(pathPart.props).not.toContain('at');
      expect(pathPart.props).toContain('points');
      expect(pathPart.props).toContain('closed');
      expect(pathPart.props).toContain('draw');
      expect(pathPart.props).toContain('marker');
      expect(pathPart.props).toContain('markerSize');
      expect(pathPart.props).toContain('lengths');
      expect(pathPart.props).toContain('width');
      expect(pathPart.props).toContain('color');
      expect(pathPart.props).toContain('dashed');
    });

    it('bbox 计算包含顶点、线宽与文字标注', () => {
      const props = {
        points: [
          [100, 100],
          [300, 100],
        ],
        lengths: ['200 cm'],
      };
      const b = pathPart.bbox(props);
      expect(b.x).toBeLessThanOrEqual(100);
      expect(b.x + b.w).toBeGreaterThanOrEqual(300);
      // 文字向上偏 14px 并在 186 处，y 方向应覆盖
      expect(b.y).toBeLessThanOrEqual(186);
    });

    it('空数据或无效数据安全容错', () => {
      const L0 = pathLayout({ points: [] });
      expect(L0.totalLength).toBe(0);
      expect(L0.segments).toHaveLength(0);

      const L1 = pathLayout({ points: [[50, 50]] });
      expect(L1.totalLength).toBe(0);
      expect(L1.currentEnd).toEqual([50, 50]);

      const els = render(pathPart, { points: [] });
      expect(els.filter((e) => e.type === 'path')).toHaveLength(0);
    });
  });
});
