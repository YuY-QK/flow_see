import { describe, expect, it } from 'vitest';
import { polygonLayout, polygonPart } from './polygon';
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

describe('polygon 零件（任务卡 B12）', () => {
  it('heights 垂足坐标（垂足在边上，锐角/直角三角形）', () => {
    // 三角形 ABC: A(0, 0), B(120, 0), C(60, 80)
    // 从顶点 3 (C) 向第 1 条边 (AB, 从 A(0,0) 到 B(120,0)) 作高
    const props = {
      points: [
        [0, 0],
        [120, 0],
        [60, 80],
      ],
      heights: [{ from: 3, to: 1 }],
    };
    const L = polygonLayout(props);
    expect(L.heights).toHaveLength(1);
    const h = L.heights[0];
    expect(h.from).toBe(3);
    expect(h.to).toBe(1);
    expect(h.footPt[0]).toBeCloseTo(60);
    expect(h.footPt[1]).toBeCloseTo(0);
    expect(h.hasExtension).toBe(false);
    expect(h.extFromPt).toBeNull();
    expect(h.extToPt).toBeNull();
  });

  it('heights 垂足坐标（含落在延长线上的钝角三角形，t > 1 与 t < 0）', () => {
    // 1. 钝角三角形，垂足在边 AB 延伸方向 (t > 1)
    // A(0, 0), B(60, 0), C(120, 80)
    // 边 1 为 A(0,0)->B(60,0)，顶点 3 为 C(120,80)
    // 垂足投影在 x 轴上为 (120, 0)，t = 120/60 = 2.0 > 1
    const propsBeyondB = {
      points: [
        [0, 0],
        [60, 0],
        [120, 80],
      ],
      heights: [{ from: 3, to: 1 }],
    };
    const L1 = polygonLayout(propsBeyondB);
    expect(L1.heights).toHaveLength(1);
    const h1 = L1.heights[0];
    expect(h1.footPt[0]).toBeCloseTo(120);
    expect(h1.footPt[1]).toBeCloseTo(0);
    expect(h1.hasExtension).toBe(true);
    expect(h1.extFromPt).toEqual([60, 0]);
    expect(h1.extToPt).toEqual([120, 0]);

    // 2. 钝角三角形，垂足在边 AB 反向延伸 (t < 0)
    // A(60, 0), B(120, 0), C(0, 80)
    // 边 1 为 A(60,0)->B(120,0)，顶点 3 为 C(0,80)
    // 垂足投影在 x 轴上为 (0, 0)，t = (0 - 60)/60 = -1.0 < 0
    const propsBeforeA = {
      points: [
        [60, 0],
        [120, 0],
        [0, 80],
      ],
      heights: [{ from: 3, to: 1 }],
    };
    const L2 = polygonLayout(propsBeforeA);
    expect(L2.heights).toHaveLength(1);
    const h2 = L2.heights[0];
    expect(h2.footPt[0]).toBeCloseTo(0);
    expect(h2.footPt[1]).toBeCloseTo(0);
    expect(h2.hasExtension).toBe(true);
    expect(h2.extFromPt).toEqual([60, 0]);
    expect(h2.extToPt).toEqual([0, 0]);
  });

  it('边长文字位置：边中点沿外法线方向 18 像素处', () => {
    // 顺时针矩形：(100, 100) -> (200, 100) -> (200, 200) -> (100, 200)
    // 边 1: (100, 100) -> (200, 100)，中点 (150, 100)，外法线向上 (0, -1) -> 文字在 (150, 82)
    // 边 2: (200, 100) -> (200, 200)，中点 (200, 150)，外法线向右 (1, 0) -> 文字在 (218, 150)
    const props = {
      points: [
        [100, 100],
        [200, 100],
        [200, 200],
        [100, 200],
      ],
      sideLabels: ['top', 'right', 'bottom', 'left'],
    };
    const L = polygonLayout(props);
    expect(L.isCW).toBe(true);
    expect(L.edges[0].label).toBe('top');
    expect(L.edges[0].labelPos[0]).toBeCloseTo(150);
    expect(L.edges[0].labelPos[1]).toBeCloseTo(82);

    expect(L.edges[1].label).toBe('right');
    expect(L.edges[1].labelPos[0]).toBeCloseTo(218);
    expect(L.edges[1].labelPos[1]).toBeCloseTo(150);

    expect(L.edges[2].label).toBe('bottom');
    expect(L.edges[2].labelPos[0]).toBeCloseTo(150);
    expect(L.edges[2].labelPos[1]).toBeCloseTo(218);

    expect(L.edges[3].label).toBe('left');
    expect(L.edges[3].labelPos[0]).toBeCloseTo(82);
    expect(L.edges[3].labelPos[1]).toBeCloseTo(150);
  });

  it('at 平移：加到所有顶点上', () => {
    const props = {
      at: [50, 60],
      points: [
        [0, 0],
        [100, 0],
        [0, 100],
      ],
    };
    const L = polygonLayout(props);
    expect(L.points).toEqual([
      [50, 60],
      [150, 60],
      [50, 160],
    ]);
    expect(L.edges[0].from).toEqual([50, 60]);
    expect(L.edges[0].to).toEqual([150, 60]);
    expect(L.edges[0].mid).toEqual([100, 60]);
  });

  it('顶点把手 apply：拖动顶点更新 points 数组', () => {
    const props = {
      at: [40, 50],
      points: [
        [0, 0],
        [100, 0],
        [0, 100],
      ],
    };
    const handles = polygonPart.handles?.(props);
    expect(handles).toBeDefined();
    expect(handles).toHaveLength(3);

    // 把手 2 (对应 points[1])
    const h2 = handles![1];
    expect(h2.prop).toBe('points');
    expect(h2.index).toBe(1);
    expect(h2.at).toEqual([140, 50]);

    // 拖动到舞台坐标 [240, 150]
    expect(h2.apply).toBeDefined();
    const nextProps = h2.apply!(props, [240, 150]);
    // 相对 at: [40, 50]，顶点新坐标应为 [200, 100]
    expect(nextProps.points).toEqual([
      [0, 0],
      [200, 100],
      [0, 100],
    ]);
    // 原属性不被破坏
    expect(nextProps.at).toEqual([40, 50]);
  });

  it('包围盒：包含顶点、边长文字、顶点字母、高和延长线、剪开线', () => {
    const props = {
      at: [100, 100],
      points: [
        [0, 0],
        [100, 0],
        [150, 80],
      ],
      sideLabels: ['top', '', ''],
      vertexLabels: ['A', 'B', 'C'],
      heights: [{ from: 3, to: 1 }],
      cut: [
        [10, 10],
        [80, 80],
      ],
    };
    const bbox = polygonPart.bbox(props);
    const L = polygonLayout(props);

    // 每一个有效顶点都必须严格在包围盒内
    for (const pt of L.points) {
      expect(pt[0]).toBeGreaterThanOrEqual(bbox.x);
      expect(pt[0]).toBeLessThanOrEqual(bbox.x + bbox.w);
      expect(pt[1]).toBeGreaterThanOrEqual(bbox.y);
      expect(pt[1]).toBeLessThanOrEqual(bbox.y + bbox.h);
    }

    // 边长文字位置在包围盒内
    const side1Pos = L.edges[0].labelPos;
    expect(side1Pos[0]).toBeGreaterThanOrEqual(bbox.x);
    expect(side1Pos[0]).toBeLessThanOrEqual(bbox.x + bbox.w);
    expect(side1Pos[1]).toBeGreaterThanOrEqual(bbox.y);
    expect(side1Pos[1]).toBeLessThanOrEqual(bbox.y + bbox.h);

    // 垂足在延长线上，也必须在包围盒内
    const footPt = L.heights[0].footPt;
    expect(footPt[0]).toBeGreaterThanOrEqual(bbox.x);
    expect(footPt[0]).toBeLessThanOrEqual(bbox.x + bbox.w);
    expect(footPt[1]).toBeGreaterThanOrEqual(bbox.y);
    expect(footPt[1]).toBeLessThanOrEqual(bbox.y + bbox.h);
  });

  it('子项：提供 v<n>、e<n>、a<n>', () => {
    const props = {
      points: [
        [100, 100],
        [200, 100],
        [100, 200],
      ],
      angles: [1],
      angleLabels: ['90°'],
    };
    const items = polygonPart.subitems?.(props);
    expect(items).toBeDefined();

    const names = items!.map((item) => item.name);
    expect(names).toContain('v1');
    expect(names).toContain('v2');
    expect(names).toContain('v3');
    expect(names).toContain('e1');
    expect(names).toContain('e2');
    expect(names).toContain('e3');
    expect(names).toContain('a1');
    expect(names).toContain('a2');
    expect(names).toContain('a3');

    // 顶点子项为 24x24 方块，中心在顶点
    const v1 = items!.find((item) => item.name === 'v1');
    expect(v1?.box).toEqual({ x: 100 - 12, y: 100 - 12, w: 24, h: 24 });

    // 边子项为边包围盒外扩 10
    const e1 = items!.find((item) => item.name === 'e1');
    expect(e1?.box).toEqual({
      x: 100 - 10,
      y: 100 - 10,
      w: 100 + 20,
      h: 0 + 20,
    });
  });

  it('直角符号 rightAngles 与角弧 angles 渲染', () => {
    const props = {
      points: [
        [100, 100],
        [200, 100],
        [100, 200],
      ],
      rightAngles: [1],
      angles: [2, 3],
      angleLabels: ['45°', '45°'],
    };
    const L = polygonLayout(props);
    expect(L.rightAngles).toHaveLength(1);
    expect(L.rightAngles[0].vertexIndex).toBe(0);
    expect(L.angles).toHaveLength(2);
    expect(L.angles[0].vertexIndex).toBe(1);
    expect(L.angles[0].label).toBe('45°');
    expect(L.angles[1].vertexIndex).toBe(2);
    expect(L.angles[1].label).toBe('45°');
  });

  it('顶点小于 3 时安全降级', () => {
    const emptyProps = { points: [] };
    const L = polygonLayout(emptyProps);
    expect(L.points).toEqual([]);
    expect(L.bbox).toBeDefined();

    const Render = polygonPart.Render as unknown as (a: { p: unknown; ctx: unknown }) => unknown;
    const renderEmpty = Render({ p: emptyProps, ctx: dummyCtx });
    expect(renderEmpty).toBeNull();
  });
});
