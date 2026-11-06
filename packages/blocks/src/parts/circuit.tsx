// 电路零件：电池、灯泡、开关、导线。拼成最简单的电路（教科版四年级下册“电路”）。
//
// 约定：电池、灯泡、开关都是横着画的，两端各有一个接线点（at ± 宽度的一半，纵向在 at 的高度）；
//       要竖着放就用公共属性 rotate: 90（绕中心转）。电池的右端是正极（＋），左端是负极（－）。
//       导线 wire 是一条折线（points），可以在 breaks 里指定哪几段不画（要从电池、灯泡、开关的“下面”穿过去的地方，
//       或者导线断开的缺口）；导线上有小圆点表示电流，沿 points 的方向流动，由 flow（0–1）控制显示，t 是时钟（秒）。
//       小灯泡亮不亮、开关合没合上由 lit、on 这两个数（0–1，可连续变化）决定，用 set 动作改。
import {
  boxAround,
  color,
  mixColor,
  num,
  pt,
  type Box,
  type PartDef,
  type Point,
  type Props,
} from '../base';

/* ───────────── 电池 ───────────── */

export const batteryPart: PartDef = {
  type: 'battery',
  name: '电池',
  anchor: 'center',
  props: ['width', 'height'],
  bbox(p) {
    const [x, y] = pt(p.at);
    return boxAround(x, y, num(p.width, 90) + 6, num(p.height, 44) + 6);
  },
  Render({ p, ctx }) {
    const [x, y] = pt(p.at);
    const w = num(p.width, 90);
    const h = num(p.height, 44);
    const body = color(p.color, ctx.theme, 'green');
    const ink = ctx.theme.ink;
    const nub = Math.max(8, w * 0.1);
    const x0 = x - w / 2;
    const bodyW = w - nub;
    const mark = h * 0.18;
    return (
      <g>
        {/* 正极的小帽（右）：和接线点接在一起 */}
        <rect
          x={x0 + bodyW - 2}
          y={y - h * 0.2}
          width={nub + 2}
          height={h * 0.4}
          rx={3}
          fill={ink}
        />
        <rect
          x={x0}
          y={y - h / 2}
          width={bodyW}
          height={h}
          rx={8}
          fill={body}
          stroke={ink}
          strokeWidth={4}
        />
        {/* 左边深色的一截：负极一端 */}
        <rect
          x={x0 + 2}
          y={y - h / 2 + 2}
          width={bodyW * 0.22}
          height={h - 4}
          rx={6}
          fill={ink}
          opacity={0.35}
        />
        <g stroke={color('white', ctx.theme)} strokeWidth={4} strokeLinecap="round">
          <line x1={x0 + bodyW * 0.11 - mark / 2} y1={y} x2={x0 + bodyW * 0.11 + mark / 2} y2={y} />
          <line x1={x0 + bodyW * 0.85 - mark} y1={y} x2={x0 + bodyW * 0.85 + mark} y2={y} />
          <line x1={x0 + bodyW * 0.85} y1={y - mark} x2={x0 + bodyW * 0.85} y2={y + mark} />
        </g>
      </g>
    );
  },
};

/* ───────────── 灯泡 ───────────── */

export const bulbPart: PartDef = {
  type: 'bulb',
  name: '灯泡',
  anchor: 'center',
  props: ['radius', 'lead', 'lit'],
  bbox(p) {
    const [x, y] = pt(p.at);
    const r = num(p.radius, 26);
    const w = (r + num(p.lead, 18)) * 2;
    return boxAround(x, y, w + 6, r * 2 + 6);
  },
  Render({ p, ctx }) {
    const [x, y] = pt(p.at);
    const r = num(p.radius, 26);
    const lead = num(p.lead, 18);
    const lit = Math.max(0, Math.min(1, num(p.lit, 0)));
    const glow = color(p.color, ctx.theme, 'yellow');
    const ink = ctx.theme.ink;
    const glass = mixColor(
      ctx.theme.stageBg.startsWith('#') ? ctx.theme.stageBg : color('white', ctx.theme),
      glow,
      lit,
    );
    const rays = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);
    return (
      <g>
        {lit > 0 ? (
          <g opacity={lit}>
            <circle cx={x} cy={y} r={r + 22} fill={glow} opacity={0.3} />
            {rays.map((a, i) => (
              <line
                key={i}
                x1={x + Math.cos(a) * (r + 8)}
                y1={y + Math.sin(a) * (r + 8)}
                x2={x + Math.cos(a) * (r + 24)}
                y2={y + Math.sin(a) * (r + 24)}
                stroke={glow}
                strokeWidth={4}
                strokeLinecap="round"
              />
            ))}
          </g>
        ) : null}
        <circle cx={x} cy={y} r={r} fill={glass} stroke={ink} strokeWidth={4} />
        {/* 灯丝：接在左右两个接线点之间，电流从灯丝穿过 */}
        <path
          d={`M${x - r - lead},${y} L${x - r},${y} L${x - 12},${y} C${x - 8},${y - 14} ${x - 3},${y - 14} ${x},${y} C${x + 3},${y + 14} ${x + 8},${y + 14} ${x + 12},${y} L${x + r},${y} L${x + r + lead},${y}`}
          fill="none"
          stroke={lit > 0.5 ? mixColor(ink, color('red', ctx.theme), lit) : ink}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    );
  },
};

/* ───────────── 开关 ───────────── */

export const switchPart: PartDef = {
  type: 'switch',
  name: '开关',
  anchor: 'center',
  props: ['width', 'on'],
  bbox(p) {
    // 断开时刀片抬起来，所以向上多留一些
    const [x, y] = pt(p.at);
    const w = num(p.width, 90);
    return { x: x - w / 2 - 14, y: y - w * 0.64, w: w + 28, h: w * 0.64 + 20 };
  },
  Render({ p, ctx }) {
    const [x, y] = pt(p.at);
    const w = num(p.width, 90);
    const on = Math.max(0, Math.min(1, num(p.on, 0)));
    const ink = color(p.color, ctx.theme);
    // 断开时刀片抬起 OPEN 度，合上时落在右边的接线点上
    const open = 38 * (1 - on);
    const a = (open * Math.PI) / 180;
    const bx = x - w / 2;
    const tipX = bx + Math.cos(a) * w;
    const tipY = y - Math.sin(a) * w;
    return (
      <g>
        <rect
          x={x - w / 2 - 8}
          y={y + 8}
          width={w + 16}
          height={8}
          rx={4}
          fill={ink}
          opacity={0.25}
        />
        <line
          x1={bx}
          y1={y}
          x2={tipX}
          y2={tipY}
          stroke={ink}
          strokeWidth={7}
          strokeLinecap="round"
        />
        <circle cx={tipX} cy={tipY} r={6} fill={ink} />
        <circle cx={bx} cy={y} r={7} fill={ctx.theme.stageBg} stroke={ink} strokeWidth={4} />
        <circle cx={x + w / 2} cy={y} r={7} fill={ctx.theme.stageBg} stroke={ink} strokeWidth={4} />
      </g>
    );
  },
};

/* ───────────── 导线 ───────────── */

export interface WirePath {
  points: Point[];
  /** 到每个顶点的累计长度 */
  cum: number[];
  total: number;
}

export function wirePath(p: Props): WirePath {
  const points = (Array.isArray(p.points) ? p.points : []).filter(
    (q): q is Point => Array.isArray(q) && q.length === 2 && q.every((n) => typeof n === 'number'),
  );
  const cum = [0];
  for (let i = 1; i < points.length; i++)
    cum.push(
      cum[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]),
    );
  return { points, cum, total: cum[cum.length - 1] ?? 0 };
}

/** 路径上离 d 处的点 */
export function wirePointAt(w: WirePath, d: number): Point {
  const { points, cum } = w;
  if (!points.length) return [0, 0];
  const s = Math.max(0, Math.min(w.total, d));
  let i = 1;
  while (i < points.length - 1 && cum[i] < s) i++;
  const seg = cum[i] - cum[i - 1];
  const f = seg > 0 ? (s - cum[i - 1]) / seg : 0;
  return [
    points[i - 1][0] + (points[i][0] - points[i - 1][0]) * f,
    points[i - 1][1] + (points[i][1] - points[i - 1][1]) * f,
  ];
}

/** 一个点投影到路径上，得到它离起点的路程 */
export function wireProject(w: WirePath, q: Point): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 1; i < w.points.length; i++) {
    const [ax, ay] = w.points[i - 1];
    const [bx, by] = w.points[i];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const f = len2 > 0 ? Math.max(0, Math.min(1, ((q[0] - ax) * dx + (q[1] - ay) * dy) / len2)) : 0;
    const dist = Math.hypot(ax + dx * f - q[0], ay + dy * f - q[1]);
    if (dist < bestDist) {
      bestDist = dist;
      best = w.cum[i - 1] + Math.sqrt(len2) * f;
    }
  }
  return best;
}

/** 不画的路段（路程区间，已排序）：breaks 里每一对点之间 */
export function wireBreaks(p: Props, w = wirePath(p)): [number, number][] {
  const list = Array.isArray(p.breaks) ? p.breaks : [];
  const out: [number, number][] = [];
  for (const b of list) {
    if (!Array.isArray(b) || b.length !== 2) continue;
    const [a, c] = b as [Point, Point];
    if (!Array.isArray(a) || !Array.isArray(c)) continue;
    const d0 = wireProject(w, a);
    const d1 = wireProject(w, c);
    out.push([Math.min(d0, d1), Math.max(d0, d1)]);
  }
  return out.sort((x, y) => x[0] - y[0]);
}

/** 画出来的路段：整条路径去掉 breaks */
export function wireDrawn(total: number, breaks: [number, number][]): [number, number][] {
  const out: [number, number][] = [];
  let at = 0;
  for (const [a, b] of breaks) {
    if (a > at) out.push([at, a]);
    at = Math.max(at, b);
  }
  if (at < total) out.push([at, total]);
  return out;
}

/** 电流小圆点现在的位置（路程）：均匀排开，随 t 匀速前进，跑到头从头再来；落在 breaks 里的不画 */
export function wireDots(p: Props, w = wirePath(p), breaks = wireBreaks(p, w)): number[] {
  const spacing = Math.max(4, num(p.spacing, 36));
  const speed = num(p.speed, 90);
  const shift = (((num(p.t, 0) * speed) % spacing) + spacing) % spacing;
  const out: number[] = [];
  for (let d = shift; d <= w.total; d += spacing)
    if (!breaks.some(([a, b]) => d > a && d < b)) out.push(d);
  return out;
}

function polyline(w: WirePath, a: number, b: number): string {
  const pts: Point[] = [wirePointAt(w, a)];
  w.cum.forEach((c, i) => {
    if (c > a && c < b) pts.push(w.points[i]);
  });
  pts.push(wirePointAt(w, b));
  return pts.map(([x, y]) => `${x},${y}`).join(' ');
}

export const wirePart: PartDef = {
  type: 'wire',
  name: '导线',
  anchor: 'center',
  required: ['points'],
  props: ['points', 'breaks', 'width', 'flow', 't', 'speed', 'spacing'],
  bbox(p) {
    const w = wirePath(p);
    if (!w.points.length) return boxAround(...pt(p.at), 10, 10);
    const xs = w.points.map((q) => q[0]);
    const ys = w.points.map((q) => q[1]);
    const pad = num(p.width, 6) + 6;
    return {
      x: Math.min(...xs) - pad,
      y: Math.min(...ys) - pad,
      w: Math.max(...xs) - Math.min(...xs) + pad * 2,
      h: Math.max(...ys) - Math.min(...ys) + pad * 2,
    } satisfies Box;
  },
  Render({ p, ctx }) {
    const w = wirePath(p);
    const breaks = wireBreaks(p, w);
    const width = num(p.width, 6);
    const ink = color(p.color, ctx.theme);
    const flow = Math.max(0, Math.min(1, num(p.flow, 0)));
    const dot = color('yellow', ctx.theme);
    return (
      <g>
        {wireDrawn(w.total, breaks).map(([a, b], i) => (
          <polyline
            key={i}
            points={polyline(w, a, b)}
            fill="none"
            stroke={ink}
            strokeWidth={width}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {flow > 0
          ? wireDots(p, w, breaks).map((d, i) => {
              const [x, y] = wirePointAt(w, d);
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={width * 0.95}
                  fill={dot}
                  stroke={ink}
                  strokeWidth={1.5}
                  opacity={flow}
                />
              );
            })
          : null}
      </g>
    );
  },
};
