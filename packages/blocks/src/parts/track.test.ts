import { describe, expect, it } from 'vitest';
import { getTheme, type Theme } from '@flow-see/core';
import { checkScene } from '../../../templates/src/scene/check';
import { findSubitem, getPart, type PartContext, type Props } from '../index';
import {
  TRACK_ICON_SIZE,
  TRACK_LINE_WIDTH,
  TRACK_TRAVELED_WIDTH,
  trackLabelsOf,
  trackLayout,
  trackPart,
} from './track';

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

const renderWithTheme = (
  p: Props,
  theme: Theme = getTheme('flat'),
  assetUrl?: (id: string) => string | undefined,
) => {
  const ctx: PartContext = { theme, assetUrl };
  return (trackPart.Render as unknown as (args: { p: Props; ctx: PartContext }) => unknown)({
    p,
    ctx,
  });
};

describe('track 行程图零件（任务卡 B22）', () => {
  describe('1. 相遇时间计算与运动学截断', () => {
    it('正确计算相遇时间 meetTime = distance / (s1 + s2) 及相遇位置 meetPos', () => {
      const L = trackLayout({
        at: [100, 200],
        length: 600,
        distance: 500,
        movers: [
          { from: 0, speed: 60 },
          { from: 1, speed: 40 },
        ],
        t: 2,
      });

      expect(L.meetTime).toBeCloseTo(500 / (60 + 40), 8);
      expect(L.meetTime).toBe(5);
      expect(L.meetPos).toBeCloseTo(300, 8);
      expect(L.meetX).toBeCloseTo(100 + (300 / 500) * 600, 8);
      expect(L.hasMet).toBe(false);

      // t = 2 时各自位置与舞台 x 坐标
      expect(L.movers[0].pos).toBeCloseTo(120, 8);
      expect(L.movers[0].x).toBeCloseTo(100 + (120 / 500) * 600, 8);
      expect(L.movers[1].pos).toBeCloseTo(500 - 80, 8);
      expect(L.movers[1].x).toBeCloseTo(100 + (420 / 500) * 600, 8);
    });

    it('t 等于或超过相遇时间后，两人严格停在相遇点不穿过彼此', () => {
      const baseProps: Props = {
        at: [100, 200],
        length: 600,
        distance: 450,
        movers: [
          { from: 0, speed: '50', label: '50 米/分' },
          { from: 1, speed: '40', label: '40 米/分' },
        ],
      };

      // 相遇时刻 meetTime = 450 / 90 = 5，相遇点 = 250
      const atMeet = trackLayout({ ...baseProps, t: 5 });
      expect(atMeet.meetTime).toBe(5);
      expect(atMeet.hasMet).toBe(true);
      expect(atMeet.effectiveT).toBe(5);
      expect(atMeet.movers[0].pos).toBe(250);
      expect(atMeet.movers[1].pos).toBe(250);
      expect(atMeet.movers[0].x).toBe(atMeet.movers[1].x);

      // t = 8.5 超过相遇时间后，两人仍严格停在 250，已走路程分别为 250 和 200
      const pastMeet = trackLayout({ ...baseProps, t: 8.5 });
      expect(pastMeet.hasMet).toBe(true);
      expect(pastMeet.effectiveT).toBe(5);
      expect(pastMeet.movers[0].pos).toBe(250);
      expect(pastMeet.movers[1].pos).toBe(250);
      expect(pastMeet.movers[0].traveled).toBe(250);
      expect(pastMeet.movers[1].traveled).toBe(200);
      expect(pastMeet.movers[0].x).toBe(pastMeet.movers[1].x);
      expect(pastMeet.movers[0].x).toBeCloseTo(100 + (250 / 450) * 600, 8);
      // 垂直方向上下错开，避免重叠遮挡
      expect(pastMeet.movers[0].lane).toBe('top');
      expect(pastMeet.movers[1].lane).toBe('bottom');
      expect(Math.abs(pastMeet.movers[0].iconCenter[1] - pastMeet.movers[1].iconCenter[1])).toBeGreaterThanOrEqual(
        TRACK_ICON_SIZE + 30,
      );
    });

    it('单向运动时无相遇截断，到达终点后位置 clamp 在 [0, distance]', () => {
      const L1 = trackLayout({
        at: [50, 180],
        length: 400,
        distance: 200,
        movers: [{ from: 0, speed: 60 }],
        t: 5,
      });
      expect(L1.meetTime).toBeNull();
      expect(L1.movers[0].pos).toBe(200);
      expect(L1.movers[0].x).toBe(450);

      const L2 = trackLayout({
        at: [50, 180],
        length: 400,
        distance: 200,
        movers: [{ from: 1, speed: 70 }],
        t: 4,
      });
      expect(L2.meetTime).toBeNull();
      expect(L2.movers[0].pos).toBe(0);
      expect(L2.movers[0].x).toBe(50);
    });
  });

  describe('2. showGap 已走路程粗线与“还差”剩余距离', () => {
    it('未相遇时正确计算“还差”数值、坐标与两端已走路程标签', () => {
      const L = trackLayout({
        at: [100, 160],
        length: 600,
        distance: 500,
        unitText: '米',
        movers: [
          { from: 0, speed: 60 },
          { from: 1, speed: 40 },
        ],
        t: 1.5,
        showGap: true,
      });

      // 1.5 分钟：左走 90，右走 60（位置 440），中间还差 350 米
      expect(L.gap.visible).toBe(true);
      expect(L.gap.distance).toBeCloseTo(350, 8);
      expect(L.gap.startPos).toBeCloseTo(90, 8);
      expect(L.gap.endPos).toBeCloseTo(440, 8);
      expect(L.gap.x1).toBeCloseTo(100 + (90 / 500) * 600, 8);
      expect(L.gap.x2).toBeCloseTo(100 + (440 / 500) * 600, 8);
      expect(L.gap.label).toBe('还差 350 米');

      // 两人已走路程粗线与中点文字
      expect(L.movers[0].color).toBe('blue');
      expect(L.movers[1].color).toBe('orange');
      expect(L.movers[0].traveledLine).toBeDefined();
      expect(L.movers[0].traveledLine?.label).toBe('90米');
      expect(L.movers[0].traveledLine?.x1).toBe(100);
      expect(L.movers[0].traveledLine?.x2).toBeCloseTo(208, 8);
      expect(L.movers[0].traveledLine?.y).toBeLessThan(L.y0);

      expect(L.movers[1].traveledLine).toBeDefined();
      expect(L.movers[1].traveledLine?.label).toBe('60米');
      expect(L.movers[1].traveledLine?.x1).toBe(700);
      expect(L.movers[1].traveledLine?.x2).toBeCloseTo(628, 8);
      expect(L.movers[1].traveledLine?.y).toBeGreaterThan(L.y0);
    });

    it('相遇后 gap 距离为 0 且不再显示“还差”虚线；showGap: false 时隐藏路程线与还差', () => {
      const met = trackLayout({
        at: [100, 160],
        length: 600,
        distance: 500,
        movers: [
          { from: 0, speed: 60 },
          { from: 1, speed: 40 },
        ],
        t: 5,
        showGap: true,
      });
      expect(met.gap.distance).toBe(0);
      expect(met.gap.visible).toBe(false);
      expect(met.movers[0].traveledLine?.label).toBe('300米');
      expect(met.movers[1].traveledLine?.label).toBe('200米');

      const hiddenGap = trackLayout({
        at: [100, 160],
        length: 600,
        distance: 500,
        movers: [
          { from: 0, speed: 60 },
          { from: 1, speed: 40 },
        ],
        t: 2,
        showGap: false,
      });
      expect(hiddenGap.gap.visible).toBe(false);
      expect(hiddenGap.movers[0].traveledLine).toBeUndefined();
      expect(hiddenGap.movers[1].traveledLine).toBeUndefined();
    });
  });

  describe('3. marks 时刻刻度位置与标签', () => {
    it('为每个运动者在指定时刻位置生成竖标与分钟标签，支持自定义 labels', () => {
      const L = trackLayout({
        at: [100, 200],
        length: 600,
        distance: 500,
        movers: [
          { from: 0, speed: 60 },
          { from: 1, speed: 40 },
        ],
        t: 3,
        marks: [1, 2],
      });

      expect(L.marks).toHaveLength(4);
      const m1Top = L.marks.find((m) => m.moverIndex === 1 && m.minute === 1)!;
      const m1Bottom = L.marks.find((m) => m.moverIndex === 2 && m.minute === 1)!;
      const m2Top = L.marks.find((m) => m.moverIndex === 1 && m.minute === 2)!;
      const m2Bottom = L.marks.find((m) => m.moverIndex === 2 && m.minute === 2)!;

      expect(m1Top.pos).toBe(60);
      expect(m1Top.x).toBeCloseTo(172, 8);
      expect(m1Top.label).toBe('第 1 分');
      expect(m1Top.lane).toBe('top');

      expect(m1Bottom.pos).toBe(460);
      expect(m1Bottom.x).toBeCloseTo(652, 8);
      expect(m1Bottom.label).toBe('第 1 分');
      expect(m1Bottom.lane).toBe('bottom');

      expect(m2Top.pos).toBe(120);
      expect(m2Top.label).toBe('第 2 分');
      expect(m2Bottom.pos).toBe(420);
      expect(m2Bottom.label).toBe('第 2 分');

      // 自定义 labels 覆盖
      const customLabels = trackLabelsOf({
        labels: { gap: '距离 {d}{u}', minute: '{n}min' },
      });
      expect(customLabels.gap).toBe('距离 {d}{u}');
      expect(customLabels.minute).toBe('{n}min');
    });
  });

  describe('4. 包围盒 bbox 与子项 subitems 查询', () => {
    it('bbox 完整包裹跑道、两端地名、上下两层人物图标与文字、已走路程文字及 marks 文字', () => {
      const props: Props = {
        at: [100, 200],
        length: 600,
        distance: 500,
        ends: ['小明家', '小红家'],
        movers: [
          { from: 0, speed: 60, asset: 'boy', label: '60 米/分' },
          { from: 1, speed: 40, asset: 'girl', label: '40 米/分' },
        ],
        t: 2,
        showGap: true,
        marks: [1, 2],
      };

      const L = trackLayout(props);
      const partDef = getPart('track')!;
      expect(partDef).toBeDefined();
      const box = partDef.bbox({ ...partDef.defaults, ...props });
      expect(box).toEqual(L.bbox);

      const assertInsideBbox = (sub: { x: number; y: number; w: number; h: number }) => {
        expect(L.bbox.x).toBeLessThanOrEqual(sub.x);
        expect(L.bbox.y).toBeLessThanOrEqual(sub.y);
        expect(L.bbox.x + L.bbox.w).toBeGreaterThanOrEqual(sub.x + sub.w);
        expect(L.bbox.y + L.bbox.h).toBeGreaterThanOrEqual(sub.y + sub.h);
      };

      // 两端地名
      assertInsideBbox(L.ends[0].box);
      assertInsideBbox(L.ends[1].box);
      // 上下两层人物与标签
      assertInsideBbox(L.movers[0].iconBox);
      assertInsideBbox(L.movers[0].labelBox!);
      assertInsideBbox(L.movers[1].iconBox);
      assertInsideBbox(L.movers[1].labelBox!);
      // 已走路程文字与还差文字
      assertInsideBbox(L.movers[0].traveledLine!.labelBox);
      assertInsideBbox(L.movers[1].traveledLine!.labelBox);
      assertInsideBbox(L.gap.labelBox);
      // marks 文字
      for (const mk of L.marks) {
        assertInsideBbox(mk.labelBox);
      }
    });

    it('支持 mover.1、mover.2、mover.* 与 gap 子项查询，相遇后 gap 子项仍可查询', () => {
      const props: Props = {
        at: [100, 160],
        length: 600,
        distance: 500,
        movers: [
          { from: 0, speed: 60, label: '60 米/分' },
          { from: 1, speed: 40, label: '40 米/分' },
        ],
        t: 2,
      };

      const m1 = findSubitem(trackPart, props, 'mover.1') as
        | { name: string; value?: number; box: { w: number } }
        | undefined;
      const m2 = findSubitem(trackPart, props, 'mover.2') as
        | { name: string; value?: number; box: { w: number } }
        | undefined;
      const allMovers = findSubitem(trackPart, props, 'mover.*');
      const gapBefore = findSubitem(trackPart, props, 'gap') as
        | { name: string; value?: number; box: { w: number } }
        | undefined;

      expect(m1).toBeDefined();
      expect(m2).toBeDefined();
      expect(allMovers).toHaveLength(2);
      expect(m1?.value).toBe(120);
      expect(m2?.value).toBe(420);
      expect(gapBefore).toBeDefined();
      expect(gapBefore?.value).toBe(300);

      // 相遇后 gap 仍可查询且 value 为 0
      const gapAfter = findSubitem(trackPart, { ...props, t: 6 }, 'gap') as
        | { name: string; value?: number; box: { w: number } }
        | undefined;
      expect(gapAfter).toBeDefined();
      expect(gapAfter?.value).toBe(0);
      expect(gapAfter?.box.w).toBeGreaterThan(0);
    });
  });

  describe('5. SVG 渲染与多主题兼容', () => {
    it('支持 ctx.assetUrl 素材渲染与无素材圆形人物保底，兼容 4 套动画主题与 _subColors', () => {
      const themes = ['flat', 'chalk', 'cute', 'pro'] as const;
      for (const th of themes) {
        const treeWithAsset = renderWithTheme(
          {
            at: [100, 180],
            length: 600,
            distance: 500,
            movers: [
              { from: 0, speed: 60, asset: 'boy', label: '60 m/min' },
              { from: 1, speed: 40, asset: 'girl', label: '40 m/min' },
            ],
            t: 2,
            marks: [1],
            _subColors: { 'mover.1': 'red', gap: 'green' },
          },
          getTheme(th),
          (id) => `/assets/${id}.svg`,
        );
        const nodes = collectVNodes(treeWithAsset);
        const images = nodes.filter((n) => n.type === 'image');
        expect(images).toHaveLength(2);
        expect(images[0].props?.href).toBe('/assets/boy.svg');
        expect(images[1].props?.href).toBe('/assets/girl.svg');

        const lines = nodes.filter((n) => n.type === 'line');
        expect(lines.some((l) => l.props?.strokeWidth === TRACK_LINE_WIDTH)).toBe(true);
        expect(lines.some((l) => l.props?.strokeWidth === TRACK_TRAVELED_WIDTH)).toBe(true);
      }

      // 无素材时回退到圆形人物图标保底
      const treeFallback = renderWithTheme({
        at: [100, 180],
        length: 600,
        distance: 500,
        movers: [{ from: 0, speed: 50 }],
        t: 5,
      });
      const fallbackNodes = collectVNodes(treeFallback);
      expect(fallbackNodes.filter((n) => n.type === 'image')).toHaveLength(0);
      expect(fallbackNodes.filter((n) => n.type === 'circle').length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('6. checkScene 配置检查', () => {
    it('合法的 track 配置及带 {参数} 模板字符串通过检查', () => {
      const issues = checkScene({
        params: { v1: 60, v2: 40, t: 5 },
        derived: { s: '(v1 + v2) * t' },
        objects: [
          {
            id: 'tr',
            type: 'track',
            length: 600,
            distance: '{s}',
            unitText: '米',
            ends: ['小明家', '小红家'],
            movers: [
              { from: 0, speed: '{v1}', asset: 'boy', label: '{v1} 米/分' },
              { from: 1, speed: '{v2}', asset: 'girl', label: '{v2} 米/分' },
            ],
            t: 0,
            showGap: true,
            marks: [1, 2],
            at: [100, 160],
          },
        ],
        steps: [
          {
            say: '出发',
            do: [{ set: { target: 'tr', t: '{t}', duration: '2s', ease: 'linear' } }],
          },
        ],
      });
      expect(issues).toEqual([]);
    });

    it('拦截非法的 length、distance、t、ends 与 movers.from / speed', () => {
      const issues = checkScene({
        params: {},
        objects: [
          {
            id: 'tr',
            type: 'track',
            length: 0,
            distance: -100,
            t: -2,
            ends: ['只有一端'],
            movers: [
              { from: 2, speed: 50 },
              { from: 1, speed: -10 },
            ],
            at: [100, 160],
          },
        ],
        steps: [{ say: '测试', do: [{ highlight: 'tr' }] }],
      });

      expect(issues.some((i) => i.message.includes('length 必须大于 0'))).toBe(true);
      expect(issues.some((i) => i.message.includes('distance 必须大于 0'))).toBe(true);
      expect(issues.some((i) => i.message.includes('t 不能小于 0'))).toBe(true);
      expect(issues.some((i) => i.message.includes('ends 必须是包含两个地名'))).toBe(true);
      expect(issues.some((i) => i.message.includes('from 只能是 0'))).toBe(true);
      expect(issues.some((i) => i.message.includes('speed 必须是大于等于 0'))).toBe(true);
    });
  });
});
