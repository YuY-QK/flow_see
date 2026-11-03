// 数学零件：数轴、钟面、分数圆、分数条、方格。
import { color, num, numList, pt, str, boxAround, type PartDef, type Props } from '../base';

/* ───────────── 数轴 ───────────── */

export interface Hop {
  from: number;
  to: number;
  label?: string;
  /** 画出来的程度 0–1（“跳一跳”动作逐渐画出弧线） */
  p?: number;
}

export function numberlineX(p: Props, v: number): number {
  const [x] = pt(p.at);
  const from = num(p.from, 0);
  const to = num(p.to, 0);
  const len = num(p.length, 0);
  return x + ((v - from) / (to - from || 1)) * len;
}

export function hopsOf(p: Props): Hop[] {
  return Array.isArray(p.hops)
    ? p.hops.filter(
        (h): h is Hop =>
          !!h && typeof h === 'object' && typeof h.from === 'number' && typeof h.to === 'number',
      )
    : [];
}

export const numberlinePart: PartDef = {
  type: 'numberline',
  name: '数轴',
  anchor: 'start',
  props: ['from', 'to', 'step', 'length', 'labelEvery', 'marks', 'pointer', 'hops', 'size'],
  bbox(p) {
    const [x, y] = pt(p.at);
    const len = num(p.length, 0);
    const span = num(p.to, 0) - num(p.from, 0) || 1;
    const hop = Math.max(0, ...hopsOf(p).map((h) => (Math.abs(h.to - h.from) / span) * len));
    const up = Math.max(30, Math.min(hop * 0.45, 120) + 30);
    return { x: x - 20, y: y - up, w: len + 40, h: up + 50 };
  },
  Render({ p, ctx }) {
    const [x, y] = pt(p.at);
    const from = num(p.from, 0);
    const to = num(p.to, 0);
    const step = Math.max(num(p.step, 1), 1e-6);
    const every = Math.max(1, Math.round(num(p.labelEvery, 1)));
    const len = num(p.length, 0);
    const size = num(p.size, 0);
    const c = color(p.color, ctx.theme);
    const X = (v: number) => numberlineX(p, v);
    const ticks: number[] = [];
    for (let v = from, i = 0; v <= to + 1e-9 && i < 500; v = from + ++i * step) ticks.push(v);
    const pointer = typeof p.pointer === 'number' ? p.pointer : undefined;
    return (
      <g>
        <line x1={x - 10} x2={x + len + 18} y1={y} y2={y} stroke={c} strokeWidth={3} />
        <path d={`M${x + len + 22},${y} l-12,-7 v14 z`} fill={c} />
        {ticks.map((v, i) => (
          <g key={i}>
            <line x1={X(v)} x2={X(v)} y1={y - 8} y2={y + 8} stroke={c} strokeWidth={2.5} />
            {i % every === 0 ? (
              <text
                x={X(v)}
                y={y + 14}
                textAnchor="middle"
                dominantBaseline="hanging"
                fontSize={size}
                fill={c}
              >
                {Math.round(v * 1000) / 1000}
              </text>
            ) : null}
          </g>
        ))}
        {numList(p.marks).map((v, i) => (
          <circle key={i} cx={X(v)} cy={y} r={8} fill={ctx.theme.accent} />
        ))}
        {hopsOf(p).map((h, i) => {
          const x1 = X(h.from);
          const x2 = X(h.to);
          const lift = Math.min(Math.abs(x2 - x1) * 0.45, 120) + 10;
          const d = `M${x1},${y - 6} C${x1},${y - lift} ${x2},${y - lift} ${x2},${y - 6}`;
          const shown = Math.max(0, Math.min(1, h.p ?? 1));
          return (
            <g key={i} opacity={shown > 0 ? 1 : 0}>
              <path
                d={d}
                fill="none"
                stroke={ctx.theme.accent}
                strokeWidth={3.5}
                pathLength={1}
                strokeDasharray={`${shown} 1`}
                strokeLinecap="round"
              />
              {h.label && shown >= 1 ? (
                <text
                  x={(x1 + x2) / 2}
                  y={y - lift * 0.75 - 8}
                  textAnchor="middle"
                  fontSize={size}
                  fontWeight="bold"
                  fill={ctx.theme.accent}
                >
                  {h.label}
                </text>
              ) : null}
            </g>
          );
        })}
        {pointer !== undefined ? (
          <path
            d={`M${X(pointer)},${y - 10} l-11,-18 h22 z`}
            fill={ctx.theme.accent}
            stroke={ctx.theme.stageBg}
            strokeWidth={2}
          />
        ) : null}
      </g>
    );
  },
};

/* ───────────── 钟面 ───────────── */

/** "3:30" / "15:05" / 210（分钟）→ 从 0:00 起的分钟数 */
export function parseClockTime(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const m = typeof v === 'string' ? v.trim().match(/^(\d{1,2}):(\d{2})$/) : null;
  if (!m || Number(m[2]) >= 60) return undefined;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** 时针、分针的角度（度，12 点方向为 0，顺时针） */
export function clockAngles(minutes: number): { hour: number; minute: number } {
  return { hour: (minutes / 2) % 360, minute: (minutes * 6) % 360 };
}

export const clockPart: PartDef = {
  type: 'clock',
  name: '钟面',
  anchor: 'center',
  props: ['time', 'radius', 'numbers', 'ticks', 'hands'],
  normalize(p) {
    if (p.time === undefined) return p;
    const t = parseClockTime(p.time);
    return t === undefined ? p : { ...p, time: t };
  },
  bbox(p) {
    const [x, y] = pt(p.at);
    const r = num(p.radius, 0);
    return boxAround(x, y, r * 2 + 12, r * 2 + 12);
  },
  Render({ p, ctx }) {
    const [x, y] = pt(p.at);
    const r = num(p.radius, 0);
    const c = color(p.color, ctx.theme);
    const minutes = num(parseClockTime(p.time), 0);
    const { hour, minute } = clockAngles(minutes);
    const hands = str(p.hands, 'both');
    const polar = (deg: number, len: number): [number, number] => [
      x + Math.sin((deg * Math.PI) / 180) * len,
      y - Math.cos((deg * Math.PI) / 180) * len,
    ];
    const hand = (deg: number, len: number, w: number, fill: string) => {
      const [hx, hy] = polar(deg, len);
      return (
        <line x1={x} y1={y} x2={hx} y2={hy} stroke={fill} strokeWidth={w} strokeLinecap="round" />
      );
    };
    return (
      <g>
        <circle cx={x} cy={y} r={r} fill={ctx.theme.stageBg} stroke={c} strokeWidth={5} />
        {p.ticks !== false
          ? Array.from({ length: 60 }, (_, i) => {
              const big = i % 5 === 0;
              const [x1, y1] = polar(i * 6, r - 6);
              const [x2, y2] = polar(i * 6, r - (big ? 20 : 12));
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={c}
                  strokeWidth={big ? 3.5 : 1.5}
                  strokeLinecap="round"
                />
              );
            })
          : null}
        {p.numbers !== false
          ? Array.from({ length: 12 }, (_, i) => {
              const [nx, ny] = polar((i + 1) * 30, r - 38);
              return (
                <text
                  key={i}
                  x={nx}
                  y={ny}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={r * 0.2}
                  fontWeight="bold"
                  fill={c}
                >
                  {i + 1}
                </text>
              );
            })
          : null}
        {hands !== 'minute' ? hand(hour, r * 0.5, 9, c) : null}
        {hands !== 'hour' ? hand(minute, r * 0.78, 5, ctx.theme.accent) : null}
        <circle cx={x} cy={y} r={8} fill={c} />
      </g>
    );
  },
};

/* ───────────── 分数圆、分数条 ───────────── */

/** 取了几份：可以是小数（“取几份”变化时，正在变的那一份半透明） */
function takeOf(p: Props, parts: number): number {
  return Math.max(0, Math.min(parts, num(p.take, 0)));
}

export const fractionCirclePart: PartDef = {
  type: 'fraction-circle',
  name: '分数圆',
  anchor: 'center',
  required: ['parts'],
  props: ['parts', 'take', 'radius'],
  bbox(p) {
    const [x, y] = pt(p.at);
    const r = num(p.radius, 0);
    return boxAround(x, y, r * 2 + 8, r * 2 + 8);
  },
  Render({ p, ctx }) {
    const [x, y] = pt(p.at);
    const r = num(p.radius, 0);
    const parts = Math.max(1, Math.round(num(p.parts, 0)));
    const take = takeOf(p, parts);
    const fill = color(p.color, ctx.theme, 'orange');
    const at = (k: number): [number, number] => {
      const a = (k / parts) * 2 * Math.PI;
      return [x + Math.sin(a) * r, y - Math.cos(a) * r];
    };
    return (
      <g>
        <circle cx={x} cy={y} r={r} fill={ctx.theme.stageBg} />
        {Array.from({ length: parts }, (_, k) => {
          const amount = Math.max(0, Math.min(1, take - k));
          if (amount <= 0) return null;
          if (parts === 1)
            return <circle key={k} cx={x} cy={y} r={r} fill={fill} opacity={amount} />;
          const [x1, y1] = at(k);
          const [x2, y2] = at(k + 1);
          return (
            <path
              key={k}
              d={`M${x},${y} L${x1},${y1} A${r},${r} 0 0 1 ${x2},${y2} Z`}
              fill={fill}
              opacity={amount}
            />
          );
        })}
        {parts > 1
          ? Array.from({ length: parts }, (_, k) => {
              const [x1, y1] = at(k);
              return (
                <line
                  key={k}
                  x1={x}
                  y1={y}
                  x2={x1}
                  y2={y1}
                  stroke={ctx.theme.ink}
                  strokeWidth={3}
                />
              );
            })
          : null}
        <circle cx={x} cy={y} r={r} fill="none" stroke={ctx.theme.ink} strokeWidth={4} />
      </g>
    );
  },
};

export const fractionBarPart: PartDef = {
  type: 'fraction-bar',
  name: '分数条',
  anchor: 'center',
  required: ['parts'],
  props: ['parts', 'take', 'width', 'height'],
  bbox(p) {
    const [x, y] = pt(p.at);
    return boxAround(x, y, num(p.width, 0) + 6, num(p.height, 0) + 6);
  },
  Render({ p, ctx }) {
    const [cx, cy] = pt(p.at);
    const w = num(p.width, 0);
    const h = num(p.height, 0);
    const x = cx - w / 2;
    const y = cy - h / 2;
    const parts = Math.max(1, Math.round(num(p.parts, 0)));
    const take = takeOf(p, parts);
    const cw = w / parts;
    const fill = color(p.color, ctx.theme, 'orange');
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} fill={ctx.theme.stageBg} />
        {Array.from({ length: parts }, (_, k) => {
          const amount = Math.max(0, Math.min(1, take - k));
          return amount > 0 ? (
            <rect key={k} x={x + k * cw} y={y} width={cw} height={h} fill={fill} opacity={amount} />
          ) : null;
        })}
        {Array.from({ length: parts - 1 }, (_, k) => (
          <line
            key={k}
            x1={x + (k + 1) * cw}
            x2={x + (k + 1) * cw}
            y1={y}
            y2={y + h}
            stroke={ctx.theme.ink}
            strokeWidth={3}
          />
        ))}
        <rect x={x} y={y} width={w} height={h} fill="none" stroke={ctx.theme.ink} strokeWidth={4} />
      </g>
    );
  },
};

/* ───────────── 方格 ───────────── */

export const gridPart: PartDef = {
  type: 'grid',
  name: '方格',
  anchor: 'start',
  props: ['rows', 'cols', 'cell', 'filled'],
  bbox(p) {
    const [x, y] = pt(p.at);
    const cell = num(p.cell, 0);
    return { x, y, w: num(p.cols, 0) * cell, h: num(p.rows, 0) * cell };
  },
  Render({ p, ctx }) {
    const [x, y] = pt(p.at);
    const rows = Math.max(1, Math.round(num(p.rows, 0)));
    const cols = Math.max(1, Math.round(num(p.cols, 0)));
    const cell = num(p.cell, 0);
    const filled = Math.max(0, num(p.filled, 0));
    const fill = color(p.color, ctx.theme, 'green');
    return (
      <g>
        {Array.from({ length: rows * cols }, (_, i) => {
          const amount = Math.max(0, Math.min(1, filled - i));
          return (
            <g key={i}>
              <rect
                x={x + (i % cols) * cell}
                y={y + Math.floor(i / cols) * cell}
                width={cell}
                height={cell}
                fill={ctx.theme.stageBg}
                stroke={ctx.theme.line}
                strokeWidth={2}
              />
              {amount > 0 ? (
                <rect
                  x={x + (i % cols) * cell + 3}
                  y={y + Math.floor(i / cols) * cell + 3}
                  width={cell - 6}
                  height={cell - 6}
                  rx={4}
                  fill={fill}
                  opacity={amount}
                />
              ) : null}
            </g>
          );
        })}
      </g>
    );
  },
};
