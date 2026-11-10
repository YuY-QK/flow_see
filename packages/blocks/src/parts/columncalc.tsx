// 竖式：乘法（两个数上下对齐，一位一位乘，再把几行相加）、加法与减法。可复用。
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

export const COLUMN_CALC_OPS = ['×', '+', '−'] as const;

type Phase = number | 'add' | 'sub';

export interface SubtractionStep {
  place: number;
  borrow: boolean;
  chainFrom?: number;
}

export interface Step {
  /** 属于哪一行的计算：第几个部分积（0 起），相加，或减法 */
  phase: Phase;
  /** 写出的格：行（部分积的序号，或 'res' 结果行）、列（从右数，0 是个位）、数字 */
  cells: { row: number | 'res'; col: number; digit: number }[];
  /** 向下一位进的数（写在 col 的位置，0 表示没有进位） */
  carry?: { col: number; digit: number };
  /** 这一步用到的数字：被乘数、乘数的第几位（从个位数起），相加/减法时用 col 表示这一列 */
  uses: { a?: number; b?: number; col?: number };
  /** 当前计算的数位（减法）：0 个位、1 十位… */
  place?: number;
  /** 这一步是否需要退位（减法） */
  borrow?: boolean;
  /** 连续退位时跳过 0 向哪一位借（减法） */
  chainFrom?: number;
  /** 这一步画出的退位点列号（减法） */
  borrowDots?: number[];
  /** 这一步画出的小字提示（减法） */
  smallValues?: { col: number; text: string }[];
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

/** 把算式拆成一步一步（纯函数，测试用） */
export function columnCalcPlan(p: Props): ColumnCalcPlan {
  const a = Math.max(0, Math.floor(num(p.a, 0)));
  const b = Math.max(0, Math.floor(num(p.b, 0)));
  const rawOp = str(p.op, '×');
  const op = rawOp === '+' ? '+' : rawOp === '−' || rawOp === '-' ? '−' : '×';
  const da = digitsOf(a);
  const db = digitsOf(b);
  const steps: Step[] = [];
  const result = op === '+' ? a + b : op === '−' ? Math.max(0, a - b) : a * b;
  const ncols = Math.max(digitsOf(result).length, da.length, db.length);

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
}

export function layoutOf(p: Props, plan: ColumnCalcPlan): Layout {
  const size = num(p.size, 44);
  const [cx, cy] = pt(p.at);
  const cw = size * 0.85;
  const rh = size * 1.2;
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
  props: ['a', 'b', 'op', 'show', 'size', 'accent', 'focus', 'blank'],
  bbox(p) {
    // 只包住已经写出来的部分（高亮框跟着竖式一步步变大）
    const plan = columnCalcPlan(p);
    const L = layoutOf(p, plan);
    const show = num(p.show, 0);
    const blanks = new Set(Array.isArray(p.blank) ? p.blank.map(String) : []);
    const k = Math.min(plan.steps.length, Math.ceil(show));
    const step = plan.steps[k - 1];
    let bottom = L.yB + L.rh / 2 + L.size * 0.15;
    if (step) {
      const row = step.phase === 'add' || step.phase === 'sub' ? 'res' : step.phase;
      bottom = (row === 'res' ? L.yRes : L.yRows[row]) + L.rh / 2;
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
            const y = c.row === 'res' ? L.yRes : L.yRows[c.row];
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
