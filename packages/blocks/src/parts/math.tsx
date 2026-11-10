// 数学零件：数轴、钟面、分数圆、分数条、方格。
import { formatNumber, time } from '@flow-see/core';
import {
  boxAround,
  color,
  num,
  numList,
  pt,
  str,
  textWidth as baseTextWidth,
  type Handle,
  type PartDef,
  type Point,
  type Props,
  type Subitem,
} from '../base';

/* ───────────── 数轴 ───────────── */

export interface Hop {
  from: number;
  to: number;
  label?: string;
  color?: string;
  /** 画出来的程度 0–1（“跳一跳”动作逐渐画出弧线） */
  p?: number;
}

export interface NumberlineLayer {
  labels?: 'integer' | 'decimal' | 'fraction' | 'time' | 'percent' | string;
  step?: number;
  offset?: number;
  color?: string;
}

export type TickValue =
  | { type: 'text'; text: string }
  | { type: 'frac'; num: string; den: string };

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

/** 格式化刻度文字（支持 integer、decimal、fraction、time、percent） */
export function formatTickValue(
  v: number,
  labels?: string,
  step?: number,
): TickValue {
  const lbl = labels || 'integer';

  if (lbl === 'percent') {
    return { type: 'text', text: formatNumber(v * 100) + '%' };
  }

  if (lbl === 'time') {
    return { type: 'text', text: time(v) };
  }

  if (lbl === 'fraction') {
    // 整数刻度写整数
    if (Math.abs(v - Math.round(v)) < 1e-6) {
      return { type: 'text', text: formatNumber(Math.round(v)) };
    }
    const s = Math.max(step ?? 1, 1e-6);
    const den0 = Math.round(1 / s);
    const num0 = Math.round(v * den0);
    const g = gcd(num0, den0);
    const num = num0 / g;
    const den = den0 / g;
    if (den === 1) {
      return { type: 'text', text: formatNumber(num) };
    }
    return {
      type: 'frac',
      num: formatNumber(num),
      den: String(den),
    };
  }

  if (lbl === 'decimal') {
    return { type: 'text', text: formatNumber(v) };
  }

  // integer / default：负数刻度写 −3（formatNumber 保证）
  if (Math.abs(v - Math.round(v)) < 1e-6) {
    return { type: 'text', text: formatNumber(Math.round(v)) };
  }
  return { type: 'text', text: formatNumber(v) };
}

/** 返回刻度文字的字符串表示（分数返回 "a/b"，用于测试断言及读屏） */
export function tickLabel(v: number, labels?: string, step?: number): string {
  const val = formatTickValue(v, labels, step);
  if (val.type === 'frac') return `${val.num}/${val.den}`;
  return val.text;
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

/** 渲染单个刻度标签（支持普通文本与 F4 行内分数） */
function TickLabelView({
  x,
  y,
  val,
  size,
  color,
}: {
  x: number;
  y: number;
  val: TickValue;
  size: number;
  color: string;
}) {
  if (val.type === 'text') {
    return (
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="hanging"
        fontSize={size}
        fill={color}
      >
        {val.text}
      </text>
    );
  }

  // F4 行内分数：分子分母字号 × 0.7，上下排列，中间横线
  const numSize = size * 0.7;
  const denSize = size * 0.7;
  const numW = baseTextWidth(val.num, numSize);
  const denW = baseTextWidth(val.den, denSize);
  const lineWidth = Math.max(numW, denW) + size * 0.2;
  const lineStrokeWidth = Math.max(1.5, size * 0.06);
  const cy = y + size * 0.5;

  return (
    <g data-tick-label={`${val.num}/${val.den}`}>
      <line
        x1={x - lineWidth / 2}
        x2={x + lineWidth / 2}
        y1={cy}
        y2={cy}
        stroke={color}
        strokeWidth={lineStrokeWidth}
        strokeLinecap="round"
      />
      <text
        x={x}
        y={cy - size * 0.35}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={numSize}
        fill={color}
      >
        {val.num}
      </text>
      <text
        x={x}
        y={cy + size * 0.35}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={denSize}
        fill={color}
      >
        {val.den}
      </text>
    </g>
  );
}

export const numberlinePart: PartDef = {
  type: 'numberline',
  name: '数轴',
  anchor: 'start',
  props: [
    'from',
    'to',
    'step',
    'length',
    'labelEvery',
    'labels',
    'layers',
    'zoomFrom',
    'zoomTo',
    'zoomScale',
    'marks',
    'pointer',
    'hops',
    'size',
  ],
  bbox(p) {
    const [x, y] = pt(p.at);
    const len = num(p.length, 0);
    const span = num(p.to, 0) - num(p.from, 0) || 1;
    const hop = Math.max(0, ...hopsOf(p).map((h) => (Math.abs(h.to - h.from) / span) * len));
    const up = Math.max(30, Math.min(hop * 0.45, 120) + 30);
    const size = num(p.size, 0) || 22;

    let down = Math.max(50, 14 + size + 10);
    if (Array.isArray(p.layers) && p.layers.length > 0) {
      down = Math.max(down, 14 + (p.layers.length + 1) * size * 1.4);
    }
    const zoomScale = num(p.zoomScale, 0);
    if (zoomScale > 1 && p.zoomFrom !== undefined && p.zoomTo !== undefined) {
      const zoomY = y + size * 3;
      down = Math.max(down, zoomY - y + 14 + size + 10);
    }

    return { x: x - 20, y: y - up, w: len + 40, h: up + down };
  },
  subitems(p): Subitem[] {
    const [x, y] = pt(p.at);
    const from = num(p.from, 0);
    const to = num(p.to, 0);
    const step = Math.max(num(p.step, 1), 1e-6);
    const len = num(p.length, 0);
    const size = num(p.size, 0) || 22;
    const X = (v: number) => numberlineX(p, v);

    const items: Subitem[] = [];

    // tick.<值>（刻度点，值用 formatNumber 后的字符串）
    for (let v = from, i = 0; v <= to + 1e-9 && i < 500; v = from + ++i * step) {
      const formatted = formatNumber(v);
      const cx = X(v);
      items.push({
        name: `tick.${formatted}`,
        box: boxAround(cx, y, 40, 40),
        value: v,
        label: formatted,
      });
    }

    // zoom
    const zoomScale = num(p.zoomScale, 0);
    if (zoomScale > 1 && p.zoomFrom !== undefined && p.zoomTo !== undefined) {
      const zoomLen = len * 0.8;
      const zoomX = x + (len - zoomLen) / 2;
      const zoomY = y + size * 3;
      items.push({
        name: 'zoom',
        box: {
          x: zoomX - 10,
          y: zoomY - 10,
          w: zoomLen + 20,
          h: size + 30,
        },
      });
    }

    return items;
  },
  Render({ p, ctx }) {
    const [x, y] = pt(p.at);
    const from = num(p.from, 0);
    const to = num(p.to, 0);
    const step = Math.max(num(p.step, 1), 1e-6);
    const every = Math.max(1, Math.round(num(p.labelEvery, 1)));
    const len = num(p.length, 0);
    const size = num(p.size, 0) || 22;
    const c = color(p.color, ctx.theme);
    const X = (v: number) => numberlineX(p, v);
    const ticks: number[] = [];
    for (let v = from, i = 0; v <= to + 1e-9 && i < 500; v = from + ++i * step) ticks.push(v);
    const pointer = typeof p.pointer === 'number' ? p.pointer : undefined;
    const mainLabels = str(p.labels) || 'integer';

    // layers 多层刻度
    const layers: NumberlineLayer[] = Array.isArray(p.layers)
      ? (p.layers.filter((l) => !!l && typeof l === 'object') as NumberlineLayer[])
      : [];

    // zoom 放大轴
    const zoomScale = num(p.zoomScale, 0);
    const hasZoom = zoomScale > 1 && p.zoomFrom !== undefined && p.zoomTo !== undefined;
    const zFrom = num(p.zoomFrom, from);
    const zTo = num(p.zoomTo, to);
    const zoomLen = len * 0.8;
    const zoomX = x + (len - zoomLen) / 2;
    const zoomY = y + size * 3;
    const zoomXAt = (v: number) => zoomX + ((v - zFrom) / (zTo - zFrom || 1)) * zoomLen;
    const zoomStep = step / 10;
    const zoomTicks: number[] = [];
    if (hasZoom) {
      for (let v = zFrom, i = 0; v <= zTo + 1e-9 && i < 500; v = zFrom + ++i * zoomStep) {
        zoomTicks.push(v);
      }
    }

    return (
      <g>
        <line x1={x - 10} x2={x + len + 18} y1={y} y2={y} stroke={c} strokeWidth={3} />
        <path d={`M${x + len + 22},${y} l-12,-7 v14 z`} fill={c} />
        {ticks.map((v, i) => {
          // 0 刻度加粗（线宽 × 1.5）
          const isZero = Math.abs(v) < 1e-6;
          const tickStrokeWidth = isZero ? 2.5 * 1.5 : 2.5;
          return (
            <g key={i}>
              <line
                x1={X(v)}
                x2={X(v)}
                y1={y - 8}
                y2={y + 8}
                stroke={c}
                strokeWidth={tickStrokeWidth}
              />
              {i % every === 0 ? (
                <TickLabelView
                  x={X(v)}
                  y={y + 14}
                  val={formatTickValue(v, mainLabels, step)}
                  size={size}
                  color={c}
                />
              ) : null}
            </g>
          );
        })}
        {/* 多行刻度文字 layers */}
        {layers.map((layer, lIdx) => {
          const layerY = y + 14 + (lIdx + 1) * size * 1.4;
          const layerLabels = layer.labels || mainLabels;
          const layerStep = Math.max(typeof layer.step === 'number' ? layer.step : step, 1e-6);
          const layerOffset = typeof layer.offset === 'number' ? layer.offset : 0;
          const layerColor = layer.color ? color(layer.color, ctx.theme) : c;
          const layerTicks: number[] = [];
          for (
            let v = from + layerOffset, i = 0;
            v <= to + 1e-9 && i < 500;
            v = from + layerOffset + ++i * layerStep
          ) {
            layerTicks.push(v);
          }
          return (
            <g key={`layer-${lIdx}`}>
              {layerTicks.map((v, i) => (
                <TickLabelView
                  key={i}
                  x={X(v)}
                  y={layerY}
                  val={formatTickValue(v, layerLabels, layerStep)}
                  size={size}
                  color={layerColor}
                />
              ))}
            </g>
          );
        })}
        {numList(p.marks).map((v, i) => (
          <circle key={i} cx={X(v)} cy={y} r={8} fill={ctx.theme.accent} />
        ))}
        {hopsOf(p).map((h, i) => {
          const x1 = X(h.from);
          const x2 = X(h.to);
          const lift = Math.min(Math.abs(x2 - x1) * 0.45, 120) + 10;
          const d = `M${x1},${y - 6} C${x1},${y - lift} ${x2},${y - lift} ${x2},${y - 6}`;
          const shown = Math.max(0, Math.min(1, h.p ?? 1));
          const hopColor = h.color ? color(h.color, ctx.theme) : ctx.theme.accent;
          return (
            <g key={i} opacity={shown > 0 ? 1 : 0}>
              <path
                d={d}
                fill="none"
                stroke={hopColor}
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
                  fill={hopColor}
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
        {/* zoom 放大轴 */}
        {hasZoom ? (
          <g>
            {/* 连接原数轴与放大轴两端的 line 色虚线 */}
            <line
              x1={X(zFrom)}
              y1={y}
              x2={zoomX}
              y2={zoomY}
              stroke={ctx.theme.line}
              strokeWidth={2}
              strokeDasharray="8 6"
            />
            <line
              x1={X(zTo)}
              y1={y}
              x2={zoomX + zoomLen}
              y2={zoomY}
              stroke={ctx.theme.line}
              strokeWidth={2}
              strokeDasharray="8 6"
            />
            {/* 放大轴主体 */}
            <line
              x1={zoomX}
              x2={zoomX + zoomLen}
              y1={zoomY}
              y2={zoomY}
              stroke={c}
              strokeWidth={3}
            />
            {zoomTicks.map((v, i) => {
              const isZero = Math.abs(v) < 1e-6;
              const tickStrokeWidth = isZero ? 2.5 * 1.5 : 2.5;
              return (
                <g key={i}>
                  <line
                    x1={zoomXAt(v)}
                    x2={zoomXAt(v)}
                    y1={zoomY - 6}
                    y2={zoomY + 6}
                    stroke={c}
                    strokeWidth={tickStrokeWidth}
                  />
                  <TickLabelView
                    x={zoomXAt(v)}
                    y={zoomY + 14}
                    val={formatTickValue(v, 'decimal', zoomStep)}
                    size={size}
                    color={c}
                  />
                </g>
              );
            })}
          </g>
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

/** 时针、分针、秒针的角度（度，12 点方向为 0，顺时针） */
export function clockAngles(
  minutes: number,
  seconds?: number,
): { hour: number; minute: number; second?: number } {
  const res: { hour: number; minute: number; second?: number } = {
    hour: (minutes / 2) % 360,
    minute: (minutes * 6) % 360,
  };
  if (seconds !== undefined) {
    res.second = ((seconds * 6) % 360 + 360) % 360;
  }
  return res;
}

export const clockPart: PartDef = {
  type: 'clock',
  name: '钟面',
  anchor: 'center',
  props: ['time', 'radius', 'numbers', 'ticks', 'hands', 'emphasis', 'seconds', 'hour24'],
  normalize(p) {
    let next = p;
    if (p.time !== undefined) {
      const t = parseClockTime(p.time);
      if (t !== undefined) next = { ...next, time: t };
    }
    if (p.seconds !== undefined) {
      const s = typeof p.seconds === 'number' ? p.seconds : Number(p.seconds);
      if (Number.isFinite(s)) next = { ...next, seconds: s };
    }
    return next;
  },
  bbox(p) {
    const [x, y] = pt(p.at);
    const r = num(p.radius, 0);
    return boxAround(x, y, r * 2 + 12, r * 2 + 12);
  },
  handles(p): Handle[] {
    const [x, y] = pt(p.at);
    const r = num(p.radius, 0);
    const minutes = num(parseClockTime(p.time), 0);
    const { hour, minute } = clockAngles(minutes);
    const hands = str(p.hands, 'both');
    const res: Handle[] = [];

    // 分针把手（prop 'time'，已有）
    if (hands !== 'hour') {
      const radMin = (minute * Math.PI) / 180;
      const minLen = r * 0.78;
      const atMin: Point = [x + Math.sin(radMin) * minLen, y - Math.cos(radMin) * minLen];
      res.push({
        prop: 'time',
        at: atMin,
        kind: 'rotate',
        center: [x, y],
        min: 0,
        max: 720,
        valueAt(pointer: Point): number {
          const dx = pointer[0] - x;
          const dy = pointer[1] - y;
          if (dx === 0 && dy === 0) return minutes;
          let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
          if (deg < 0) deg += 360;
          const minuteOffset = deg / 6;
          const currentHour = Math.floor(minutes / 60);
          return currentHour * 60 + minuteOffset;
        },
      });
    }

    // 时针把手（prop 'time'，拖时针按 1 分钟 = 0.5° 换算，保持吸附到 step）
    if (hands !== 'minute') {
      const radHour = (hour * Math.PI) / 180;
      const hourLen = r * 0.5;
      const atHour: Point = [x + Math.sin(radHour) * hourLen, y - Math.cos(radHour) * hourLen];
      res.push({
        prop: 'time',
        at: atHour,
        kind: 'rotate',
        center: [x, y],
        min: 0,
        max: 720,
        valueAt(pointer: Point): number {
          const dx = pointer[0] - x;
          const dy = pointer[1] - y;
          if (dx === 0 && dy === 0) return minutes;
          let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
          if (deg < 0) deg += 360;
          let val = deg / 0.5;
          if (minutes >= 720) {
            val += 720;
          } else if (minutes > 660 && val === 0) {
            val = 720;
          }
          return val;
        },
      });
    }

    // 秒针把手（prop 'seconds'，写了就画秒针）
    if (p.seconds !== undefined) {
      const seconds = num(p.seconds, 0);
      const { second = 0 } = clockAngles(minutes, seconds);
      const radSec = (second * Math.PI) / 180;
      const secLen = r * 0.78 * 1.1;
      const atSec: Point = [x + Math.sin(radSec) * secLen, y - Math.cos(radSec) * secLen];
      res.push({
        prop: 'seconds',
        at: atSec,
        kind: 'rotate',
        center: [x, y],
        min: 0,
        max: 60,
        valueAt(pointer: Point): number {
          const dx = pointer[0] - x;
          const dy = pointer[1] - y;
          if (dx === 0 && dy === 0) return seconds;
          let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
          if (deg < 0) deg += 360;
          return deg / 6;
        },
      });
    }

    return res;
  },
  Render({ p, ctx }) {
    const [x, y] = pt(p.at);
    const r = num(p.radius, 0);
    const c = color(p.color, ctx.theme);
    const minutes = num(parseClockTime(p.time), 0);
    const hasSeconds = p.seconds !== undefined && p.seconds !== null;
    const seconds = hasSeconds ? num(p.seconds, 0) : undefined;
    const { hour, minute, second } = clockAngles(minutes, seconds);
    const hands = str(p.hands, 'both');
    const emphasis = str(p.emphasis, 'none');
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
    const secColor = color('red', ctx.theme);
    const dimColor = color('dim', ctx.theme);
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
              const numR = p.hour24 ? r - 50 : r - 38;
              const [nx, ny] = polar((i + 1) * 30, numR);
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
        {p.numbers !== false && p.hour24
          ? Array.from({ length: 12 }, (_, i) => {
              const [nx, ny] = polar((i + 1) * 30, r - 26);
              return (
                <text
                  key={`h24-${i}`}
                  x={nx}
                  y={ny}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={r * 0.2 * 0.55}
                  fontWeight="bold"
                  fill={dimColor}
                >
                  {i + 13}
                </text>
              );
            })
          : null}
        {/* emphasis：突出一根指针（另一根变淡），讲“哪根是时针、哪根是分针”时用 */}
        <g opacity={emphasis === 'minute' ? 0.3 : 1}>
          {hands !== 'minute' ? hand(hour, r * 0.5, emphasis === 'hour' ? 14 : 9, c) : null}
        </g>
        <g opacity={emphasis === 'hour' ? 0.3 : 1}>
          {hands !== 'hour'
            ? hand(minute, r * 0.78, emphasis === 'minute' ? 9 : 5, ctx.theme.accent)
            : null}
        </g>
        {/* 秒针：细线，red，比分针长 10%，尾部有短配重；时间连续变化时秒针由 seconds 单独控制 */}
        {seconds !== undefined && second !== undefined ? (() => {
          const secLen = r * 0.78 * 1.1;
          const tailLen = r * 0.2;
          const [sx2, sy2] = polar(second, secLen);
          const [tx, ty] = polar(second + 180, tailLen);
          const [wx, wy] = polar(second + 180, tailLen * 0.65);
          return (
            <g opacity={emphasis !== 'none' ? 0.3 : 1}>
              <line
                x1={tx}
                y1={ty}
                x2={sx2}
                y2={sy2}
                stroke={secColor}
                strokeWidth={2}
                strokeLinecap="round"
              />
              <circle cx={wx} cy={wy} r={r * 0.035} fill={secColor} />
            </g>
          );
        })() : null}
        <circle cx={x} cy={y} r={8} fill={c} />
        {seconds !== undefined ? <circle cx={x} cy={y} r={3.5} fill={secColor} /> : null}
      </g>
    );
  },
};

/** 分钟数 → “3:05”这样的时间（12 小时制，0 点显示为 12） */
export function formatClockTime(minutes: number): string {
  const m = Math.floor(((minutes % 1440) + 1440) % 1440);
  const h = Math.floor(m / 60) % 12 || 12;
  return `${h}:${String(m % 60).padStart(2, '0')}`;
}

/** 电子钟：方框里的数字时间；time 和钟面一样写，可以连续变化 */
export const digitalClockPart: PartDef = {
  type: 'digital-clock',
  name: '电子钟',
  anchor: 'center',
  props: ['time', 'size'],
  normalize: clockPart.normalize,
  bbox(p) {
    const [x, y] = pt(p.at);
    const size = num(p.size, 0);
    return boxAround(x, y, size * 3.4, size * 1.6);
  },
  Render({ p, ctx }) {
    const b = digitalClockPart.bbox(p);
    const [x, y] = pt(p.at);
    const size = num(p.size, 0);
    const c = color(p.color, ctx.theme);
    return (
      <g>
        <rect
          x={b.x}
          y={b.y}
          width={b.w}
          height={b.h}
          rx={size * 0.3}
          fill={ctx.theme.stageBg}
          stroke={c}
          strokeWidth={4}
        />
        <text
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size}
          fontWeight="bold"
          fill={c}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {formatClockTime(num(parseClockTime(p.time), 0))}
        </text>
      </g>
    );
  },
};

/* ───────────── 分数圆、分数条 ───────────── */

/** 计算扇形的包围盒（舞台坐标） */
function sectorBox(cx: number, cy: number, r: number, a1: number, a2: number) {
  if (a2 - a1 >= 2 * Math.PI - 1e-6) {
    return { x: cx - r, y: cy - r, w: 2 * r, h: 2 * r };
  }
  const pts: [number, number][] = [
    [cx, cy],
    [cx + Math.sin(a1) * r, cy - Math.cos(a1) * r],
    [cx + Math.sin(a2) * r, cy - Math.cos(a2) * r],
  ];
  const cardinals = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2, 2 * Math.PI];
  for (const c of cardinals) {
    if (c > a1 && c < a2) {
      pts.push([cx + Math.sin(c) * r, cy - Math.cos(c) * r]);
    }
  }
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** 取了几份：可以是小数（“取几份”变化时，正在变的那一份半透明） */
function takeOf(p: Props, parts: number): number {
  return Math.max(0, Math.min(parts, num(p.take, 0)));
}

export const fractionCirclePart: PartDef = {
  type: 'fraction-circle',
  name: '分数圆',
  anchor: 'center',
  required: ['parts'],
  props: ['parts', 'take', 'radius', 'wholes', 'subdivide'],
  bbox(p) {
    const [cx, cy] = pt(p.at);
    const r = num(p.radius, 0);
    const wholes = Math.max(1, Math.round(num(p.wholes, 1)));
    const gap = r * 0.3;
    const totalW = wholes * (2 * r) + (wholes - 1) * gap;
    return boxAround(cx, cy, totalW + 8, r * 2 + 8);
  },
  subitems(p) {
    const [cx, cy] = pt(p.at);
    const r = num(p.radius, 0);
    const wholes = Math.max(1, Math.round(num(p.wholes, 1)));
    const parts = Math.max(1, Math.round(num(p.parts, 1)));
    const subdivide = Math.max(1, num(p.subdivide, 1));
    const subDiv = Math.max(1, Math.round(subdivide));
    const effectiveParts = parts * subDiv;
    const gap = r * 0.3;
    const pitch = 2 * r + gap;
    const x0 = cx - ((wholes - 1) * pitch) / 2;

    const items: Subitem[] = [];
    for (let wi = 0; wi < wholes; wi++) {
      const cxW = x0 + wi * pitch;
      items.push({
        name: `whole.${wi + 1}`,
        box: { x: cxW - r, y: cy - r, w: 2 * r, h: 2 * r },
      });
    }
    for (let wi = 0; wi < wholes; wi++) {
      const cxW = x0 + wi * pitch;
      for (let pj = 0; pj < effectiveParts; pj++) {
        const partNum = wi * effectiveParts + pj + 1;
        const a1 = (pj / effectiveParts) * 2 * Math.PI;
        const a2 = ((pj + 1) / effectiveParts) * 2 * Math.PI;
        items.push({
          name: `part.${partNum}`,
          box: sectorBox(cxW, cy, r, a1, a2),
        });
      }
    }
    return items;
  },
  Render({ p, ctx }) {
    const [cx, cy] = pt(p.at);
    const r = num(p.radius, 0);
    const wholes = Math.max(1, Math.round(num(p.wholes, 1)));
    const parts = Math.max(1, Math.round(num(p.parts, 1)));
    const subdivide = Math.max(1, num(p.subdivide, 1));
    const targetDiv =
      subdivide > 1 && !Number.isInteger(subdivide)
        ? Math.ceil(subdivide)
        : Math.max(1, Math.round(subdivide));
    const lineRatio = Number.isInteger(subdivide) ? 1.0 : subdivide - Math.floor(subdivide);
    const effectiveParts = parts * targetDiv;
    const totalParts = wholes * effectiveParts;
    const take = takeOf(p, totalParts);
    const fill = color(p.color, ctx.theme, 'orange');

    const gap = r * 0.3;
    const pitch = 2 * r + gap;
    const x0 = cx - ((wholes - 1) * pitch) / 2;

    return (
      <g>
        {Array.from({ length: wholes }, (_, wi) => {
          const cxW = x0 + wi * pitch;
          const cyW = cy;
          const atAngle = (idx: number, rad = r): [number, number] => {
            const a = (idx / effectiveParts) * 2 * Math.PI;
            return [cxW + Math.sin(a) * rad, cyW - Math.cos(a) * rad];
          };
          return (
            <g key={wi}>
              <circle cx={cxW} cy={cyW} r={r} fill={ctx.theme.stageBg} />
              {Array.from({ length: effectiveParts }, (_, pj) => {
                const pIndex = wi * effectiveParts + pj;
                const amount = Math.max(0, Math.min(1, take - pIndex));
                if (amount <= 0) return null;
                if (effectiveParts === 1) {
                  return <circle key={pj} cx={cxW} cy={cyW} r={r} fill={fill} opacity={amount} />;
                }
                const [x1, y1] = atAngle(pj);
                const [x2, y2] = atAngle(pj + 1);
                return (
                  <path
                    key={pj}
                    d={`M${cxW},${cyW} L${x1},${y1} A${r},${r} 0 0 1 ${x2},${y2} Z`}
                    fill={fill}
                    opacity={amount}
                  />
                );
              })}
              {parts > 1
                ? Array.from({ length: parts }, (_, k) => {
                    const a = (k / parts) * 2 * Math.PI;
                    const x1 = cxW + Math.sin(a) * r;
                    const y1 = cyW - Math.cos(a) * r;
                    return (
                      <line
                        key={`p-${k}`}
                        x1={cxW}
                        y1={cyW}
                        x2={x1}
                        y2={y1}
                        stroke={ctx.theme.ink}
                        strokeWidth={3}
                      />
                    );
                  })
                : null}
              {targetDiv > 1
                ? Array.from({ length: parts }, (_, k) =>
                    Array.from({ length: targetDiv - 1 }, (__, j) => {
                      const subPartIdx = k * targetDiv + j + 1;
                      const a = (subPartIdx / effectiveParts) * 2 * Math.PI;
                      const subLen = r * lineRatio;
                      const xEnd = cxW + Math.sin(a) * subLen;
                      const yEnd = cyW - Math.cos(a) * subLen;
                      return (
                        <line
                          key={`sub-${k}-${j}`}
                          data-subdivide-line="true"
                          x1={cxW}
                          y1={cyW}
                          x2={xEnd}
                          y2={yEnd}
                          stroke={ctx.theme.ink}
                          strokeWidth={3}
                        />
                      );
                    }),
                  )
                : null}
              <circle cx={cxW} cy={cyW} r={r} fill="none" stroke={ctx.theme.ink} strokeWidth={4} />
            </g>
          );
        })}
      </g>
    );
  },
};

export const fractionBarPart: PartDef = {
  type: 'fraction-bar',
  name: '分数条',
  anchor: 'center',
  required: ['parts'],
  props: ['parts', 'take', 'width', 'height', 'wholes', 'subdivide'],
  bbox(p) {
    const [cx, cy] = pt(p.at);
    const w = num(p.width, 0);
    const h = num(p.height, 0);
    const wholes = Math.max(1, Math.round(num(p.wholes, 1)));
    const gap = h * 0.4;
    const totalH = wholes * h + (wholes - 1) * gap;
    return boxAround(cx, cy, w + 6, totalH + 6);
  },
  subitems(p) {
    const [cx, cy] = pt(p.at);
    const w = num(p.width, 0);
    const h = num(p.height, 0);
    const wholes = Math.max(1, Math.round(num(p.wholes, 1)));
    const parts = Math.max(1, Math.round(num(p.parts, 1)));
    const subdivide = Math.max(1, num(p.subdivide, 1));
    const subDiv = Math.max(1, Math.round(subdivide));
    const effectiveParts = parts * subDiv;
    const gap = h * 0.4;
    const pitch = h + gap;
    const y0 = cy - ((wholes - 1) * pitch) / 2;
    const x = cx - w / 2;
    const cw = w / effectiveParts;

    const items: Subitem[] = [];
    for (let wi = 0; wi < wholes; wi++) {
      const cyW = y0 + wi * pitch;
      items.push({
        name: `whole.${wi + 1}`,
        box: { x, y: cyW - h / 2, w, h },
      });
    }
    for (let wi = 0; wi < wholes; wi++) {
      const cyW = y0 + wi * pitch;
      const yW = cyW - h / 2;
      for (let pj = 0; pj < effectiveParts; pj++) {
        const partNum = wi * effectiveParts + pj + 1;
        items.push({
          name: `part.${partNum}`,
          box: { x: x + pj * cw, y: yW, w: cw, h },
        });
      }
    }
    return items;
  },
  Render({ p, ctx }) {
    const [cx, cy] = pt(p.at);
    const w = num(p.width, 0);
    const h = num(p.height, 0);
    const wholes = Math.max(1, Math.round(num(p.wholes, 1)));
    const parts = Math.max(1, Math.round(num(p.parts, 1)));
    const subdivide = Math.max(1, num(p.subdivide, 1));
    const targetDiv =
      subdivide > 1 && !Number.isInteger(subdivide)
        ? Math.ceil(subdivide)
        : Math.max(1, Math.round(subdivide));
    const lineRatio = Number.isInteger(subdivide) ? 1.0 : subdivide - Math.floor(subdivide);
    const effectiveParts = parts * targetDiv;
    const totalParts = wholes * effectiveParts;
    const take = takeOf(p, totalParts);
    const cw = w / effectiveParts;
    const partW = w / parts;
    const fill = color(p.color, ctx.theme, 'orange');

    const gap = h * 0.4;
    const pitch = h + gap;
    const y0 = cy - ((wholes - 1) * pitch) / 2;
    const x = cx - w / 2;

    return (
      <g>
        {Array.from({ length: wholes }, (_, wi) => {
          const cyW = y0 + wi * pitch;
          const yW = cyW - h / 2;
          return (
            <g key={wi}>
              <rect x={x} y={yW} width={w} height={h} fill={ctx.theme.stageBg} />
              {Array.from({ length: effectiveParts }, (_, pj) => {
                const pIndex = wi * effectiveParts + pj;
                const amount = Math.max(0, Math.min(1, take - pIndex));
                return amount > 0 ? (
                  <rect
                    key={pj}
                    x={x + pj * cw}
                    y={yW}
                    width={cw}
                    height={h}
                    fill={fill}
                    opacity={amount}
                  />
                ) : null;
              })}
              {Array.from({ length: parts - 1 }, (_, k) => (
                <line
                  key={`p-${k}`}
                  x1={x + (k + 1) * partW}
                  x2={x + (k + 1) * partW}
                  y1={yW}
                  y2={yW + h}
                  stroke={ctx.theme.ink}
                  strokeWidth={3}
                />
              ))}
              {targetDiv > 1
                ? Array.from({ length: parts }, (_, k) =>
                    Array.from({ length: targetDiv - 1 }, (__, j) => {
                      const subW = partW / targetDiv;
                      const xSub = x + k * partW + (j + 1) * subW;
                      const subH = h * lineRatio;
                      return (
                        <line
                          key={`sub-${k}-${j}`}
                          data-subdivide-line="true"
                          x1={xSub}
                          x2={xSub}
                          y1={yW}
                          y2={yW + subH}
                          stroke={ctx.theme.ink}
                          strokeWidth={3}
                        />
                      );
                    }),
                  )
                : null}
              <rect
                x={x}
                y={yW}
                width={w}
                height={h}
                fill="none"
                stroke={ctx.theme.ink}
                strokeWidth={4}
              />
            </g>
          );
        })}
      </g>
    );
  },
};

/* ───────────── 方格 ───────────── */

export const gridPart: PartDef = {
  type: 'grid',
  name: '方格',
  anchor: 'start',
  props: ['rows', 'cols', 'cell', 'filled', 'cells'],
  bbox(p) {
    const [x, y] = pt(p.at);
    const cell = num(p.cell, 0);
    return { x, y, w: num(p.cols, 0) * cell, h: num(p.rows, 0) * cell };
  },
  subitems(p) {
    const [x, y] = pt(p.at);
    const rows = Math.max(1, Math.round(num(p.rows, 0)));
    const cols = Math.max(1, Math.round(num(p.cols, 0)));
    const cell = num(p.cell, 0);
    const items: Subitem[] = [];
    for (let r = 1; r <= rows; r++) {
      items.push({
        name: `row.${r}`,
        box: { x, y: y + (r - 1) * cell, w: cols * cell, h: cell },
      });
    }
    for (let c = 1; c <= cols; c++) {
      items.push({
        name: `col.${c}`,
        box: { x: x + (c - 1) * cell, y, w: cell, h: rows * cell },
      });
    }
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        items.push({
          name: `cell.${r}.${c}`,
          box: { x: x + (c - 1) * cell, y: y + (r - 1) * cell, w: cell, h: cell },
        });
      }
    }
    return items;
  },
  Render({ p, ctx }) {
    const [x, y] = pt(p.at);
    const rows = Math.max(1, Math.round(num(p.rows, 0)));
    const cols = Math.max(1, Math.round(num(p.cols, 0)));
    const cell = num(p.cell, 0);
    const filled = Math.max(0, num(p.filled, 0));
    const fill = color(p.color, ctx.theme, 'green');
    const hasCells = Array.isArray(p.cells);
    const cellSet = hasCells
      ? new Set(
          (p.cells as unknown[])
            .filter((item): item is [unknown, unknown] => Array.isArray(item) && item.length === 2)
            .map(([r, c]) => `${Math.round(num(r, 0))},${Math.round(num(c, 0))}`),
        )
      : null;
    const subColors =
      p._subColors && typeof p._subColors === 'object'
        ? (p._subColors as Record<string, string>)
        : undefined;

    return (
      <g>
        {Array.from({ length: rows * cols }, (_, i) => {
          const r = Math.floor(i / cols) + 1;
          const c = (i % cols) + 1;
          const isColored = cellSet ? cellSet.has(`${r},${c}`) : false;
          const amount = cellSet ? (isColored ? 1 : 0) : Math.max(0, Math.min(1, filled - i));
          const cellColor = subColors
            ? color(
                subColors[`cell.${r}.${c}`] ??
                  subColors[`row.${r}`] ??
                  subColors[`col.${c}`] ??
                  p.color,
                ctx.theme,
                'green',
              )
            : fill;

          return (
            <g key={i}>
              <rect
                x={x + (c - 1) * cell}
                y={y + (r - 1) * cell}
                width={cell}
                height={cell}
                fill={ctx.theme.stageBg}
                stroke={ctx.theme.line}
                strokeWidth={2}
              />
              {amount > 0 ? (
                <rect
                  x={x + (c - 1) * cell + 3}
                  y={y + (r - 1) * cell + 3}
                  width={Math.max(0, cell - 6)}
                  height={Math.max(0, cell - 6)}
                  rx={4}
                  fill={cellColor}
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
