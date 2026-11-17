import { describe, expect, it } from 'vitest';
import type { Theme } from '@flow-see/core';
import type { PartContext } from '../base';
import {
  balanceDialAngle,
  balanceLayout,
  balancePart,
  balanceTilt,
} from './balance';

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

describe('B9 balance (天平 / 秤零件)', () => {
  describe('tilt 角度数学计算', () => {
    it('左右重量相同时处于完全水平状态 (tilt = 0)', () => {
      expect(balanceTilt(0, 0)).toBe(0);
      expect(balanceTilt(5, 5)).toBe(0);
      expect(balanceTilt(100, 100)).toBe(0);
      expect(balanceTilt(2.5, 2.5)).toBe(0);
    });

    it('右边重时向右下倾斜 (tilt > 0)', () => {
      // tilt = maxTilt * clamp((right - left) / Math.max(left, right, 1), -1, 1)
      // right = 2, left = 0 => denom = 2, raw = 1 => 15 * 1 = 15
      expect(balanceTilt(0, 2, 15)).toBe(15);
      // right = 3, left = 1 => denom = 3, raw = 2/3 => 15 * (2/3) = 10
      expect(balanceTilt(1, 3, 15)).toBeCloseTo(10, 5);
      // right = 4, left = 2 => denom = 4, raw = 2/4 = 0.5 => 15 * 0.5 = 7.5
      expect(balanceTilt(2, 4, 15)).toBeCloseTo(7.5, 5);
    });

    it('左边重时向左下倾斜 (tilt < 0)', () => {
      expect(balanceTilt(2, 0, 15)).toBe(-15);
      expect(balanceTilt(3, 1, 15)).toBeCloseTo(-10, 5);
      expect(balanceTilt(4, 2, 15)).toBeCloseTo(-7.5, 5);
    });

    it('支持自定义 maxTilt 参数', () => {
      expect(balanceTilt(0, 10, 20)).toBe(20);
      expect(balanceTilt(10, 0, 20)).toBe(-20);
      expect(balanceTilt(1, 3, 30)).toBeCloseTo(20, 5);
    });

    it('极大极小值与 clamp 保护', () => {
      // 差值极大时受 clamp(-1, 1) 限制不超过 maxTilt
      expect(balanceTilt(0, 1000, 15)).toBe(15);
      expect(balanceTilt(1000, 0, 15)).toBe(-15);
      // 分母保底至少为 1
      expect(balanceTilt(0, 0.5, 15)).toBe(7.5);
    });
  });

  describe('beam 托盘天平布局与完全水平状态', () => {
    it('left === right 时横梁完全水平，指针垂直向上', () => {
      const layout = balanceLayout({
        kind: 'beam',
        at: [400, 360],
        width: 360,
        left: 5,
        right: 5,
      });

      expect(layout.tilt).toBe(0);
      expect(layout.beam).toBeDefined();
      if (!layout.beam) return;

      // 左右端点 y 坐标必须相等
      expect(layout.beam.leftPivot[1]).toBeCloseTo(layout.beam.rightPivot[1], 5);
      // 左右端点 x 坐标关于中心对称
      expect(layout.beam.leftPivot[0]).toBeCloseTo(400 - 180, 5);
      expect(layout.beam.rightPivot[0]).toBeCloseTo(400 + 180, 5);
      // 左右托盘上表面 y 坐标相等
      expect(layout.beam.leftPanTopY).toBeCloseTo(layout.beam.rightPanTopY, 5);
      // 指针尖端 x 坐标与 pivot[0] 相同（垂直向上）
      expect(layout.beam.pointerTip[0]).toBeCloseTo(400, 5);
      expect(layout.beam.pointerTip[1]).toBeLessThan(layout.beam.pivot[1]);
    });

    it('右边重时右端点向下、左端点向上', () => {
      const layout = balanceLayout({
        kind: 'beam',
        at: [400, 360],
        width: 360,
        left: 1,
        right: 3,
        maxTilt: 15,
      });

      expect(layout.tilt).toBeGreaterThan(0);
      if (!layout.beam) return;

      // 右端点 y 变大（下沉），左端点 y 变小（上升）
      expect(layout.beam.rightPivot[1]).toBeGreaterThan(layout.beam.pivot[1]);
      expect(layout.beam.leftPivot[1]).toBeLessThan(layout.beam.pivot[1]);
      expect(layout.beam.rightPanTopY).toBeGreaterThan(layout.beam.leftPanTopY);
      // 指针随横梁顺时针偏转（x 偏向右侧）
      expect(layout.beam.pointerTip[0]).toBeGreaterThan(layout.beam.pivot[0]);
    });
  });

  describe('seesaw 跷跷板布局', () => {
    it('跷跷板 left === right 时木板水平，tilt = 0', () => {
      const layout = balanceLayout({
        kind: 'seesaw',
        at: [400, 360],
        width: 420,
        left: 2,
        right: 2,
      });

      expect(layout.tilt).toBe(0);
      expect(layout.seesaw).toBeDefined();
      if (!layout.seesaw) return;
      expect(layout.seesaw.boardL).toBe(420);
    });

    it('跷跷板左边重时左沉右翘', () => {
      const layout = balanceLayout({
        kind: 'seesaw',
        at: [400, 360],
        width: 420,
        left: 5,
        right: 1,
      });

      expect(layout.tilt).toBeLessThan(0);
      // 左端子项包围盒的中心 y 应该低于或包含倾斜点
      expect(layout.leftBox.x).toBeLessThan(layout.rightBox.x);
    });
  });

  describe('dial 台秤指针角度计算与满量程测试', () => {
    it('balanceDialAngle 准确计算 0 到 max 量程的指针角度（0° 到 330°）', () => {
      expect(balanceDialAngle(0, 1000)).toBe(0);
      expect(balanceDialAngle(500, 1000)).toBe(165);
      expect(balanceDialAngle(1000, 1000)).toBe(330);
      expect(balanceDialAngle(250, 1000)).toBeCloseTo(82.5, 5);
      expect(balanceDialAngle(750, 1000)).toBeCloseTo(247.5, 5);
    });

    it('超出量程或负数时的 clamp 保护', () => {
      expect(balanceDialAngle(-50, 1000)).toBe(0);
      expect(balanceDialAngle(1500, 1000)).toBe(330);
    });

    it('dial 模式下生成 11 个大刻度并正确标注', () => {
      const layout = balanceLayout({
        kind: 'dial',
        at: [400, 360],
        width: 300,
        left: 600,
        max: 1000,
        unit: 'g',
      });

      expect(layout.dial).toBeDefined();
      if (!layout.dial) return;
      expect(layout.dial.ticks).toHaveLength(11);
      expect(layout.dial.ticks[0].val).toBe(0);
      expect(layout.dial.ticks[5].val).toBe(500);
      expect(layout.dial.ticks[10].val).toBe(1000);
      expect(layout.dialAngle).toBeCloseTo(198, 5); // 600 / 1000 * 330 = 198
    });
  });

  describe('包围盒 bbox 计算', () => {
    it('包围盒必须包含底座锚点 y', () => {
      const layout = balanceLayout({
        kind: 'beam',
        at: [400, 360],
        width: 360,
      });

      expect(layout.box.y + layout.box.h).toBeGreaterThanOrEqual(360);
      expect(layout.box.x).toBeLessThan(400);
      expect(layout.box.x + layout.box.w).toBeGreaterThan(400);
    });

    it('包围盒必须包含倾斜后的最低点与最高点', () => {
      const flatLayout = balanceLayout({
        kind: 'beam',
        at: [400, 360],
        width: 360,
        left: 0,
        right: 0,
      });

      const tiltedLayout = balanceLayout({
        kind: 'beam',
        at: [400, 360],
        width: 360,
        left: 0,
        right: 10,
        maxTilt: 15,
      });

      // 右倾时右托盘沉下，最低点的 y 应该变大（即 y + h 变大）
      expect(tiltedLayout.box.y + tiltedLayout.box.h).toBeGreaterThan(
        flatLayout.beam!.rightPanTopY,
      );
      // 必须完整包含右托盘
      expect(tiltedLayout.box.y + tiltedLayout.box.h).toBeGreaterThanOrEqual(
        tiltedLayout.rightBox.y + tiltedLayout.rightBox.h,
      );
      // 必须完整包含左托盘
      expect(tiltedLayout.box.y).toBeLessThanOrEqual(tiltedLayout.leftBox.y);
    });

    it('放入物品时包围盒必须包含所有物品', () => {
      const emptyLayout = balanceLayout({
        kind: 'beam',
        at: [400, 360],
        width: 360,
        leftItems: [],
        rightItems: [],
      });

      const withItemsLayout = balanceLayout({
        kind: 'beam',
        at: [400, 360],
        width: 360,
        leftItems: ['apple', 'apple', 'apple', 'apple'],
        rightItems: ['bear'],
      });

      // 放置物品后子项盒应该包含物品高度，顶部 y 向上抬高
      expect(withItemsLayout.leftBox.y).toBeLessThan(emptyLayout.leftBox.y);
      expect(withItemsLayout.leftBox.h).toBeGreaterThan(emptyLayout.leftBox.h);
      expect(withItemsLayout.box.y).toBeLessThanOrEqual(withItemsLayout.leftBox.y);
    });

    it('跷跷板放置多物品两层叠加时，包围盒准确包裹', () => {
      const layout = balanceLayout({
        kind: 'seesaw',
        at: [400, 360],
        width: 420,
        left: 3,
        right: 1,
        leftItems: ['bear', 'bear', 'bear', 'bear', 'bear'],
        rightItems: ['rabbit'],
      });

      expect(layout.seesaw?.leftItemsLocal).toHaveLength(5);
      expect(layout.box.w).toBeGreaterThan(400);
      expect(layout.leftBox.w).toBeGreaterThan(0);
      expect(layout.rightBox.w).toBeGreaterThan(0);
    });
  });

  describe('子项 subitems 规格', () => {
    it('subitems 正确提供 left 和 right 两个子项', () => {
      const p = {
        kind: 'beam',
        at: [400, 360],
        width: 360,
        left: 1,
        right: 2,
      };

      const subs = balancePart.subitems!(p);
      expect(subs).toHaveLength(2);
      expect(subs[0].name).toBe('left');
      expect(subs[1].name).toBe('right');
      expect(subs[0].box.w).toBeGreaterThan(0);
      expect(subs[1].box.w).toBeGreaterThan(0);
      // left 在舞台左侧，right 在舞台右侧
      expect(subs[0].box.x).toBeLessThan(subs[1].box.x);
    });
  });

  describe('Render 渲染测试', () => {
    it('Render beam 能正常生成 VNode，不报运行时错误', () => {
      const vnode = (balancePart.Render as unknown as (args: { p: unknown; ctx: unknown }) => unknown)({
        p: {
          kind: 'beam',
          at: [400, 360],
          width: 360,
          left: 2,
          right: 3,
          leftItems: ['apple'],
          rightItems: ['pear'],
        },
        ctx: dummyCtx,
      });

      expect(vnode).toBeTruthy();
    });

    it('Render seesaw 能正常生成 VNode', () => {
      const vnode = (balancePart.Render as unknown as (args: { p: unknown; ctx: unknown }) => unknown)({
        p: {
          kind: 'seesaw',
          at: [400, 360],
          width: 420,
          left: 3,
          right: 1,
          leftItems: ['bear'],
          rightItems: ['rabbit'],
        },
        ctx: dummyCtx,
      });

      expect(vnode).toBeTruthy();
    });

    it('Render dial 能正常生成 VNode', () => {
      const vnode = (balancePart.Render as unknown as (args: { p: unknown; ctx: unknown }) => unknown)({
        p: {
          kind: 'dial',
          at: [400, 360],
          width: 320,
          left: 500,
          max: 1000,
          unit: '克',
          leftItems: ['apple'],
        },
        ctx: dummyCtx,
      });

      expect(vnode).toBeTruthy();
    });
  });
});
