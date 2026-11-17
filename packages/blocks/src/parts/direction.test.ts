import { describe, expect, it } from 'vitest';
import type { Theme } from '@flow-see/core';
import type { PartContext } from '../base';
import {
  directionLayout,
  directionPart,
  directionPoint,
  COMPASS_LABEL_GAP,
  type DirectionTarget,
} from './direction';

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

const renderTree = (p: Record<string, unknown>) =>
  (directionPart.Render as unknown as (args: { p: unknown; ctx: unknown }) => unknown)({
    p,
    ctx: dummyCtx,
  });

describe('B17 方向标与方位图 (direction)', () => {
  describe('1. 基础几何换算函数 directionPoint', () => {
    it('0° 正北：y 向上减小', () => {
      const [x, y] = directionPoint(200, 200, 100, 0);
      expect(x).toBeCloseTo(200, 5);
      expect(y).toBeCloseTo(100, 5);
    });

    it('90° 正东：x 向右增加', () => {
      const [x, y] = directionPoint(200, 200, 100, 90);
      expect(x).toBeCloseTo(300, 5);
      expect(y).toBeCloseTo(200, 5);
    });

    it('180° 正南：y 向下增加', () => {
      const [x, y] = directionPoint(200, 200, 100, 180);
      expect(x).toBeCloseTo(200, 5);
      expect(y).toBeCloseTo(300, 5);
    });

    it('270° 正西：x 向左减小', () => {
      const [x, y] = directionPoint(200, 200, 100, 270);
      expect(x).toBeCloseTo(100, 5);
      expect(y).toBeCloseTo(200, 5);
    });

    it('45° 东北：x 和 y 的增减量相等', () => {
      const [x, y] = directionPoint(200, 200, 100, 45);
      const delta = 100 * Math.SQRT1_2;
      expect(x).toBeCloseTo(200 + delta, 5);
      expect(y).toBeCloseTo(200 - delta, 5);
    });
  });

  describe('2. compass 模式下 8 个方向文字的几何坐标', () => {
    it('计算 8 个方向文字的几何坐标（位于 radius + 16 处）', () => {
      const cx = 300;
      const cy = 250;
      const radius = 120;
      const L = directionLayout({
        at: [cx, cy],
        radius,
        mode: 'compass',
      });

      expect(L.dirLabels).toHaveLength(8);
      const labelDist = radius + COMPASS_LABEL_GAP; // 136

      const dirMap = new Map(L.dirLabels.map((item) => [item.key, item]));

      // 验证北、东、南、西
      const north = dirMap.get('N')!;
      expect(north.pos[0]).toBeCloseTo(cx, 5);
      expect(north.pos[1]).toBeCloseTo(cy - labelDist, 5);
      expect(north.isMajor).toBe(true);
      expect(north.text).toBe('北');
      expect(north.colorKey).toBe('red');

      const east = dirMap.get('E')!;
      expect(east.pos[0]).toBeCloseTo(cx + labelDist, 5);
      expect(east.pos[1]).toBeCloseTo(cy, 5);
      expect(east.isMajor).toBe(true);
      expect(east.text).toBe('东');
      expect(east.colorKey).toBe('ink');

      const south = dirMap.get('S')!;
      expect(south.pos[0]).toBeCloseTo(cx, 5);
      expect(south.pos[1]).toBeCloseTo(cy + labelDist, 5);
      expect(south.isMajor).toBe(true);
      expect(south.text).toBe('南');

      const west = dirMap.get('W')!;
      expect(west.pos[0]).toBeCloseTo(cx - labelDist, 5);
      expect(west.pos[1]).toBeCloseTo(cy, 5);
      expect(west.isMajor).toBe(true);
      expect(west.text).toBe('西');

      // 验证副方向（东北、东南、西南、西北）
      const delta = labelDist * Math.SQRT1_2;
      const ne = dirMap.get('NE')!;
      expect(ne.pos[0]).toBeCloseTo(cx + delta, 5);
      expect(ne.pos[1]).toBeCloseTo(cy - delta, 5);
      expect(ne.isMajor).toBe(false);
      expect(ne.text).toBe('东北');

      const se = dirMap.get('SE')!;
      expect(se.pos[0]).toBeCloseTo(cx + delta, 5);
      expect(se.pos[1]).toBeCloseTo(cy + delta, 5);
      expect(se.isMajor).toBe(false);
      expect(se.text).toBe('东南');

      const sw = dirMap.get('SW')!;
      expect(sw.pos[0]).toBeCloseTo(cx - delta, 5);
      expect(sw.pos[1]).toBeCloseTo(cy + delta, 5);
      expect(sw.isMajor).toBe(false);
      expect(sw.text).toBe('西南');

      const nw = dirMap.get('NW')!;
      expect(nw.pos[0]).toBeCloseTo(cx - delta, 5);
      expect(nw.pos[1]).toBeCloseTo(cy - delta, 5);
      expect(nw.isMajor).toBe(false);
      expect(nw.text).toBe('西北');
    });

    it('主方向长箭头尖端在 radius 处，副方向短箭头尖端在 radius * 0.68 处', () => {
      const L = directionLayout({
        at: [200, 200],
        radius: 100,
        mode: 'compass',
      });

      expect(L.compassArrows).toHaveLength(8);
      const arrowMap = new Map(L.compassArrows!.map((a) => [a.key, a]));

      const nArrow = arrowMap.get('N')!;
      expect(nArrow.tip[0]).toBeCloseTo(200, 5);
      expect(nArrow.tip[1]).toBeCloseTo(100, 5); // 200 - 100
      expect(nArrow.colorKey).toBe('red');

      const neArrow = arrowMap.get('NE')!;
      const minorLen = 100 * 0.68;
      const minorDelta = minorLen * Math.SQRT1_2;
      expect(neArrow.tip[0]).toBeCloseTo(200 + minorDelta, 5);
      expect(neArrow.tip[1]).toBeCloseTo(200 - minorDelta, 5);
    });

    it('支持自定义 labels', () => {
      const L = directionLayout({
        at: [200, 200],
        radius: 100,
        labels: { N: 'North', E: 'East' },
      });
      const dirMap = new Map(L.dirLabels.map((item) => [item.key, item.text]));
      expect(dirMap.get('N')).toBe('North');
      expect(dirMap.get('E')).toBe('East');
      expect(dirMap.get('S')).toBe('南'); // 继承默认 site.yaml 配置
    });
  });

  describe('3. pointer = 90 指向正东及把手交互', () => {
    it('pointer = 90 时指针尖端位于正东方向', () => {
      const cx = 400;
      const cy = 250;
      const radius = 100;
      const L = directionLayout({
        at: [cx, cy],
        radius,
        pointer: 90,
        showPointer: true,
      });

      const pointerLen = radius * 0.85; // 85
      expect(L.pointerTip[0]).toBeCloseTo(cx + pointerLen, 5);
      expect(L.pointerTip[1]).toBeCloseTo(cy, 5);
    });

    it('pointer 把手：位置在指针尖端，支持顺时针拖动计算角度', () => {
      const cx = 300;
      const cy = 200;
      const radius = 120;
      const handles = directionPart.handles!({
        at: [cx, cy],
        radius,
        pointer: 90,
        showPointer: true,
      });

      expect(handles).toHaveLength(1);
      const h = handles[0];
      expect(h.prop).toBe('pointer');
      expect(h.kind).toBe('rotate');
      expect(h.center).toEqual([cx, cy]);
      expect(h.at[0]).toBeCloseTo(cx + radius * 0.85, 5);
      expect(h.at[1]).toBeCloseTo(cy, 5);

      // 验证 valueAt 计算
      // 拖到正东
      expect(h.valueAt([cx + 100, cy])).toBe(90);
      // 拖到正北
      expect(h.valueAt([cx, cy - 100])).toBe(0);
      // 拖到正南
      expect(h.valueAt([cx, cy + 100])).toBe(180);
      // 拖到正西
      expect(h.valueAt([cx - 100, cy])).toBe(270);
      // 拖到西南 225°
      expect(h.valueAt([cx - 100, cy + 100])).toBeCloseTo(225, 2);
    });

    it('showPointer = false 时不提供 handles', () => {
      const handles = directionPart.handles!({
        at: [200, 200],
        radius: 100,
        pointer: 90,
        showPointer: false,
      });
      expect(handles).toHaveLength(0);
    });
  });

  describe('4. clock 模式 3 点钟方向对应角度（90°）与刻度位置', () => {
    it('clock 模式 3 点钟对应 90°，刻度线与数字位置精确', () => {
      const cx = 250;
      const cy = 220;
      const radius = 140;
      const L = directionLayout({
        at: [cx, cy],
        radius,
        mode: 'clock',
      });

      expect(L.clockTicks).toHaveLength(12);
      expect(L.clockNumbers).toHaveLength(12);

      const tick3 = L.clockTicks!.find((t) => t.hour === 3)!;
      expect(tick3.deg).toBe(90);
      expect(tick3.isMajor).toBe(true);
      // 3 点钟外端在正东
      expect(tick3.outer[0]).toBeCloseTo(cx + radius, 5);
      expect(tick3.outer[1]).toBeCloseTo(cy, 5);
      // 3 点钟内端
      expect(tick3.inner[0]).toBeCloseTo(cx + radius - 12, 5);
      expect(tick3.inner[1]).toBeCloseTo(cy, 5);

      const num3 = L.clockNumbers!.find((n) => n.hour === 3)!;
      expect(num3.deg).toBe(90);
      const numDist = radius - 24; // 116
      expect(num3.pos[0]).toBeCloseTo(cx + numDist, 5);
      expect(num3.pos[1]).toBeCloseTo(cy, 5);

      // 验证 12 点钟（0°，正上方）
      const tick12 = L.clockTicks!.find((t) => t.hour === 12)!;
      expect(tick12.deg).toBe(360);
      expect(tick12.outer[0]).toBeCloseTo(cx, 5);
      expect(tick12.outer[1]).toBeCloseTo(cy - radius, 5);
    });

    it('clock 模式子项包含 dir.1 到 dir.12', () => {
      const subitems = directionPart.subitems!({
        at: [200, 200],
        radius: 100,
        mode: 'clock',
      });

      for (let h = 1; h <= 12; h++) {
        const sub = subitems.find((s) => s.name === `dir.${h}`);
        expect(sub).toBeDefined();
        expect(sub?.value).toBe(h);
      }
    });
  });

  describe('5. target 目标的极坐标到笛卡尔坐标换算', () => {
    it('极坐标 (bearing, distance) 精确转换为笛卡尔坐标 (x, y)', () => {
      const cx = 580;
      const cy = 230;
      const targets: DirectionTarget[] = [
        { bearing: 0, distance: 150, asset: 'library', label: '图书馆' },
        { bearing: 45, distance: 150, asset: 'park', label: '公园' },
        { bearing: 90, distance: 150, asset: 'shop', label: '商店' },
        { bearing: 180, distance: 150, asset: 'school', label: '学校' },
        { bearing: 225, distance: 150, asset: 'zoo', label: '动物园' },
        { bearing: 270, distance: 150, asset: 'cinema', label: '电影院' },
      ];

      const L = directionLayout({
        at: [cx, cy],
        radius: 150,
        targets,
      });

      expect(L.targets).toHaveLength(6);

      // 0° 正北
      expect(L.targets[0].pos[0]).toBeCloseTo(cx, 5);
      expect(L.targets[0].pos[1]).toBeCloseTo(cy - 150, 5);
      expect(L.targets[0].label).toBe('图书馆');

      // 45° 东北
      const d45 = 150 * Math.SQRT1_2;
      expect(L.targets[1].pos[0]).toBeCloseTo(cx + d45, 5);
      expect(L.targets[1].pos[1]).toBeCloseTo(cy - d45, 5);

      // 90° 正东
      expect(L.targets[2].pos[0]).toBeCloseTo(cx + 150, 5);
      expect(L.targets[2].pos[1]).toBeCloseTo(cy, 5);

      // 180° 正南
      expect(L.targets[3].pos[0]).toBeCloseTo(cx, 5);
      expect(L.targets[3].pos[1]).toBeCloseTo(cy + 150, 5);

      // 225° 西南
      expect(L.targets[4].pos[0]).toBeCloseTo(cx - d45, 5);
      expect(L.targets[4].pos[1]).toBeCloseTo(cy + d45, 5);

      // 270° 正西
      expect(L.targets[5].pos[0]).toBeCloseTo(cx - 150, 5);
      expect(L.targets[5].pos[1]).toBeCloseTo(cy, 5);
    });

    it('target 包围盒覆盖素材图标和文字', () => {
      const cx = 300;
      const cy = 200;
      const L = directionLayout({
        at: [cx, cy],
        targets: [{ bearing: 90, distance: 100, label: '公园' }],
      });

      const tgt = L.targets[0];
      expect(tgt.box.x).toBeLessThanOrEqual(tgt.pos[0] - 28);
      expect(tgt.box.x + tgt.box.w).toBeGreaterThanOrEqual(tgt.pos[0] + 28);
      expect(tgt.box.y).toBeLessThanOrEqual(tgt.pos[1] - 28);
      expect(tgt.box.y + tgt.box.h).toBeGreaterThan(tgt.pos[1] + 28); // 包含下方文字
    });
  });

  describe('6. scaleBar 几何布局', () => {
    it('左下角线段比例尺长 px，两端带短竖线，上方标注 0 与 km 千米', () => {
      const cx = 300;
      const cy = 240;
      const radius = 160;
      const L = directionLayout({
        at: [cx, cy],
        radius,
        scaleBar: { km: 2, px: 80 },
      });

      expect(L.scaleBar).toBeDefined();
      const sb = L.scaleBar!;
      expect(sb.km).toBe(2);
      expect(sb.px).toBe(80);

      // 起点在左下角 (cx - radius, cy + radius + 20)
      const expectedStartX = cx - radius;
      const expectedStartY = cy + radius + 20;

      expect(sb.line[0][0]).toBe(expectedStartX);
      expect(sb.line[0][1]).toBe(expectedStartY);
      expect(sb.line[1][0]).toBe(expectedStartX + 80);
      expect(sb.line[1][1]).toBe(expectedStartY);

      // 竖线长 8px (上下各 4)
      expect(sb.leftTick[0][1]).toBe(expectedStartY - 4);
      expect(sb.leftTick[1][1]).toBe(expectedStartY + 4);
      expect(sb.rightTick[0][1]).toBe(expectedStartY - 4);
      expect(sb.rightTick[1][1]).toBe(expectedStartY + 4);

      // 文字
      expect(sb.leftText).toBe('0');
      expect(sb.rightText).toBe('2 千米');
    });
  });

  describe('7. bearing 模式与方位角弧', () => {
    it('bearing 模式下十字标线与正北起始的角弧', () => {
      const cx = 300;
      const cy = 240;
      const radius = 160;
      const L = directionLayout({
        at: [cx, cy],
        radius,
        mode: 'bearing',
        bearing: 30,
      });

      expect(L.bearingCross).toBeDefined();
      expect(L.bearingCross!.ns[0][1]).toBe(cy - radius); // 北
      expect(L.bearingCross!.ns[1][1]).toBe(cy + radius); // 南

      expect(L.bearingArc).toBeDefined();
      expect(L.bearingArc!.sweep).toBe(1); // 北偏东顺时针
      expect(L.bearingArc!.text).toBe('30°');
    });

    it('bearing 负角度表示北偏西，逆时针画弧 (sweep = 0)', () => {
      const L = directionLayout({
        at: [300, 240],
        radius: 160,
        mode: 'bearing',
        bearing: -45,
      });

      expect(L.bearingArc).toBeDefined();
      expect(L.bearingArc!.sweep).toBe(0);
      expect(L.bearingArc!.text).toBe('45°');
    });
  });

  describe('8. 子项查询与包围盒验证', () => {
    it('compass 模式提供 8 个方向子项及 target.<n> 子项', () => {
      const subitems = directionPart.subitems!({
        at: [400, 225],
        radius: 120,
        mode: 'compass',
        targets: [
          { bearing: 0, distance: 150, label: '地点1' },
          { bearing: 45, distance: 150, label: '地点2' },
        ],
      });

      const names = subitems.map((s) => s.name);
      expect(names).toContain('dir.N');
      expect(names).toContain('dir.NE');
      expect(names).toContain('dir.E');
      expect(names).toContain('dir.SE');
      expect(names).toContain('dir.S');
      expect(names).toContain('dir.SW');
      expect(names).toContain('dir.W');
      expect(names).toContain('dir.NW');
      expect(names).toContain('target.1');
      expect(names).toContain('target.2');

      // 验证包围盒有效性
      for (const s of subitems) {
        expect(s.box.w).toBeGreaterThan(0);
        expect(s.box.h).toBeGreaterThan(0);
      }
    });

    it('总体 bbox 包含罗盘、所有目标以及比例尺', () => {
      const cx = 300;
      const cy = 240;
      const radius = 100;
      const bbox = directionPart.bbox({
        at: [cx, cy],
        radius,
        targets: [{ bearing: 90, distance: 200, label: '远方' }],
        scaleBar: { km: 5, px: 100 },
      });

      // 远方 target 在 x = 300 + 200 = 500
      expect(bbox.x + bbox.w).toBeGreaterThan(500);
      // scaleBar 在 y = 240 + 100 + 20 = 360
      expect(bbox.y + bbox.h).toBeGreaterThan(360);
      // 左边界包含 x = 300 - 100 = 200
      expect(bbox.x).toBeLessThan(200);
    });
  });

  describe('9. Render 渲染结构验证', () => {
    it('compass 模式渲染出外圈细圆、箭头组与指针', () => {
      const vnode = renderTree({
        at: [200, 200],
        radius: 100,
        mode: 'compass',
        pointer: 45,
      });

      expect(vnode).toBeDefined();
    });

    it('clock 模式渲染出钟面刻度与数字', () => {
      const vnode = renderTree({
        at: [200, 200],
        radius: 100,
        mode: 'clock',
      });

      expect(vnode).toBeDefined();
    });

    it('bearing 模式渲染出十字标线和角弧', () => {
      const vnode = renderTree({
        at: [200, 200],
        radius: 100,
        mode: 'bearing',
        bearing: 30,
      });

      expect(vnode).toBeDefined();
    });
  });
});
