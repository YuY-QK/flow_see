import { describe, expect, it } from 'vitest';
import { getTheme, type Theme } from '@flow-see/core';
import { checkScene } from '../../../templates/src/scene/check';
import { findSubitem, getPart } from '../index';
import type { PartContext } from '../base';
import {
  BAG_BALL_RADIUS,
  MAX_BAG_BALLS_PER_ROW,
  chanceLayout,
  chancePart,
  generateChanceResults,
  mulberry32,
} from './chance';

const renderWithTheme = (p: Record<string, unknown>, theme: Theme = getTheme('flat')) => {
  const ctx: PartContext = { theme };
  return (chancePart.Render as unknown as (args: { p: unknown; ctx: unknown }) => unknown)({
    p,
    ctx,
  });
};

describe('B20 摸球 / 转盘 / 硬币零件 (chance)', () => {
  describe('1. 确定性伪随机序列 mulberry32 与 generateChanceResults', () => {
    it('seed: 1 生成的前 10 个摸球结果完全固定（写死断言，跨运行 100% 确定性）', () => {
      const items = [
        { color: 'red', count: 3 },
        { color: 'yellow', count: 1 },
      ];
      const seq1 = generateChanceResults(items, 10, 1);
      expect(seq1).toEqual([
        'red',
        'red',
        'red',
        'yellow',
        'yellow',
        'red',
        'red',
        'red',
        'red',
        'yellow',
      ]);

      // 再次调用及通过 chanceLayout 生成均得到完全相同的序列
      const seq2 = generateChanceResults({ kind: 'bag', items, count: 10, seed: 1 });
      expect(seq2).toEqual(seq1);

      const layout = chanceLayout({ kind: 'bag', items, draw: 10, seed: 1 });
      expect(layout.completedResults).toEqual(seq1);
    });

    it('seed: 1 生成的前 10 次抛硬币正反面序列完全固定', () => {
      const coinSeq = generateChanceResults({ kind: 'coin', count: 10, seed: 1 });
      expect(coinSeq).toEqual([
        'tails',
        'heads',
        'tails',
        'tails',
        'tails',
        'heads',
        'tails',
        'tails',
        'heads',
        'tails',
      ]);

      // mulberry32 自身跨调用一致
      const r1 = mulberry32(42);
      const r2 = mulberry32(42);
      const floats1 = Array.from({ length: 5 }, () => r1());
      const floats2 = Array.from({ length: 5 }, () => r2());
      expect(floats1).toEqual(floats2);
    });

    it('results 长度不足 Math.ceil(draw) 时保留前缀并用 seed 继续按比例补齐', () => {
      const items = [
        { color: 'red', count: 3 },
        { color: 'yellow', count: 1 },
      ];
      const L = chanceLayout({
        kind: 'bag',
        items,
        results: ['yellow', 'red'],
        seed: 1,
        draw: 5,
      });
      expect(L.completedResults).toHaveLength(5);
      expect(L.completedResults[0]).toBe('yellow');
      expect(L.completedResults[1]).toBe('red');
      // 第 3..5 项由 seed: 1 第 3..5 个随机数生成
      expect(L.completedResults.slice(2)).toEqual(['red', 'yellow', 'yellow']);
    });

    it('比例 3 : 1 时生成 1000 个结果中红色占比在 75% ± 5%（700..800）之间', () => {
      const items = [
        { color: 'red', count: 3 },
        { color: 'yellow', count: 1 },
      ];
      const results = generateChanceResults(items, 1000, 1);
      expect(results).toHaveLength(1000);
      const redCount = results.filter((c) => c === 'red').length;
      const yellowCount = results.filter((c) => c === 'yellow').length;
      expect(redCount + yellowCount).toBe(1000);
      expect(redCount).toBeGreaterThanOrEqual(700);
      expect(redCount).toBeLessThanOrEqual(800);
    });
  });

  describe('2. bag（摸球袋）几何、draw: 2.5 中间画面与换行排列', () => {
    const bagItems = [
      { color: 'red', count: 2 },
      { color: 'yellow', count: 2 },
    ];
    const presetResults = ['red', 'yellow', 'red', 'yellow'];

    it('draw: 2.25（0..0.5 阶段）已完成 2 个球，小手伸进袋口且尚未拿出第 3 个球', () => {
      const L = chanceLayout({
        kind: 'bag',
        items: bagItems,
        results: presetResults,
        draw: 2.25,
        at: [200, 220],
      });
      expect(L.completedCount).toBe(2);
      expect(L.frac).toBeCloseTo(0.25, 5);
      expect(L.bag).toBeDefined();
      expect(L.bag!.drawnBalls).toHaveLength(2);
      expect(L.bag!.drawnBalls.map((b) => b.color)).toEqual(['red', 'yellow']);
      expect(L.bag!.hand).toBeDefined();
      expect(L.bag!.hand!.phase).toBe('reaching');
      expect(L.bag!.activeBall).toBeUndefined();
    });

    it('draw: 2.5 与 2.75（0.5..1 阶段）已完成 2 个球，手正拿着第 3 个球从袋口移向右侧队列', () => {
      const L25 = chanceLayout({
        kind: 'bag',
        items: bagItems,
        results: presetResults,
        draw: 2.5,
        at: [200, 220],
      });
      expect(L25.completedCount).toBe(2);
      expect(L25.activeResult).toBe('red');
      expect(L25.bag!.drawnBalls).toHaveLength(2);
      expect(L25.bag!.hand).toBeDefined();
      expect(L25.bag!.hand!.phase).toBe('pulling');
      expect(L25.bag!.activeBall).toBeDefined();
      expect(L25.bag!.activeBall!.color).toBe('red');
      expect(L25.bag!.activeBall!.radius).toBe(BAG_BALL_RADIUS);
      // frac = 0.5 时球正好位于袋口位置
      expect(L25.bag!.activeBall!.pos[0]).toBeCloseTo(L25.bag!.mouthPos[0], 5);
      expect(L25.bag!.activeBall!.pos[1]).toBeCloseTo(L25.bag!.mouthPos[1], 5);

      // frac = 0.75 时球已向右移出袋口、位于袋口与第 3 个槽位之间
      const L275 = chanceLayout({
        kind: 'bag',
        items: bagItems,
        results: presetResults,
        draw: 2.75,
        at: [200, 220],
      });
      const L3 = chanceLayout({
        kind: 'bag',
        items: bagItems,
        results: presetResults,
        draw: 3,
        at: [200, 220],
      });
      const thirdSlotX = L3.bag!.drawnBalls[2].pos[0];
      expect(L275.bag!.activeBall!.pos[0]).toBeGreaterThan(L25.bag!.mouthPos[0]);
      expect(L275.bag!.activeBall!.pos[0]).toBeLessThan(thirdSlotX);
    });

    it('已摸出的球每行最多排 10 个，超过自动换行对齐', () => {
      const L = chanceLayout({
        kind: 'bag',
        items: bagItems,
        seed: 7,
        draw: 12,
        at: [150, 220],
      });
      expect(L.bag!.drawnBalls).toHaveLength(12);
      expect(L.bag!.drawnBalls[9].row).toBe(0);
      expect(L.bag!.drawnBalls[9].col).toBe(MAX_BAG_BALLS_PER_ROW - 1);
      expect(L.bag!.drawnBalls[10].row).toBe(1);
      expect(L.bag!.drawnBalls[10].col).toBe(0);
      expect(L.bag!.drawnBalls[10].pos[0]).toBeCloseTo(L.bag!.drawnBalls[0].pos[0], 5);
      expect(L.bag!.drawnBalls[10].pos[1]).toBeGreaterThan(L.bag!.drawnBalls[0].pos[1]);
    });
  });

  describe('3. spinner（转盘）扇形角度、落点范围与减速旋转', () => {
    const spinnerItems = [
      { color: 'red', count: 3 },
      { color: 'yellow', count: 1 },
    ];

    it('扇形按份数比例划分，且每次落点严格落在对应颜色扇形中间 ± 半宽 × 0.6 内', () => {
      const L = chanceLayout({
        kind: 'spinner',
        items: spinnerItems,
        results: ['red', 'yellow', 'red', 'yellow', 'red'],
        seed: 3,
        draw: 5,
      });
      expect(L.spinner).toBeDefined();
      const [redSec, yellowSec] = L.spinner!.sectors;
      expect(redSec.startAngle).toBeCloseTo(0, 5);
      expect(redSec.endAngle).toBeCloseTo(270, 5);
      expect(redSec.midAngle).toBeCloseTo(135, 5);
      expect(redSec.halfWidth).toBeCloseTo(135, 5);

      expect(yellowSec.startAngle).toBeCloseTo(270, 5);
      expect(yellowSec.endAngle).toBeCloseTo(360, 5);
      expect(yellowSec.midAngle).toBeCloseTo(315, 5);
      expect(yellowSec.halfWidth).toBeCloseTo(45, 5);

      L.results.forEach((col, i) => {
        const angle = L.spinner!.landingAngles[i];
        const sec = col === 'red' ? redSec : yellowSec;
        expect(angle).toBeGreaterThanOrEqual(sec.midAngle - sec.halfWidth * 0.6 - 1e-6);
        expect(angle).toBeLessThanOrEqual(sec.midAngle + sec.halfWidth * 0.6 + 1e-6);
        expect(angle).toBeGreaterThan(sec.startAngle);
        expect(angle).toBeLessThan(sec.endAngle);
      });

      // 整数 draw: 5 时指针停在第 5 次结果的落点角
      expect(L.spinner!.isSpinning).toBe(false);
      expect(L.spinner!.pointerAngle).toBeCloseTo(L.spinner!.landingAngles[4], 5);
    });

    it('draw: 2.5 时转盘正处于第 3 次旋转减速过程（先快后慢，已完成超过 2 圈的大部分角位移）', () => {
      const base = {
        kind: 'spinner',
        items: spinnerItems,
        results: ['red', 'yellow', 'red'],
        seed: 1,
      };
      const L2 = chanceLayout({ ...base, draw: 2 });
      const L22 = chanceLayout({ ...base, draw: 2.2 });
      const L25 = chanceLayout({ ...base, draw: 2.5 });
      const L28 = chanceLayout({ ...base, draw: 2.8 });
      const L3 = chanceLayout({ ...base, draw: 3 });

      expect(L25.completedCount).toBe(2);
      expect(L25.spinner!.isSpinning).toBe(true);

      // 验证总角位移单调递增且先快后慢（前半程转动角度远大于后半程）
      const startDeg = L2.spinner!.pointerAngle;
      const midDeg = L25.spinner!.pointerTotalDeg;
      const targetLanding = L3.spinner!.pointerAngle;
      const cwDelta = (((targetLanding - startDeg) % 360) + 360) % 360;
      const endTotalDeg = startDeg + 720 + cwDelta;

      expect(L22.spinner!.pointerTotalDeg).toBeGreaterThan(startDeg);
      expect(midDeg).toBeGreaterThan(L22.spinner!.pointerTotalDeg);
      expect(L28.spinner!.pointerTotalDeg).toBeGreaterThan(midDeg);
      expect(endTotalDeg).toBeGreaterThan(L28.spinner!.pointerTotalDeg);

      const firstHalfDelta = midDeg - startDeg;
      const secondHalfDelta = endTotalDeg - midDeg;
      expect(firstHalfDelta).toBeGreaterThan(secondHalfDelta * 3);
    });
  });

  describe('4. coin（抛硬币）正反面翻转与自定义标签', () => {
    it('draw: 2.5 时硬币处于第 3 次翻转压扁中间态，稳定后显示正面/反面文字并支持自定义 labels', () => {
      const L25 = chanceLayout({
        kind: 'coin',
        results: ['heads', 'tails', 'heads'],
        draw: 2.5,
      });
      expect(L25.completedCount).toBe(2);
      expect(L25.coin).toBeDefined();
      expect(L25.coin!.isFlipping).toBe(true);
      // frac = 0.5 时 |cos(1.5π)| = 0，竖直压扁且处于上抛最高点
      expect(L25.coin!.flipScaleY).toBeCloseTo(0, 5);
      expect(L25.coin!.tossOffsetY).toBeLessThan(-20);

      // 稳定在 draw = 2（tails）与 draw = 3（heads）
      const L2 = chanceLayout({
        kind: 'coin',
        results: ['heads', 'tails', 'heads'],
        draw: 2,
      });
      expect(L2.coin!.isFlipping).toBe(false);
      expect(L2.coin!.flipScaleY).toBe(1);
      expect(L2.coin!.face).toBe('tails');
      expect(L2.coin!.faceLabel).toBe('反面');

      const L3Custom = chanceLayout({
        kind: 'coin',
        results: ['heads', 'tails', 'heads'],
        draw: 3,
        labels: { heads: '字', tails: '花', times: '共 {n} 回' },
        tally: true,
      });
      expect(L3Custom.coin!.face).toBe('heads');
      expect(L3Custom.coin!.faceLabel).toBe('字');
      expect(L3Custom.tallyPanel!.rows.map((r) => `${r.label}:${r.countText}`)).toEqual([
        '字:共 2 回',
        '花:共 1 回',
      ]);
    });
  });

  describe('5. tally 累计次数面板与 subitems 子项', () => {
    it('tally: true 仅统计已完成的 Math.floor(draw) 次结果，计数准确', () => {
      const L = chanceLayout({
        kind: 'spinner',
        items: [
          { color: 'red', count: 5 },
          { color: 'yellow', count: 1 },
        ],
        results: ['red', 'yellow', 'red', 'red', 'yellow'],
        draw: 4.6, // 已完成 4 次：red 3 次、yellow 1 次（第 5 次 yellow 尚未完成）
        tally: true,
      });
      expect(L.tallyPanel).toBeDefined();
      expect(L.tallyPanel!.rows).toHaveLength(2);
      expect(L.tallyPanel!.rows[0]).toMatchObject({
        key: 'red',
        count: 3,
        countText: '3 次',
      });
      expect(L.tallyPanel!.rows[1]).toMatchObject({
        key: 'yellow',
        count: 1,
        countText: '1 次',
      });
    });

    it('subitems 支持 bag 和 spinner 的 color.<颜色名> 查询', () => {
      const bagProps = {
        kind: 'bag',
        items: [
          { color: 'red', count: 2 },
          { color: 'yellow', count: 2 },
          { color: 'blue', count: 1 },
        ],
        results: ['red', 'yellow', 'red'],
        draw: 3,
      };
      const redSub = findSubitem(chancePart, bagProps, 'color.red');
      const yellowSub = findSubitem(chancePart, bagProps, 'color.yellow');
      const blueSub = findSubitem(chancePart, bagProps, 'color.blue');
      expect(redSub).toBeDefined();
      expect(!Array.isArray(redSub) && redSub?.value).toBe(2);
      expect(!Array.isArray(redSub) && redSub?.disabled).toBeFalsy();
      expect(!Array.isArray(yellowSub) && yellowSub?.value).toBe(1);
      // blue 尚未摸出，标记 disabled: true
      expect(!Array.isArray(blueSub) && blueSub?.value).toBe(0);
      expect(!Array.isArray(blueSub) && blueSub?.disabled).toBe(true);

      const spinnerProps = {
        kind: 'spinner',
        items: [
          { color: 'red', count: 3 },
          { color: 'yellow', count: 1 },
        ],
      };
      const spRed = findSubitem(chancePart, spinnerProps, 'color.red');
      const spYellow = findSubitem(chancePart, spinnerProps, 'color.yellow');
      expect(!Array.isArray(spRed) && spRed?.value).toBe(3);
      expect(!Array.isArray(spYellow) && spYellow?.value).toBe(1);
    });

    it('已注册到 PARTS，且三种形态在 4 套动画主题下均可正常渲染 React 元素树', () => {
      const resolved = getPart('chance');
      expect(resolved).toBeDefined();
      expect(resolved?.anchor).toBe('center');
      expect(resolved?.defaults.kind).toBe('bag');
      expect(resolved?.defaults.seed).toBe(1);

      for (const themeId of ['flat', 'cute', 'chalk', 'pro'] as const) {
        const theme = getTheme(themeId);
        expect(
          renderWithTheme(
            {
              kind: 'bag',
              items: [
                { color: 'red', count: 3 },
                { color: 'yellow', count: 1 },
              ],
              draw: 2.5,
              tally: true,
            },
            theme,
          ),
        ).toBeTruthy();
        expect(
          renderWithTheme(
            {
              kind: 'spinner',
              items: [
                { color: 'red', count: 3 },
                { color: 'yellow', count: 1 },
              ],
              draw: 2.5,
              tally: true,
            },
            theme,
          ),
        ).toBeTruthy();
        expect(renderWithTheme({ kind: 'coin', draw: 2.5, tally: true }, theme)).toBeTruthy();
      }
    });
  });

  describe('6. checkScene 配置检查', () => {
    it('合法的 bag / spinner / coin 场景配置通过检查', () => {
      const issues = checkScene({
        params: {},
        objects: [
          {
            id: 'b1',
            type: 'chance',
            kind: 'bag',
            items: [
              { color: 'red', count: 3 },
              { color: 'yellow', count: 1 },
            ],
            results: ['red', 'yellow', 'red'],
            draw: 0,
            at: [200, 220],
          },
          {
            id: 'c1',
            type: 'chance',
            kind: 'coin',
            results: ['heads', 'tails'],
            draw: 0,
            at: [550, 220],
          },
        ],
        steps: [
          {
            say: '摸球与抛硬币',
            do: [
              { set: { target: 'b1', draw: 3 } },
              { set: { target: 'c1', draw: 2 } },
            ],
          },
        ],
      });
      expect(issues).toEqual([]);
    });

    it('results 里的颜色不在 items 中时报错', () => {
      const issues = checkScene({
        params: {},
        objects: [
          {
            id: 'b1',
            type: 'chance',
            kind: 'bag',
            items: [
              { color: 'red', count: 3 },
              { color: 'yellow', count: 1 },
            ],
            results: ['red', 'blue'],
            at: [400, 225],
          },
        ],
        steps: [{ say: '测试', do: [{ highlight: 'b1' }] }],
      });
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some((i) => i.message.includes('blue') && i.message.includes('items'))).toBe(
        true,
      );
    });

    it('items 中 count 为 0 的颜色出现在 results 中时报错', () => {
      const issues = checkScene({
        params: {},
        objects: [
          {
            id: 'sp1',
            type: 'chance',
            kind: 'spinner',
            items: [
              { color: 'red', count: 4 },
              { color: 'green', count: 0 },
            ],
            results: ['red', 'green'],
            at: [400, 225],
          },
        ],
        steps: [{ say: '测试', do: [{ highlight: 'sp1' }] }],
      });
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some((i) => i.message.includes('green') && i.message.includes('0'))).toBe(true);
    });
  });
});
