// 竖式：乘法（两个数上下对齐，一位一位乘，再把几行相加）、加法、减法与除法（长除法）。可复用。
// 支持小数、三位数乘两位数、因数末尾有 0 简写（trimZeros）、试商调商、以及所有 op 的 blank 挖空。
//
//        3 8            被乘数 a
//     ×  2 7            乘数 b
//   ───────
//      2 6 6            用乘数个位去乘：每个小格是一步（event）
//    7 6                用乘数十位去乘，积向左空一位写
//   ───────
//    1 0 2 6            把几行相加
//
// 减法：被减数在上、减数在下，右对齐；横线下写差。
// 从个位起每一位一步：够减直接写差；不够减在被减数高一位上方画退位点，这一位上方写小号“10 + 原数”提示；
// 高一位减时用“原数 − 1”（原数字上方写小号新值）；中间是 0 连续退位时 0 变 9（上方写小 9）再向更高位借。
//
// 除法（长除法）：除数在左，被除数在右，二者之间画“厂”形除号（竖线 + 横线）；商写在横线上方，与被除数对应位对齐。
// 每一个商位四小步：① 商：写商；② 乘：写商 × 除数；③ 减：画短横线写差；④ 落：落下一位（画小箭头）。最后一位没有“落”。
// 最高位不够除时从下一位开始写商；中间某位不够除时商 0 省略乘减两小步直接落下一位（教材简写）；
// 支持 trial: { place, value } 试商与调商。
//
// 小数（X3）：
// - decimals: [da, db]：a、b 分别有几位小数（可从数值推断）。
// - 加减：小数点对齐，位数不同时末尾补灰色小 0（dim 色）表示补位；结果小数点与上面对齐；结果末尾 0 用 dim 色。
// - 乘法：先按整数右对齐算，积写完后最后一小步在积上点小数点（从右数 da + db 位，位数不够时在前面补 0，补的 0 用 accent 色）。
// - 除法：除数是整数时商的小数点和被除数小数点对齐；位数不够时末尾添 0 继续除（添的 0 用 dim 色）。
//   除数是小数时：第一步把除数、被除数的小数点同时右移（画小弧形箭头，原小数点淡出），变成整数除数再除。
// - trimZeros: true 时因数末尾的 0 写在右侧外面，最后一小步把 0 补到积的末尾。
// - 所有 op 支持 blank（子项名列表）。
import {
  color,
  num,
  pt,
  str,
  textWidth,
  type Box,
  type PartDef,
  type Props,
  type Subitem,
} from '../base';
import { BlankBox } from './mark';

export const COLUMN_CALC_OPS = ['×', '+', '−', '÷'] as const;

export type Phase =
  | number
  | 'add'
  | 'sub'
  | 'div'
  | 'pad'
  | 'point'
  | 'trim-zero'
  | 'shift-points';

export type DivStepType =
  | 'quotient'
  | 'prod'
  | 'diff'
  | 'drop'
  | 'trial-quotient'
  | 'trial-prod'
  | 'adjust-quotient'
  | 'shift-points';

export interface SubtractionStep {
  place: number;
  borrow: boolean;
  chainFrom?: number;
}

export interface DivisionStep {
  round: number;
  place: number;
  quotientDigit: number;
  zero: boolean;
  product?: number;
  difference?: number;
  droppedDigit?: number;
  hasDot?: boolean;
  dropIsAppended?: boolean;
}

export interface Step {
  /** 属于哪一行的计算：第几个部分积（0 起），相加，或减法/除法/补零/点小数点 */
  phase: Phase;
  /** 写出的格：行（部分积的序号，或 'res' 结果行、'q' 商行）、列（从右数，0 是个位）、数字 */
  cells: { row: number | 'res' | 'q'; col: number; digit: number }[];
  /** 向下一位进的数（写在 col 的位置，0 表示没有进位） */
  carry?: { col: number; digit: number };
  /** 这一步用到的数字：被乘数、乘数的第几位（从个位数起），相加/减法时用 col 表示这一列 */
  uses: { a?: number; b?: number; col?: number };
  /** 当前计算的数位（减法/除法）：0 个位、1 十位… */
  place?: number;
  /** 这一步是否需要退位（减法） */
  borrow?: boolean;
  /** 连续退位时跳过 0 向哪一位借（减法） */
  chainFrom?: number;
  /** 这一步画出的退位点列号（减法） */
  borrowDots?: number[];
  /** 这一步画出的小字提示（减法） */
  smallValues?: { col: number; text: string }[];

  // 除法字段
  divType?: DivStepType;
  round?: number;
  digit?: number;
  value?: number;
  zero?: boolean;
  trial?: boolean;
  crossedValue?: number;
  fromCol?: number;

  // 小数与简写扩展字段
  shiftAmount?: number;
  isLeadingZero?: boolean;
  hasDot?: boolean;
  dropIsAppended?: boolean;
}

export interface DivRound {
  round: number;
  place: number;
  qDigit: number;
  hasTrial?: boolean;
  trialVal?: number;
  zero?: boolean;
  prod?: number;
  diff?: number;
  isLast?: boolean;
  dropDigit?: number;
  hasDot?: boolean;
  dropIsAppended?: boolean;
}

export interface ColumnCalcPlan {
  op: string;
  a: number[];
  b: number[];
  /** 一共几列数字（不含运算符那一列） */
  ncols: number;
  /** 部分积有几行（加法和减法为 0） */
  rows: number;
  /** 有没有“相加”那一步：乘数是两位以上，或加法 */
  hasAdd: boolean;
  steps: Step[];
  result: number;
  remainder?: number;
  divRounds?: DivRound[];

  // 小数与简写扩展字段
  decimals?: [number, number];
  isDecimal?: boolean;
  maxDec?: number;
  padZerosA?: number;
  padZerosB?: number;
  trailingZerosCount?: number;
  trimZeros?: boolean;
  trimmedZerosCount?: number;
  isDivShift?: boolean;
  shiftAmount?: number;
  dotCol?: number;
  unitsCol?: number;
  paddedLeadingZeros?: number;
  appendedZerosCount?: number;
  resDigits?: number[];
}

export const digitsOf = (n: number): number[] => {
  const s = String(Math.max(0, Math.floor(n)));
  return s
    .split('')
    .reverse()
    .map((c) => Number(c));
};

export function inferDecimals(val: unknown): number {
  if (val === undefined || val === null) return 0;
  const s = String(val).trim();
  const dot = s.indexOf('.');
  return dot >= 0 ? s.length - 1 - dot : 0;
}

/** 纯函数：计算减法每一步的信息（供 E1 repeat / E2 when / derived 参考） */
export function subtractionSteps(a: number, b: number): SubtractionStep[] {
  const decA = inferDecimals(a);
  const decB = inferDecimals(b);
  const maxDec = Math.max(decA, decB);
  const safeA = Math.round(a * Math.pow(10, maxDec));
  const safeB = Math.round(b * Math.pow(10, maxDec));
  const da = digitsOf(safeA);
  const db = digitsOf(safeB);
  const ncols = Math.max(da.length, db.length, 1);
  const cur = Array.from({ length: ncols }, (_, i) => da[i] ?? 0);
  const sub = Array.from({ length: ncols }, (_, i) => db[i] ?? 0);
  const steps: SubtractionStep[] = [];

  for (let p = 0; p < ncols; p++) {
    const ai = cur[p];
    const bi = sub[p];
    if (ai >= bi) {
      cur[p] = ai - bi;
      steps.push({ place: p, borrow: false });
    } else {
      let k = p + 1;
      while (k < ncols && cur[k] === 0) k++;
      const isChain = k > p + 1;
      const chainFrom = isChain && k < ncols ? k : undefined;

      if (k < ncols) {
        cur[k] -= 1;
        for (let m = k - 1; m > p; m--) {
          cur[m] = 9;
        }
        cur[p] += 10;
      }

      steps.push({
        place: p,
        borrow: true,
        ...(chainFrom !== undefined ? { chainFrom } : {}),
      });
      cur[p] -= bi;
    }
  }
  return steps;
}

/** 纯函数：计算除法每一步的信息（供 E1 repeat / E2 when / derived 参考） */
export function divisionSteps(a: number, b: number): DivisionStep[] {
  const decA = inferDecimals(a);
  const decB = inferDecimals(b);
  if (decA === 0 && decB === 0 && a >= b) {
    const safeA = Math.max(0, Math.floor(a));
    const safeB = Math.max(1, Math.floor(b));
    const da = digitsOf(safeA);
    const m = da.length;
    const divDigits = [...da].reverse();
    const steps: DivisionStep[] = [];

    let k = 0;
    let cur = divDigits[0] ?? 0;
    while (cur < safeB && k + 1 < m) {
      k++;
      cur = cur * 10 + divDigits[k];
    }

    let round = 0;
    while (k < m) {
      const place = m - 1 - k;
      const qDigit = Math.floor(cur / safeB);
      const isLast = k === m - 1;

      if (qDigit === 0 && steps.length > 0) {
        const nextDigit = !isLast ? (divDigits[k + 1] ?? 0) : undefined;
        steps.push({
          round,
          place,
          quotientDigit: 0,
          zero: true,
          difference: cur,
          droppedDigit: nextDigit,
        });
        if (!isLast) {
          cur = cur * 10 + nextDigit!;
        }
        k++;
        round++;
      } else {
        const prod = qDigit * safeB;
        const diff = cur - prod;
        const nextDigit = !isLast ? (divDigits[k + 1] ?? 0) : undefined;
        steps.push({
          round,
          place,
          quotientDigit: qDigit,
          zero: false,
          product: prod,
          difference: diff,
          droppedDigit: nextDigit,
        });
        if (!isLast) {
          cur = diff * 10 + nextDigit!;
        }
        k++;
        round++;
      }
    }
    return steps;
  }

  // 小数除法或添 0 除法
  const shift = decB;
  const effA = Math.round(a * Math.pow(10, shift) * 1e8) / 1e8;
  const effB = Math.round(b * Math.pow(10, shift));
  const plan = columnCalcPlan({ a: effA, b: effB, op: '÷', decimals: [Math.max(0, decA - shift), 0] });
  return (plan.divRounds ?? []).map((dr) => ({
    round: dr.round,
    place: dr.place,
    quotientDigit: dr.qDigit,
    zero: dr.zero ?? false,
    product: dr.prod,
    difference: dr.diff,
    droppedDigit: dr.dropDigit,
    hasDot: dr.hasDot,
    dropIsAppended: dr.dropIsAppended,
  }));
}

/** 把算式拆成一步一步（纯函数，测试用） */
export function columnCalcPlan(p: Props): ColumnCalcPlan {
  const rawOp = str(p.op, '×');
  const op =
    rawOp === '+'
      ? '+'
      : rawOp === '−' || rawOp === '-'
        ? '−'
        : rawOp === '÷' || rawOp === '/'
          ? '÷'
          : '×';

  let daDec = inferDecimals(p.a);
  let dbDec = inferDecimals(p.b);
  if (Array.isArray(p.decimals) && p.decimals.length >= 2) {
    daDec = Math.max(0, Math.floor(Number(p.decimals[0])));
    dbDec = Math.max(0, Math.floor(Number(p.decimals[1])));
  }
  const isDecimal = daDec > 0 || dbDec > 0;
  const trimZeros = op === '×' && p.trimZeros === true;

  // ───────────── 加法 ─────────────
  if (op === '+') {
    if (!isDecimal) {
      const a = Math.max(0, Math.floor(num(p.a, 0)));
      const b = Math.max(0, Math.floor(num(p.b, 0)));
      const da = digitsOf(a);
      const db = digitsOf(b);
      const result = a + b;
      const ncols = Math.max(digitsOf(result).length, da.length, db.length);
      const steps: Step[] = [];
      let carry = 0;
      const need = digitsOf(result).length;
      for (let c = 0; c < need; c++) {
        const v = (da[c] ?? 0) + (db[c] ?? 0) + carry;
        carry = Math.floor(v / 10);
        steps.push({
          phase: 'add',
          cells: [{ row: 'res', col: c, digit: v % 10 }],
          carry: carry > 0 && c < need - 1 ? { col: c + 1, digit: carry } : undefined,
          uses: { col: c },
        });
      }
      return { op, a: da, b: db, ncols, rows: 0, hasAdd: true, steps, result };
    }

    const maxDec = Math.max(daDec, dbDec);
    const padZerosA = maxDec - daDec;
    const padZerosB = maxDec - dbDec;
    const numA = typeof p.a === 'string' ? parseFloat(p.a) : num(p.a, 0);
    const numB = typeof p.b === 'string' ? parseFloat(p.b) : num(p.b, 0);
    const scaledA = Math.round(numA * Math.pow(10, maxDec));
    const scaledB = Math.round(numB * Math.pow(10, maxDec));
    const scaledRes = scaledA + scaledB;
    const result = Math.round(scaledRes) / Math.pow(10, maxDec);

    const minLenA = Math.max(digitsOf(Math.floor(numA)).length + maxDec, maxDec + 1);
    const minLenB = Math.max(digitsOf(Math.floor(numB)).length + maxDec, maxDec + 1);
    const minLenRes = Math.max(digitsOf(Math.floor(result)).length + maxDec, maxDec + 1);

    const da = digitsOf(scaledA);
    while (da.length < minLenA) da.push(0);
    const db = digitsOf(scaledB);
    while (db.length < minLenB) db.push(0);
    const dRes = digitsOf(scaledRes);
    while (dRes.length < minLenRes) dRes.push(0);

    const ncols = Math.max(dRes.length, da.length, db.length);
    const steps: Step[] = [];

    if (padZerosA > 0 || padZerosB > 0) {
      steps.push({ phase: 'pad', cells: [], uses: {} });
    }

    let carry = 0;
    for (let c = 0; c < ncols; c++) {
      const v = (da[c] ?? 0) + (db[c] ?? 0) + carry;
      carry = Math.floor(v / 10);
      steps.push({
        phase: 'add',
        cells: [{ row: 'res', col: c, digit: v % 10 }],
        carry: carry > 0 && c < ncols - 1 ? { col: c + 1, digit: carry } : undefined,
        uses: { col: c },
      });
    }
    if (carry > 0) {
      steps.push({
        phase: 'add',
        cells: [{ row: 'res', col: ncols, digit: carry }],
        uses: { col: ncols },
      });
    }

    let trailingZerosCount = 0;
    while (trailingZerosCount < maxDec && dRes[trailingZerosCount] === 0) {
      trailingZerosCount++;
    }

    return {
      op,
      a: da,
      b: db,
      ncols,
      rows: 0,
      hasAdd: true,
      steps,
      result,
      decimals: [daDec, dbDec],
      isDecimal: true,
      maxDec,
      padZerosA,
      padZerosB,
      trailingZerosCount,
      resDigits: dRes,
    };
  }

  // ───────────── 减法 ─────────────
  if (op === '−') {
    if (!isDecimal) {
      const a = Math.max(0, Math.floor(num(p.a, 0)));
      const b = Math.max(0, Math.floor(num(p.b, 0)));
      const da = digitsOf(a);
      const db = digitsOf(b);
      const result = Math.max(0, a - b);
      const ncols = Math.max(digitsOf(result).length, da.length, db.length);
      const steps: Step[] = [];
      const cur = Array.from({ length: ncols }, (_, i) => da[i] ?? 0);
      const sub = Array.from({ length: ncols }, (_, i) => db[i] ?? 0);
      const borrowedCols = new Set<number>();
      const intermediateZeroCols = new Set<number>();

      for (let pCol = 0; pCol < ncols; pCol++) {
        const ai = cur[pCol];
        const bi = sub[pCol];
        const borrowDots: number[] = [];
        const smallValues: { col: number; text: string }[] = [];

        if (borrowedCols.has(pCol) && !intermediateZeroCols.has(pCol)) {
          smallValues.push({ col: pCol, text: String(ai) });
        }

        let borrow = false;
        let chainFrom: number | undefined;

        if (ai < bi) {
          borrow = true;
          let k = pCol + 1;
          while (k < ncols && cur[k] === 0) k++;
          if (k < ncols) {
            if (k > pCol + 1) {
              chainFrom = k;
              for (let m = pCol + 1; m <= k; m++) {
                borrowDots.push(m);
                borrowedCols.add(m);
              }
              for (let m = pCol + 1; m < k; m++) {
                cur[m] = 9;
                intermediateZeroCols.add(m);
                smallValues.push({ col: m, text: '9' });
              }
            } else {
              borrowDots.push(k);
              borrowedCols.add(k);
            }
            cur[k] -= 1;
            smallValues.push({ col: pCol, text: String(10 + ai) });
            cur[pCol] += 10;
          }
        }

        const diffVal = cur[pCol] - bi;
        cur[pCol] = diffVal;

        const cells: { row: number | 'res'; col: number; digit: number }[] = [];
        const resDigits = digitsOf(result);
        if (pCol < resDigits.length) {
          cells.push({ row: 'res', col: pCol, digit: diffVal % 10 });
        }

        steps.push({
          phase: 'sub',
          cells,
          carry: undefined,
          uses: { a: pCol, b: pCol, col: pCol },
          place: pCol,
          borrow,
          ...(chainFrom !== undefined ? { chainFrom } : {}),
          borrowDots,
          smallValues,
        });
      }

      return { op, a: da, b: db, ncols, rows: 0, hasAdd: false, steps, result };
    }

    const maxDec = Math.max(daDec, dbDec);
    const padZerosA = maxDec - daDec;
    const padZerosB = maxDec - dbDec;
    const numA = typeof p.a === 'string' ? parseFloat(p.a) : num(p.a, 0);
    const numB = typeof p.b === 'string' ? parseFloat(p.b) : num(p.b, 0);
    const scaledA = Math.round(numA * Math.pow(10, maxDec));
    const scaledB = Math.round(numB * Math.pow(10, maxDec));
    const scaledRes = Math.max(0, scaledA - scaledB);
    const result = Math.round(scaledRes) / Math.pow(10, maxDec);

    const minLenA = Math.max(digitsOf(Math.floor(numA)).length + maxDec, maxDec + 1);
    const minLenB = Math.max(digitsOf(Math.floor(numB)).length + maxDec, maxDec + 1);
    const minLenRes = Math.max(digitsOf(Math.floor(result)).length + maxDec, maxDec + 1);

    const da = digitsOf(scaledA);
    while (da.length < minLenA) da.push(0);
    const db = digitsOf(scaledB);
    while (db.length < minLenB) db.push(0);
    const dRes = digitsOf(scaledRes);
    while (dRes.length < minLenRes) dRes.push(0);

    const ncols = Math.max(dRes.length, da.length, db.length);
    const steps: Step[] = [];

    if (padZerosA > 0 || padZerosB > 0) {
      steps.push({ phase: 'pad', cells: [], uses: {} });
    }

    const cur = Array.from({ length: ncols }, (_, i) => da[i] ?? 0);
    const sub = Array.from({ length: ncols }, (_, i) => db[i] ?? 0);
    const borrowedCols = new Set<number>();
    const intermediateZeroCols = new Set<number>();

    for (let pCol = 0; pCol < ncols; pCol++) {
      const ai = cur[pCol];
      const bi = sub[pCol];
      const borrowDots: number[] = [];
      const smallValues: { col: number; text: string }[] = [];

      if (borrowedCols.has(pCol) && !intermediateZeroCols.has(pCol)) {
        smallValues.push({ col: pCol, text: String(ai) });
      }

      let borrow = false;
      let chainFrom: number | undefined;

      if (ai < bi) {
        borrow = true;
        let k = pCol + 1;
        while (k < ncols && cur[k] === 0) k++;
        if (k < ncols) {
          if (k > pCol + 1) {
            chainFrom = k;
            for (let m = pCol + 1; m <= k; m++) {
              borrowDots.push(m);
              borrowedCols.add(m);
            }
            for (let m = pCol + 1; m < k; m++) {
              cur[m] = 9;
              intermediateZeroCols.add(m);
              smallValues.push({ col: m, text: '9' });
            }
          } else {
            borrowDots.push(k);
            borrowedCols.add(k);
          }
          cur[k] -= 1;
          smallValues.push({ col: pCol, text: String(10 + ai) });
          cur[pCol] += 10;
        }
      }

      const diffVal = cur[pCol] - bi;
      cur[pCol] = diffVal;

      const cells: { row: number | 'res'; col: number; digit: number }[] = [];
      if (pCol < dRes.length) {
        cells.push({ row: 'res', col: pCol, digit: diffVal % 10 });
      }

      steps.push({
        phase: 'sub',
        cells,
        carry: undefined,
        uses: { a: pCol, b: pCol, col: pCol },
        place: pCol,
        borrow,
        ...(chainFrom !== undefined ? { chainFrom } : {}),
        borrowDots,
        smallValues,
      });
    }

    let trailingZerosCount = 0;
    while (trailingZerosCount < maxDec && dRes[trailingZerosCount] === 0) {
      trailingZerosCount++;
    }

    return {
      op,
      a: da,
      b: db,
      ncols,
      rows: 0,
      hasAdd: false,
      steps,
      result,
      decimals: [daDec, dbDec],
      isDecimal: true,
      maxDec,
      padZerosA,
      padZerosB,
      trailingZerosCount,
      resDigits: dRes,
    };
  }

  // ───────────── 乘法 ─────────────
  if (op === '×') {
    if (trimZeros) {
      const rawA = Math.floor(num(p.a, 0));
      const rawB = Math.floor(num(p.b, 0));
      let tzA = 0;
      let tempA = rawA;
      while (tempA > 0 && tempA % 10 === 0) {
        tzA++;
        tempA = Math.floor(tempA / 10);
      }
      let tzB = 0;
      let tempB = rawB;
      while (tempB > 0 && tempB % 10 === 0) {
        tzB++;
        tempB = Math.floor(tempB / 10);
      }
      const tz = tzA + tzB;
      if (tz > 0) {
        const effA = tempA;
        const effB = tempB;
        const daEff = digitsOf(effA);
        const dbEff = digitsOf(effB);
        const da = digitsOf(rawA);
        const db = digitsOf(rawB);
        const result = rawA * rawB;
        const effResult = effA * effB;
        const steps: Step[] = [];
        const partial: number[][] = [];

        dbEff.forEach((bj, j) => {
          const row: number[] = [];
          let carry = 0;
          daEff.forEach((ai, i) => {
            const v = ai * bj + carry;
            carry = Math.floor(v / 10);
            const last = i === daEff.length - 1;
            const col = tz + j + i;
            const cells = [{ row: j, col, digit: v % 10 }];
            if (last && carry > 0) cells.push({ row: j, col: col + 1, digit: carry });
            for (const c of cells) row[c.col] = c.digit;
            steps.push({
              phase: j,
              cells,
              carry: !last && carry > 0 ? { col: tz + i + 1, digit: carry } : undefined,
              uses: { a: tz + i, b: tz + j },
            });
          });
          partial.push(row);
        });

        const hasAdd = dbEff.length > 1;
        if (hasAdd) {
          const effNeed = digitsOf(effResult).length;
          let carry = 0;
          for (let c = 0; c < effNeed; c++) {
            const col = tz + c;
            const v = partial.reduce((s, r) => s + (r[col] ?? 0), 0) + carry;
            carry = Math.floor(v / 10);
            steps.push({
              phase: 'add',
              cells: [{ row: 'res', col, digit: v % 10 }],
              carry: carry > 0 && c < effNeed - 1 ? { col: col + 1, digit: carry } : undefined,
              uses: { col },
            });
          }
        }

        // 最后一小步把因数末尾的 0 补到积的末尾
        for (let k = tz - 1; k >= 0; k--) {
          steps.push({
            phase: 'trim-zero',
            cells: [{ row: 'res', col: k, digit: 0 }],
            uses: { a: k },
          });
        }

        const ncols = Math.max(digitsOf(result).length, da.length, db.length + tz);
        return {
          op,
          a: da,
          b: db,
          ncols,
          rows: dbEff.length,
          hasAdd,
          steps,
          result,
          trimZeros: true,
          trimmedZerosCount: tz,
        };
      }
    }

    if (isDecimal) {
      const totDec = daDec + dbDec;
      const numA = typeof p.a === 'string' ? parseFloat(p.a) : num(p.a, 0);
      const numB = typeof p.b === 'string' ? parseFloat(p.b) : num(p.b, 0);
      const intA = Math.round(numA * Math.pow(10, daDec));
      const intB = Math.round(numB * Math.pow(10, dbDec));
      const intRes = intA * intB;
      const result = intRes / Math.pow(10, totDec);

      const strA = numA.toFixed(daDec).replace('.', '');
      const strB = numB.toFixed(dbDec).replace('.', '');
      const da = strA.split('').reverse().map(Number);
      const db = strB.split('').reverse().map(Number);

      const daInt = digitsOf(intA);
      const dbInt = digitsOf(intB);
      const steps: Step[] = [];
      const partial: number[][] = [];

      dbInt.forEach((bj, j) => {
        const row: number[] = [];
        let carry = 0;
        daInt.forEach((ai, i) => {
          const v = ai * bj + carry;
          carry = Math.floor(v / 10);
          const last = i === daInt.length - 1;
          const cells = [{ row: j, col: j + i, digit: v % 10 }];
          if (last && carry > 0) cells.push({ row: j, col: j + i + 1, digit: carry });
          for (const c of cells) row[c.col] = c.digit;
          steps.push({
            phase: j,
            cells,
            carry: !last && carry > 0 ? { col: i + 1, digit: carry } : undefined,
            uses: { a: i, b: j },
          });
        });
        partial.push(row);
      });

      const hasAdd = dbInt.length > 1;
      if (hasAdd) {
        const rows: number[][] = partial;
        let carry = 0;
        const need = digitsOf(intRes).length;
        for (let c = 0; c < need; c++) {
          const v = rows.reduce((s, r) => s + (r[c] ?? 0), 0) + carry;
          carry = Math.floor(v / 10);
          steps.push({
            phase: 'add',
            cells: [{ row: 'res', col: c, digit: v % 10 }],
            carry: carry > 0 && c < need - 1 ? { col: c + 1, digit: carry } : undefined,
            uses: { col: c },
          });
        }
      }

      // 积写完后最后一小步在积上点小数点，位数不够时在前面补 0（补的 0 用 accent 色）
      const intDigits = digitsOf(intRes);
      const paddedLeadingCells: { row: number | 'res'; col: number; digit: number }[] = [];
      const targetRow = hasAdd ? 'res' : 0;
      if (intDigits.length < totDec + 1) {
        for (let col = intDigits.length; col < totDec + 1; col++) {
          paddedLeadingCells.push({ row: targetRow, col, digit: 0 });
        }
      }

      steps.push({
        phase: 'point',
        cells: paddedLeadingCells,
        isLeadingZero: paddedLeadingCells.length > 0,
        uses: {},
      });

      const resDigits = [...intDigits];
      while (resDigits.length < totDec + 1) resDigits.push(0);

      let trailingZerosCount = 0;
      while (trailingZerosCount < totDec && resDigits[trailingZerosCount] === 0) {
        trailingZerosCount++;
      }

      const ncols = Math.max(resDigits.length, da.length, db.length);
      return {
        op,
        a: da,
        b: db,
        ncols,
        rows: dbInt.length,
        hasAdd,
        steps,
        result,
        decimals: [daDec, dbDec],
        isDecimal: true,
        maxDec: totDec,
        dotCol: totDec,
        paddedLeadingZeros: paddedLeadingCells.length,
        trailingZerosCount,
        resDigits,
      };
    }

    const a = Math.max(0, Math.floor(num(p.a, 0)));
    const b = Math.max(0, Math.floor(num(p.b, 0)));
    const da = digitsOf(a);
    const db = digitsOf(b);
    const result = a * b;
    const ncols = Math.max(digitsOf(result).length, da.length, db.length);
    const steps: Step[] = [];
    const partial: number[][] = [];

    db.forEach((bj, j) => {
      const row: number[] = [];
      let carry = 0;
      da.forEach((ai, i) => {
        const v = ai * bj + carry;
        carry = Math.floor(v / 10);
        const last = i === da.length - 1;
        const cells = [{ row: j, col: j + i, digit: v % 10 }];
        if (last && carry > 0) cells.push({ row: j, col: j + i + 1, digit: carry });
        for (const c of cells) row[c.col] = c.digit;
        steps.push({
          phase: j,
          cells,
          carry: !last && carry > 0 ? { col: i + 1, digit: carry } : undefined,
          uses: { a: i, b: j },
        });
      });
      partial.push(row);
    });

    const hasAdd = db.length > 1;
    if (hasAdd) {
      const rows: number[][] = partial;
      let carry = 0;
      const need = digitsOf(result).length;
      for (let c = 0; c < need; c++) {
        const v = rows.reduce((s, r) => s + (r[c] ?? 0), 0) + carry;
        carry = Math.floor(v / 10);
        steps.push({
          phase: 'add',
          cells: [{ row: 'res', col: c, digit: v % 10 }],
          carry: carry > 0 && c < need - 1 ? { col: c + 1, digit: carry } : undefined,
          uses: { col: c },
        });
      }
    }

    return { op, a: da, b: db, ncols, rows: db.length, hasAdd, steps, result };
  }

  // ───────────── 除法 ─────────────
  const isDivDecimal =
    isDecimal ||
    (typeof p.a === 'number' && typeof p.b === 'number' && p.a < p.b && p.a > 0) ||
    (p.decimals !== undefined && Array.isArray(p.decimals) && (p.decimals[0] > 0 || p.decimals[1] > 0));

  if (!isDivDecimal) {
    const a = Math.max(0, Math.floor(num(p.a, 0)));
    const b = Math.max(1, Math.floor(num(p.b, 1)));
    const da = digitsOf(a);
    const db = digitsOf(b);
    const steps: Step[] = [];
    const result = Math.floor(a / b);
    const remainder = a % b;
    const ncols = Math.max(da.length, 1);

    const m = da.length;
    const divDigits = [...da].reverse();
    let k = 0;
    let cur = divDigits[0] ?? 0;
    while (cur < b && k + 1 < m) {
      k++;
      cur = cur * 10 + divDigits[k];
    }

    const trialSpec =
      p.trial && typeof p.trial === 'object'
        ? (p.trial as { place: number | string; value: number | string })
        : undefined;

    let round = 0;
    const divRounds: DivRound[] = [];

    while (k < m) {
      const place = m - 1 - k;
      const qDigit = Math.floor(cur / b);
      const isLast = k === m - 1;
      const hasTrial =
        trialSpec !== undefined && Math.floor(Number(trialSpec.place)) === place;
      const trialVal = hasTrial ? Math.floor(Number(trialSpec.value)) : undefined;

      if (hasTrial && trialVal !== undefined) {
        steps.push({
          phase: round,
          divType: 'trial-quotient',
          place,
          round,
          digit: trialVal,
          trial: true,
          cells: [{ row: 'q', col: place, digit: trialVal }],
          uses: { a: place },
        });

        const tProd = trialVal * b;
        const tProdDigits = digitsOf(tProd);
        const tProdCells = tProdDigits.map((d, idx) => ({
          row: round,
          col: place + idx,
          digit: d,
        }));
        steps.push({
          phase: round,
          divType: 'trial-prod',
          place,
          round,
          value: tProd,
          trial: true,
          cells: tProdCells,
          uses: { a: place, b: 0 },
        });

        steps.push({
          phase: round,
          divType: 'adjust-quotient',
          place,
          round,
          crossedValue: trialVal,
          digit: qDigit,
          cells: [{ row: 'q', col: place, digit: qDigit }],
          uses: { a: place },
        });

        const prod = qDigit * b;
        const prodDigits = digitsOf(prod);
        const prodCells = prodDigits.map((d, idx) => ({
          row: round,
          col: place + idx,
          digit: d,
        }));
        steps.push({
          phase: round,
          divType: 'prod',
          place,
          round,
          value: prod,
          cells: prodCells,
          uses: { a: place, b: 0 },
        });

        const diff = cur - prod;
        const diffDigits = digitsOf(diff);
        const diffCells =
          diff > 0 || isLast
            ? diffDigits.map((d, idx) => ({
                row: round,
                col: place + idx,
                digit: d,
              }))
            : [];
        steps.push({
          phase: round,
          divType: 'diff',
          place,
          round,
          value: diff,
          cells: diffCells,
          uses: { col: place },
        });

        divRounds.push({
          round,
          place,
          qDigit,
          hasTrial: true,
          trialVal,
          prod,
          diff,
          isLast,
        });

        if (!isLast) {
          const nextDigit = divDigits[k + 1] ?? 0;
          steps.push({
            phase: round,
            divType: 'drop',
            place: place - 1,
            fromCol: place - 1,
            round,
            digit: nextDigit,
            cells: [{ row: round, col: place - 1, digit: nextDigit }],
            uses: { a: place - 1 },
          });
          cur = diff * 10 + nextDigit;
          k++;
        } else {
          k++;
        }
        round++;
      } else if (qDigit === 0 && steps.length > 0) {
        steps.push({
          phase: round,
          divType: 'quotient',
          place,
          round,
          digit: 0,
          zero: true,
          cells: [{ row: 'q', col: place, digit: 0 }],
          uses: { a: place },
        });

        divRounds.push({
          round,
          place,
          qDigit: 0,
          zero: true,
          diff: cur,
          isLast,
        });

        if (!isLast) {
          const nextDigit = divDigits[k + 1] ?? 0;
          steps.push({
            phase: round,
            divType: 'drop',
            place: place - 1,
            fromCol: place - 1,
            round,
            digit: nextDigit,
            zero: true,
            cells: [{ row: round, col: place - 1, digit: nextDigit }],
            uses: { a: place - 1 },
          });
          cur = cur * 10 + nextDigit;
          k++;
        } else {
          k++;
        }
        round++;
      } else {
        steps.push({
          phase: round,
          divType: 'quotient',
          place,
          round,
          digit: qDigit,
          cells: [{ row: 'q', col: place, digit: qDigit }],
          uses: { a: place },
        });

        const prod = qDigit * b;
        const prodDigits = digitsOf(prod);
        const prodCells = prodDigits.map((d, idx) => ({
          row: round,
          col: place + idx,
          digit: d,
        }));
        steps.push({
          phase: round,
          divType: 'prod',
          place,
          round,
          value: prod,
          cells: prodCells,
          uses: { a: place, b: 0 },
        });

        const diff = cur - prod;
        const diffDigits = digitsOf(diff);
        const diffCells =
          diff > 0 || isLast
            ? diffDigits.map((d, idx) => ({
                row: round,
                col: place + idx,
                digit: d,
              }))
            : [];
        steps.push({
          phase: round,
          divType: 'diff',
          place,
          round,
          value: diff,
          cells: diffCells,
          uses: { col: place },
        });

        divRounds.push({
          round,
          place,
          qDigit,
          prod,
          diff,
          isLast,
        });

        if (!isLast) {
          const nextDigit = divDigits[k + 1] ?? 0;
          steps.push({
            phase: round,
            divType: 'drop',
            place: place - 1,
            fromCol: place - 1,
            round,
            digit: nextDigit,
            cells: [{ row: round, col: place - 1, digit: nextDigit }],
            uses: { a: place - 1 },
          });
          cur = diff * 10 + nextDigit;
          k++;
        } else {
          k++;
        }
        round++;
      }
    }

    return {
      op,
      a: da,
      b: db,
      ncols,
      rows: divRounds.length,
      hasAdd: false,
      steps,
      result,
      remainder,
      divRounds,
    };
  }

  // ───────────── 小数除法（含除数是小数的小数点移动与添 0 继续除） ─────────────
  const rawA = typeof p.a === 'string' ? parseFloat(p.a) : num(p.a, 0);
  const rawB = typeof p.b === 'string' ? parseFloat(p.b) : num(p.b, 1);
  const steps: Step[] = [];
  const shift = dbDec;

  if (shift > 0) {
    steps.push({
      phase: 'shift-points',
      divType: 'shift-points',
      shiftAmount: shift,
      cells: [],
      uses: {},
    });
  }

  const effA = Math.round(rawA * Math.pow(10, shift) * 1e8) / 1e8;
  const effB = Math.round(rawB * Math.pow(10, shift));
  const effDa = Math.max(0, daDec - shift);

  const intA = Math.floor(effA);
  const intDigits = digitsOf(intA).reverse();
  const fracStr = effDa > 0 ? (effA.toFixed(effDa).split('.')[1] ?? '') : '';
  const fracDigits = fracStr.split('').map(Number);

  interface DivDigitItem {
    digit: number;
    isFrac: boolean;
    isAppended: boolean;
  }
  const allDigits: DivDigitItem[] = [];
  intDigits.forEach((d) => allDigits.push({ digit: d, isFrac: false, isAppended: false }));
  fracDigits.forEach((d) => allDigits.push({ digit: d, isFrac: true, isAppended: false }));

  // 先预跑一遍除法，确定一共需要添几个 0，以便排定列坐标
  const runSim = () => {
    const sim = allDigits.map((x) => ({ ...x }));
    let cur = 0;
    let k = 0;
    const maxFracLimit = daDec > 6 ? daDec : 6;
    if (sim.length === 1 && sim[0].digit < effB) {
      cur = sim[0].digit;
      k = 1;
    } else {
      cur = sim[0]?.digit ?? 0;
      while (cur < effB && k + 1 < sim.length && !sim[k + 1].isFrac) {
        k++;
        cur = cur * 10 + sim[k].digit;
      }
    }
    while (true) {
      const qDigit = Math.floor(cur / effB);
      const prod = qDigit * effB;
      const diff = cur - prod;
      if (k === sim.length - 1 && diff === 0) break;
      const fracCount = sim.filter((x) => x.isFrac).length;
      if (fracCount >= maxFracLimit && (k >= sim.length - 1 || diff === 0)) break;

      if (k + 1 < sim.length) {
        k++;
        cur = diff * 10 + sim[k].digit;
      } else if (diff > 0 || fracCount < daDec) {
        sim.push({ digit: 0, isFrac: true, isAppended: true });
        k++;
        cur = diff * 10;
      } else {
        break;
      }
    }
    return sim;
  };

  const finalDigits = runSim();
  const totalFrac = finalDigits.filter((x) => x.isFrac).length;
  const unitsIndex = intDigits.length - 1;
  const unitsCol = totalFrac;
  const colOfIndex = (idx: number) => {
    if (idx <= unitsIndex) return unitsCol + (unitsIndex - idx);
    return unitsCol - (idx - unitsIndex);
  };

  let k = 0;
  let cur = 0;
  let round = 0;
  const divRounds: DivRound[] = [];

  const addRound = (
    qDigit: number,
    place: number,
    hasDot: boolean,
    zero: boolean,
    isLast: boolean,
    dropItem?: DivDigitItem,
  ) => {
    // 1. 商
    steps.push({
      phase: round,
      divType: 'quotient',
      place,
      round,
      digit: qDigit,
      zero,
      hasDot,
      cells: [{ row: 'q', col: place, digit: qDigit }],
      uses: { a: place },
    });

    if (zero && round > 0) {
      divRounds.push({
        round,
        place,
        qDigit: 0,
        zero: true,
        diff: cur,
        isLast,
        hasDot,
      });

      if (!isLast && dropItem) {
        steps.push({
          phase: round,
          divType: 'drop',
          place: place - 1,
          fromCol: place - 1,
          round,
          digit: dropItem.digit,
          zero: true,
          dropIsAppended: dropItem.isAppended,
          cells: [{ row: round, col: place - 1, digit: dropItem.digit }],
          uses: { a: place - 1 },
        });
      }
      return;
    }

    // 2. 乘
    const prod = qDigit * effB;
    const prodDigits = digitsOf(prod);
    const prodCells = prodDigits.map((d, idx) => ({
      row: round,
      col: place + idx,
      digit: d,
    }));
    steps.push({
      phase: round,
      divType: 'prod',
      place,
      round,
      value: prod,
      cells: prodCells,
      uses: { a: place, b: 0 },
    });

    // 3. 减
    const diff = cur - prod;
    const diffDigits = digitsOf(diff);
    const diffCells =
      diff > 0 || isLast
        ? diffDigits.map((d, idx) => ({
            row: round,
            col: place + idx,
            digit: d,
          }))
        : [];
    steps.push({
      phase: round,
      divType: 'diff',
      place,
      round,
      value: diff,
      cells: diffCells,
      uses: { col: place },
    });

    divRounds.push({
      round,
      place,
      qDigit,
      prod,
      diff,
      isLast,
      hasDot,
      dropDigit: dropItem?.digit,
      dropIsAppended: dropItem?.isAppended,
    });

    // 4. 落
    if (!isLast && dropItem) {
      steps.push({
        phase: round,
        divType: 'drop',
        place: place - 1,
        fromCol: place - 1,
        round,
        digit: dropItem.digit,
        dropIsAppended: dropItem.isAppended,
        cells: [{ row: round, col: place - 1, digit: dropItem.digit }],
        uses: { a: place - 1 },
      });
    }
  };

  const isUnitsSmall = finalDigits.length === 1 && finalDigits[0].digit < effB;
  if (isUnitsSmall || (intDigits.length === 1 && intDigits[0] < effB)) {
    cur = finalDigits[0].digit;
    const place = colOfIndex(0);
    const isLast = finalDigits.length === 1;
    const nextItem = !isLast ? finalDigits[1] : undefined;
    addRound(0, place, true, true, isLast, nextItem);
    if (!isLast) cur = cur * 10 + nextItem!.digit;
    k = 1;
    round++;
  } else {
    cur = finalDigits[0]?.digit ?? 0;
    while (cur < effB && k + 1 < finalDigits.length && !finalDigits[k + 1].isFrac) {
      k++;
      cur = cur * 10 + finalDigits[k].digit;
    }
  }

  while (k < finalDigits.length) {
    const place = colOfIndex(k);
    const qDigit = Math.floor(cur / effB);
    const isLast = k === finalDigits.length - 1;
    const hasDot = k === unitsIndex + 1 || (k <= unitsIndex && isLast && totalFrac > 0);
    const nextItem = !isLast ? finalDigits[k + 1] : undefined;
    const zero = qDigit === 0 && steps.some((s) => s.divType === 'quotient');

    addRound(qDigit, place, hasDot, zero, isLast, nextItem);

    if (zero) {
      if (!isLast) cur = cur * 10 + nextItem!.digit;
    } else {
      const prod = qDigit * effB;
      const diff = cur - prod;
      if (!isLast) cur = diff * 10 + nextItem!.digit;
    }
    k++;
    round++;
  }

  const daDigits = finalDigits.map((x) => x.digit).reverse();
  const dbDigits = digitsOf(rawB);
  const result = Math.round((rawA / rawB) * 1e8) / 1e8;

  return {
    op: '÷',
    a: daDigits,
    b: dbDigits,
    ncols: Math.max(daDigits.length, 1),
    rows: divRounds.length,
    hasAdd: false,
    steps,
    result,
    divRounds,
    decimals: [daDec, dbDec],
    isDecimal: isDivDecimal,
    isDivShift: shift > 0,
    shiftAmount: shift,
    unitsCol,
    appendedZerosCount: finalDigits.filter((x) => x.isAppended).length,
  };
}

export interface DivRoundLayout {
  round: number;
  yProd?: number;
  yLine?: number;
  lineX1?: number;
  lineX2?: number;
  yDiff?: number;
  arrow?: { from: [number, number]; to: [number, number] };
}

export interface Layout {
  size: number;
  cw: number;
  rh: number;
  yCarry: number;
  yDot: number;
  dotRadius: number;
  yA: number;
  yB: number;
  yRows: number[];
  yRes: number;
  line1: number;
  line2: number;
  x(col: number): number;
  left: number;
  right: number;

  // 除法专用字段
  yQ?: number;
  yBar?: number;
  xBracket?: number;
  xDivisor?: (dCol: number) => number;
  yTrialAdj?: number;
  divRounds?: DivRoundLayout[];

  // 小数点专用坐标
  xDotA?: number;
  xDotB?: number;
  xDotRes?: number;
  xDotQ?: number;
  xDotShiftOldDivisor?: number;
  xDotShiftNewDivisor?: number;
  xDotShiftOldDividend?: number;
  xDotShiftNewDividend?: number;
  shiftArrowDivisor?: { from: [number, number]; to: [number, number] };
  shiftArrowDividend?: { from: [number, number]; to: [number, number] };
}

export function layoutOf(p: Props, plan: ColumnCalcPlan): Layout {
  const size = num(p.size, 44);
  const [cx, cy] = pt(p.at);
  const cw = size * 0.85;
  const rh = size * 1.2;
  const dotRadius = size * 0.08;

  if (plan.op === '÷') {
    const m = Math.max(plan.a.length, 1);
    const k = Math.max(plan.b.length, 1);
    const gap = cw * 0.8;
    const totalW = k * cw + gap + m * cw;
    const rightEdge = cx + totalW / 2;

    const x0 = rightEdge - cw / 2;
    const x = (col: number) => x0 - col * cw;

    const xBracket = x(m - 1) - cw * 0.55;
    const xDiv0 = xBracket - cw * 0.65;
    const xDivisor = (dCol: number) => xDiv0 - dCol * cw;

    const hasTrial = plan.steps.some((s) => s.trial);
    const spaceAboveQ = hasTrial ? size * 0.75 : rh * 0.4;
    const spaceQToBar = rh * 0.55;
    const spaceBarToA = rh * 0.55;

    const roundsWithProd = (plan.divRounds ?? []).filter((r) => !r.zero);
    const nDivRows = roundsWithProd.length * 2;
    const totalH = spaceAboveQ + spaceQToBar + spaceBarToA + nDivRows * rh + rh * 0.5;

    const top = cy - totalH / 2;
    const yQ = top + spaceAboveQ;
    const yTrialAdj = yQ - size * 0.65;
    const yBar = yQ + spaceQToBar;
    const yA = yBar + spaceBarToA;

    let yCur = yA;
    const divRounds: DivRoundLayout[] = [];

    for (const dr of plan.divRounds ?? []) {
      if (dr.zero) {
        const arrow = !dr.isLast
          ? {
              from: [x(dr.place - 1), yA + size * 0.38] as [number, number],
              to: [x(dr.place - 1), yCur - size * 0.38] as [number, number],
            }
          : undefined;
        divRounds.push({
          round: dr.round,
          yDiff: yCur,
          arrow,
        });
      } else {
        const yProd = yCur + rh;
        const yLine = yProd + rh / 2 + size * 0.1;
        const yDiff = yProd + rh;

        const prodDigits = digitsOf(dr.prod ?? 0);
        const prodLeftCol = dr.place + prodDigits.length - 1;
        const prodRightCol = dr.place;
        const lineX1 = x(prodLeftCol) - cw * 0.5;
        const lineX2 = x(prodRightCol) + cw * 0.5;

        const arrow = !dr.isLast
          ? {
              from: [x(dr.place - 1), yA + size * 0.38] as [number, number],
              to: [x(dr.place - 1), yDiff - size * 0.38] as [number, number],
            }
          : undefined;

        divRounds.push({
          round: dr.round,
          yProd,
          yLine,
          lineX1,
          lineX2,
          yDiff,
          arrow,
        });
        yCur = yDiff;
      }
    }

    let xDotA: number | undefined;
    let xDotQ: number | undefined;
    let xDotShiftOldDivisor: number | undefined;
    let xDotShiftNewDivisor: number | undefined;
    let xDotShiftOldDividend: number | undefined;
    let xDotShiftNewDividend: number | undefined;
    let shiftArrowDivisor: { from: [number, number]; to: [number, number] } | undefined;
    let shiftArrowDividend: { from: [number, number]; to: [number, number] } | undefined;

    if (plan.unitsCol !== undefined) {
      xDotA = (x(plan.unitsCol) + x(plan.unitsCol - 1)) / 2;
      xDotQ = xDotA;
    }

    if (plan.isDivShift && plan.shiftAmount) {
      xDotShiftOldDivisor = (xDivisor(1) + xDivisor(0)) / 2;
      xDotShiftNewDivisor = xDivisor(0) + cw * 0.45;
      xDotShiftOldDividend = (x(plan.unitsCol! + plan.shiftAmount) + x(plan.unitsCol! + plan.shiftAmount - 1)) / 2;
      xDotShiftNewDividend = (x(plan.unitsCol!) + x(plan.unitsCol! - 1)) / 2;

      shiftArrowDivisor = {
        from: [xDotShiftOldDivisor, yA + size * 0.42],
        to: [xDotShiftNewDivisor, yA + size * 0.42],
      };
      shiftArrowDividend = {
        from: [xDotShiftOldDividend, yA + size * 0.42],
        to: [xDotShiftNewDividend, yA + size * 0.42],
      };
    }

    return {
      size,
      cw,
      rh,
      yCarry: 0,
      yDot: 0,
      dotRadius,
      yA,
      yB: yA,
      yRows: [],
      yRes: yCur,
      line1: yBar,
      line2: 0,
      x,
      left: xDivisor(k - 1) - cw / 2,
      right: rightEdge,
      yQ,
      yBar,
      xBracket,
      xDivisor,
      yTrialAdj,
      divRounds,
      xDotA,
      xDotQ,
      xDotShiftOldDivisor,
      xDotShiftNewDivisor,
      xDotShiftOldDividend,
      xDotShiftNewDividend,
      shiftArrowDivisor,
      shiftArrowDividend,
    };
  }

  const carryH = size * 0.6;
  const nRows = plan.rows;
  const hasRes = plan.hasAdd || plan.op === '−';
  const total =
    carryH +
    rh * 2 +
    size * 0.3 +
    nRows * rh +
    (hasRes && nRows > 0 ? size * 0.3 : 0) +
    (hasRes ? rh : 0);
  const top = cy - total / 2;
  const yCarry = top + carryH / 2;
  const yA = top + carryH + rh / 2;
  const yDot = yA - size * 0.56;
  const yB = yA + rh;
  const line1 = yB + rh / 2 + size * 0.15;
  const yRows = Array.from({ length: nRows }, (_, j) => line1 + size * 0.15 + rh * (j + 0.5));
  const afterRows = line1 + size * 0.15 + nRows * rh;
  const line2 = nRows > 0 ? afterRows + size * 0.15 : afterRows;
  const yRes =
    nRows === 1 && !hasRes
      ? yRows[0]
      : (nRows > 0 ? line2 + size * 0.15 : line1 + size * 0.15) + rh / 2;
  const x = (col: number) => cx + (plan.ncols / 2 - col) * cw;

  let xDotA: number | undefined;
  let xDotB: number | undefined;
  let xDotRes: number | undefined;

  if (plan.op === '+' || plan.op === '−') {
    if (plan.isDecimal && plan.maxDec && plan.maxDec > 0) {
      xDotA = (x(plan.maxDec) + x(plan.maxDec - 1)) / 2;
      xDotB = xDotA;
      xDotRes = xDotA;
    }
  } else if (plan.op === '×') {
    if (plan.isDecimal) {
      const daDec = plan.decimals ? plan.decimals[0] : 0;
      const dbDec = plan.decimals ? plan.decimals[1] : 0;
      if (daDec > 0) xDotA = (x(daDec) + x(daDec - 1)) / 2;
      if (dbDec > 0) xDotB = (x(dbDec) + x(dbDec - 1)) / 2;
      if (plan.dotCol !== undefined && plan.dotCol > 0) {
        xDotRes = (x(plan.dotCol) + x(plan.dotCol - 1)) / 2;
      }
    }
  }

  return {
    size,
    cw,
    rh,
    yCarry,
    yDot,
    dotRadius,
    yA,
    yB,
    yRows,
    yRes,
    line1,
    line2,
    x,
    left: x(plan.ncols) - cw / 2,
    right: x(0) + cw / 2,
    xDotA,
    xDotB,
    xDotRes,
  };
}

/** 第 k 步现在显示多少：show 从 k-1 走到 k 时从 0 变到 1 */
const piece = (show: number, k: number) => Math.max(0, Math.min(1, show - (k - 1)));

export const columnCalcPart: PartDef = {
  type: 'column-calc',
  name: '竖式',
  anchor: 'center',
  required: ['a', 'b'],
  props: [
    'a',
    'b',
    'op',
    'show',
    'size',
    'accent',
    'focus',
    'blank',
    'trial',
    'decimals',
    'trimZeros',
  ],
  bbox(p) {
    const plan = columnCalcPlan(p);
    const L = layoutOf(p, plan);
    const show = num(p.show, 0);
    const blanks = new Set(Array.isArray(p.blank) ? p.blank.map(String) : []);
    const k = Math.min(plan.steps.length, Math.ceil(show));
    const sw = Math.max(2, L.size / 14);

    if (plan.op === '÷') {
      let top = L.yBar! - sw;
      let bottom = L.yA + L.rh / 2;

      if (k >= 1) {
        const hasAdjusted = plan.steps
          .slice(0, k)
          .some((s) => s.divType === 'adjust-quotient');
        top = hasAdjusted
          ? L.yTrialAdj! - (L.size * 0.8) / 2
          : L.yQ! - L.rh / 2;
      }

      if ([...blanks].some((b) => b.startsWith('q'))) {
        top = Math.min(top, L.yQ! - L.rh / 2);
      }

      for (let idx = 0; idx < k; idx++) {
        const st = plan.steps[idx];
        const rLayout = L.divRounds?.find((dr) => dr.round === st.round);
        if (rLayout) {
          if (st.divType === 'prod' || st.divType === 'trial-prod') {
            if (rLayout.yProd) bottom = Math.max(bottom, rLayout.yProd + L.rh / 2);
          } else if (st.divType === 'diff' || st.divType === 'drop') {
            if (rLayout.yDiff) bottom = Math.max(bottom, rLayout.yDiff + L.rh / 2);
          }
        }
      }

      for (const b of blanks) {
        if (b.startsWith('step')) {
          const m = b.match(/^step(\d+)\.(prod|diff)$/);
          if (m) {
            const stepNum = Number(m[1]);
            const roundIdx = stepNum === 0 ? 0 : stepNum - 1;
            const rLayout = L.divRounds?.[roundIdx];
            if (rLayout) {
              if (m[2] === 'prod' && rLayout.yProd) bottom = Math.max(bottom, rLayout.yProd + L.rh / 2);
              if (m[2] === 'diff' && rLayout.yDiff) bottom = Math.max(bottom, rLayout.yDiff + L.rh / 2);
            }
          }
        }
      }

      return { x: L.left, y: top, w: L.right - L.left, h: bottom - top } satisfies Box;
    }

    const step = plan.steps[k - 1];
    let bottom = L.yB + L.rh / 2 + L.size * 0.15;
    if (step) {
      if (
        step.phase === 'add' ||
        step.phase === 'sub' ||
        step.phase === 'trim-zero' ||
        step.phase === 'point'
      ) {
        bottom = L.yRes + L.rh / 2;
      } else if (typeof step.phase === 'number') {
        bottom = (L.yRows[step.phase] ?? L.yRes) + L.rh / 2;
      }
    }
    if ([...blanks].some((b) => b.startsWith('r2') || b === 'res')) {
      bottom = Math.max(bottom, L.yRes + L.rh / 2);
    }
    const top = k >= 1 ? L.yCarry - L.size * 0.3 : L.yA - L.rh / 2;
    return { x: L.left, y: top, w: L.right - L.left, h: bottom - top } satisfies Box;
  },
  subitems(p) {
    const plan = columnCalcPlan(p);
    const L = layoutOf(p, plan);
    const items: Subitem[] = [];

    if (plan.op === '÷') {
      const quotientMap = new Map<number, number>();
      for (const st of plan.steps) {
        if (st.divType === 'quotient' || st.divType === 'adjust-quotient') {
          quotientMap.set(st.place!, st.digit ?? 0);
        }
      }
      for (const [col, digit] of quotientMap.entries()) {
        items.push({
          name: `q${col}`,
          box: { x: L.x(col) - L.cw / 2, y: L.yQ! - L.rh / 2, w: L.cw, h: L.rh },
          value: digit,
        });
      }

      plan.a.forEach((digit, col) => {
        items.push({
          name: `dividend.c${col}`,
          box: { x: L.x(col) - L.cw / 2, y: L.yA - L.rh / 2, w: L.cw, h: L.rh },
          value: digit,
        });
      });

      const bVal = num(p.b, 0);
      const k = plan.b.length;
      const xDivLeft = L.xDivisor!(k - 1) - L.cw / 2;
      const xDivRight = L.xDivisor!(0) + L.cw / 2;
      items.push({
        name: 'divisor',
        box: { x: xDivLeft, y: L.yA - L.rh / 2, w: xDivRight - xDivLeft, h: L.rh },
        value: bVal,
      });

      const divRounds = plan.divRounds ?? [];
      for (let rIdx = 0; rIdx < divRounds.length; rIdx++) {
        const dr = divRounds[rIdx];
        const rNum = rIdx + 1;
        const rLayout = L.divRounds?.find((l) => l.round === dr.round);

        if (dr.prod !== undefined && rLayout?.yProd !== undefined) {
          const prodDigits = digitsOf(dr.prod);
          const leftCol = dr.place + prodDigits.length - 1;
          const rightCol = dr.place;
          const xBoxLeft = L.x(leftCol) - L.cw / 2;
          const xBoxRight = L.x(rightCol) + L.cw / 2;
          items.push({
            name: `step${rNum}.prod`,
            box: {
              x: xBoxLeft,
              y: rLayout.yProd - L.rh / 2,
              w: xBoxRight - xBoxLeft,
              h: L.rh,
            },
            value: dr.prod,
          });
          if (divRounds.length === 1) {
            items.push({
              name: 'step0.prod',
              box: {
                x: xBoxLeft,
                y: rLayout.yProd - L.rh / 2,
                w: xBoxRight - xBoxLeft,
                h: L.rh,
              },
              value: dr.prod,
            });
          }
        }

        if (dr.diff !== undefined && rLayout?.yDiff !== undefined) {
          items.push({
            name: `step${rNum}.diff`,
            box: {
              x: L.x(dr.place) - L.cw / 2,
              y: rLayout.yDiff - L.rh / 2,
              w: L.cw,
              h: L.rh,
            },
            value: dr.diff,
          });
          if (divRounds.length === 1) {
            items.push({
              name: 'step0.diff',
              box: {
                x: L.x(dr.place) - L.cw / 2,
                y: rLayout.yDiff - L.rh / 2,
                w: L.cw,
                h: L.rh,
              },
              value: dr.diff,
            });
          }
        }
      }

      return items;
    }

    plan.a.forEach((digit, col) => {
      items.push({
        name: `r0c${col}`,
        box: { x: L.x(col) - L.cw / 2, y: L.yA - L.rh / 2, w: L.cw, h: L.rh },
        value: digit,
      });
    });

    plan.b.forEach((digit, col) => {
      const colIdx = plan.trimZeros ? (plan.trimmedZerosCount ?? 0) + col : col;
      items.push({
        name: `r1c${colIdx}`,
        box: { x: L.x(colIdx) - L.cw / 2, y: L.yB - L.rh / 2, w: L.cw, h: L.rh },
        value: digit,
      });
    });

    const resDigits = plan.resDigits ?? digitsOf(plan.result);
    for (let col = 0; col < plan.ncols; col++) {
      items.push({
        name: `r2c${col}`,
        box: { x: L.x(col) - L.cw / 2, y: L.yRes - L.rh / 2, w: L.cw, h: L.rh },
        value: resDigits[col] ?? 0,
      });
    }

    const borrowCols = new Set<number>();
    for (const st of plan.steps) {
      if (st.borrowDots) {
        for (const col of st.borrowDots) borrowCols.add(col);
      }
    }
    for (const col of Array.from(borrowCols).sort((a, b) => a - b)) {
      const r = L.dotRadius;
      items.push({
        name: `borrow.${col}`,
        box: { x: L.x(col) - r, y: L.yDot - r, w: r * 2, h: r * 2 },
      });
    }

    return items;
  },
  Render({ p, ctx }) {
    const plan = columnCalcPlan(p);
    const L = layoutOf(p, plan);
    const s = L.size;
    const show = num(p.show, 0);
    const blanks = new Set(Array.isArray(p.blank) ? p.blank.map(String) : []);
    const ink = color(p.color, ctx.theme);
    const accent = color(p.accent, ctx.theme, 'accent');
    const dimColor = color('dim', ctx.theme);
    const lineColor = color('line', ctx.theme);
    const focus = p.focus !== false;
    const sw = Math.max(2, s / 14);
    const k = Math.min(plan.steps.length, Math.ceil(show));
    const cur = focus && k >= 1 ? plan.steps[k - 1] : undefined;

    const txt = (
      t: string,
      x: number,
      y: number,
      fill: string,
      size = s,
      key?: string,
      opacity = 1,
    ) => (
      <text
        key={key}
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size}
        fontWeight="bold"
        fill={fill}
        opacity={opacity}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {t}
      </text>
    );

    const dotCircle = (x: number, y: number, opacity = 1, fill = ink, key?: string) => (
      <circle
        key={key}
        cx={x}
        cy={y}
        r={L.dotRadius}
        fill={fill}
        opacity={opacity}
      />
    );

    const hot = (on: boolean) => (on ? accent : ink);

    // ───────────── 除法渲染 ─────────────
    if (plan.op === '÷') {
      const curveR = Math.min(L.cw * 0.3, s * 0.25);
      const yDivBottom = L.yA + L.rh * 0.45;
      const xRight = L.x(0) + L.cw * 0.55;

      const bracketPath = `M ${L.xBracket} ${yDivBottom} L ${L.xBracket} ${L.yBar! + curveR} Q ${L.xBracket} ${L.yBar!} ${L.xBracket! + curveR} ${L.yBar!} L ${xRight} ${L.yBar!}`;
      const isCurStep = (st: Step) => cur === st;

      return (
        <g>
          {/* 厂形除号 */}
          <path
            d={bracketPath}
            fill="none"
            stroke={ink}
            strokeWidth={sw}
            strokeLinecap="round"
          />

          {/* 除数 */}
          {plan.b.map((d, col) => {
            const isBlank = blanks.has('divisor');
            const x = L.xDivisor!(col);
            const isDimLeadingZero =
              plan.isDivShift &&
              col === 1 &&
              d === 0 &&
              piece(show, 1) >= 1;
            return isBlank ? (
              <BlankBox
                key={`div-b-${col}`}
                cx={x}
                cy={L.yA}
                textW={textWidth(String(d), s)}
                size={s}
                stroke={ink}
              />
            ) : (
              txt(
                String(d),
                x,
                L.yA,
                isDimLeadingZero ? dimColor : hot(cur?.uses.b !== undefined && cur.uses.b === col),
                s,
                `div-b-${col}`,
              )
            );
          })}

          {/* 除数小数点与移动箭头 */}
          {L.xDotShiftOldDivisor !== undefined && L.xDotShiftNewDivisor !== undefined && (
            <g key="div-b-shift">
              {/* 原小数点淡出 */}
              {dotCircle(
                L.xDotShiftOldDivisor,
                L.yA + s * 0.35,
                Math.max(0, 1 - piece(show, 1)),
                ink,
                'dot-b-old',
              )}
              {/* 新小数点出现 */}
              {dotCircle(
                L.xDotShiftNewDivisor,
                L.yA + s * 0.35,
                piece(show, 1),
                ink,
                'dot-b-new',
              )}
              {/* 弧形箭头 */}
              {piece(show, 1) > 0 && (() => {
                const arr = L.shiftArrowDivisor!;
                const x1 = arr.from[0];
                const y1 = arr.from[1];
                const x2 = arr.to[0];
                const y2 = arr.to[1];
                const xc = (x1 + x2) / 2;
                const yc = y1 + s * 0.22;
                const as = s * 0.22;
                return (
                  <g opacity={piece(show, 1)}>
                    <path
                      d={`M ${x1} ${y1} Q ${xc} ${yc} ${x2} ${y2}`}
                      fill="none"
                      stroke={lineColor}
                      strokeWidth={Math.max(1.5, s / 24)}
                      strokeLinecap="round"
                    />
                    <path
                      d={`M ${x2 - as * 0.5} ${y2 + as * 0.3} L ${x2} ${y2} L ${x2 - as * 0.1} ${y2 + as * 0.6}`}
                      fill="none"
                      stroke={lineColor}
                      strokeWidth={Math.max(1.5, s / 24)}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                );
              })()}
            </g>
          )}

          {/* 被除数 */}
          {plan.a.map((d, col) => {
            const isBlank = blanks.has(`dividend.c${col}`);
            const x = L.x(col);
            const inUse = cur?.uses.a === col;
            const isAppendedZero =
              plan.unitsCol !== undefined && col < plan.unitsCol - (plan.decimals ? plan.decimals[0] - (plan.shiftAmount ?? 0) : 0);
            return isBlank ? (
              <BlankBox
                key={`div-a-${col}`}
                cx={x}
                cy={L.yA}
                textW={textWidth(String(d), s)}
                size={s}
                stroke={ink}
              />
            ) : (
              txt(
                String(d),
                x,
                L.yA,
                isAppendedZero ? dimColor : hot(inUse),
                s,
                `div-a-${col}`,
              )
            );
          })}

          {/* 被除数小数点与移动箭头 */}
          {L.xDotShiftOldDividend !== undefined && L.xDotShiftNewDividend !== undefined ? (
            <g key="div-a-shift">
              {dotCircle(
                L.xDotShiftOldDividend,
                L.yA + s * 0.35,
                Math.max(0, 1 - piece(show, 1)),
                ink,
                'dot-a-old',
              )}
              {dotCircle(
                L.xDotShiftNewDividend,
                L.yA + s * 0.35,
                piece(show, 1),
                ink,
                'dot-a-new',
              )}
              {piece(show, 1) > 0 && (() => {
                const arr = L.shiftArrowDividend!;
                const x1 = arr.from[0];
                const y1 = arr.from[1];
                const x2 = arr.to[0];
                const y2 = arr.to[1];
                const xc = (x1 + x2) / 2;
                const yc = y1 + s * 0.22;
                const as = s * 0.22;
                return (
                  <g opacity={piece(show, 1)}>
                    <path
                      d={`M ${x1} ${y1} Q ${xc} ${yc} ${x2} ${y2}`}
                      fill="none"
                      stroke={lineColor}
                      strokeWidth={Math.max(1.5, s / 24)}
                      strokeLinecap="round"
                    />
                    <path
                      d={`M ${x2 - as * 0.5} ${y2 + as * 0.3} L ${x2} ${y2} L ${x2 - as * 0.1} ${y2 + as * 0.6}`}
                      fill="none"
                      stroke={lineColor}
                      strokeWidth={Math.max(1.5, s / 24)}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                );
              })()}
            </g>
          ) : (
            L.xDotA !== undefined && dotCircle(L.xDotA, L.yA + s * 0.35, 1, ink, 'dot-a')
          )}

          {/* 商的小数点 */}
          {L.xDotQ !== undefined && (() => {
            const dotRound = plan.divRounds?.find((r) => r.hasDot);
            const dotStep = dotRound
              ? plan.steps.find((s) => s.round === dotRound.round && s.divType === 'quotient')
              : undefined;
            const dotIdx = dotStep ? plan.steps.indexOf(dotStep) : 0;
            const opac = piece(show, dotIdx + 1);
            if (opac <= 0) return null;
            return dotCircle(L.xDotQ, L.yQ! + s * 0.35, opac, ink, 'dot-q');
          })()}

          {/* 商的各位 */}
          {Array.from(
            new Set(
              plan.steps
                .map((st) => st.place)
                .filter((pl): pl is number => pl !== undefined),
            ),
          ).map((place) => {
            const isBlank = blanks.has(`q${place}`);
            const x = L.x(place);

            const qStep = plan.steps.find(
              (st) => st.place === place && st.divType === 'quotient',
            );
            const tqStep = plan.steps.find(
              (st) => st.place === place && st.divType === 'trial-quotient',
            );
            const adjStep = plan.steps.find(
              (st) => st.place === place && st.divType === 'adjust-quotient',
            );

            if (isBlank) {
              return (
                <BlankBox
                  key={`blank-q-${place}`}
                  cx={x}
                  cy={L.yQ!}
                  textW={s * 0.6}
                  size={s}
                  stroke={ink}
                />
              );
            }

            if (tqStep && adjStep) {
              const tqStepIdx = plan.steps.indexOf(tqStep);
              const adjStepIdx = plan.steps.indexOf(adjStep);
              const opacTrial = piece(show, tqStepIdx + 1);
              const opacAdj = piece(show, adjStepIdx + 1);
              if (opacTrial <= 0) return null;

              const isCurTrial = cur === tqStep;
              const isCurAdj = cur === adjStep;
              const slashW = s * 0.35;
              const slashH = s * 0.35;

              return (
                <g key={`q-trial-${place}`}>
                  <g opacity={opacTrial}>
                    {txt(String(tqStep.digit), x, L.yQ!, hot(isCurTrial), s, `trial-val-${place}`)}
                    {opacAdj > 0 && (
                      <line
                        x1={x - slashW}
                        y1={L.yQ! + slashH}
                        x2={x + slashW}
                        y2={L.yQ! - slashH}
                        stroke={accent}
                        strokeWidth={Math.max(2, s / 16)}
                        strokeLinecap="round"
                        opacity={opacAdj}
                      />
                    )}
                  </g>
                  {opacAdj > 0 && (
                    <g opacity={opacAdj}>
                      {txt(
                        String(adjStep.digit),
                        x,
                        L.yTrialAdj!,
                        hot(isCurAdj),
                        s * 0.8,
                        `adj-val-${place}`,
                      )}
                    </g>
                  )}
                </g>
              );
            }

            if (qStep) {
              const qStepIdx = plan.steps.indexOf(qStep);
              const opac = piece(show, qStepIdx + 1);
              if (opac <= 0) return null;
              return (
                <g key={`q-${place}`} opacity={opac}>
                  {txt(String(qStep.digit), x, L.yQ!, hot(isCurStep(qStep)), s, `q-val-${place}`)}
                </g>
              );
            }
            return null;
          })}

          {/* 每一轮除法中的乘积、短横线、差、落位 */}
          {(plan.divRounds ?? []).map((dr, rIdx) => {
            const rLayout = L.divRounds?.find((l) => l.round === dr.round);
            if (!rLayout) return null;
            const rNum = rIdx + 1;

            const prodStep = plan.steps.find(
              (st) => st.round === dr.round && st.divType === 'prod',
            );
            const tProdStep = plan.steps.find(
              (st) => st.round === dr.round && st.divType === 'trial-prod',
            );
            const adjStep = plan.steps.find(
              (st) => st.round === dr.round && st.divType === 'adjust-quotient',
            );
            const diffStep = plan.steps.find(
              (st) => st.round === dr.round && st.divType === 'diff',
            );
            const dropStep = plan.steps.find(
              (st) => st.round === dr.round && st.divType === 'drop',
            );

            const isBlankProd =
              blanks.has(`step${rNum}.prod`) || (dr.round === 0 && blanks.has('step0.prod'));
            const isBlankDiff =
              blanks.has(`step${rNum}.diff`) || (dr.round === 0 && blanks.has('step0.diff'));

            return (
              <g key={`div-round-${dr.round}`}>
                {/* 1. 试乘积 */}
                {tProdStep && adjStep && (() => {
                  const tProdIdx = plan.steps.indexOf(tProdStep);
                  const adjIdx = plan.steps.indexOf(adjStep);
                  const opacTProd = piece(show, tProdIdx + 1);
                  const prodIdx = prodStep ? plan.steps.indexOf(prodStep) : adjIdx;
                  const opacProd = prodStep ? piece(show, prodIdx + 1) : 0;
                  const visible = opacTProd > 0 && opacProd < 1;
                  if (!visible || !rLayout.yProd) return null;
                  return (
                    <g key={`tprod-${dr.round}`} opacity={opacTProd * (1 - opacProd)}>
                      {digitsOf(dr.trialVal! * num(p.b, 1)).map((d, dIdx) =>
                        txt(
                          String(d),
                          L.x(dr.place + dIdx),
                          rLayout.yProd!,
                          hot(isCurStep(tProdStep)),
                          s,
                          `tprod-d-${dIdx}`,
                        ),
                      )}
                    </g>
                  );
                })()}

                {/* 2. 正规乘积 */}
                {prodStep && rLayout.yProd && (() => {
                  const prodIdx = plan.steps.indexOf(prodStep);
                  const opac = piece(show, prodIdx + 1);
                  if (opac <= 0) return null;
                  if (isBlankProd) {
                    return (
                      <BlankBox
                        key={`blank-prod-${rNum}`}
                        cx={(rLayout.lineX1! + rLayout.lineX2!) / 2}
                        cy={rLayout.yProd}
                        textW={Math.abs(rLayout.lineX2! - rLayout.lineX1!)}
                        size={s}
                        stroke={ink}
                      />
                    );
                  }
                  const pDigits = digitsOf(dr.prod ?? 0);
                  return (
                    <g key={`prod-${dr.round}`} opacity={opac}>
                      {pDigits.map((d, dIdx) =>
                        txt(
                          String(d),
                          L.x(dr.place + dIdx),
                          rLayout.yProd!,
                          hot(isCurStep(prodStep)),
                          s,
                          `prod-${dr.round}-${dIdx}`,
                        ),
                      )}
                    </g>
                  );
                })()}

                {/* 3. 减号短横线 */}
                {diffStep && rLayout.yLine && (() => {
                  const diffIdx = plan.steps.indexOf(diffStep);
                  const opac = piece(show, diffIdx + 1);
                  if (opac <= 0) return null;
                  return (
                    <line
                      key={`diff-line-${dr.round}`}
                      x1={rLayout.lineX1}
                      x2={rLayout.lineX2}
                      y1={rLayout.yLine}
                      y2={rLayout.yLine}
                      stroke={ink}
                      strokeWidth={sw}
                      strokeLinecap="round"
                      opacity={opac}
                    />
                  );
                })()}

                {/* 4. 差（余数） */}
                {diffStep && rLayout.yDiff && (() => {
                  const diffIdx = plan.steps.indexOf(diffStep);
                  const opac = piece(show, diffIdx + 1);
                  if (opac <= 0) return null;
                  if (isBlankDiff) {
                    return (
                      <BlankBox
                        key={`blank-diff-${rNum}`}
                        cx={L.x(dr.place)}
                        cy={rLayout.yDiff}
                        textW={s * 0.6}
                        size={s}
                        stroke={ink}
                      />
                    );
                  }
                  const dDigits = digitsOf(dr.diff ?? 0);
                  if (dr.diff === 0 && !dr.isLast) return null;
                  return (
                    <g key={`diff-${dr.round}`} opacity={opac}>
                      {dDigits.map((d, dIdx) =>
                        txt(
                          String(d),
                          L.x(dr.place + dIdx),
                          rLayout.yDiff!,
                          hot(isCurStep(diffStep)),
                          s,
                          `diff-${dr.round}-${dIdx}`,
                        ),
                      )}
                    </g>
                  );
                })()}

                {/* 5. 落位箭头与落下的数字 */}
                {dropStep && rLayout.yDiff && (() => {
                  const dropIdx = plan.steps.indexOf(dropStep);
                  const opac = piece(show, dropIdx + 1);
                  if (opac <= 0) return null;
                  const arrow = rLayout.arrow;
                  const as = s * 0.3;
                  const xDrop = L.x(dropStep.place!);
                  const isAppended = dropStep.dropIsAppended;
                  return (
                    <g key={`drop-${dr.round}`} opacity={opac}>
                      {arrow && (
                        <g>
                          <line
                            x1={arrow.from[0]}
                            y1={arrow.from[1]}
                            x2={arrow.to[0]}
                            y2={arrow.to[1]}
                            stroke={lineColor}
                            strokeWidth={Math.max(1.5, s / 24)}
                            strokeLinecap="round"
                          />
                          <path
                            d={`M ${arrow.to[0] - as * 0.35} ${arrow.to[1] - as * 0.7} L ${arrow.to[0]} ${arrow.to[1]} L ${arrow.to[0] + as * 0.35} ${arrow.to[1] - as * 0.7}`}
                            fill="none"
                            stroke={lineColor}
                            strokeWidth={Math.max(1.5, s / 24)}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </g>
                      )}
                      {txt(
                        String(dropStep.digit),
                        xDrop,
                        rLayout.yDiff,
                        isAppended ? dimColor : hot(isCurStep(dropStep)),
                        s,
                        `drop-digit-${dr.round}`,
                      )}
                    </g>
                  );
                })()}
              </g>
            );
          })}
        </g>
      );
    }

    // ───────────── 加法、减法、乘法渲染 ─────────────
    const phaseOf = (i: number) => plan.steps[i - 1]?.phase;
    const carryOpacity = (phase: Phase): number => {
      if (k < 1) return 0;
      if (phaseOf(k) === phase) return 1;
      if (k > 1 && Math.floor(show) === k - 1 && phaseOf(k - 1) === phase)
        return 1 - (show - (k - 1));
      return 0;
    };

    return (
      <g>
        {/* 进位（加法、乘法） */}
        {plan.op !== '−' &&
          plan.steps.map((st, i) =>
            st.carry ? (
              <g key={`c${i}`} opacity={piece(show, i + 1) * carryOpacity(st.phase)}>
                {txt(String(st.carry.digit), L.x(st.carry.col), L.yCarry, accent, s * 0.5)}
              </g>
            ) : null,
          )}

        {/* 退位点与借位小字（减法） */}
        {plan.op === '−' &&
          plan.steps.map((st, i) => {
            const opac = piece(show, i + 1);
            if (opac <= 0) return null;
            return (
              <g key={`sub-step-${i}`}>
                {st.borrowDots?.map((col) => (
                  <circle
                    key={`dot-${col}`}
                    cx={L.x(col)}
                    cy={L.yDot}
                    r={L.dotRadius}
                    fill={accent}
                    opacity={opac}
                  />
                ))}
                {st.smallValues?.map((sv) => (
                  <g key={`sm-${sv.col}`} opacity={opac}>
                    {txt(sv.text, L.x(sv.col), L.yCarry, accent, s * 0.5)}
                  </g>
                ))}
              </g>
            );
          })}

        {/* 被乘数 / 被加数 / 被减数 a */}
        {plan.a.map((d, i) => {
          const isBlank = blanks.has(`r0c${i}`) || blanks.has(`a.c${i}`);
          const isPadZero = plan.padZerosA !== undefined && i < plan.padZerosA;
          const padOpac = isPadZero ? piece(show, 1) : 1;
          const size = isPadZero ? s * 0.75 : s;
          const colorVal = isPadZero ? dimColor : hot(cur?.uses.a === i);

          return (
            <g key={`a${i}`} opacity={padOpac}>
              {isBlank ? (
                <BlankBox
                  cx={L.x(i)}
                  cy={L.yA}
                  textW={textWidth(String(d), s)}
                  size={s}
                  stroke={ink}
                />
              ) : (
                txt(String(d), L.x(i), L.yA, colorVal, size, undefined, padOpac)
              )}
            </g>
          );
        })}

        {/* a 的小数点 */}
        {L.xDotA !== undefined && (() => {
          const isPadZeroA = plan.padZerosA !== undefined && plan.padZerosA > 0 && plan.decimals?.[0] === 0;
          const opac = isPadZeroA ? piece(show, 1) : 1;
          return opac > 0 ? dotCircle(L.xDotA, L.yA + s * 0.35, opac, ink, 'dot-a') : null;
        })()}

        {/* 乘数 / 加数 / 减数 b */}
        {plan.b.map((d, j) => {
          const colIdx = plan.trimZeros ? (plan.trimmedZerosCount ?? 0) + j : j;
          const isBlank = blanks.has(`r1c${colIdx}`) || blanks.has(`b.c${colIdx}`);
          const isPadZero = plan.padZerosB !== undefined && j < plan.padZerosB;
          const padOpac = isPadZero ? piece(show, 1) : 1;
          const size = isPadZero ? s * 0.75 : s;
          const colorVal = isPadZero ? dimColor : hot(cur?.uses.b === colIdx);

          return (
            <g key={`b${j}`} opacity={padOpac}>
              {isBlank ? (
                <BlankBox
                  cx={L.x(colIdx)}
                  cy={L.yB}
                  textW={textWidth(String(d), s)}
                  size={s}
                  stroke={ink}
                />
              ) : (
                txt(String(d), L.x(colIdx), L.yB, colorVal, size, undefined, padOpac)
              )}
            </g>
          );
        })}

        {/* b 的小数点 */}
        {L.xDotB !== undefined && (() => {
          const isPadZeroB = plan.padZerosB !== undefined && plan.padZerosB > 0 && plan.decimals?.[1] === 0;
          const opac = isPadZeroB ? piece(show, 1) : 1;
          return opac > 0 ? dotCircle(L.xDotB, L.yB + s * 0.35, opac, ink, 'dot-b') : null;
        })()}

        {/* 运算符与第一条横线 */}
        {txt(plan.op, L.x(plan.ncols), L.yB, ink)}
        <line
          x1={L.left}
          x2={L.right}
          y1={L.line1}
          y2={L.line1}
          stroke={ink}
          strokeWidth={sw}
          strokeLinecap="round"
        />

        {/* 每一步写出的数字 */}
        {plan.steps.flatMap((st, i) =>
          st.cells.map((c) => {
            const y = c.row === 'res' ? L.yRes : L.yRows[c.row as number] ?? L.yRes;
            const isCur = cur === st;
            const inColumn = cur?.phase === 'add' && cur.uses.col === c.col && c.row !== 'res';
            const cellKey = c.row === 'res' ? `r2c${c.col}` : `r${c.row}c${c.col}`;
            const isBlank =
              blanks.has(cellKey) ||
              (c.row === 'res' && (blanks.has('res') || blanks.has(`resc${c.col}`))) ||
              (typeof c.row === 'number' && blanks.has(`p${c.row}c${c.col}`));

            if (isBlank) {
              return (
                <g key={`blank-${i}-${cellKey}`}>
                  <BlankBox
                    cx={L.x(c.col)}
                    cy={y}
                    textW={textWidth(String(c.digit), s)}
                    size={s}
                    stroke={ink}
                  />
                </g>
              );
            }

            const opac = piece(show, i + 1);
            if (opac <= 0) return null;

            // 判断是否是结果小数末尾的 0（dim 色）或乘法积前补的 0（accent 色）
            const isTrailingZero =
              (c.row === 'res' || (plan.rows === 1 && !plan.hasAdd && c.row === 0)) &&
              plan.trailingZerosCount !== undefined &&
              c.col < plan.trailingZerosCount;
            const isLeadingAccentZero = st.isLeadingZero;

            const fillColor = isLeadingAccentZero
              ? accent
              : isTrailingZero
                ? dimColor
                : hot(isCur || inColumn);

            return (
              <g key={`s${i}-${c.row}-${c.col}`} opacity={opac}>
                {txt(String(c.digit), L.x(c.col), y, fillColor)}
              </g>
            );
          }),
        )}

        {/* 结果行小数点 */}
        {L.xDotRes !== undefined && (() => {
          let dotOpac = 0;
          if (plan.op === '+' || plan.op === '−') {
            const firstResIdx = plan.steps.findIndex((s) => s.cells.some((c) => c.row === 'res'));
            dotOpac = firstResIdx >= 0 ? piece(show, firstResIdx + 1) : 0;
          } else if (plan.op === '×') {
            const pointStepIdx = plan.steps.findIndex((s) => s.phase === 'point');
            dotOpac = pointStepIdx >= 0 ? piece(show, pointStepIdx + 1) : 0;
          }
          if (dotOpac <= 0) return null;
          return dotCircle(L.xDotRes, L.yRes + s * 0.35, dotOpac, ink, 'dot-res');
        })()}

        {/* 相加：第二条横线跟着第一步相加出现 */}
        {plan.hasAdd && plan.rows > 0 ? (
          <line
            x1={L.left}
            x2={L.right}
            y1={L.line2}
            y2={L.line2}
            stroke={ink}
            strokeWidth={sw}
            strokeLinecap="round"
            opacity={piece(show, plan.steps.findIndex((st) => st.phase === 'add') + 1)}
          />
        ) : null}
      </g>
    );
  },
};
