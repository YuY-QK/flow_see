import { describe, expect, it } from 'vitest';
import type { Theme } from '@flow-see/core';
import type { PartContext } from '../base';
import {
  INNER_FONT_SIZE,
  INNER_LABEL_INSET,
  MAJOR_TICK_LEN,
  MID_TICK_LEN,
  MINOR_TICK_LEN,
  OUTER_FONT_SIZE,
  OUTER_LABEL_INSET,
  ROTATE_HANDLE_OFFSET,
  protractorLayout,
  protractorPart,
  protractorPoint,
} from './protractor';

const dummyTheme: Theme = {
  id: 'flat',
  name: '扁平',
  stageBg: '#f4f7ff',
  stageBorder: '#dce5ff',
  ink: '#1f2433',
  dim: '#a9b6da',
  accent: '#2f5fe0',
  line: '#bfcbef',
  labelBg: '#dce5ff',
  palette: ['#2f5fe0', '#c25a00', '#1e7f4f'],
  elementInk: '#ffffff',
  radius: 14,
  font: 'sans-serif',
};

const dummyCtx: PartContext = { theme: dummyTheme };

describe('protractor 零件（任务卡 B15）', () => {
  describe('1. 外圈与内圈刻度及 30° 位置', () => {
    it('默认 181 条刻度线：每 1° 短线（8）、每 5° 中线（12）、每 10° 长线（18）', () => {
      const L = protractorLayout({ at: [400, 300], radius: 180 });
      expect(L.ticks).toHaveLength(181);

      const t0 = L.ticks[0];
      expect(t0.kind).toBe('major');
      expect(t0.length).toBe(MAJOR_TICK_LEN);
      expect(t0.outerPt[0]).toBeCloseTo(580);
      expect(t0.outerPt[1]).toBeCloseTo(300);
      expect(t0.innerPt[0]).toBeCloseTo(580 - 18);
      expect(t0.innerPt[1]).toBeCloseTo(300);

      const t1 = L.ticks[1];
      expect(t1.kind).toBe('minor');
      expect(t1.length).toBe(MINOR_TICK_LEN);

      const t5 = L.ticks[5];
      expect(t5.kind).toBe('mid');
      expect(t5.length).toBe(MID_TICK_LEN);

      const t90 = L.ticks[90];
      expect(t90.kind).toBe('major');
      expect(t90.outerPt[0]).toBeCloseTo(400);
      expect(t90.outerPt[1]).toBeCloseTo(120);
      expect(t90.innerPt[0]).toBeCloseTo(400);
      expect(t90.innerPt[1]).toBeCloseTo(120 + 18);
    });

    it('外圈 30°（从右往左 0–180）与内圈 30°（从左往右 0–180）的坐标位置对称且准确', () => {
      const cx = 400;
      const cy = 300;
      const r = 180;
      const L = protractorLayout({ at: [cx, cy], radius: r });

      expect(L.outerLabels).toHaveLength(19);
      expect(L.innerLabels).toHaveLength(19);

      // 外圈 0 在右端 (0°)，外圈 180 在左端 (180°)
      const outer0 = L.outerLabels.find((l) => l.value === 0)!;
      const outer180 = L.outerLabels.find((l) => l.value === 180)!;
      expect(outer0.localDeg).toBe(0);
      expect(outer180.localDeg).toBe(180);
      expect(outer0.fontSize).toBe(OUTER_FONT_SIZE);

      // 内圈 0 在左端 (180°)，内圈 180 在右端 (0°)
      const inner0 = L.innerLabels.find((l) => l.value === 0)!;
      const inner180 = L.innerLabels.find((l) => l.value === 180)!;
      expect(inner0.localDeg).toBe(180);
      expect(inner180.localDeg).toBe(0);
      expect(inner0.fontSize).toBe(INNER_FONT_SIZE);

      // 外圈 30°：位于右侧 30° 方向，半径 r - OUTER_LABEL_INSET
      const outer30 = L.outerLabels.find((l) => l.value === 30)!;
      const outerR = r - OUTER_LABEL_INSET;
      expect(outer30.localDeg).toBe(30);
      expect(outer30.pos[0]).toBeCloseTo(cx + outerR * Math.cos((30 * Math.PI) / 180));
      expect(outer30.pos[1]).toBeCloseTo(cy - outerR * Math.sin((30 * Math.PI) / 180));
      expect(outer30.pos[0]).toBeGreaterThan(cx);
      expect(outer30.pos[1]).toBeLessThan(cy);

      // 内圈 30°：位于左侧 150° 方向，半径 r - INNER_LABEL_INSET
      const inner30 = L.innerLabels.find((l) => l.value === 30)!;
      const innerR = r - INNER_LABEL_INSET;
      expect(inner30.localDeg).toBe(150);
      expect(inner30.pos[0]).toBeCloseTo(cx + innerR * Math.cos((150 * Math.PI) / 180));
      expect(inner30.pos[1]).toBeCloseTo(cy - innerR * Math.sin((150 * Math.PI) / 180));
      expect(inner30.pos[0]).toBeLessThan(cx);
      expect(inner30.pos[1]).toBeLessThan(cy);

      // 外圈 30° 对应的弧面刻度外端点在 (cx + r*cos30°, cy - r*sin30°)
      const tick30 = L.ticks[30];
      expect(tick30.outerPt[0]).toBeCloseTo(cx + r * Math.cos(Math.PI / 6));
      expect(tick30.outerPt[1]).toBeCloseTo(cy - r * 0.5);
    });
  });

  describe('2. rotate 整体旋转与子项（center / zero.inner / zero.outer）', () => {
    it('rotate = 0 时子项位置准确', () => {
      const p = { at: [300, 360], radius: 200, rotate: 0 };
      const subs = protractorPart.subitems!(p);
      expect(subs.map((s) => s.name)).toEqual(['center', 'zero.inner', 'zero.outer']);

      const center = subs.find((s) => s.name === 'center')!;
      const zInner = subs.find((s) => s.name === 'zero.inner')!;
      const zOuter = subs.find((s) => s.name === 'zero.outer')!;

      expect(center.box.x + center.box.w / 2).toBeCloseTo(300);
      expect(center.box.y + center.box.h / 2).toBeCloseTo(360);

      // 内圈 0 在左端点 [100, 360]
      expect(zInner.box.x + zInner.box.w / 2).toBeCloseTo(100);
      expect(zInner.box.y + zInner.box.h / 2).toBeCloseTo(360);

      // 外圈 0 在右端点 [500, 360]
      expect(zOuter.box.x + zOuter.box.w / 2).toBeCloseTo(500);
      expect(zOuter.box.y + zOuter.box.h / 2).toBeCloseTo(360);
    });

    it('rotate = 30 与 rotate = -90 后刻度、最高点及子项随之绕中心点旋转', () => {
      const cx = 300;
      const cy = 240;
      const r = 120;

      // 逆时针转 30°：外圈 30° 转到世界角 60°，弧中点 apex 转到 120°
      const L30 = protractorLayout({ at: [cx, cy], radius: r, rotate: 30 });
      const expTick30 = protractorPoint(cx, cy, r, 60);
      expect(L30.ticks[30].outerPt[0]).toBeCloseTo(expTick30[0]);
      expect(L30.ticks[30].outerPt[1]).toBeCloseTo(expTick30[1]);

      const expApex30 = protractorPoint(cx, cy, r, 120);
      expect(L30.apex[0]).toBeCloseTo(expApex30[0]);
      expect(L30.apex[1]).toBeCloseTo(expApex30[1]);

      const subs30 = protractorPart.subitems!({ at: [cx, cy], radius: r, rotate: 30 });
      const zOuter30 = subs30.find((s) => s.name === 'zero.outer')!;
      const zInner30 = subs30.find((s) => s.name === 'zero.inner')!;
      const expRight30 = protractorPoint(cx, cy, r, 30);
      const expLeft30 = protractorPoint(cx, cy, r, 210);
      expect(zOuter30.box.x + zOuter30.box.w / 2).toBeCloseTo(expRight30[0]);
      expect(zOuter30.box.y + zOuter30.box.h / 2).toBeCloseTo(expRight30[1]);
      expect(zInner30.box.x + zInner30.box.w / 2).toBeCloseTo(expLeft30[0]);
      expect(zInner30.box.y + zInner30.box.h / 2).toBeCloseTo(expLeft30[1]);

      // rotate = -90（顺时针转 90°，用于方位角测量：内圈 0 刻度线对准正北 [cx, cy - r]，半圆朝东）
      const LNeg90 = protractorLayout({ at: [cx, cy], radius: r, rotate: -90 });
      expect(LNeg90.leftEnd[0]).toBeCloseTo(cx);
      expect(LNeg90.leftEnd[1]).toBeCloseTo(cy - r);
      expect(LNeg90.apex[0]).toBeCloseTo(cx + r);
      expect(LNeg90.apex[1]).toBeCloseTo(cy);
    });
  });

  describe('3. scale 与 highlight 分支', () => {
    it('scale 控制显示 inner / outer / both 刻度数字', () => {
      const LOuter = protractorLayout({ scale: 'outer' });
      expect(LOuter.outerLabels).toHaveLength(19);
      expect(LOuter.innerLabels).toHaveLength(0);

      const LInner = protractorLayout({ scale: 'inner' });
      expect(LInner.outerLabels).toHaveLength(0);
      expect(LInner.innerLabels).toHaveLength(19);

      const LBoth = protractorLayout({ scale: 'both' });
      expect(LBoth.outerLabels).toHaveLength(19);
      expect(LBoth.innerLabels).toHaveLength(19);
    });

    it('highlight 支持 none / outer / inner / 具体度数刻度线', () => {
      const LNone = protractorLayout({ highlight: 'none' });
      expect(LNone.highlightLine).toBeUndefined();
      expect(LNone.outerLabels.every((l) => !l.highlighted)).toBe(true);
      expect(LNone.innerLabels.every((l) => !l.highlighted)).toBe(true);

      const LOuterHl = protractorLayout({ highlight: 'outer' });
      expect(LOuterHl.highlightLine).toBeUndefined();
      expect(LOuterHl.outerLabels.every((l) => l.highlighted)).toBe(true);
      expect(LOuterHl.innerLabels.every((l) => !l.highlighted)).toBe(true);

      const LInnerHl = protractorLayout({ highlight: 'inner' });
      expect(LInnerHl.highlightLine).toBeUndefined();
      expect(LInnerHl.innerLabels.every((l) => l.highlighted)).toBe(true);
      expect(LInnerHl.outerLabels.every((l) => !l.highlighted)).toBe(true);

      // 数值度数高亮：从中心画一条到该刻度的 accent 线
      const LDeg = protractorLayout({ at: [300, 300], radius: 200, rotate: 15, highlight: 60 });
      expect(LDeg.highlightLine).toBeDefined();
      expect(LDeg.highlightLine!.from).toEqual([300, 300]);
      const expTo = protractorPoint(300, 300, 200, 75);
      expect(LDeg.highlightLine!.to[0]).toBeCloseTo(expTo[0]);
      expect(LDeg.highlightLine!.to[1]).toBeCloseTo(expTo[1]);

      // scale = inner 时数值高亮指向内圈该度数位置
      const LInnerDeg = protractorLayout({
        at: [300, 300],
        radius: 200,
        scale: 'inner',
        highlight: 30,
      });
      const expInnerTo = protractorPoint(300, 300, 200, 150);
      expect(LInnerDeg.highlightLine!.to[0]).toBeCloseTo(expInnerTo[0]);
      expect(LInnerDeg.highlightLine!.to[1]).toBeCloseTo(expInnerTo[1]);
    });

    it('Render 在各 highlight 模式下正确输出 React VNode 结构', () => {
      const Render = protractorPart.Render as unknown as (a: {
        p: unknown;
        ctx: unknown;
      }) => { type: string; props: { children: unknown } };

      const vnodeRing = Render({
        p: { at: [400, 300], radius: 180, highlight: 'outer' },
        ctx: dummyCtx,
      });
      expect(vnodeRing.type).toBe('g');
      const ringJson = JSON.stringify(vnodeRing);
      expect(ringJson).toContain(dummyTheme.accent);
      expect(ringJson).toContain('"fillOpacity":0.85');

      const vnodeLine = Render({
        p: { at: [400, 300], radius: 180, highlight: 65 },
        ctx: dummyCtx,
      });
      const lineJson = JSON.stringify(vnodeLine);
      expect(lineJson).toContain(`"stroke":"${dummyTheme.accent}"`);
      expect(lineJson).toContain('"strokeWidth":3');
    });
  });

  describe('4. 把手（rotate valueAt 与 at apply）及包围盒', () => {
    it('rotate 把手位于弧最高点外侧 20px，valueAt 正确逆解各方向角度', () => {
      const p = { at: [400, 300], radius: 180, rotate: 0 };
      const handles = protractorPart.handles!(p);
      expect(handles).toHaveLength(2);

      const rotHandle = handles.find((h) => h.prop === 'rotate')!;
      expect(rotHandle.kind).toBe('rotate');
      expect(rotHandle.center).toEqual([400, 300]);
      expect(rotHandle.at[0]).toBeCloseTo(400);
      expect(rotHandle.at[1]).toBeCloseTo(300 - 180 - ROTATE_HANDLE_OFFSET);

      // 正上方 -> rotate = 0
      expect(rotHandle.valueAt([400, 100])).toBe(0);
      // 逆时针偏 30°（120° 方向）-> rotate = 30
      expect(rotHandle.valueAt(protractorPoint(400, 300, 200, 120))).toBeCloseTo(30);
      // 正左方（180° 方向）-> rotate = 90
      expect(rotHandle.valueAt([200, 300])).toBe(90);
      // 正右方（0° 方向）-> rotate = -90
      expect(rotHandle.valueAt([600, 300])).toBe(-90);
      // 正下方（-90° 方向）-> rotate = 180
      expect(rotHandle.valueAt([400, 500])).toBe(180);
      // 指针与中心重合 -> 保持当前 rotate
      const rotHandle25 = protractorPart.handles!({ at: [400, 300], rotate: 25 })[0];
      expect(rotHandle25.valueAt([400, 300])).toBe(25);
    });

    it('at 把手通过 apply 拖动整体位置并保留其他属性', () => {
      const p = { at: [500, 300], radius: 200, rotate: 30 };
      const atHandle = protractorPart.handles!(p).find((h) => h.prop === 'at')!;
      expect(atHandle.kind).toBe('drag');
      expect(atHandle.at).toEqual([500, 300]);
      expect(atHandle.apply).toBeDefined();

      const updated = atHandle.apply!(p, [300.4, 359.6]);
      expect(updated.at).toEqual([300, 360]);
      expect(updated.radius).toBe(200);
      expect(updated.rotate).toBe(30);

      // 空属性输入也正常返回圆整后的 at
      expect(atHandle.apply!({}, [250.2, 199.8])).toEqual({ at: [250, 200] });
    });

    it('bbox 准确覆盖旋转前后的半圆与底边端点', () => {
      const b0 = protractorPart.bbox({ at: [400, 300], radius: 180, rotate: 0 });
      expect(b0.x).toBeLessThanOrEqual(220);
      expect(b0.x + b0.w).toBeGreaterThanOrEqual(580);
      expect(b0.y).toBeLessThanOrEqual(120);
      expect(b0.y + b0.h).toBeGreaterThanOrEqual(300);
      // 未旋转时下半圆为空，底边下方仅留少量十字和描边余量
      expect(b0.y + b0.h).toBeLessThanOrEqual(312);

      const b30 = protractorPart.bbox({ at: [400, 300], radius: 180, rotate: 30 });
      const L30 = protractorLayout({ at: [400, 300], radius: 180, rotate: 30 });
      expect(L30.leftEnd[1]).toBeLessThanOrEqual(b30.y + b30.h);
      expect(L30.rightEnd[0]).toBeLessThanOrEqual(b30.x + b30.w);
      expect(b30.y).toBeLessThanOrEqual(120);
    });
  });
});
