import { isValidElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { getTheme } from '@flow-see/core';
import { BlankBox } from './mark';
import {
  columnCalcPart,
  columnCalcPlan,
  layoutOf,
  subtractionSteps,
} from './columncalc';
import { findSubitem } from '../index';

const m = { at: [400, 200], a: 38, b: 27, op: '×', size: 44 };

interface El {
  type: unknown;
  props: Record<string, unknown>;
}

function flatten(node: ReactNode, out: El[] = []): El[] {
  if (Array.isArray(node)) node.forEach((n) => flatten(n, out));
  else if (isValidElement(node)) {
    const el = node as unknown as El;
    out.push(el);
    if (typeof el.type === 'string') flatten(el.props.children as ReactNode, out);
    else if (typeof el.type === 'function' && el.type !== BlankBox)
      flatten((el.type as (p: unknown) => ReactNode)(el.props), out);
  }
  return out;
}

const renderPart = (p: Record<string, unknown>): El[] => {
  const Render = columnCalcPart.Render as unknown as (a: { p: unknown; ctx: unknown }) => ReactNode;
  return flatten(Render({ p, ctx: { theme: getTheme('cute') } }));
};

const smallWords = (els: El[]) =>
  els
    .filter((e) => e.type === 'text' && Number(e.props.fontSize) < 30)
    .map((e) => String(e.props.children));

const resWords = (els: El[], yRes: number) =>
  els
    .filter((e) => e.type === 'text' && Math.abs(Number(e.props.y) - yRes) < 1)
    .map((e) => String(e.props.children));

describe('竖式', () => {
  it('两位数乘两位数：每行从被乘数的个位乘起，进位逐步产生', () => {
    const plan = columnCalcPlan(m);
    // 8×7=56 → 写 6 进 5；3×7=21+5=26 → 写 6、进到百位的 2；8×2=16 → 写 6 进 1；3×2=6+1=7
    const mul = plan.steps.filter((s) => s.phase !== 'add');
    expect(mul).toHaveLength(4);
    expect(mul[0].cells).toEqual([{ row: 0, col: 0, digit: 6 }]);
    expect(mul[0].carry).toEqual({ col: 1, digit: 5 });
    expect(mul[1].cells.map((c) => c.digit)).toEqual([6, 2]);
    expect(mul[1].carry).toBeUndefined();
    // 第二行向左空一位：8×2 写在十位列
    expect(mul[2].cells[0]).toEqual({ row: 1, col: 1, digit: 6 });
    expect(mul[3].cells[0]).toEqual({ row: 1, col: 2, digit: 7 });
  });

  it('相加：266 + 760 = 1026，逐位写出，满十进位', () => {
    const plan = columnCalcPlan(m);
    const add = plan.steps.filter((s) => s.phase === 'add');
    expect(add.map((s) => s.cells[0].digit)).toEqual([6, 2, 0, 1]);
    expect(add.map((s) => s.carry?.digit)).toEqual([undefined, 1, 1, undefined]);
    expect(plan.result).toBe(1026);
    expect(plan.ncols).toBe(4);
  });

  it('乘数是一位数时没有相加那一步，部分积就是得数', () => {
    const plan = columnCalcPlan({ ...m, a: 36, b: 4 });
    expect(plan.hasAdd).toBe(false);
    expect(plan.steps).toHaveLength(2);
    const digits = plan.steps.flatMap((s) => s.cells.map((c) => c.digit));
    expect(digits).toEqual([4, 4, 1]);
  });

  it('加法：两个数上下对齐逐位加', () => {
    const plan = columnCalcPlan({ ...m, op: '+', a: 478, b: 256 });
    expect(plan.rows).toBe(0);
    expect(plan.steps.map((s) => s.cells[0].digit)).toEqual([4, 3, 7]);
    expect(plan.result).toBe(734);
  });

  it('包围盒只包住已经写出的部分，随 show 一步步变大', () => {
    const h = [0, 1, 3, 5].map((show) => columnCalcPart.bbox({ ...m, show }).h);
    expect(h[0]).toBeLessThan(h[1]);
    expect(h[1]).toBeLessThan(h[2]);
    expect(h[2]).toBeLessThan(h[3]);
  });
});

describe('竖式减法（任务卡 X1）', () => {
  it('纯函数 subtractionSteps 计算每位退位与连续退位链', () => {
    // 52 − 27：个位退位
    expect(subtractionSteps(52, 27)).toEqual([
      { place: 0, borrow: true },
      { place: 1, borrow: false },
    ]);

    // 305 − 128：中间有 0 的连续退位
    expect(subtractionSteps(305, 128)).toEqual([
      { place: 0, borrow: true, chainFrom: 2 },
      { place: 1, borrow: false },
      { place: 2, borrow: false },
    ]);

    // 600 − 1：连续退位两次
    expect(subtractionSteps(600, 1)).toEqual([
      { place: 0, borrow: true, chainFrom: 2 },
      { place: 1, borrow: false },
      { place: 2, borrow: false },
    ]);

    // 45 − 23：不退位
    expect(subtractionSteps(45, 23)).toEqual([
      { place: 0, borrow: false },
      { place: 1, borrow: false },
    ]);
  });

  it('52 − 27（个位退位）：计划与每一步画面元素', () => {
    const props = { at: [400, 200], a: 52, b: 27, op: '−', size: 44 };
    const plan = columnCalcPlan(props);
    const L = layoutOf(props, plan);
    expect(plan.op).toBe('−');
    expect(plan.result).toBe(25);
    expect(plan.ncols).toBe(2);
    expect(plan.rows).toBe(0);
    expect(plan.steps).toHaveLength(2);

    // 第 0 步（个位）：向十位退位，在十位头上画退位点，个位写小 12，差写 5
    expect(plan.steps[0]).toMatchObject({
      place: 0,
      borrow: true,
      borrowDots: [1],
      smallValues: [{ col: 0, text: '12' }],
      cells: [{ row: 'res', col: 0, digit: 5 }],
    });

    // 第 1 步（十位）：原数 5 变小 4，4 − 2 = 2，差写 2
    expect(plan.steps[1]).toMatchObject({
      place: 1,
      borrow: false,
      borrowDots: [],
      smallValues: [{ col: 1, text: '4' }],
      cells: [{ row: 'res', col: 1, digit: 2 }],
    });

    // 画面元素验证：show = 1 时画出退位点（位置在十位上方）、个位小字 12、差 5
    const els1 = renderPart({ ...props, show: 1 });
    const circles1 = els1.filter((e) => e.type === 'circle' && Number(e.props.opacity) > 0);
    expect(circles1).toHaveLength(1);
    expect(circles1[0].props.cx).toBeCloseTo(L.x(1));
    expect(circles1[0].props.cy).toBeCloseTo(L.yDot);
    expect(circles1[0].props.r).toBeCloseTo(44 * 0.08);

    const sm1 = smallWords(els1);
    expect(sm1).toContain('12');
    expect(sm1).not.toContain('4');
    const rw1 = resWords(els1, L.yRes);
    expect(rw1).toEqual(['5']);

    // show = 2 时画出小字 4、差 2
    const els2 = renderPart({ ...props, show: 2 });
    const sm2 = smallWords(els2);
    expect(sm2).toContain('12');
    expect(sm2).toContain('4');
    const rw2 = resWords(els2, L.yRes);
    expect(rw2).toContain('5');
    expect(rw2).toContain('2');
  });

  it('305 − 128（中间有 0 的连续退位）：计划与每一步画面元素', () => {
    const props = { at: [400, 200], a: 305, b: 128, op: '−', size: 44 };
    const plan = columnCalcPlan(props);
    const L = layoutOf(props, plan);
    expect(plan.result).toBe(177);
    expect(plan.steps).toHaveLength(3);

    // 第 0 步：个位不够减向十位借，十位为 0 向百位借（chainFrom: 2），十位与百位头上都有退位点，十位变小 9，个位写小 15，差写 7
    expect(plan.steps[0]).toMatchObject({
      place: 0,
      borrow: true,
      chainFrom: 2,
      borrowDots: [1, 2],
      smallValues: [
        { col: 1, text: '9' },
        { col: 0, text: '15' },
      ],
      cells: [{ row: 'res', col: 0, digit: 7 }],
    });

    // 第 1 步：十位够减（9 − 2 = 7），不产生新标记
    expect(plan.steps[1]).toMatchObject({
      place: 1,
      borrow: false,
      borrowDots: [],
      smallValues: [],
      cells: [{ row: 'res', col: 1, digit: 7 }],
    });

    // 第 2 步：百位头上借过位，写小 2（3 − 1），2 − 1 = 1，差写 1
    expect(plan.steps[2]).toMatchObject({
      place: 2,
      borrow: false,
      borrowDots: [],
      smallValues: [{ col: 2, text: '2' }],
      cells: [{ row: 'res', col: 2, digit: 1 }],
    });

    // 画面元素验证：show = 1 时有两个退位点（十位与百位），小 9、小 15、差 7
    const els1 = renderPart({ ...props, show: 1 });
    const circles1 = els1.filter((e) => e.type === 'circle' && Number(e.props.opacity) > 0);
    expect(circles1).toHaveLength(2);
    const cxs = circles1.map((c) => Number(c.props.cx));
    expect(cxs.some((x) => Math.abs(x - L.x(1)) < 0.1)).toBe(true);
    expect(cxs.some((x) => Math.abs(x - L.x(2)) < 0.1)).toBe(true);

    const sm1 = smallWords(els1);
    expect(sm1).toContain('9');
    expect(sm1).toContain('15');
    expect(sm1).not.toContain('2'); // 百位小字 2 还未出现
    const rw1 = resWords(els1, L.yRes);
    expect(rw1).toEqual(['7']);

    // show = 3 时全部写出
    const els3 = renderPart({ ...props, show: 3 });
    const sm3 = smallWords(els3);
    expect(sm3).toContain('2'); // 百位小字 2
    const rw3 = resWords(els3, L.yRes);
    expect(rw3).toContain('7');
    expect(rw3).toContain('1');
  });

  it('600 − 1（连续退位两次）：跨两级 0 借位与每一步画面元素', () => {
    const props = { at: [400, 200], a: 600, b: 1, op: '−', size: 44 };
    const plan = columnCalcPlan(props);
    const L = layoutOf(props, plan);
    expect(plan.result).toBe(599);
    expect(plan.steps).toHaveLength(3);

    // 第 0 步：向十位借（十位为0）向百位借（chainFrom: 2），百位与十位退位点，十位小 9，个位小 10，差 9
    expect(plan.steps[0]).toMatchObject({
      place: 0,
      borrow: true,
      chainFrom: 2,
      borrowDots: [1, 2],
      smallValues: [
        { col: 1, text: '9' },
        { col: 0, text: '10' },
      ],
      cells: [{ row: 'res', col: 0, digit: 9 }],
    });

    // 第 1 步：十位 9 − 0 = 9
    expect(plan.steps[1]).toMatchObject({
      place: 1,
      borrow: false,
      borrowDots: [],
      smallValues: [],
      cells: [{ row: 'res', col: 1, digit: 9 }],
    });

    // 第 2 步：百位原数 6 变小 5，5 − 0 = 5
    expect(plan.steps[2]).toMatchObject({
      place: 2,
      borrow: false,
      borrowDots: [],
      smallValues: [{ col: 2, text: '5' }],
      cells: [{ row: 'res', col: 2, digit: 5 }],
    });

    const els1 = renderPart({ ...props, show: 1 });
    const circles1 = els1.filter((e) => e.type === 'circle' && Number(e.props.opacity) > 0);
    expect(circles1).toHaveLength(2);
    const sm1 = smallWords(els1);
    expect(sm1).toContain('10');
    expect(sm1).toContain('9');

    const els3 = renderPart({ ...props, show: 3 });
    const sm3 = smallWords(els3);
    expect(sm3).toContain('5');
    const rw3 = resWords(els3, L.yRes);
    expect(rw3.filter((w) => w === '9')).toHaveLength(2);
    expect(rw3).toContain('5');
  });

  it('45 − 23（不退位）：每一步不产生退位点和小字', () => {
    const props = { at: [400, 200], a: 45, b: 23, op: '−', size: 44 };
    const plan = columnCalcPlan(props);
    const L = layoutOf(props, plan);
    expect(plan.result).toBe(22);
    expect(plan.steps).toHaveLength(2);

    expect(plan.steps[0]).toMatchObject({
      place: 0,
      borrow: false,
      borrowDots: [],
      smallValues: [],
      cells: [{ row: 'res', col: 0, digit: 2 }],
    });

    expect(plan.steps[1]).toMatchObject({
      place: 1,
      borrow: false,
      borrowDots: [],
      smallValues: [],
      cells: [{ row: 'res', col: 1, digit: 2 }],
    });

    const els = renderPart({ ...props, show: 2 });
    const circles = els.filter((e) => e.type === 'circle');
    expect(circles).toHaveLength(0);
    const sm = smallWords(els);
    expect(sm).toHaveLength(0);
    const rw = resWords(els, L.yRes);
    expect(rw).toEqual(['2', '2']);
  });

  it('blank 时该格画空框，答对清空后写出数字', () => {
    const props = { at: [400, 200], a: 52, b: 27, op: '−', size: 44, blank: ['r2c0'], show: 0 };
    const plan = columnCalcPlan(props);
    const L = layoutOf(props, plan);
    // show = 0 且 blank: ['r2c0'] 时，差的个位画成空框
    const elsBlank = renderPart(props);
    const blanks = elsBlank.filter(
      (e) => e.type === BlankBox || (e.props && typeof e.props === 'object' && 'data-blank' in e.props),
    );
    expect(blanks).toHaveLength(1);
    // 此时差的行没有填上数字 5
    const rwBlank = resWords(elsBlank, L.yRes);
    expect(rwBlank).toHaveLength(0);

    // 答对后 blank: []，show: 1 时，空框消失，数字 5 写出
    const elsDone = renderPart({ ...props, blank: [], show: 1 });
    const blanksDone = elsDone.filter(
      (e) => e.type === BlankBox || (e.props && typeof e.props === 'object' && 'data-blank' in e.props),
    );
    expect(blanksDone).toHaveLength(0);
    const rwDone = resWords(elsDone, L.yRes);
    expect(rwDone).toEqual(['5']);
  });

  it('subitems：返回 r0c/r1c/r2c 以及退位点 borrow.<列>', () => {
    const props = { at: [400, 200], a: 305, b: 128, op: '−', size: 44 };
    const subs = columnCalcPart.subitems?.(props);
    expect(subs).toBeDefined();

    // 被减数 305：r0c0(5)、r0c1(0)、r0c2(3)
    expect(findSubitem(columnCalcPart, props, 'r0c0')).toMatchObject({ name: 'r0c0', value: 5 });
    expect(findSubitem(columnCalcPart, props, 'r0c1')).toMatchObject({ name: 'r0c1', value: 0 });
    expect(findSubitem(columnCalcPart, props, 'r0c2')).toMatchObject({ name: 'r0c2', value: 3 });

    // 减数 128：r1c0(8)、r1c1(2)、r1c2(1)
    expect(findSubitem(columnCalcPart, props, 'r1c0')).toMatchObject({ name: 'r1c0', value: 8 });
    expect(findSubitem(columnCalcPart, props, 'r1c1')).toMatchObject({ name: 'r1c1', value: 2 });
    expect(findSubitem(columnCalcPart, props, 'r1c2')).toMatchObject({ name: 'r1c2', value: 1 });

    // 差 177：r2c0(7)、r2c1(7)、r2c2(1)
    expect(findSubitem(columnCalcPart, props, 'r2c0')).toMatchObject({ name: 'r2c0', value: 7 });
    expect(findSubitem(columnCalcPart, props, 'r2c1')).toMatchObject({ name: 'r2c1', value: 7 });
    expect(findSubitem(columnCalcPart, props, 'r2c2')).toMatchObject({ name: 'r2c2', value: 1 });

    // 退位点：borrow.1 和 borrow.2
    const borrow1 = findSubitem(columnCalcPart, props, 'borrow.1');
    const borrow2 = findSubitem(columnCalcPart, props, 'borrow.2');
    expect(borrow1).toBeDefined();
    expect(borrow2).toBeDefined();
    expect(borrow1).toMatchObject({ name: 'borrow.1' });
    expect(borrow2).toMatchObject({ name: 'borrow.2' });

    // 通配符 borrow.* 查到两个退位点
    const allBorrows = findSubitem(columnCalcPart, props, 'borrow.*');
    expect(Array.isArray(allBorrows)).toBe(true);
    expect(allBorrows).toHaveLength(2);
  });

  it('减法包围盒：包含结果行和借位行', () => {
    const props = { at: [400, 200], a: 52, b: 27, op: '−', size: 44 };
    const h0 = columnCalcPart.bbox({ ...props, show: 0 }).h;
    const h1 = columnCalcPart.bbox({ ...props, show: 1 }).h;
    expect(h0).toBeLessThan(h1);
  });
});
