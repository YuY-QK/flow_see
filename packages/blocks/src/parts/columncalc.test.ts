import { isValidElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { getTheme } from '@flow-see/core';
import { BlankBox } from './mark';
import {
  columnCalcPart,
  columnCalcPlan,
  divisionSteps,
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

describe('竖式除法（长除法，任务卡 X2）', () => {
  it('纯函数 divisionSteps 计算每轮商位、乘积与零标记', () => {
    // 84 ÷ 4：两轮，无余数
    expect(divisionSteps(84, 4)).toEqual([
      { round: 0, place: 1, quotientDigit: 2, zero: false, product: 8, difference: 0, droppedDigit: 4 },
      { round: 1, place: 0, quotientDigit: 1, zero: false, product: 4, difference: 0, droppedDigit: undefined },
    ]);

    // 96 ÷ 3：两轮，无余数
    expect(divisionSteps(96, 3)).toEqual([
      { round: 0, place: 1, quotientDigit: 3, zero: false, product: 9, difference: 0, droppedDigit: 6 },
      { round: 1, place: 0, quotientDigit: 2, zero: false, product: 6, difference: 0, droppedDigit: undefined },
    ]);

    // 85 ÷ 4：两轮，余数 1
    expect(divisionSteps(85, 4)).toEqual([
      { round: 0, place: 1, quotientDigit: 2, zero: false, product: 8, difference: 0, droppedDigit: 5 },
      { round: 1, place: 0, quotientDigit: 1, zero: false, product: 4, difference: 1, droppedDigit: undefined },
    ]);

    // 612 ÷ 3：三轮，商中间 0
    expect(divisionSteps(612, 3)).toEqual([
      { round: 0, place: 2, quotientDigit: 2, zero: false, product: 6, difference: 0, droppedDigit: 1 },
      { round: 1, place: 1, quotientDigit: 0, zero: true, difference: 1, droppedDigit: 2 },
      { round: 2, place: 0, quotientDigit: 4, zero: false, product: 12, difference: 0, droppedDigit: undefined },
    ]);

    // 120 ÷ 4：最高位 1 < 4 从十位起商，末尾商 0
    expect(divisionSteps(120, 4)).toEqual([
      { round: 0, place: 1, quotientDigit: 3, zero: false, product: 12, difference: 0, droppedDigit: 0 },
      { round: 1, place: 0, quotientDigit: 0, zero: true, difference: 0, droppedDigit: undefined },
    ]);

    // 156 ÷ 12：除数两位数
    expect(divisionSteps(156, 12)).toEqual([
      { round: 0, place: 1, quotientDigit: 1, zero: false, product: 12, difference: 3, droppedDigit: 6 },
      { round: 1, place: 0, quotientDigit: 3, zero: false, product: 36, difference: 0, droppedDigit: undefined },
    ]);
  });

  it('84 ÷ 4：计划与每一步画面元素位置', () => {
    const props = { at: [400, 200], a: 84, b: 4, op: '÷', size: 44 };
    const plan = columnCalcPlan(props);
    const L = layoutOf(props, plan);
    expect(plan.op).toBe('÷');
    expect(plan.result).toBe(21);
    expect(plan.remainder).toBe(0);
    expect(plan.ncols).toBe(2);
    expect(plan.steps).toHaveLength(7);

    // 7 个微步的类型检查
    expect(plan.steps.map((s) => s.divType)).toEqual([
      'quotient',
      'prod',
      'diff',
      'drop',
      'quotient',
      'prod',
      'diff',
    ]);
    expect(plan.steps.map((s) => s.place)).toEqual([1, 1, 1, 0, 0, 0, 0]);

    // show = 0：画出除号“厂”与除数 4、被除数 84
    const els0 = renderPart({ ...props, show: 0 });
    const paths0 = els0.filter((e) => e.type === 'path');
    expect(paths0.length).toBeGreaterThanOrEqual(1); // 厂形除号
    const t0 = els0.filter((e) => e.type === 'text').map((e) => String(e.props.children));
    expect(t0).toContain('4'); // 除数
    expect(t0).toContain('8'); // 被除数十位
    expect(t0).toContain('4'); // 被除数个位
    // 尚未写出商
    const qTexts0 = els0.filter((e) => e.type === 'text' && Math.abs(Number(e.props.y) - L.yQ!) < 1);
    expect(qTexts0).toHaveLength(0);

    // show = 1：第 0 步（商十位 2，在 x(1)）
    const els1 = renderPart({ ...props, show: 1 });
    const qTexts1 = els1.filter(
      (e) => e.type === 'text' && Math.abs(Number(e.props.y) - L.yQ!) < 1,
    );
    expect(qTexts1).toHaveLength(1);
    expect(qTexts1[0].props.children).toBe('2');
    expect(Number(qTexts1[0].props.x)).toBeCloseTo(L.x(1));

    // show = 2：第 1 步（乘积 8，在 x(1), yProd0）
    const r0Layout = L.divRounds![0];
    const els2 = renderPart({ ...props, show: 2 });
    const prodTexts2 = els2.filter(
      (e) => e.type === 'text' && Math.abs(Number(e.props.y) - r0Layout.yProd!) < 1,
    );
    expect(prodTexts2).toHaveLength(1);
    expect(prodTexts2[0].props.children).toBe('8');
    expect(Number(prodTexts2[0].props.x)).toBeCloseTo(L.x(1));

    // show = 3：第 2 步（减：短横线，8 - 8 = 0 教材简写不写 0）
    const els3 = renderPart({ ...props, show: 3 });
    const lines3 = els3.filter(
      (e) => e.type === 'line' && Math.abs(Number(e.props.y1) - r0Layout.yLine!) < 1 && Number(e.props.opacity) > 0,
    );
    expect(lines3).toHaveLength(1);
    expect(Number(lines3[0].props.x1)).toBeCloseTo(r0Layout.lineX1!);
    expect(Number(lines3[0].props.x2)).toBeCloseTo(r0Layout.lineX2!);

    // show = 4：第 3 步（落：个位 4 落下来，带小箭头）
    const els4 = renderPart({ ...props, show: 4 });
    const dropTexts4 = els4.filter(
      (e) => e.type === 'text' && Math.abs(Number(e.props.y) - r0Layout.yDiff!) < 1,
    );
    expect(dropTexts4).toHaveLength(1);
    expect(dropTexts4[0].props.children).toBe('4');
    expect(Number(dropTexts4[0].props.x)).toBeCloseTo(L.x(0));

    // show = 5：第 4 步（商个位 1，在 x(0)）
    const els5 = renderPart({ ...props, show: 5 });
    const qTexts5 = els5.filter(
      (e) => e.type === 'text' && Math.abs(Number(e.props.y) - L.yQ!) < 1,
    );
    expect(qTexts5).toHaveLength(2);
    const qVals5 = qTexts5.map((t) => String(t.props.children));
    expect(qVals5).toContain('2');
    expect(qVals5).toContain('1');

    // show = 7：第 6 步全部写出，最后一位写出余数 0
    const r1Layout = L.divRounds![1];
    const els7 = renderPart({ ...props, show: 7 });
    const finalDiff7 = els7.filter(
      (e) => e.type === 'text' && Math.abs(Number(e.props.y) - r1Layout.yDiff!) < 1,
    );
    expect(finalDiff7).toHaveLength(1);
    expect(finalDiff7[0].props.children).toBe('0');
    expect(Number(finalDiff7[0].props.x)).toBeCloseTo(L.x(0));
  });

  it('96 ÷ 3（无余数）：计划与每一步画面元素位置', () => {
    const props = { at: [400, 200], a: 96, b: 3, op: '÷', size: 44 };
    const plan = columnCalcPlan(props);
    const L = layoutOf(props, plan);
    expect(plan.result).toBe(32);
    expect(plan.remainder).toBe(0);
    expect(plan.steps).toHaveLength(7);

    // show = 7 全部写出
    const els = renderPart({ ...props, show: 7 });
    // 商为 3 2
    const qTexts = els
      .filter((e) => e.type === 'text' && Math.abs(Number(e.props.y) - L.yQ!) < 1)
      .map((e) => ({ text: String(e.props.children), x: Number(e.props.x) }));
    expect(qTexts).toHaveLength(2);
    expect(qTexts.find((t) => Math.abs(t.x - L.x(1)) < 1)?.text).toBe('3');
    expect(qTexts.find((t) => Math.abs(t.x - L.x(0)) < 1)?.text).toBe('2');

    // 最终差为 0
    const finalRowY = L.divRounds![1].yDiff!;
    const diffTexts = els.filter(
      (e) => e.type === 'text' && Math.abs(Number(e.props.y) - finalRowY) < 1,
    );
    expect(diffTexts).toHaveLength(1);
    expect(diffTexts[0].props.children).toBe('0');
  });

  it('85 ÷ 4（有余数）：计划与最终余数 1 画面元素', () => {
    const props = { at: [400, 200], a: 85, b: 4, op: '÷', size: 44 };
    const plan = columnCalcPlan(props);
    const L = layoutOf(props, plan);
    expect(plan.result).toBe(21);
    expect(plan.remainder).toBe(1);
    expect(plan.steps).toHaveLength(7);

    // 步骤 6 为 diff，value 为 1
    expect(plan.steps[6]).toMatchObject({
      divType: 'diff',
      place: 0,
      value: 1,
    });

    const els = renderPart({ ...props, show: 7 });
    const finalDiffY = L.divRounds![1].yDiff!;
    const diffEls = els.filter(
      (e) => e.type === 'text' && Math.abs(Number(e.props.y) - finalDiffY) < 1,
    );
    expect(diffEls).toHaveLength(1);
    expect(diffEls[0].props.children).toBe('1');
    expect(Number(diffEls[0].props.x)).toBeCloseTo(L.x(0));
  });

  it('612 ÷ 3（商中间 0）：中间某位商 0 省略乘减两小步直接落下一位', () => {
    const props = { at: [400, 200], a: 612, b: 3, op: '÷', size: 44 };
    const plan = columnCalcPlan(props);
    const L = layoutOf(props, plan);
    expect(plan.result).toBe(204);
    expect(plan.remainder).toBe(0);
    expect(plan.steps).toHaveLength(9);

    // 检查步骤类型与 zero: true 标记
    // 步骤 4 为商十位 0：zero: true
    expect(plan.steps[4]).toMatchObject({
      divType: 'quotient',
      place: 1,
      digit: 0,
      zero: true,
    });
    // 步骤 5 为直接落个位 2：zero: true
    expect(plan.steps[5]).toMatchObject({
      divType: 'drop',
      place: 0,
      digit: 2,
      zero: true,
    });

    // show = 5 时十位商 0 出现
    const els5 = renderPart({ ...props, show: 5 });
    const qTexts5 = els5
      .filter((e) => e.type === 'text' && Math.abs(Number(e.props.y) - L.yQ!) < 1)
      .map((e) => ({ text: String(e.props.children), x: Number(e.props.x) }));
    expect(qTexts5.find((t) => Math.abs(t.x - L.x(1)) < 1)?.text).toBe('0');

    // show = 6 时个位 2 落在第一轮差行 (yDiff0)，与十位落下的 1 并排在同一行，形成 12
    const yRow12 = L.divRounds![0].yDiff!;
    const els6 = renderPart({ ...props, show: 6 });
    const row12Texts = els6
      .filter((e) => e.type === 'text' && Math.abs(Number(e.props.y) - yRow12) < 1)
      .map((e) => ({ text: String(e.props.children), x: Number(e.props.x) }));
    expect(row12Texts).toHaveLength(2);
    expect(row12Texts.find((t) => Math.abs(t.x - L.x(1)) < 1)?.text).toBe('1');
    expect(row12Texts.find((t) => Math.abs(t.x - L.x(0)) < 1)?.text).toBe('2');

    // show = 9 全部写出：个位商 4，乘积 12，余数 0
    const els9 = renderPart({ ...props, show: 9 });
    const qTexts9 = els9
      .filter((e) => e.type === 'text' && Math.abs(Number(e.props.y) - L.yQ!) < 1)
      .map((e) => String(e.props.children));
    expect(qTexts9).toContain('2');
    expect(qTexts9).toContain('0');
    expect(qTexts9).toContain('4');
  });

  it('120 ÷ 4（商末尾 0）：最高位不够除跳过，末尾商 0 占位', () => {
    const props = { at: [400, 200], a: 120, b: 4, op: '÷', size: 44 };
    const plan = columnCalcPlan(props);
    const L = layoutOf(props, plan);
    expect(plan.result).toBe(30);
    expect(plan.steps).toHaveLength(5);

    // 第一位商从十位（place 1）开始，百位没有 0
    expect(plan.steps[0]).toMatchObject({
      divType: 'quotient',
      place: 1,
      digit: 3,
    });
    // 乘 12、减 0、落 0
    expect(plan.steps[1].divType).toBe('prod');
    expect(plan.steps[2].divType).toBe('diff');
    expect(plan.steps[3]).toMatchObject({
      divType: 'drop',
      place: 0,
      digit: 0,
    });
    // 最后一位商 0（zero: true），无后续乘减
    expect(plan.steps[4]).toMatchObject({
      divType: 'quotient',
      place: 0,
      digit: 0,
      zero: true,
    });

    const els = renderPart({ ...props, show: 5 });
    // 商只有 3 和 0（十位 3、个位 0），百位上方无文字
    const qTexts = els.filter(
      (e) => e.type === 'text' && Math.abs(Number(e.props.y) - L.yQ!) < 1,
    );
    expect(qTexts).toHaveLength(2);
    expect(qTexts.find((t) => Math.abs(Number(t.props.x) - L.x(2)) < 1)).toBeUndefined();
    expect(qTexts.find((t) => Math.abs(Number(t.props.x) - L.x(1)) < 1)?.props.children).toBe('3');
    expect(qTexts.find((t) => Math.abs(Number(t.props.x) - L.x(0)) < 1)?.props.children).toBe('0');
  });

  it('156 ÷ 12：两位数除数排版与每一步位置', () => {
    const props = { at: [400, 200], a: 156, b: 12, op: '÷', size: 44 };
    const plan = columnCalcPlan(props);
    const L = layoutOf(props, plan);
    expect(plan.result).toBe(13);
    expect(plan.remainder).toBe(0);
    expect(plan.steps).toHaveLength(7);

    // 除数 12 占两位：十位 1、个位 2
    const els = renderPart({ ...props, show: 7 });
    const divTexts = els
      .filter((e) => e.type === 'text' && Math.abs(Number(e.props.y) - L.yA) < 1 && Number(e.props.x) < L.xBracket!)
      .map((e) => String(e.props.children));
    expect(divTexts).toContain('1');
    expect(divTexts).toContain('2');

    // 第一步商 1 写在十位（place 1）
    expect(plan.steps[0]).toMatchObject({ divType: 'quotient', place: 1, digit: 1 });
    // 乘积 12 右端对齐十位（col 1 是 2、col 2 是 1）
    expect(plan.steps[1]).toMatchObject({ divType: 'prod', place: 1, value: 12 });
    // 差 3 写在十位
    expect(plan.steps[2]).toMatchObject({ divType: 'diff', place: 1, value: 3 });
    // 落个位 6，与 3 拼成 36
    expect(plan.steps[3]).toMatchObject({ divType: 'drop', place: 0, digit: 6 });
    // 第二步商 3 写在个位
    expect(plan.steps[4]).toMatchObject({ divType: 'quotient', place: 0, digit: 3 });
    // 乘积 36
    expect(plan.steps[5]).toMatchObject({ divType: 'prod', place: 0, value: 36 });
    // 差 0
    expect(plan.steps[6]).toMatchObject({ divType: 'diff', place: 0, value: 0 });
  });

  it('384 ÷ 48（试商 7 改 8 的 trial）：试商、试乘、改商划掉与新商', () => {
    const props = {
      at: [400, 200],
      a: 384,
      b: 48,
      op: '÷',
      size: 44,
      trial: { place: 0, value: 7 },
    };
    const plan = columnCalcPlan(props);
    const L = layoutOf(props, plan);
    expect(plan.result).toBe(8);
    expect(plan.steps).toHaveLength(5);

    // 步骤序列：trial-quotient -> trial-prod -> adjust-quotient -> prod -> diff
    expect(plan.steps.map((s) => s.divType)).toEqual([
      'trial-quotient',
      'trial-prod',
      'adjust-quotient',
      'prod',
      'diff',
    ]);

    // show = 1 时商位写 7（未划掉）
    const els1 = renderPart({ ...props, show: 1 });
    const qTexts1 = els1.filter(
      (e) => e.type === 'text' && Math.abs(Number(e.props.y) - L.yQ!) < 1,
    );
    expect(qTexts1).toHaveLength(1);
    expect(qTexts1[0].props.children).toBe('7');
    // 无斜线
    const slash1 = els1.filter(
      (e) => e.type === 'line' && Math.abs(Number(e.props.y1) - (L.yQ! + 44 * 0.35)) < 1,
    );
    expect(slash1).toHaveLength(0);

    // show = 2 时下方写出试乘积 7 × 48 = 336
    const els2 = renderPart({ ...props, show: 2 });
    const prodTexts2 = els2
      .filter((e) => e.type === 'text' && Math.abs(Number(e.props.y) - L.divRounds![0].yProd!) < 1)
      .map((e) => String(e.props.children));
    expect(prodTexts2).toContain('3');
    expect(prodTexts2).toContain('6');

    // show = 3 时划掉 7，上方写出新商 8
    const els3 = renderPart({ ...props, show: 3 });
    // 划掉 7 的斜线
    const slash3 = els3.filter(
      (e) => e.type === 'line' && Number(e.props.opacity) > 0 && Math.abs(Number(e.props.y1) - (L.yQ! + 44 * 0.35)) < 1,
    );
    expect(slash3).toHaveLength(1);
    // 上方写出新商 8（位于 yTrialAdj）
    const adjText3 = els3.filter(
      (e) => e.type === 'text' && Math.abs(Number(e.props.y) - L.yTrialAdj!) < 1,
    );
    expect(adjText3).toHaveLength(1);
    expect(adjText3[0].props.children).toBe('8');

    // show = 5 时全部写出：正确积 384、余数 0
    const els5 = renderPart({ ...props, show: 5 });
    const finalDiff5 = els5.filter(
      (e) => e.type === 'text' && Math.abs(Number(e.props.y) - L.divRounds![0].yDiff!) < 1,
    );
    expect(finalDiff5).toHaveLength(1);
    expect(finalDiff5[0].props.children).toBe('0');
  });

  it('subitems：支持 q<列>、dividend.c<列>、divisor、step<n>.prod 与 step<n>.diff', () => {
    const props = { at: [400, 200], a: 156, b: 12, op: '÷', size: 44 };
    const subs = columnCalcPart.subitems?.(props);
    expect(subs).toBeDefined();

    // 商 q0(3)、q1(1)
    expect(findSubitem(columnCalcPart, props, 'q0')).toMatchObject({ name: 'q0', value: 3 });
    expect(findSubitem(columnCalcPart, props, 'q1')).toMatchObject({ name: 'q1', value: 1 });

    // 被除数 dividend.c0(6)、dividend.c1(5)、dividend.c2(1)
    expect(findSubitem(columnCalcPart, props, 'dividend.c0')).toMatchObject({ name: 'dividend.c0', value: 6 });
    expect(findSubitem(columnCalcPart, props, 'dividend.c1')).toMatchObject({ name: 'dividend.c1', value: 5 });
    expect(findSubitem(columnCalcPart, props, 'dividend.c2')).toMatchObject({ name: 'dividend.c2', value: 1 });

    // 除数 divisor(12)
    expect(findSubitem(columnCalcPart, props, 'divisor')).toMatchObject({ name: 'divisor', value: 12 });

    // 步骤积与差：step1.prod(12)、step1.diff(3)、step2.prod(36)、step2.diff(0)
    expect(findSubitem(columnCalcPart, props, 'step1.prod')).toMatchObject({ name: 'step1.prod', value: 12 });
    expect(findSubitem(columnCalcPart, props, 'step1.diff')).toMatchObject({ name: 'step1.diff', value: 3 });
    expect(findSubitem(columnCalcPart, props, 'step2.prod')).toMatchObject({ name: 'step2.prod', value: 36 });
    expect(findSubitem(columnCalcPart, props, 'step2.diff')).toMatchObject({ name: 'step2.diff', value: 0 });

    // 通配符查询
    const allProds = findSubitem(columnCalcPart, props, 'step*.prod');
    expect(Array.isArray(allProds)).toBe(true);
    expect(allProds).toHaveLength(2);

    const allQ = findSubitem(columnCalcPart, props, 'q*');
    expect(Array.isArray(allQ)).toBe(true);
    expect(allQ).toHaveLength(2);
  });

  it('blank：除法下填空格子画空框，答对后正确填入数字', () => {
    const props = {
      at: [400, 200],
      a: 84,
      b: 4,
      op: '÷',
      size: 44,
      blank: ['q0', 'step1.prod'],
      show: 7,
    };
    const els = renderPart(props);
    const blanks = els.filter(
      (e) => e.type === BlankBox || (e.props && typeof e.props === 'object' && 'data-blank' in e.props),
    );
    expect(blanks).toHaveLength(2);

    // 清空 blank 后不再有 BlankBox
    const elsDone = renderPart({ ...props, blank: [] });
    const blanksDone = elsDone.filter(
      (e) => e.type === BlankBox || (e.props && typeof e.props === 'object' && 'data-blank' in e.props),
    );
    expect(blanksDone).toHaveLength(0);
  });

  it('除法包围盒：包含除号、商、除数与逐步展开内容', () => {
    const props = { at: [400, 200], a: 84, b: 4, op: '÷', size: 44 };
    const h0 = columnCalcPart.bbox({ ...props, show: 0 }).h;
    const h1 = columnCalcPart.bbox({ ...props, show: 1 }).h;
    const h2 = columnCalcPart.bbox({ ...props, show: 2 }).h;
    const h7 = columnCalcPart.bbox({ ...props, show: 7 }).h;

    // show = 0 仅有除号行；show = 1 增加了顶部商位；show = 2 增加了乘积；show = 7 完整展开
    expect(h0).toBeLessThan(h1);
    expect(h1).toBeLessThan(h2);
    expect(h2).toBeLessThan(h7);

    // 带 trial 时，调商后包围盒覆盖顶部调商小字
    const trialProps = {
      at: [400, 200],
      a: 384,
      b: 48,
      op: '÷',
      size: 44,
      trial: { place: 0, value: 7 },
    };
    const boxBeforeAdj = columnCalcPart.bbox({ ...trialProps, show: 2 });
    const boxAfterAdj = columnCalcPart.bbox({ ...trialProps, show: 3 });
    expect(boxAfterAdj.y).toBeLessThan(boxBeforeAdj.y);
  });
});
