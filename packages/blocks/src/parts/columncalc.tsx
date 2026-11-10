// 竖式：乘法（两个数上下对齐，一位一位乘，再把几行相加）、加法、减法与除法（长除法）。可复用。
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

type Phase = number | 'add' | 'sub' | 'div';

export type DivStepType =
  | 'quotient'
  | 'prod'
  | 'diff'
  | 'drop'
  | 'trial-quotient'
  | 'trial-prod'
  | 'adjust-quotient';

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
}

export interface Step {
  /** 属于哪一行的计算：第几个部分积（0 起），相加，或减法/除法 */
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
}

const digitsOf = (n: number): number[] => {
  const s = String(Math.max(0, Math.floor(n)));
  return s
    .split('')
    .reverse()
    .map((c) => Number(c));
};

/** 纯函数：计算减法每一步的信息（供 E1 repeat / E2 when / derived 参考） */
export function subtractionSteps(a: number, b: number): SubtractionStep[] {
  const da = digitsOf(a);
  const db = digitsOf(b);
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

/** 把算式拆成一步一步（纯函数，测试用） */
export function columnCalcPlan(p: Props): ColumnCalcPlan {
  const a = Math.max(0, Math.floor(num(p.a, 0)));
  const rawOp = str(p.op, '×');
  const op =
    rawOp === '+'
      ? '+'
      : rawOp === '−' || rawOp === '-'
        ? '−'
        : rawOp === '÷' || rawOp === '/'
          ? '÷'
          : '×';
  const b = op === '÷' ? Math.max(1, Math.floor(num(p.b, 1))) : Math.max(0, Math.floor(num(p.b, 0)));
  const da = digitsOf(a);
  const db = digitsOf(b);
  const steps: Step[] = [];
  const result =
    op === '+'
      ? a + b
      : op === '−'
        ? Math.max(0, a - b)
        : op === '÷'
          ? Math.floor(a / b)
          : a * b;
  const remainder = op === '÷' ? a % b : undefined;
  const ncols =
    op === '÷'
      ? Math.max(da.length, 1)
      : Math.max(digitsOf(result).length, da.length, db.length);

  const partial: number[][] = []; // 每个部分积各列的数字（已经向左空出位置）
  if (op === '×') {
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
  }
  const hasAdd = op === '+' || (op === '×' && db.length > 1);
  if (hasAdd) {
    const rows: number[][] = op === '+' ? [da, db] : partial;
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
  } else if (op === '−') {
    const cur = Array.from({ length: ncols }, (_, i) => da[i] ?? 0);
    const sub = Array.from({ length: ncols }, (_, i) => db[i] ?? 0);
    const borrowedCols = new Set<number>();
    const intermediateZeroCols = new Set<number>();

    for (let pCol = 0; pCol < ncols; pCol++) {
      const ai = cur[pCol];
      const bi = sub[pCol];
      const borrowDots: number[] = [];
      const smallValues: { col: number; text: string }[] = [];

      // 若当前位之前被借过位且不是中间写了小 9 的 0：在计算该位时上方写小号新值（ai）
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
            // 连续退位：从 pCol + 1 到 k 都画退位点
            for (let m = pCol + 1; m <= k; m++) {
              borrowDots.push(m);
              borrowedCols.add(m);
            }
            // 中间是 0 的各位变成 9（上方写小 9）
            for (let m = pCol + 1; m < k; m++) {
              cur[m] = 9;
              intermediateZeroCols.add(m);
              smallValues.push({ col: m, text: '9' });
            }
          } else {
            // 直接退位：高一位画退位点
            borrowDots.push(k);
            borrowedCols.add(k);
          }

          cur[k] -= 1;
          // 当前位借 10：上方写小号“10 + 原数”提示
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
  } else if (op === '÷') {
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
        // 1. 试商：在商的对应位写 trialVal
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

        // 2. 试乘：在下方写 trialVal × 除数 的积
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

        // 3. 改商：把 trialVal 划掉并在上方写正确的商 qDigit
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

        // 4. 正确乘积：写 qDigit × 除数
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

        // 5. 减：画短横线，写出差
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

        // 6. 落：把下一位落下来
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
        // 中间某位或末位不够除商 0：省略乘减两小步，直接落下一位
        // 标记 zero: true
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
        // 正常商位 qDigit > 0（或最高位的计算）
        // ① 商
        steps.push({
          phase: round,
          divType: 'quotient',
          place,
          round,
          digit: qDigit,
          cells: [{ row: 'q', col: place, digit: qDigit }],
          uses: { a: place },
        });

        // ② 乘：在下方写 商 × 除数 的积，右端与当前被除数的那一位 (place) 对齐
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

        // ③ 减：画一条短横线，写出差
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

        // ④ 落：把被除数的下一位“落”下来写在差的右边。最后一位没有“落”。
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

  return {
    op,
    a: da,
    b: db,
    ncols,
    rows: op === '×' ? db.length : 0,
    hasAdd,
    steps,
    result,
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
  /** 各行的中心 y：进位行、被乘数、乘数、部分积（每行）、结果 */
  yCarry: number;
  yDot: number;
  dotRadius: number;
  yA: number;
  yB: number;
  yRows: number[];
  yRes: number;
  line1: number;
  line2: number;
  /** 第 col 列的中心 x（0 是个位，ncols 是运算符那一列） */
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
}

export function layoutOf(p: Props, plan: ColumnCalcPlan): Layout {
  const size = num(p.size, 44);
  const [cx, cy] = pt(p.at);
  const cw = size * 0.85;
  const rh = size * 1.2;

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

    return {
      size,
      cw,
      rh,
      yCarry: 0,
      yDot: 0,
      dotRadius: 0,
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
    };
  }

  const carryH = size * 0.6;
  const nRows = plan.rows;
  const hasRes = plan.hasAdd || plan.op === '−';
  // 从上到下：进位/借位行、被乘数、乘数、横线、部分积们、横线、结果
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
  const dotRadius = size * 0.08;
  const yB = yA + rh;
  const line1 = yB + rh / 2 + size * 0.15;
  const yRows = Array.from({ length: nRows }, (_, j) => line1 + size * 0.15 + rh * (j + 0.5));
  const afterRows = line1 + size * 0.15 + nRows * rh;
  const line2 = nRows > 0 ? afterRows + size * 0.15 : afterRows;
  const yRes = (nRows > 0 ? line2 + size * 0.15 : line1 + size * 0.15) + rh / 2;
  const x = (col: number) => cx + (plan.ncols / 2 - col) * cw;
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
  };
}

/** 第 k 步现在显示多少：show 从 k-1 走到 k 时从 0 变到 1 */
const piece = (show: number, k: number) => Math.max(0, Math.min(1, show - (k - 1)));

export const columnCalcPart: PartDef = {
  type: 'column-calc',
  name: '竖式',
  anchor: 'center',
  required: ['a', 'b'],
  props: ['a', 'b', 'op', 'show', 'size', 'accent', 'focus', 'blank', 'trial'],
  bbox(p) {
    // 只包住已经写出来的部分（高亮框跟着竖式一步步变大）
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
      if (step.phase === 'add' || step.phase === 'sub') {
        bottom = L.yRes + L.rh / 2;
      } else if (typeof step.phase === 'number') {
        bottom = L.yRows[step.phase] + L.rh / 2;
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
      // 1. q<列>：商的各位
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

      // 2. dividend.c<列>：被除数的各位
      plan.a.forEach((digit, col) => {
        items.push({
          name: `dividend.c${col}`,
          box: { x: L.x(col) - L.cw / 2, y: L.yA - L.rh / 2, w: L.cw, h: L.rh },
          value: digit,
        });
      });

      // 3. divisor：除数
      const bVal = num(p.b, 0);
      const k = plan.b.length;
      const xDivLeft = L.xDivisor!(k - 1) - L.cw / 2;
      const xDivRight = L.xDivisor!(0) + L.cw / 2;
      items.push({
        name: 'divisor',
        box: { x: xDivLeft, y: L.yA - L.rh / 2, w: xDivRight - xDivLeft, h: L.rh },
        value: bVal,
      });

      // 4. step<n>.prod 与 step<n>.diff
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

    // r0c<列>：被加数 / 被乘数 / 被减数
    plan.a.forEach((digit, col) => {
      items.push({
        name: `r0c${col}`,
        box: { x: L.x(col) - L.cw / 2, y: L.yA - L.rh / 2, w: L.cw, h: L.rh },
        value: digit,
      });
    });

    // r1c<列>：加数 / 乘数 / 减数
    plan.b.forEach((digit, col) => {
      items.push({
        name: `r1c${col}`,
        box: { x: L.x(col) - L.cw / 2, y: L.yB - L.rh / 2, w: L.cw, h: L.rh },
        value: digit,
      });
    });

    // r2c<列>：得数行（差 / 和 / 积）
    const resDigits = digitsOf(plan.result);
    for (let col = 0; col < plan.ncols; col++) {
      items.push({
        name: `r2c${col}`,
        box: { x: L.x(col) - L.cw / 2, y: L.yRes - L.rh / 2, w: L.cw, h: L.rh },
        value: resDigits[col] ?? 0,
      });
    }

    // borrow.<列>：退位点
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
    const accent = color(p.accent, ctx.theme, 'red');
    const focus = p.focus !== false;
    const sw = Math.max(2, s / 14);
    const k = Math.min(plan.steps.length, Math.ceil(show));
    const cur = focus && k >= 1 ? plan.steps[k - 1] : undefined;
    const txt = (t: string, x: number, y: number, fill: string, size = s, key?: string) => (
      <text
        key={key}
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size}
        fontWeight="bold"
        fill={fill}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {t}
      </text>
    );
    const hot = (on: boolean) => (on ? accent : ink);

    if (plan.op === '÷') {
      const curveR = Math.min(L.cw * 0.3, s * 0.25);
      const yDivBottom = L.yA + L.rh * 0.45;
      const xRight = L.x(0) + L.cw * 0.55;
      const lineColor = color('line', ctx.theme);

      // 1. “厂”形除号：竖线 + 横线，竖线上端略弯
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
              txt(String(d), x, L.yA, hot(cur?.uses.b !== undefined && cur.uses.b === col), s, `div-b-${col}`)
            );
          })}

          {/* 被除数 */}
          {plan.a.map((d, col) => {
            const isBlank = blanks.has(`dividend.c${col}`);
            const x = L.x(col);
            const inUse = cur?.uses.a === col;
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
              txt(String(d), x, L.yA, hot(inUse), s, `div-a-${col}`)
            );
          })}

          {/* 商的各位 */}
          {Array.from(new Set(plan.steps.map((st) => st.place).filter((pl): pl is number => pl !== undefined))).map(
            (place) => {
              const isBlank = blanks.has(`q${place}`);
              const x = L.x(place);

              const qStep = plan.steps.find((st) => st.place === place && st.divType === 'quotient');
              const tqStep = plan.steps.find((st) => st.place === place && st.divType === 'trial-quotient');
              const adjStep = plan.steps.find((st) => st.place === place && st.divType === 'adjust-quotient');

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
                        {txt(String(adjStep.digit), x, L.yTrialAdj!, hot(isCurAdj), s * 0.8, `adj-val-${place}`)}
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
            },
          )}

          {/* 每一轮除法中的乘积、短横线、差、落位 */}
          {(plan.divRounds ?? []).map((dr, rIdx) => {
            const rLayout = L.divRounds?.find((l) => l.round === dr.round);
            if (!rLayout) return null;
            const rNum = rIdx + 1;

            const prodStep = plan.steps.find((st) => st.round === dr.round && st.divType === 'prod');
            const tProdStep = plan.steps.find((st) => st.round === dr.round && st.divType === 'trial-prod');
            const adjStep = plan.steps.find((st) => st.round === dr.round && st.divType === 'adjust-quotient');
            const diffStep = plan.steps.find((st) => st.round === dr.round && st.divType === 'diff');
            const dropStep = plan.steps.find((st) => st.round === dr.round && st.divType === 'drop');

            const isBlankProd =
              blanks.has(`step${rNum}.prod`) || (dr.round === 0 && blanks.has('step0.prod'));
            const isBlankDiff =
              blanks.has(`step${rNum}.diff`) || (dr.round === 0 && blanks.has('step0.diff'));

            return (
              <g key={`div-round-${dr.round}`}>
                {/* 1. 试乘积（在改商前展示） */}
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
                        txt(String(d), L.x(dr.place + dIdx), rLayout.yProd!, hot(isCurStep(tProdStep)), s, `tprod-d-${dIdx}`),
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
                        txt(String(d), L.x(dr.place + dIdx), rLayout.yProd!, hot(isCurStep(prodStep)), s, `prod-${dr.round}-${dIdx}`),
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
                        txt(String(d), L.x(dr.place + dIdx), rLayout.yDiff!, hot(isCurStep(diffStep)), s, `diff-${dr.round}-${dIdx}`),
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
                      {txt(String(dropStep.digit), xDrop, rLayout.yDiff, hot(isCurStep(dropStep)), s, `drop-digit-${dr.round}`)}
                    </g>
                  );
                })()}
              </g>
            );
          })}
        </g>
      );
    }

    // 进位只显示正在算的那一行，换行时淡出
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
        {/* 被乘数、乘数、运算符 */}
        {plan.a.map((d, i) => {
          const isBlank = blanks.has(`r0c${i}`);
          return (
            <g key={`a${i}`}>
              {isBlank ? (
                <BlankBox
                  cx={L.x(i)}
                  cy={L.yA}
                  textW={textWidth(String(d), s)}
                  size={s}
                  stroke={ink}
                />
              ) : (
                txt(String(d), L.x(i), L.yA, hot(cur?.uses.a === i))
              )}
            </g>
          );
        })}
        {plan.b.map((d, j) => {
          const isBlank = blanks.has(`r1c${j}`);
          return (
            <g key={`b${j}`}>
              {isBlank ? (
                <BlankBox
                  cx={L.x(j)}
                  cy={L.yB}
                  textW={textWidth(String(d), s)}
                  size={s}
                  stroke={ink}
                />
              ) : (
                txt(String(d), L.x(j), L.yB, hot(cur?.uses.b === j))
              )}
            </g>
          );
        })}
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
            const y = c.row === 'res' ? L.yRes : L.yRows[c.row as number];
            const isCur = cur === st;
            const inColumn = cur?.phase === 'add' && cur.uses.col === c.col && c.row !== 'res';
            const cellKey = c.row === 'res' ? `r2c${c.col}` : `r${c.row}c${c.col}`;
            const isBlank = blanks.has(cellKey);
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
            return (
              <g key={`s${i}-${c.row}-${c.col}`} opacity={opac}>
                {txt(String(c.digit), L.x(c.col), y, hot(isCur || inColumn))}
              </g>
            );
          }),
        )}
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
