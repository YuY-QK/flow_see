import { describe, expect, it } from 'vitest';
import type { Theme } from '@flow-see/core';
import { color, type PartContext } from '../base';
import { clockAngles, clockPart } from './math';

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
const renderTree = (p: Record<string, unknown>) =>
  (clockPart.Render as unknown as (args: { p: unknown; ctx: unknown }) => unknown)({
    p,
    ctx: dummyCtx,
  });

describe('X5 钟表扩展', () => {
  describe('秒针角度', () => {
    it('clockAngles 计算秒针角度（12 点方向为 0，顺时针，60 秒一圈 360°）', () => {
      expect(clockAngles(0, 0).second).toBe(0);
      expect(clockAngles(0, 15).second).toBe(90);
      expect(clockAngles(0, 30).second).toBe(180);
      expect(clockAngles(0, 45).second).toBe(270);
      expect(clockAngles(0, 59.999).second).toBeCloseTo(359.994, 2);
      expect(clockAngles(0, 60).second).toBe(0);
    });

    it('不传 seconds 时 second 属性为 undefined', () => {
      const angles = clockAngles(180);
      expect(angles.hour).toBe(90);
      expect(angles.minute).toBe(0);
      expect(angles.second).toBeUndefined();
    });

    it('Render 在写了 seconds 时画出秒针（细线，red，比分针长 10%，尾部有短配重）', () => {
      const redColor = color('red', dummyTheme);
      const vnodeWithSec = renderTree({ at: [200, 200], radius: 100, time: '3:00', seconds: 15 });

      // 提取所有 line
      const lines: Array<{ x1: number; y1: number; x2: number; y2: number; stroke: string; strokeWidth: number }> = [];
      const circles: Array<{ cx: number; cy: number; r: number; fill: string }> = [];

      function walk(node: any) {
        if (!node || typeof node !== 'object') return;
        if (node.type === 'line' && node.props) {
          lines.push(node.props);
        }
        if (node.type === 'circle' && node.props) {
          circles.push(node.props);
        }
        if (node.props?.children) {
          const ch = Array.isArray(node.props.children) ? node.props.children : [node.props.children];
          ch.forEach(walk);
        }
      }
      walk(vnodeWithSec);

      // 找到秒针的线（stroke 是 red，strokeWidth 是 2）
      const secLine = lines.find((l) => l.stroke === redColor && l.strokeWidth === 2);
      expect(secLine).toBeDefined();

      // 秒针指向 15 秒（90° 方向，x 向右）
      // 比分针 (100 * 0.78 = 78) 长 10% => 78 * 1.1 = 85.8
      // x2 应该在 200 + 85.8 = 285.8 左右
      expect(secLine!.x2).toBeCloseTo(285.8, 1);
      expect(secLine!.y2).toBeCloseTo(200, 1);

      // 尾部向相反方向（270° 方向，x 向左，尾长 100 * 0.2 = 20）
      // x1 应该在 200 - 20 = 180 左右
      expect(secLine!.x1).toBeCloseTo(180, 1);
      expect(secLine!.y1).toBeCloseTo(200, 1);

      // 检查尾部配重圆点
      const counterWeight = circles.find((c) => c.fill === redColor && c.r > 2 && c.r < 5 && c.cx < 200);
      expect(counterWeight).toBeDefined();
    });

    it('Render 在不写 seconds 时不画秒针', () => {
      const redColor = color('red', dummyTheme);
      const vnodeNoSec = renderTree({ at: [200, 200], radius: 100, time: '3:00' });

      const lines: any[] = [];
      function walk(node: any) {
        if (!node || typeof node !== 'object') return;
        if (node.type === 'line' && node.props) lines.push(node.props);
        if (node.props?.children) {
          const ch = Array.isArray(node.props.children) ? node.props.children : [node.props.children];
          ch.forEach(walk);
        }
      }
      walk(vnodeNoSec);

      const secLine = lines.find((l) => l.stroke === redColor);
      expect(secLine).toBeUndefined();
    });
  });

  describe('hour24 的 13 在 1 外面', () => {
    it('hour24 为 true 时画出 13–24，13 在 1 外面，24 在 12 外面，字号为 0.55 倍，dim 色', () => {
      const dimColor = color('dim', dummyTheme);
      const vnode24 = renderTree({ at: [200, 200], radius: 100, time: '0:00', hour24: true });

      const texts: Array<{ text: string; x: number; y: number; fontSize: number; fill: string }> = [];
      function walk(node: any) {
        if (!node) return;
        if (Array.isArray(node)) {
          node.forEach(walk);
          return;
        }
        if (typeof node !== 'object') return;
        if (node.type === 'text' && node.props) {
          texts.push({
            text: String(node.props.children),
            x: node.props.x,
            y: node.props.y,
            fontSize: node.props.fontSize,
            fill: node.props.fill,
          });
        }
        if (node.props?.children) {
          walk(node.props.children);
        }
      }
      walk(vnode24);

      // 共 24 个数字文本
      expect(texts).toHaveLength(24);

      const t1 = texts.find((t) => t.text === '1');
      const t13 = texts.find((t) => t.text === '13');
      const t12 = texts.find((t) => t.text === '12');
      const t24 = texts.find((t) => t.text === '24');

      expect(t1).toBeDefined();
      expect(t13).toBeDefined();
      expect(t12).toBeDefined();
      expect(t24).toBeDefined();

      // 13 与 1 都在 1 点钟方向（30°，x > 200, y < 200）
      expect(t1!.x).toBeGreaterThan(200);
      expect(t1!.y).toBeLessThan(200);
      expect(t13!.x).toBeGreaterThan(200);
      expect(t13!.y).toBeLessThan(200);

      // 13 在 1 外面：13 到中心的距离大于 1 到中心的距离
      const dist1 = Math.hypot(t1!.x - 200, t1!.y - 200);
      const dist13 = Math.hypot(t13!.x - 200, t13!.y - 200);
      expect(dist13).toBeGreaterThan(dist1);

      // 24 在 12 外面：24 到中心的距离大于 12 到中心的距离（12 点钟方向）
      const dist12 = Math.hypot(t12!.x - 200, t12!.y - 200);
      const dist24 = Math.hypot(t24!.x - 200, t24!.y - 200);
      expect(dist24).toBeGreaterThan(dist12);
      expect(t24!.y).toBeLessThan(t12!.y); // 24 在 12 上方更远处

      // 13–24 字号为 r * 0.2 * 0.55 = 100 * 0.2 * 0.55 = 11
      expect(t13!.fontSize).toBeCloseTo(11);
      // 13–24 颜色为 dim 色
      expect(t13!.fill).toBe(dimColor);
      expect(t24!.fill).toBe(dimColor);
    });

    it('hour24 未设置时不画 13–24', () => {
      const vnode = renderTree({ at: [200, 200], radius: 100, time: '0:00' });

      const texts: string[] = [];
      function walk(node: any) {
        if (!node) return;
        if (Array.isArray(node)) {
          node.forEach(walk);
          return;
        }
        if (typeof node !== 'object') return;
        if (node.type === 'text' && node.props) texts.push(String(node.props.children));
        if (node.props?.children) {
          walk(node.props.children);
        }
      }
      walk(vnode);

      expect(texts).toHaveLength(12);
      expect(texts).not.toContain('13');
      expect(texts).not.toContain('24');
    });
  });

  describe('三个把手的 valueAt', () => {
    it('分针把手（prop time）：指针在 3 点方向返回 3:15（195 分钟）', () => {
      const props = { at: [200, 200], radius: 100, time: '3:00', seconds: 0 };
      const handles = clockPart.handles?.(props)!;
      expect(handles).toHaveLength(3);

      const minuteHandle = handles[0];
      expect(minuteHandle.prop).toBe('time');
      // 分针末端在 12 点钟方向（3:00 时分针指向 12 点）
      expect(minuteHandle.at[0]).toBeCloseTo(200);
      expect(minuteHandle.at[1]).toBeCloseTo(122); // 200 - 100 * 0.78

      // 指针放置在 3 点钟方向 (dx = 100, dy = 0) => 3:15 (195 min)
      expect(minuteHandle.valueAt([300, 200])).toBe(195);
      // 指针放置在 6 点钟方向 => 3:30 (210 min)
      expect(minuteHandle.valueAt([200, 300])).toBe(210);
    });

    it('时针把手（prop time）：拖时针按 1 分钟 = 0.5° 换算', () => {
      const props = { at: [200, 200], radius: 100, time: '3:00', seconds: 0 };
      const handles = clockPart.handles?.(props)!;

      const hourHandle = handles[1];
      expect(hourHandle.prop).toBe('time');
      // 时针末端在 3 点钟方向（3:00 时时针指向 3 点，长度 100 * 0.5 = 50）
      expect(hourHandle.at[0]).toBeCloseTo(250);
      expect(hourHandle.at[1]).toBeCloseTo(200);

      // 指向 3 点钟（90°）：90 / 0.5 = 180 分钟（3:00）
      expect(hourHandle.valueAt([300, 200])).toBe(180);

      // 指向 4 点钟（120°）：120 / 0.5 = 240 分钟（4:00）
      expect(hourHandle.valueAt([200 + 100 * Math.sin((120 * Math.PI) / 180), 200 - 100 * Math.cos((120 * Math.PI) / 180)])).toBeCloseTo(240);

      // 指向 6 点钟（180°）：180 / 0.5 = 360 分钟（6:00）
      expect(hourHandle.valueAt([200, 300])).toBe(360);

      // 指向 9 点钟（270°）：270 / 0.5 = 540 分钟（9:00）
      expect(hourHandle.valueAt([100, 200])).toBe(540);

      // 指向 12 点钟（0°）：0 分钟
      expect(hourHandle.valueAt([200, 100])).toBe(0);
    });

    it('秒针把手（prop seconds）：秒针末端，按 1 秒 = 6° 换算', () => {
      const props = { at: [200, 200], radius: 100, time: '3:00', seconds: 15 };
      const handles = clockPart.handles?.(props)!;

      const secHandle = handles[2];
      expect(secHandle.prop).toBe('seconds');
      // 15 秒指向 3 点钟方向，长度 100 * 0.78 * 1.1 = 85.8
      expect(secHandle.at[0]).toBeCloseTo(285.8, 1);
      expect(secHandle.at[1]).toBeCloseTo(200, 1);

      // 指针在 3 点钟方向（90°）=> 90 / 6 = 15 秒
      expect(secHandle.valueAt([300, 200])).toBe(15);

      // 指针在 6 点钟方向（180°）=> 180 / 6 = 30 秒
      expect(secHandle.valueAt([200, 300])).toBe(30);

      // 指针在 9 点钟方向（270°）=> 270 / 6 = 45 秒
      expect(secHandle.valueAt([100, 200])).toBe(45);

      // 指针在 12 点钟方向（0°）=> 0 秒
      expect(secHandle.valueAt([200, 100])).toBe(0);
    });

    it('没有 seconds 属性时只返回分针和时针两个把手', () => {
      const props = { at: [200, 200], radius: 100, time: '3:00' };
      const handles = clockPart.handles?.(props)!;
      expect(handles).toHaveLength(2);
      expect(handles.map((h) => h.prop)).toEqual(['time', 'time']);
    });

    it('hands 指定为 minute 时只返回分针把手，指定为 hour 时只返回时针把手', () => {
      const minuteOnly = clockPart.handles?.({ at: [200, 200], radius: 100, time: '3:00', hands: 'minute' })!;
      expect(minuteOnly).toHaveLength(1);
      expect(minuteOnly[0].at[1]).toBeCloseTo(122);

      const hourOnly = clockPart.handles?.({ at: [200, 200], radius: 100, time: '3:00', hands: 'hour' })!;
      expect(hourOnly).toHaveLength(1);
      expect(hourOnly[0].at[0]).toBeCloseTo(250);
    });
  });

  describe('normalize 与 props 声明', () => {
    it('props 列表中包含 seconds 与 hour24', () => {
      expect(clockPart.props).toContain('seconds');
      expect(clockPart.props).toContain('hour24');
    });

    it('normalize 正确归一化 time 与 seconds', () => {
      const norm = clockPart.normalize!({ time: '3:30', seconds: '45.5', hour24: true });
      expect(norm.time).toBe(210);
      expect(norm.seconds).toBe(45.5);
      expect(norm.hour24).toBe(true);
    });
  });
});
