// 竖式：乘法（两个数上下对齐，一位一位乘，再把几行相加）和加法。可复用。
//
//        3 8            被乘数 a
//     ×  2 7            乘数 b
//   ───────
//      2 6 6            用乘数个位去乘：每个小格是一步（event）
//    7 6                用乘数十位去乘，积向左空一位写
//   ───────
//    1 0 2 6            把几行相加
//
// 每个小格是一“步”：乘法先按“乘数的个位 → 十位 …”、每行从被乘数的个位乘起，然后相加的每一位也是一步。
// show 是已经写出多少步（0 起，可以连续变化，用 set 动作逐步显示；超过总步数就是全部写出）。
// 进位用小数字写在被乘数（或相加的各行）的上面，只显示正在算的这一行的进位；
// 正在算的这一步，用到的数字用强调色标出（focus: false 时不标）。
import { color, num, pt, str, type Box, type PartDef, type Props } from '../base';

export const COLUMN_CALC_OPS = ['×', '+'] as const;

type Phase = number | 'add';

interface Step {
  /** 属于哪一行的计算：第几个部分积（0 起），或相加 */
  phase: Phase;
  /** 写出的格：行（部分积的序号，或 'res' 结果行）、列（从右数，0 是个位）、数字 */
  cells: { row: number | 'res'; col: number; digit: number }[];
  /** 向下一位进的数（写在 col 的位置，0 表示没有进位） */
  carry: { col: number; digit: number } | undefined;
  /** 这一步用到的数字：被乘数、乘数的第几位（从个位数起），相加时用 col 表示这一列 */
  uses: { a?: number; b?: number; col?: number };
}

export interface ColumnCalcPlan {
  op: string;
  a: number[];
  b: number[];
  /** 一共几列数字（不含运算符那一列） */
  ncols: number;
  /** 部分积有几行（加法为 0） */
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

/** 把算式拆成一步一步（纯函数，测试用） */
export function columnCalcPlan(p: Props): ColumnCalcPlan {
  const a = Math.max(0, Math.floor(num(p.a, 0)));
  const b = Math.max(0, Math.floor(num(p.b, 0)));
  const op = str(p.op, '×') === '+' ? '+' : '×';
  const da = digitsOf(a);
  const db = digitsOf(b);
  const steps: Step[] = [];
  const result = op === '+' ? a + b : a * b;
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
  const hasAdd = op === '+' || db.length > 1;
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

interface Layout {
  size: number;
  cw: number;
  rh: number;
  /** 各行的中心 y：进位行、被乘数、乘数、部分积（每行）、结果 */
  yCarry: number;
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

function layoutOf(p: Props, plan: ColumnCalcPlan): Layout {
  const size = num(p.size, 44);
  const [cx, cy] = pt(p.at);
  const cw = size * 0.85;
  const rh = size * 1.2;
  const carryH = size * 0.6;
  const nRows = plan.rows;
  const hasRes = plan.hasAdd;
  // 从上到下：进位、被乘数、乘数、横线、部分积们、横线、结果
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
  props: ['a', 'b', 'op', 'show', 'size', 'accent', 'focus'],
  bbox(p) {
    // 只包住已经写出来的部分（高亮框跟着竖式一步步变大）
    const plan = columnCalcPlan(p);
    const L = layoutOf(p, plan);
    const show = num(p.show, 0);
    const k = Math.min(plan.steps.length, Math.ceil(show));
    const step = plan.steps[k - 1];
    let bottom = L.yB + L.rh / 2 + L.size * 0.15;
    if (step) {
      const row = step.phase === 'add' ? 'res' : step.phase;
      bottom = (row === 'res' ? L.yRes : L.yRows[row]) + L.rh / 2;
    }
    const top = k >= 1 ? L.yCarry - L.size * 0.3 : L.yA - L.rh / 2;
    return { x: L.left, y: top, w: L.right - L.left, h: bottom - top } satisfies Box;
  },
  Render({ p, ctx }) {
    const plan = columnCalcPlan(p);
    const L = layoutOf(p, plan);
    const s = L.size;
    const show = num(p.show, 0);
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
        {/* 进位 */}
        {plan.steps.map((st, i) =>
          st.carry ? (
            <g key={`c${i}`} opacity={piece(show, i + 1) * carryOpacity(st.phase)}>
              {txt(String(st.carry.digit), L.x(st.carry.col), L.yCarry, accent, s * 0.5)}
            </g>
          ) : null,
        )}
        {/* 被乘数、乘数、运算符 */}
        {plan.a.map((d, i) => (
          <g key={`a${i}`}>{txt(String(d), L.x(i), L.yA, hot(cur?.uses.a === i))}</g>
        ))}
        {plan.b.map((d, j) => (
          <g key={`b${j}`}>{txt(String(d), L.x(j), L.yB, hot(cur?.uses.b === j))}</g>
        ))}
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
            return (
              <g key={`s${i}-${c.row}-${c.col}`} opacity={piece(show, i + 1)}>
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
