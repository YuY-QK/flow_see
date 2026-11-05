// 拆分算式图：凑十法、破十法、借十法、平十法通用。
//
//   9 + 6 = 15          原题（一直在最上面，不变）
//      / \               把其中一个数拆成两部分（split、parts）
//     1   5
//  └─+─┘                 第一次合并（first）：两个数做一次运算，结果写在下面
//   10
//   └───+────┘↑          第二次合并（second）：和剩下的数再算一次，箭头指向得数
//
// 节点名：a、b = 原题的两个数；p、q = 拆出来的两部分（左、右）；m = 第一次合并的结果。
// show（0–4，可以连续变化，用 set 动作逐步显示）：
//   0 原题（得数是“?”）；1 拆开；2 第一次合并；3 第二次合并；4 写出得数。
import {
  boxAround,
  color,
  num,
  pt,
  str,
  textWidth,
  type Box,
  type PartDef,
  type Point,
  type Props,
} from '../base';

type NodeName = 'a' | 'b' | 'p' | 'q' | 'm';
interface Join {
  join: [NodeName, NodeName];
  op: string;
  value: string;
}

const NODES: readonly string[] = ['a', 'b', 'p', 'q', 'm'];

function joinOf(v: unknown, fallback: [NodeName, NodeName]): Join {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const j = Array.isArray(o.join) ? o.join.map(String) : [];
  const pair =
    j.length === 2 && j.every((x) => NODES.includes(x)) ? (j as [NodeName, NodeName]) : fallback;
  return { join: pair, op: str(o.op, '+'), value: str(o.value, '?') };
}

interface Layout {
  size: number;
  /** 原题每一项：文字、中心 x */
  tokens: { text: string; x: number }[];
  y0: number;
  nodes: Record<NodeName, { text: string; x: number; y: number }>;
  /** 拆开的那个数（分叉的起点） */
  splitFrom: Point;
  first: Join & { y: number; x1: number; x2: number };
  second: Join & { y: number; x1: number; x2: number };
  /** 得数的位置（箭头指向这里） */
  result: { x: number; y: number };
  box: Box;
}

/** 由属性算出各部分的位置（舞台坐标）；at 是原题那一行的中心 */
export function splitCalcLayout(p: Props): Layout {
  const size = num(p.size, 40);
  const [cx, y0] = pt(p.at);
  const a = str(p.a);
  const b = str(p.b);
  const op = str(p.op, '+');
  const parts = Array.isArray(p.parts) ? p.parts.map((x) => String(x)) : ['?', '?'];
  const first = joinOf(p.first, ['a', 'p']);
  const second = joinOf(p.second, ['m', 'q']);
  const result = second.value;

  // 原题：a op b = 得数（得数的位置按“?”和得数中较宽的留）
  const words = [a, op, b, '=', result];
  const widths = words.map((w, i) =>
    Math.max(textWidth(w, size), i === 4 ? textWidth('?', size) : 0, size * 0.5),
  );
  const gap = size * 0.3;
  const total = widths.reduce((s, w) => s + w, 0) + gap * (words.length - 1);
  let x = cx - total / 2;
  const tokens = words.map((text, i) => {
    const t = { text, x: x + widths[i] / 2 };
    x += widths[i] + gap;
    return t;
  });

  // 拆开：在被拆的数下面分成左右两部分
  const from = str(p.split, 'b') === 'a' ? tokens[0] : tokens[2];
  const half = Math.max(
    size * 0.85,
    (textWidth(parts[0] ?? '', size) + textWidth(parts[1] ?? '', size)) / 2 + size * 0.25,
  );
  const y1 = y0 + size * 1.9;
  const nodes: Layout['nodes'] = {
    a: { text: a, x: tokens[0].x, y: y0 },
    b: { text: b, x: tokens[2].x, y: y0 },
    p: { text: parts[0] ?? '', x: from.x - half, y: y1 },
    q: { text: parts[1] ?? '', x: from.x + half, y: y1 },
    m: { text: first.value, x: 0, y: 0 },
  };

  // 第一次合并：两个数下面拉一条横线，结果写在横线下面正中
  const n1 = nodes[first.join[0]];
  const n2 = nodes[first.join[1]];
  const yb1 = Math.max(n1.y, n2.y) + size * 0.95;
  nodes.m = { text: first.value, x: (n1.x + n2.x) / 2, y: yb1 + size * 0.8 };

  // 第二次合并：再拉一条横线，一直连到得数正下方，箭头向上指向得数
  const s1 = nodes[second.join[0]];
  const s2 = nodes[second.join[1]];
  const yb2 = Math.max(s1.y, s2.y) + size * 0.95;
  const rx = tokens[4].x;

  const minX = Math.min(
    tokens[0].x - widths[0] / 2,
    nodes.p.x - size * 0.5,
    nodes.m.x - size * 0.6,
  );
  const maxX = Math.max(rx + widths[4] / 2, nodes.q.x + size * 0.5);
  const box = {
    x: minX,
    y: y0 - size * 0.65,
    w: maxX - minX,
    h: yb2 + size * 0.3 - (y0 - size * 0.65),
  };

  return {
    size,
    tokens,
    y0,
    nodes,
    splitFrom: [from.x, y0 + size * 0.5],
    first: { ...first, y: yb1, x1: Math.min(n1.x, n2.x), x2: Math.max(n1.x, n2.x) },
    second: {
      ...second,
      y: yb2,
      x1: Math.min(s1.x, s2.x),
      x2: Math.max(s1.x, s2.x, rx),
    },
    result: { x: rx, y: y0 },
    box,
  };
}

/** 第 k 部分（1–4）现在显示多少：show 从 k-1 走到 k 时从 0 变到 1 */
const piece = (show: number, k: number) => Math.max(0, Math.min(1, show - (k - 1)));

export const splitCalcPart: PartDef = {
  type: 'split-calc',
  name: '拆分算式图',
  anchor: 'center',
  required: ['a', 'b', 'parts'],
  props: [
    'a',
    'op',
    'b',
    'split',
    'parts',
    'first',
    'second',
    'show',
    'size',
    'partColor',
    'accent',
  ],
  bbox(p) {
    // 只包住已经显示出来的部分（高亮框跟着竖式一步步变大）
    const L = splitCalcLayout(p);
    if (!(L.box.w > 0)) return boxAround(...pt(p.at), 10, 10);
    const show = num(p.show, 0);
    const s = L.size;
    const bottom =
      show <= 0
        ? L.y0 + s * 0.65
        : show <= 1
          ? L.nodes.p.y + s * 0.65
          : show <= 2
            ? L.nodes.m.y + s * 0.65
            : L.box.y + L.box.h;
    return { ...L.box, h: bottom - L.box.y };
  },
  Render({ p, ctx }) {
    const L = splitCalcLayout(p);
    const s = L.size;
    const show = num(p.show, 0);
    const ink = color(p.color, ctx.theme);
    const partC = color(p.partColor, ctx.theme, 'blue');
    const accent = color(p.accent, ctx.theme, 'red');
    const line = ink; // 线和数字同色（参考常见的凑十法板书：黑色线条）
    const sw = Math.max(2, s / 16);
    const num$ = (t: string, x: number, y: number, fill: string, size = s) => (
      <text
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
    // 运算符：横线正中一个小圆圈
    const opMark = (op: string, x: number, y: number) => (
      <g>
        <circle
          cx={x}
          cy={y}
          r={s * 0.3}
          fill={ctx.theme.stageBg}
          stroke={accent}
          strokeWidth={sw * 0.8}
        />
        {num$(op, x, y, accent, s * 0.45)}
      </g>
    );
    // 两个数下面的括线：从各自的底部竖下来，在 y 处连成横线
    const bracket = (xs: { x: number; y: number }[], y: number, x1: number, x2: number) => (
      <g stroke={line} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {xs.map((n, i) => (
          <line key={i} x1={n.x} x2={n.x} y1={n.y + s * 0.55} y2={y} />
        ))}
        <line x1={x1} x2={x2} y1={y} y2={y} />
      </g>
    );
    const { nodes: N, first: F, second: S2 } = L;
    const k1 = piece(show, 1);
    const k2 = piece(show, 2);
    const k3 = piece(show, 3);
    const k4 = piece(show, 4);
    const [fx, fy] = L.splitFrom;
    return (
      <g>
        {/* 原题 */}
        {L.tokens.slice(0, 4).map((t, i) => (
          <g key={i}>{num$(t.text, t.x, L.y0, ink)}</g>
        ))}
        <g opacity={1 - k4}>{num$('?', L.tokens[4].x, L.y0, ink)}</g>
        <g opacity={k4}>{num$(L.tokens[4].text, L.tokens[4].x, L.y0, accent)}</g>

        {/* 1 拆开 */}
        <g opacity={k1}>
          <g stroke={line} strokeWidth={sw} strokeLinecap="round">
            <line x1={fx} y1={fy} x2={N.p.x} y2={N.p.y - s * 0.55} />
            <line x1={fx} y1={fy} x2={N.q.x} y2={N.q.y - s * 0.55} />
          </g>
          {num$(N.p.text, N.p.x, N.p.y, partC)}
          {num$(N.q.text, N.q.x, N.q.y, partC)}
        </g>

        {/* 2 第一次合并 */}
        <g opacity={k2}>
          {bracket([N[F.join[0]], N[F.join[1]]], F.y, F.x1, F.x2)}
          {opMark(F.op, (F.x1 + F.x2) / 2, F.y)}
          {num$(N.m.text, N.m.x, N.m.y, ink)}
        </g>

        {/* 3 第二次合并：横线连到得数正下方，向上的箭头指向得数 */}
        <g opacity={k3}>
          {bracket([N[S2.join[0]], N[S2.join[1]]], S2.y, S2.x1, S2.x2)}
          <g
            stroke={accent}
            strokeWidth={sw}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1={L.result.x} x2={L.result.x} y1={S2.y} y2={L.result.y + s * 0.6} />
            <path
              d={`M${L.result.x - s * 0.18} ${L.result.y + s * 0.82} L${L.result.x} ${L.result.y + s * 0.6} L${L.result.x + s * 0.18} ${L.result.y + s * 0.82}`}
            />
          </g>
          {opMark(S2.op, (S2.x1 + Math.max(N[S2.join[0]].x, N[S2.join[1]].x)) / 2, S2.y)}
        </g>
      </g>
    );
  },
};
