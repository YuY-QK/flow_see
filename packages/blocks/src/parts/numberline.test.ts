import { isValidElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { getTheme } from '@flow-see/core';
import { checkScene } from '../../../templates/src/scene/check';
import { sceneFrame, type SceneDef } from '../../../templates/src/scene/evaluate';
import { color, findSubitem } from '../index';
import {
  formatTickValue,
  numberlinePart,
  numberlineX,
  tickLabel,
  type Hop,
} from './math';

const theme = getTheme('cute');

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
    if (typeof el.type === 'string') {
      flatten(el.props.children as ReactNode, out);
    } else if (typeof el.type === 'function') {
      flatten((el.type as (p: unknown) => ReactNode)(el.props), out);
    }
  }
  return out;
}

const render = (p: Record<string, unknown>): El[] => {
  const Render = numberlinePart.Render as unknown as (a: { p: unknown; ctx: unknown }) => ReactNode;
  return flatten(Render({ p, ctx: { theme } }));
};

describe('数轴扩展 (X4)', () => {
  describe('1. 负数刻度文字与 0 刻度加粗', () => {
    it('负数刻度文字使用 − (U+2212) 负号', () => {
      expect(tickLabel(-3)).toBe('−3');
      expect(tickLabel(-10)).toBe('−10');
      expect(tickLabel(0)).toBe('0');
      expect(tickLabel(5)).toBe('5');
    });

    it('from 可以为负数，生成负数刻度文字，且 0 刻度线宽加粗 1.5 倍', () => {
      const p = {
        at: [100, 200],
        from: -3,
        to: 3,
        step: 1,
        length: 600,
        size: 20,
      };
      const els = render(p);

      // 提取全部 text 元素的内容
      const texts = els
        .filter((e) => e.type === 'text')
        .map((e) => String(e.props.children));

      expect(texts).toEqual(['−3', '−2', '−1', '0', '1', '2', '3']);

      // 0 刻度的 line 刻度加粗：strokeWidth = 2.5 * 1.5 = 3.75
      // X(0) 应该为 100 + ((0 - (-3)) / 6) * 600 = 400
      const tickLines = els.filter(
        (e) =>
          e.type === 'line' &&
          e.props.y1 === 192 && // 200 - 8
          e.props.y2 === 208, // 200 + 8
      );
      expect(tickLines).toHaveLength(7);

      const zeroTick = tickLines.find((l) => l.props.x1 === 400);
      expect(zeroTick).toBeDefined();
      expect(zeroTick?.props.strokeWidth).toBe(3.75);

      const nonZeroTick = tickLines.find((l) => l.props.x1 === 100); // v = -3
      expect(nonZeroTick).toBeDefined();
      expect(nonZeroTick?.props.strokeWidth).toBe(2.5);
    });

    it('subitems 包含负数 tick 子项', () => {
      const p = {
        at: [100, 200],
        from: -3,
        to: 3,
        step: 1,
        length: 600,
      };
      const sub = findSubitem(numberlinePart, p, 'tick.−3');
      expect(sub).toBeDefined();
      expect(Array.isArray(sub)).toBe(false);
      expect(sub).toMatchObject({
        name: 'tick.−3',
        value: -3,
        label: '−3',
      });
    });
  });

  describe('2. fraction 刻度 0、1/4、1/2、3/4、1', () => {
    it('tickLabel 对 fraction 刻度生成 0、1/4、1/2、3/4、1', () => {
      const step = 0.25;
      expect(tickLabel(0, 'fraction', step)).toBe('0');
      expect(tickLabel(0.25, 'fraction', step)).toBe('1/4');
      expect(tickLabel(0.5, 'fraction', step)).toBe('1/2');
      expect(tickLabel(0.75, 'fraction', step)).toBe('3/4');
      expect(tickLabel(1, 'fraction', step)).toBe('1');
    });

    it('formatTickValue 在整数刻度写整数，非整数生成 frac 结构', () => {
      const step = 0.25;
      expect(formatTickValue(0, 'fraction', step)).toEqual({ type: 'text', text: '0' });
      expect(formatTickValue(0.25, 'fraction', step)).toEqual({ type: 'frac', num: '1', den: '4' });
      expect(formatTickValue(0.5, 'fraction', step)).toEqual({ type: 'frac', num: '1', den: '2' });
      expect(formatTickValue(0.75, 'fraction', step)).toEqual({ type: 'frac', num: '3', den: '4' });
      expect(formatTickValue(1, 'fraction', step)).toEqual({ type: 'text', text: '1' });
    });

    it('渲染数轴时，整数刻度渲染普通 text，分数刻度渲染带有横线与分子分母的 F4 行内分数', () => {
      const p = {
        at: [100, 200],
        from: 0,
        to: 1,
        step: 0.25,
        labels: 'fraction',
        length: 400,
        size: 20,
      };
      const els = render(p);

      // 检查 data-tick-label 标注组
      const fracGroups = els.filter(
        (e) => e.type === 'g' && typeof e.props['data-tick-label'] === 'string',
      );
      expect(fracGroups.map((g) => g.props['data-tick-label'])).toEqual(['1/4', '1/2', '3/4']);

      // 整数刻度 0 和 1 呈现为普通 text
      const hangingTexts = els.filter(
        (e) => e.type === 'text' && e.props.dominantBaseline === 'hanging',
      );
      expect(hangingTexts.map((e) => String(e.props.children))).toEqual(['0', '1']);

      // 行内分数分子分母居中
      const centralTexts = els.filter(
        (e) => e.type === 'text' && e.props.dominantBaseline === 'central',
      );
      expect(centralTexts.map((e) => String(e.props.children))).toEqual([
        '1', '4', // 1/4
        '1', '2', // 1/2
        '3', '4', // 3/4
      ]);
    });
  });

  describe('3. layers 多行刻度文字', () => {
    it('layers 两行分别下移 size * 1.4 并渲染对应格式的文字', () => {
      const size = 20;
      const y = 200;
      const p = {
        at: [100, y],
        from: 0,
        to: 1,
        step: 0.25,
        labels: 'decimal',
        layers: [{ labels: 'fraction' }, { labels: 'percent' }],
        length: 400,
        size,
      };
      const els = render(p);

      // 主行 y = 200 + 14 = 214
      // 第一层 y = 214 + 20 * 1.4 = 242
      // 第二层 y = 214 + 20 * 1.4 * 2 = 270

      // 第二层 percent 的文字位于 y = 270
      const percentTexts = els.filter(
        (e) => e.type === 'text' && e.props.y === 214 + size * 1.4 * 2,
      );
      expect(percentTexts.map((e) => String(e.props.children))).toEqual([
        '0%',
        '25%',
        '50%',
        '75%',
        '100%',
      ]);

      // 第一层 fraction 包含 3 组 F4 分数 (1/4, 1/2, 3/4)
      const fracGroups = els.filter(
        (e) => e.type === 'g' && typeof e.props['data-tick-label'] === 'string',
      );
      expect(fracGroups.map((g) => g.props['data-tick-label'])).toEqual(['1/4', '1/2', '3/4']);

      // 主行 decimal 包含 0, 0.25, 0.5, 0.75, 1
      const mainRowTexts = els.filter(
        (e) => e.type === 'text' && e.props.y === 214,
      );
      expect(mainRowTexts.map((e) => String(e.props.children))).toEqual([
        '0',
        '0.25',
        '0.5',
        '0.75',
        '1',
      ]);
    });

    it('layers 支持独立 step 和 offset', () => {
      const p = {
        at: [100, 200],
        from: 0,
        to: 24,
        step: 1,
        labelEvery: 2,
        layers: [{ labels: 'integer', step: 12 }],
        length: 480,
        size: 20,
      };
      const els = render(p);

      // 第一层 step: 12 只标 0, 12, 24
      const layer1Texts = els.filter(
        (e) => e.type === 'text' && e.props.y === 214 + 20 * 1.4,
      );
      expect(layer1Texts.map((e) => String(e.props.children))).toEqual(['0', '12', '24']);
    });
  });

  describe('4. zoom 放大轴位置与包围盒', () => {
    it('zoomScale > 1 时在下方 size * 3 处画出长度 = 原长 * 0.8 的放大轴及连线', () => {
      const size = 20;
      const x = 100;
      const y = 200;
      const length = 500;
      const p = {
        at: [x, y],
        from: 0,
        to: 10,
        step: 1,
        length,
        size,
        zoomFrom: 2,
        zoomTo: 3,
        zoomScale: 2,
      };

      const els = render(p);

      // 放大轴参数
      const expectedZoomLen = length * 0.8; // 400
      const expectedZoomX = x + (length - expectedZoomLen) / 2; // 150
      const expectedZoomY = y + size * 3; // 260

      // 检查放大轴的主轴线
      const zoomAxisLine = els.find(
        (e) =>
          e.type === 'line' &&
          e.props.x1 === expectedZoomX &&
          e.props.x2 === expectedZoomX + expectedZoomLen &&
          e.props.y1 === expectedZoomY &&
          e.props.y2 === expectedZoomY,
      );
      expect(zoomAxisLine).toBeDefined();

      // 检查连接两条虚线
      const xFrom = numberlineX(p, 2); // 100 + (2/10)*500 = 200
      const xTo = numberlineX(p, 3); // 100 + (3/10)*500 = 250

      const dashedLines = els.filter(
        (e) =>
          e.type === 'line' &&
          e.props.strokeDasharray === '8 6' &&
          e.props.y1 === y &&
          e.props.y2 === expectedZoomY,
      );
      expect(dashedLines).toHaveLength(2);

      // 左虚线：(xFrom, y) -> (zoomX, zoomY)
      expect(dashedLines.find((l) => l.props.x1 === xFrom && l.props.x2 === expectedZoomX)).toBeDefined();
      // 右虚线：(xTo, y) -> (zoomX + zoomLen, zoomY)
      expect(
        dashedLines.find(
          (l) => l.props.x1 === xTo && l.props.x2 === expectedZoomX + expectedZoomLen,
        ),
      ).toBeDefined();

      // 放大轴细分为原 step / 10 = 0.1，从 2 到 3 共 11 个刻度
      const zoomTexts = els.filter(
        (e) => e.type === 'text' && e.props.y === expectedZoomY + 14,
      );
      expect(zoomTexts).toHaveLength(11);
      expect(zoomTexts.map((e) => String(e.props.children))).toEqual([
        '2',
        '2.1',
        '2.2',
        '2.3',
        '2.4',
        '2.5',
        '2.6',
        '2.7',
        '2.8',
        '2.9',
        '3',
      ]);
    });

    it('zoom 的包围盒正确包含放大轴及其标签', () => {
      const size = 20;
      const x = 100;
      const y = 200;
      const length = 500;
      const p = {
        at: [x, y],
        from: 0,
        to: 10,
        step: 1,
        length,
        size,
        zoomFrom: 2,
        zoomTo: 3,
        zoomScale: 2,
      };

      const bbox = numberlinePart.bbox(p);
      const expectedZoomY = y + size * 3; // 260
      const bottom = expectedZoomY + 14 + size + 10; // 304
      expect(bbox.x).toBe(x - 20); // 80
      expect(bbox.w).toBe(length + 40); // 540
      expect(bbox.y + bbox.h).toBeGreaterThanOrEqual(bottom);
    });

    it('subitems 包含 zoom 子项', () => {
      const p = {
        at: [100, 200],
        from: 0,
        to: 10,
        step: 1,
        length: 500,
        size: 20,
        zoomFrom: 2,
        zoomTo: 3,
        zoomScale: 2,
      };

      const zoomSub = findSubitem(numberlinePart, p, 'zoom');
      expect(zoomSub).toBeDefined();
      expect(Array.isArray(zoomSub)).toBe(false);
      expect(zoomSub).toEqual({
        name: 'zoom',
        box: {
          x: 140, // 150 - 10
          y: 250, // 260 - 10
          w: 420, // 400 + 20
          h: 50, // size + 30
        },
      });
    });

    it('zoomScale <= 1 时不画放大轴且不产生 zoom 子项', () => {
      const p = {
        at: [100, 200],
        from: 0,
        to: 10,
        step: 1,
        length: 500,
        zoomFrom: 2,
        zoomTo: 3,
        zoomScale: 1,
      };
      const els = render(p);
      expect(els.filter((e) => e.type === 'line' && e.props.strokeDasharray === '8 6')).toHaveLength(0);
      expect(findSubitem(numberlinePart, p, 'zoom')).toBeUndefined();
    });
  });

  describe('5. hop color', () => {
    it('hop 支持指定 color，弧线和文字使用指定颜色', () => {
      const hops: Hop[] = [
        { from: 0, to: 4, label: '+4', color: 'orange', p: 1 },
        { from: 4, to: 8, label: '+4', p: 1 },
      ];
      const p = {
        at: [100, 200],
        from: 0,
        to: 10,
        step: 1,
        length: 500,
        hops,
      };
      const els = render(p);

      // 第一条 hop 的 path 和 text 用 orange
      const paths = els.filter((e) => e.type === 'path' && e.props.strokeWidth === 3.5);
      expect(paths).toHaveLength(2);
      expect(paths[0].props.stroke).toBe(color('orange', theme));
      expect(paths[1].props.stroke).toBe(theme.accent); // 默认 accent

      const hopTexts = els.filter(
        (e) => e.type === 'text' && e.props.fontWeight === 'bold',
      );
      expect(hopTexts).toHaveLength(2);
      expect(hopTexts[0].props.fill).toBe(color('orange', theme));
      expect(hopTexts[1].props.fill).toBe(theme.accent);
    });

    it('sceneFrame 正确处理 hop 的 color 属性', () => {
      const def = {
        stage: { width: 800, height: 450 },
        objects: [
          {
            id: 'line',
            type: 'numberline',
            at: [100, 200] as [number, number],
            from: 0,
            to: 10,
          },
        ],
        steps: [
          [
            {
              hop: {
                target: 'line',
                from: 0,
                to: 4,
                label: '+4',
                color: 'green',
              },
            },
          ],
        ],
      };

      const frame = sceneFrame(def as unknown as SceneDef, 0, 1);
      const line = frame.objects.find((o) => o.id === 'line');
      expect(line).toBeDefined();
      const lineHops = line?.props.hops as Hop[];
      expect(lineHops).toHaveLength(1);
      expect(lineHops[0]).toMatchObject({
        from: 0,
        to: 4,
        label: '+4',
        color: 'green',
      });
    });

    it('checkScene 认识 hop 的 color 属性，并检查非法颜色', () => {
      const sceneOk = {
        objects: [{ id: 'l', type: 'numberline', at: [0, 0] }],
        steps: [
          {
            title: '1',
            say: '1',
            do: [{ hop: { target: 'l', from: 0, to: 2, color: 'blue' } }],
          },
        ],
      };
      const rOk = checkScene(sceneOk as unknown as Parameters<typeof checkScene>[0]);
      expect(rOk).toHaveLength(0);

      const sceneBad = {
        objects: [{ id: 'l', type: 'numberline', at: [0, 0] }],
        steps: [
          {
            title: '1',
            say: '1',
            do: [{ hop: { target: 'l', from: 0, to: 2, color: 'not-a-color-name' } }],
          },
        ],
      };
      const rBad = checkScene(sceneBad as unknown as Parameters<typeof checkScene>[0]);
      expect(rBad.length).toBeGreaterThan(0);
      expect(rBad.some((i) => i.message.includes('color'))).toBe(true);
    });
  });
});
