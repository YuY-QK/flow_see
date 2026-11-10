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

describe('竖式小数、多位数乘法、简写与 blank（任务卡 X3）', () => {
  it('decimals 参数支持与从数值推断小数位数（保留末尾 0 如 2.50）', () => {
    // 隐式推断
    const plan1 = columnCalcPlan({ a: 2.5, b: 3.86, op: '+' });
    expect(plan1.decimals).toEqual([1, 2]);
    expect(plan1.isDecimal).toBe(true);

    // 显式指定 decimals: [2, 0]（保留末尾 0 成为 2.50）
    const plan2 = columnCalcPlan({ a: 2.5, b: 3, op: '+', decimals: [2, 0] });
    expect(plan2.decimals).toEqual([2, 0]);
    expect(plan2.a[0]).toBe(0); // 2.50 的百分位是 0
    expect(plan2.a[1]).toBe(5); // 十分位 5
    expect(plan2.a[2]).toBe(2); // 个位 2
  });

  it('2.5 + 3.86：小数点对齐、末尾补灰色小 0、结果对齐', () => {
    const props = { at: [400, 200], a: 2.5, b: 3.86, op: '+', size: 44 };
    const plan = columnCalcPlan(props);
    const L = layoutOf(props, plan);
    expect(plan.isDecimal).toBe(true);
    expect(plan.result).toBe(6.36);
    expect(plan.maxDec).toBe(2);
    expect(plan.padZerosA).toBe(1); // 2.5 补一个 0 成为 2.50
    expect(plan.padZerosB).toBe(0);

    // 4 步：① 补 0；② 百分位 0+6=6；③ 十分位 5+8=13（写 3 进 1）；④ 个位 2+3+1=6
    expect(plan.steps).toHaveLength(4);
    expect(plan.steps[0].phase).toBe('pad');
    expect(plan.steps[1].cells).toEqual([{ row: 'res', col: 0, digit: 6 }]);
    expect(plan.steps[2].cells).toEqual([{ row: 'res', col: 1, digit: 3 }]);
    expect(plan.steps[2].carry).toEqual({ col: 2, digit: 1 });
    expect(plan.steps[3].cells).toEqual([{ row: 'res', col: 2, digit: 6 }]);

    // show = 0 时补的 0 未出现（opacity 0）
    const els0 = renderPart({ ...props, show: 0 });
    const padText0 = els0.find((e) => e.type === 'text' && e.props.x === L.x(0) && e.props.y === L.yA);
    expect(padText0).toBeDefined();
    expect(Number(padText0!.props.opacity)).toBe(0);

    // show = 1 时补位 0 出现：字号更小（44 * 0.75 = 33），颜色为 dim 色
    const els1 = renderPart({ ...props, show: 1 });
    const padText1 = els1.find((e) => e.type === 'text' && e.props.x === L.x(0) && e.props.y === L.yA);
    expect(padText1).toBeDefined();
    expect(Number(padText1!.props.opacity)).toBe(1);
    expect(padText1!.props.children).toBe('0');
    expect(Number(padText1!.props.fontSize)).toBe(44 * 0.75);
    expect(padText1!.props.fill).toBe(getTheme('cute').dim);

    // show = 4 全部写出，结果 6.36，结果行小数点出现
    const els4 = renderPart({ ...props, show: 4 });
    const rw4 = resWords(els4, L.yRes);
    expect(rw4).toContain('6');
    expect(rw4).toContain('3');
    const dots4 = els4.filter((e) => e.type === 'circle');
    // a 有小数点、b 有小数点、res 有小数点
    expect(dots4.length).toBeGreaterThanOrEqual(3);
    const dotRes = dots4.find((d) => d.props.cx === L.xDotRes && Math.abs(Number(d.props.cy) - (L.yRes + 44 * 0.35)) < 1);
    expect(dotRes).toBeDefined();
  });

  it('10 − 2.35：整数末尾补 .00，连续退位与每一步画面元素', () => {
    const props = { at: [400, 200], a: 10, b: 2.35, op: '−', size: 44 };
    const plan = columnCalcPlan(props);
    const L = layoutOf(props, plan);
    expect(plan.result).toBe(7.65);
    expect(plan.padZerosA).toBe(2); // 10 补两个 0 成为 10.00
    expect(plan.steps[0].phase).toBe('pad');

    // show = 1 时，10 补出小数点和两个灰色小 0
    const els1 = renderPart({ ...props, show: 1 });
    const zero0 = els1.find((e) => e.type === 'text' && e.props.x === L.x(0) && e.props.y === L.yA);
    const zero1 = els1.find((e) => e.type === 'text' && e.props.x === L.x(1) && e.props.y === L.yA);
    expect(zero0).toBeDefined();
    expect(zero1).toBeDefined();
    expect(zero0!.props.fill).toBe(getTheme('cute').dim);
    expect(zero1!.props.fill).toBe(getTheme('cute').dim);
    expect(Number(zero0!.props.fontSize)).toBe(44 * 0.75);

    // show = 2 时，百分位向十位退位（chainFrom: 3），退位点产生，差为 5
    const els2 = renderPart({ ...props, show: 2 });
    const sm2 = smallWords(els2);
    expect(sm2).toContain('10'); // 个位借来的 10
    expect(sm2).toContain('9');  // 十分位变 9
    const rw2 = resWords(els2, L.yRes);
    expect(rw2).toEqual(['5']);

    // show = 5 全部算完，差 7.65
    const els5 = renderPart({ ...props, show: 5 });
    const rw5 = resWords(els5, L.yRes);
    expect(rw5).toContain('5');
    expect(rw5).toContain('6');
    expect(rw5).toContain('7');
  });

  it('加法结果末尾的 0 用 dim 色表示（如 5.4 + 2.6 = 8.0）', () => {
    const props = { at: [400, 200], a: 5.4, b: 2.6, op: '+', size: 44, show: 3 };
    const plan = columnCalcPlan(props);
    const L = layoutOf(props, plan);
    expect(plan.result).toBe(8);
    expect(plan.trailingZerosCount).toBe(1);

    const els = renderPart(props);
    // 结果行的 0（十分位）为 dim 色
    const zeroRes = els.find((e) => e.type === 'text' && e.props.x === L.x(0) && Math.abs(Number(e.props.y) - L.yRes) < 1);
    expect(zeroRes).toBeDefined();
    expect(zeroRes!.props.fill).toBe(getTheme('cute').dim);
    // 结果行的 8 为 ink 正常色
    const eightRes = els.find((e) => e.type === 'text' && e.props.x === L.x(1) && Math.abs(Number(e.props.y) - L.yRes) < 1);
    expect(eightRes).toBeDefined();
    expect(eightRes!.props.fill).not.toBe(getTheme('cute').dim);
  });

  it('0.8 × 3：先按整数算右对齐，最后一小步点小数点', () => {
    const props = { at: [400, 200], a: 0.8, b: 3, op: '×', size: 44 };
    const plan = columnCalcPlan(props);
    const L = layoutOf(props, plan);
    expect(plan.result).toBe(2.4);
    expect(plan.maxDec).toBe(1);
    expect(plan.steps).toHaveLength(2);

    // 第 1 步：整数乘 8×3=24，写出 24，phase = 0
    expect(plan.steps[0].phase).toBe(0);
    expect(plan.steps[0].cells).toEqual([
      { row: 0, col: 0, digit: 4 },
      { row: 0, col: 1, digit: 2 },
    ]);

    // 第 2 步：点小数点，phase = 'point'
    expect(plan.steps[1].phase).toBe('point');

    // show = 1 时：积为 24，无小数点
    const els1 = renderPart({ ...props, show: 1 });
    const dots1 = els1.filter(
      (e) => e.type === 'circle' && Math.abs(Number(e.props.cy) - (L.yRes + 44 * 0.35)) < 1,
    );
    expect(dots1).toHaveLength(0);

    // show = 2 时：点上小数点，积变为 2.4
    const els2 = renderPart({ ...props, show: 2 });
    const dots2 = els2.filter(
      (e) => e.type === 'circle' && Math.abs(Number(e.props.cy) - (L.yRes + 44 * 0.35)) < 1,
    );
    expect(dots2).toHaveLength(1);
    expect(dots2[0].props.cx).toBeCloseTo(L.xDotRes!);
  });

  it('0.25 × 0.4（积前补 0）：位数不够时在前面补 0，补的 0 用 accent 色', () => {
    const props = { at: [400, 200], a: 0.25, b: 0.4, op: '×', size: 44 };
    const plan = columnCalcPlan(props);
    const L = layoutOf(props, plan);
    expect(plan.result).toBe(0.1);
    expect(plan.maxDec).toBe(3); // 2 + 1 = 3 位小数
    expect(plan.paddedLeadingZeros).toBe(1); // 25×4=100 只有 3 位，前面补 0 形成 0.100

    const pointStep = plan.steps[plan.steps.length - 1];
    expect(pointStep.phase).toBe('point');
    expect(pointStep.isLeadingZero).toBe(true);
    expect(pointStep.cells).toEqual([{ row: 0, col: 3, digit: 0 }]);

    expect(plan.steps).toHaveLength(3);

    // show = 2 时写出整数乘积 100（尚未点小数点与补 0）
    const els2 = renderPart({ ...props, show: 2 });
    const zeroLeading2 = els2.find(
      (e) => e.type === 'text' && e.props.x === L.x(3) && Math.abs(Number(e.props.y) - L.yRes) < 1,
    );
    expect(zeroLeading2).toBeUndefined();

    // show = 3（最后一小步：点小数点与补 0 步）
    const els3 = renderPart({ ...props, show: 3 });
    // 个位补的 0 使用 accent 色
    const zeroLeading = els3.find(
      (e) => e.type === 'text' && e.props.x === L.x(3) && Math.abs(Number(e.props.y) - L.yRes) < 1,
    );
    expect(zeroLeading).toBeDefined();
    expect(zeroLeading!.props.fill).toBe(getTheme('cute').accent);

    // 末尾的 00 为 dim 色
    const zeroTail0 = els3.find(
      (e) => e.type === 'text' && e.props.x === L.x(0) && Math.abs(Number(e.props.y) - L.yRes) < 1,
    );
    const zeroTail1 = els3.find(
      (e) => e.type === 'text' && e.props.x === L.x(1) && Math.abs(Number(e.props.y) - L.yRes) < 1,
    );
    expect(zeroTail0!.props.fill).toBe(getTheme('cute').dim);
    expect(zeroTail1!.props.fill).toBe(getTheme('cute').dim);
  });

  it('350 × 24（trimZeros: true）：因数末尾 0 写在外面，最后一小步补 0 到积末尾', () => {
    const props = { at: [400, 200], a: 350, b: 24, op: '×', trimZeros: true, size: 44 };
    const plan = columnCalcPlan(props);
    const L = layoutOf(props, plan);
    expect(plan.trimZeros).toBe(true);
    expect(plan.trimmedZerosCount).toBe(1);
    expect(plan.result).toBe(8400);

    // 最后一小步是 trim-zero，将 0 补到积的 col 0
    const lastStep = plan.steps[plan.steps.length - 1];
    expect(lastStep.phase).toBe('trim-zero');
    expect(lastStep.cells).toEqual([{ row: 'res', col: 0, digit: 0 }]);

    // 在倒数第二步（相加完成，未补 0 时）：积中尚未有 col 0 的 0
    const beforeLastShow = plan.steps.length - 1;
    const elsBefore = renderPart({ ...props, show: beforeLastShow });
    const zeroResBefore = elsBefore.find(
      (e) => e.type === 'text' && e.props.x === L.x(0) && Math.abs(Number(e.props.y) - L.yRes) < 1,
    );
    expect(zeroResBefore).toBeUndefined();

    // 在最后一步（show = 总步数）：0 补在积末尾
    const elsFinal = renderPart({ ...props, show: plan.steps.length });
    const zeroResFinal = elsFinal.find(
      (e) => e.type === 'text' && e.props.x === L.x(0) && Math.abs(Number(e.props.y) - L.yRes) < 1,
    );
    expect(zeroResFinal).toBeDefined();
    expect(zeroResFinal!.props.children).toBe('0');
  });

  it('22.4 ÷ 4：商的小数点与被除数小数点对齐，在商的小步出现', () => {
    const props = { at: [400, 200], a: 22.4, b: 4, op: '÷', size: 44 };
    const plan = columnCalcPlan(props);
    const L = layoutOf(props, plan);
    expect(plan.result).toBe(5.6);
    expect(plan.divRounds).toHaveLength(2);

    // 第 1 轮（整数部分 22÷4）：商 5、乘 20、差 2、落 4，共 4 步
    // 第 2 轮（小数部分十分位 24÷4）：商 6（此时商的小数点出现）、乘 24、差 0
    const dotRound = plan.divRounds![1];
    expect(dotRound.hasDot).toBe(true);
    expect(dotRound.qDigit).toBe(6);

    // show = 4（第 1 轮结束时）：商行还没有小数点
    const els4 = renderPart({ ...props, show: 4 });
    const dotQ4 = els4.filter(
      (e) => e.type === 'circle' && Math.abs(Number(e.props.cy) - (L.yQ! + 44 * 0.35)) < 1,
    );
    expect(dotQ4).toHaveLength(0);

    // show = 5（商 6 出现时）：商行小数点出现，与被除数小数点对齐（cx 相同）
    const els5 = renderPart({ ...props, show: 5 });
    const dotQ5 = els5.find(
      (e) => e.type === 'circle' && Math.abs(Number(e.props.cy) - (L.yQ! + 44 * 0.35)) < 1,
    );
    expect(dotQ5).toBeDefined();
    expect(dotQ5!.props.cx).toBeCloseTo(L.xDotQ!);
    expect(L.xDotQ).toBeCloseTo(L.xDotA!);
  });

  it('1 ÷ 4（添 0）：被除数除尽前添 0 继续除，添的 0 用 dim 色', () => {
    const props = { at: [400, 200], a: 1, b: 4, op: '÷', size: 44 };
    const plan = columnCalcPlan(props);
    const L = layoutOf(props, plan);
    expect(plan.result).toBe(0.25);
    expect(plan.divRounds).toHaveLength(3); // 3 轮：商 0、商 2、商 5

    // 第一轮商 0，商行出现 0.，被除数添 0 落位，dropIsAppended 为 true
    expect(plan.divRounds![0].qDigit).toBe(0);
    expect(plan.divRounds![0].hasDot).toBe(true);
    expect(plan.divRounds![0].dropIsAppended).toBe(true);

    // 第二轮添 0 落位，dropIsAppended 为 true
    expect(plan.divRounds![1].dropIsAppended).toBe(true);

    // 第三轮为最后一轮（商 5，整除）
    expect(plan.divRounds![2].qDigit).toBe(5);
    expect(plan.divRounds![2].isLast).toBe(true);

    // show = 99 全部显示
    const els = renderPart({ ...props, show: 99 });
    // 被除数上添的 0 在 yA 行且颜色为 dim 色
    const dimAppended = els.filter(
      (e) => e.type === 'text' && Math.abs(Number(e.props.y) - L.yA) < 1 && e.props.fill === getTheme('cute').dim,
    );
    expect(dimAppended.length).toBeGreaterThanOrEqual(2);
  });

  it('2.52 ÷ 0.6（小数点移动）：第一步把除数、被除数小数点同时右移', () => {
    const props = { at: [400, 200], a: 2.52, b: 0.6, op: '÷', size: 44 };
    const plan = columnCalcPlan(props);
    const L = layoutOf(props, plan);
    expect(plan.isDivShift).toBe(true);
    expect(plan.shiftAmount).toBe(1);
    expect(plan.result).toBe(4.2);

    // 第 1 步是 shift-points
    expect(plan.steps[0].divType).toBe('shift-points');

    // show = 1 时画出移动弧形箭头
    const els1 = renderPart({ ...props, show: 1 });
    const paths = els1.filter((e) => e.type === 'path' && e.props.stroke === getTheme('cute').line);
    // 除数和被除数各有一个弧形箭头与箭头尖端
    expect(paths.length).toBeGreaterThanOrEqual(2);

    // show = 99 算完，商为 4.2
    const elsDone = renderPart({ ...props, show: 99 });
    const qTexts = elsDone
      .filter((e) => e.type === 'text' && Math.abs(Number(e.props.y) - L.yQ!) < 1)
      .map((e) => String(e.props.children));
    expect(qTexts).toContain('4');
    expect(qTexts).toContain('2');
  });

  it('所有 op 都支持 blank 挖空虚线框', () => {
    // 加法 blank
    const pAdd = { at: [400, 200], a: 2.5, b: 3.86, op: '+', blank: ['r2c0'], show: 4 };
    const elsAdd = renderPart(pAdd);
    expect(elsAdd.filter((e) => e.type === BlankBox || (e.props && 'data-blank' in e.props))).toHaveLength(1);

    // 减法 blank
    const pSub = { at: [400, 200], a: 10, b: 2.35, op: '−', blank: ['r2c1'], show: 5 };
    const elsSub = renderPart(pSub);
    expect(elsSub.filter((e) => e.type === BlankBox || (e.props && 'data-blank' in e.props))).toHaveLength(1);

    // 乘法 blank
    const pMul = { at: [400, 200], a: 0.8, b: 3, op: '×', blank: ['r2c0', 'r0c0'], show: 2 };
    const elsMul = renderPart(pMul);
    expect(elsMul.filter((e) => e.type === BlankBox || (e.props && 'data-blank' in e.props))).toHaveLength(2);

    // 除法 blank
    const pDiv = { at: [400, 200], a: 22.4, b: 4, op: '÷', blank: ['q0', 'dividend.c0'], show: 7 };
    const elsDiv = renderPart(pDiv);
    expect(elsDiv.filter((e) => e.type === BlankBox || (e.props && 'data-blank' in e.props))).toHaveLength(2);
  });
});

