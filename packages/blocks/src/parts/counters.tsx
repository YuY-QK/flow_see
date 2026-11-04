// 计数块：圆片 / 方块 / 小棒，可按一排、一列、点阵或十格框排列。
import { sceneStyle } from '../style';
import {
  color,
  isPoint,
  mixColor,
  num,
  pt,
  str,
  type Box,
  type PartDef,
  type Point,
  type Props,
} from '../base';

export const COUNTER_LAYOUTS = ['row', 'column', 'grid', 'tenframe'] as const;
export const COUNTER_SHAPES = ['circle', 'square', 'stick'] as const;

function layoutOf(p: Props): (typeof COUNTER_LAYOUTS)[number] {
  const l = str(p.layout, 'row');
  return (COUNTER_LAYOUTS as readonly string[]).includes(l)
    ? (l as (typeof COUNTER_LAYOUTS)[number])
    : 'row';
}

/** 十格框有几个框：至少 1 个，按 count 和 capacity 中较大的算 */
export function frameCount(p: Props): number {
  return Math.max(1, Math.ceil(Math.max(num(p.count, 0), num(p.capacity, 0)) / 10));
}

/** 第 i 个位置（格子中心，舞台坐标）。i 可以超出当前个数：合并时飞到“下一个空位” */
export function counterSlot(p: Props, i: number): Point {
  const [x, y] = pt(p.at);
  const s = num(p.size, 0);
  switch (layoutOf(p)) {
    case 'column':
      return [x + s / 2, y + i * s + s / 2];
    case 'grid': {
      const cols = Math.max(1, Math.round(num(p.cols, 0)));
      return [x + (i % cols) * s + s / 2, y + Math.floor(i / cols) * s + s / 2];
    }
    case 'tenframe': {
      const k = Math.floor(i / 10);
      const j = i % 10;
      return [
        x + (j % 5) * s + s / 2,
        y + k * s * (2 + sceneStyle().tenframeGap) + Math.floor(j / 5) * s + s / 2,
      ];
    }
    default:
      return [x + i * s + s / 2, y + s / 2];
  }
}

/** 每个计数块现在的位置：拆分、移动时由场景写入 items，否则按排列计算 */
export function counterItems(p: Props): Point[] {
  const n = Math.max(0, Math.round(num(p.count, 0)));
  if (Array.isArray(p.items) && p.items.length === n && p.items.every(isPoint))
    return p.items as Point[];
  return Array.from({ length: n }, (_, i) => counterSlot(p, i));
}

/** 每个计数块的颜色：colors 里逐个给出（合并后借来的仍保留原来的颜色），没给的用 color */
export function counterColors(p: Props): string[] {
  const n = Math.max(0, Math.round(num(p.count, 0)));
  const base = str(p.color, 'blue');
  const list = Array.isArray(p.colors) ? p.colors : [];
  return Array.from({ length: n }, (_, i) => (typeof list[i] === 'string' ? list[i] : base));
}

function frameBoxes(p: Props): Box[] {
  if (layoutOf(p) !== 'tenframe') return [];
  const [x, y] = pt(p.at);
  const s = num(p.size, 0);
  return Array.from({ length: frameCount(p) }, (_, k) => ({
    x,
    y: y + k * s * (2 + sceneStyle().tenframeGap),
    w: 5 * s,
    h: 2 * s,
  }));
}

export const countersPart: PartDef = {
  type: 'counters',
  name: '计数块',
  anchor: 'start',
  required: ['count'],
  props: ['count', 'layout', 'cols', 'shape', 'size', 'capacity', 'colors', 'items'],
  bbox(p) {
    const s = num(p.size, 0);
    const boxes = [
      ...frameBoxes(p),
      ...counterItems(p).map(([cx, cy]) => ({ x: cx - s / 2, y: cy - s / 2, w: s, h: s })),
    ];
    if (!boxes.length) {
      const [x, y] = pt(p.at);
      return { x, y, w: s, h: s };
    }
    const x0 = Math.min(...boxes.map((b) => b.x));
    const y0 = Math.min(...boxes.map((b) => b.y));
    const x1 = Math.max(...boxes.map((b) => b.x + b.w));
    const y1 = Math.max(...boxes.map((b) => b.y + b.h));
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  },
  Render({ p, ctx }) {
    const s = num(p.size, 0);
    const fills = counterColors(p).map((c) => color(c, ctx.theme, 'blue'));
    const shape = str(p.shape, 'circle');
    const r = s * 0.38;
    // 边框：比填充色深一些，靠在一起、叠在一起的块也分得清
    const { width: bw, darken } = sceneStyle().counterBorder;
    const darkest = color('black', ctx.theme);
    const edge = (c: string) => mixColor(c, darkest, darken);
    return (
      <g>
        {frameBoxes(p).map((b, k) => (
          <g key={k} stroke={ctx.theme.line} strokeWidth={2.5} fill="none">
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={6} fill={ctx.theme.stageBg} />
            {[1, 2, 3, 4].map((c) => (
              <line key={c} x1={b.x + c * s} x2={b.x + c * s} y1={b.y} y2={b.y + b.h} />
            ))}
            <line x1={b.x} x2={b.x + b.w} y1={b.y + s} y2={b.y + s} />
          </g>
        ))}
        {counterItems(p).map(([cx, cy], i) =>
          shape === 'square' ? (
            <rect
              key={i}
              x={cx - r}
              y={cy - r}
              width={r * 2}
              height={r * 2}
              rx={r * 0.25}
              fill={fills[i]}
              stroke={edge(fills[i])}
              strokeWidth={bw}
            />
          ) : shape === 'stick' ? (
            <rect
              key={i}
              x={cx - s * 0.1}
              y={cy - s * 0.42}
              width={s * 0.2}
              height={s * 0.84}
              rx={s * 0.08}
              fill={fills[i]}
              stroke={edge(fills[i])}
              strokeWidth={bw}
            />
          ) : (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill={fills[i]}
              stroke={edge(fills[i])}
              strokeWidth={bw}
            />
          ),
        )}
      </g>
    );
  },
};

/** 十格框：计数块按十格框排列的简写 */
export const tenframePart: PartDef = {
  ...countersPart,
  type: 'tenframe',
  name: '十格框',
  required: [],
};
