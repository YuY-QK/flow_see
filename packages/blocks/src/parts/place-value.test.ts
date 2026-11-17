import { isValidElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { getTheme } from '@flow-see/core';
import {
  color,
  findSubitem,
  placeValueLayout,
  placeValuePart,
} from '../index';
import { BlankBox } from './mark';
import { checkScene } from '../../../templates/src/scene/check';

const theme = getTheme('flat');

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
    if (el.props && el.props.children) {
      flatten(el.props.children as ReactNode, out);
    }
  }
  return out;
}

describe('B4 计数器 / 数位表（place-value）', () => {
  it('value 305 时三根杆珠子数 3、0、5', () => {
    const props = {
      at: [400, 200] as [number, number],
      places: 2,
      decimals: 0,
      value: 305,
      style: 'abacus' as const,
      color: 'blue',
    };
    const layout = placeValueLayout(props);

    // 三根杆依次为百位 (d2)、十位 (d1)、个位 (d0)
    expect(layout.columns).toHaveLength(3);
    const [colHundreds, colTens, colOnes] = layout.columns;

    expect(colHundreds.key).toBe('d2');
    expect(colHundreds.digit).toBe(3);
    expect(colHundreds.beads).toHaveLength(3);

    expect(colTens.key).toBe('d1');
    expect(colTens.digit).toBe(0);
    expect(colTens.beads).toHaveLength(0);

    expect(colOnes.key).toBe('d0');
    expect(colOnes.digit).toBe(5);
    expect(colOnes.beads).toHaveLength(5);

    // 渲染检查：一共 8 颗珠子，珠子颜色交替（个位 blue，十位 orange，百位 blue）
    const Render = placeValuePart.Render as (p: { p: unknown; ctx: unknown }) => ReactNode;
    const rendered = Render({ p: props, ctx: { theme } });
    const els = flatten(rendered);
    const ellipses = els.filter((e) => e.type === 'ellipse');
    expect(ellipses).toHaveLength(8);

    // 前 3 颗在百位（blue），后 5 颗在个位（blue）
    const blueColor = color('blue', theme);
    ellipses.forEach((e) => {
      expect(e.props.fill).toBe(blueColor);
    });

    // 检查子项包含 d2, d1, d0
    const subitems = placeValuePart.subitems!(props);
    expect(subitems.map((s) => s.name)).toEqual(['d2', 'd1', 'd0']);
    expect(findSubitem(placeValuePart, props, 'd0')).toMatchObject({ value: 5 });
    expect(findSubitem(placeValuePart, props, 'd1')).toMatchObject({ value: 0 });
    expect(findSubitem(placeValuePart, props, 'd2')).toMatchObject({ value: 3 });
  });

  it('value 1.25、decimals 2 的小数点位置', () => {
    const props = {
      at: [400, 200] as [number, number],
      places: 0,
      decimals: 2,
      value: 1.25,
      style: 'abacus' as const,
    };
    const layout = placeValueLayout(props);

    // 列：d0（个位）、d-1（十分位）、d-2（百分位）
    expect(layout.columns).toHaveLength(3);
    const [d0, dNeg1, dNeg2] = layout.columns;
    expect(d0.digit).toBe(1);
    expect(dNeg1.digit).toBe(2);
    expect(dNeg2.digit).toBe(5);

    // 小数点存在且位置在 d0 和 d-1 中间
    expect(layout.point).toBeDefined();
    const pt = layout.point!;
    expect(pt.x).toBeCloseTo((d0.x + dNeg1.x) / 2, 6);
    expect(pt.y).toBeCloseTo(layout.baseBox!.y + layout.baseBox!.h / 2, 6);

    // subitems 中包含 point
    const subitems = placeValuePart.subitems!(props);
    const ptSub = subitems.find((s) => s.name === 'point');
    expect(ptSub).toBeDefined();
    expect(ptSub!.box.x + ptSub!.box.w / 2).toBeCloseTo(pt.x, 6);
    expect(ptSub!.box.y + ptSub!.box.h / 2).toBeCloseTo(pt.y, 6);

    // chart 样式下同样在 d0 和 d-1 之间
    const chartLayout = placeValueLayout({ ...props, style: 'chart' });
    expect(chartLayout.point).toBeDefined();
    expect(chartLayout.point!.x).toBeCloseTo(
      (chartLayout.columns[0].x + chartLayout.columns[1].x) / 2,
      6,
    );
  });

  it('groups 时级名跨列', () => {
    const props = {
      at: [400, 200] as [number, number],
      places: 7,
      decimals: 0,
      groups: true,
      style: 'chart' as const,
      value: 12345678,
    };
    const layout = placeValueLayout(props);

    // 8 列：d7..d0
    expect(layout.columns).toHaveLength(8);
    expect(layout.groupHeaders).toHaveLength(2);

    const [wanGroup, geGroup] = layout.groupHeaders;
    // 万级跨 d7 到 d4（前 4 列，宽度 4 * 70 = 280）
    expect(wanGroup.startCol).toBe(0);
    expect(wanGroup.endCol).toBe(3);
    expect(wanGroup.box.w).toBe(4 * 70);
    expect(wanGroup.box.x).toBe(layout.box.x);

    // 个级跨 d3 到 d0（后 4 列，宽度 4 * 70 = 280）
    expect(geGroup.startCol).toBe(4);
    expect(geGroup.endCol).toBe(7);
    expect(geGroup.box.w).toBe(4 * 70);
    expect(geGroup.box.x).toBe(layout.box.x + 4 * 70);

    // 渲染 chart 包含两级表头和单元格
    const Render = placeValuePart.Render as (p: { p: unknown; ctx: unknown }) => ReactNode;
    const rendered = Render({ p: props, ctx: { theme } });
    const els = flatten(rendered);
    const rects = els.filter((e) => e.type === 'rect');
    expect(rects.length).toBeGreaterThan(16);
  });

  it('9→10 中间状态', () => {
    // 9.5 中间状态：个位 10 颗珠子并拢淡出，十位落下 1 颗
    const props = {
      at: [400, 200] as [number, number],
      places: 1,
      decimals: 0,
      value: 9.5,
      style: 'abacus' as const,
    };
    const layout = placeValueLayout(props);

    const [tensCol, onesCol] = layout.columns;
    // 个位：10 颗珠子，透明度为 1 - 0.5 = 0.5
    expect(onesCol.beads).toHaveLength(10);
    onesCol.beads.forEach((bead) => {
      expect(bead.opacity).toBeCloseTo(0.5, 4);
      expect(bead.falling).toBe(false);
    });

    // 十位：1 颗珠子正在落下
    expect(tensCol.beads).toHaveLength(1);
    const fallingBead = tensCol.beads[0];
    expect(fallingBead.falling).toBe(true);
    expect(fallingBead.opacity).toBe(1);

    // 珠子 y 坐标应位于杆顶与落点正中间
    const rodTopY = layout.box.y;
    const restY = layout.baseBox!.y - 10;
    const expectedY = rodTopY + 0.5 * (restY - rodTopY);
    expect(fallingBead.y).toBeCloseTo(expectedY, 4);

    // 到达 10 稳态：个位 0 颗，十位 1 颗稳定珠子
    const doneLayout = placeValueLayout({ ...props, value: 10 });
    expect(doneLayout.columns[1].beads).toHaveLength(0);
    expect(doneLayout.columns[0].beads).toHaveLength(1);
    expect(doneLayout.columns[0].beads[0].falling).toBe(false);
    expect(doneLayout.columns[0].beads[0].opacity).toBe(1);

    // 初始 9 稳态：个位 9 颗，十位 0 颗
    const initLayout = placeValueLayout({ ...props, value: 9 });
    expect(initLayout.columns[1].beads).toHaveLength(9);
    expect(initLayout.columns[0].beads).toHaveLength(0);
  });

  it('blank 填空时挖空虚线框', () => {
    const props = {
      at: [400, 200] as [number, number],
      places: 1,
      value: 35,
      blank: ['d0'],
      style: 'abacus' as const,
    };
    const Render = placeValuePart.Render as (p: { p: unknown; ctx: unknown }) => ReactNode;
    const els = flatten(Render({ p: props, ctx: { theme } }));
    const blankBoxes = els.filter(
      (e) => e.type === BlankBox || (e.props && 'data-blank' in e.props),
    );
    expect(blankBoxes).toHaveLength(1);

    // chart 样式下也支持 blank
    const chartEls = flatten(Render({ p: { ...props, style: 'chart' }, ctx: { theme } }));
    const chartBlanks = chartEls.filter(
      (e) => e.type === BlankBox || (e.props && 'data-blank' in e.props),
    );
    expect(chartBlanks).toHaveLength(1);
  });

  it('showDigits 为 false 时不画数字', () => {
    const props = {
      at: [400, 200] as [number, number],
      places: 1,
      value: 35,
      showDigits: false,
      style: 'abacus' as const,
    };
    const Render = placeValuePart.Render as (p: { p: unknown; ctx: unknown }) => ReactNode;
    const els = flatten(Render({ p: props, ctx: { theme } }));
    // 没有字号为 32 的数字文字
    const digitTexts = els.filter(
      (e) => e.type === 'text' && e.props.fontSize === 32,
    );
    expect(digitTexts).toHaveLength(0);
  });

  it('check: value 的位数超过 places 或小数位超过 decimals 时报错', () => {
    // 1. 整数位数超过 places
    const badPlaces = checkScene({
      params: {},
      objects: [
        {
          id: 'pv',
          type: 'place-value',
          places: 2,
          value: 1000, // 4 位数 > places 2
        },
      ],
      steps: [],
    });
    expect(
      badPlaces.some((i) => i.message.includes('value 的位数超过 places')),
    ).toBe(true);

    // 2. 小数位数超过 decimals
    const badDecimals = checkScene({
      params: {},
      objects: [
        {
          id: 'pv',
          type: 'place-value',
          places: 0,
          decimals: 2,
          value: 1.234, // 3 位小数 > decimals 2
        },
      ],
      steps: [],
    });
    expect(
      badDecimals.some((i) => i.message.includes('value 的小数位数超过 decimals')),
    ).toBe(true);

    // 3. style 错误
    const badStyle = checkScene({
      params: {},
      objects: [
        {
          id: 'pv',
          type: 'place-value',
          style: 'table',
        },
      ],
      steps: [],
    });
    expect(
      badStyle.some((i) => i.message.includes('计数器的 style 只能是')),
    ).toBe(true);

    // 4. 合法配置检查通过
    const ok = checkScene({
      params: {},
      objects: [
        {
          id: 'pv',
          type: 'place-value',
          places: 2,
          decimals: 2,
          value: 305.25,
        },
      ],
      steps: [],
    });
    expect(ok).toEqual([]);
  });
});
