// 粒子示意：把物质看成许多小颗粒，固态排得整齐只在原地抖动，液态挨得很近、能挪动，气态离得很远、到处跑。
// （水的三态变化、以后的扩散、热胀冷缩等都能用。）
//
// phase 0 固态、1 液态、2 气态，可以连续变化（用 set 动作改 phase，颗粒一边移动一边换排法）；
// t 是动画时钟（秒）：颗粒的抖动、游动是 t 的函数，用 set 动作让 t 匀速增大（ease: linear）就一直在动，
// 暂停、拖进度条、导出视频都能得到同一帧。位置只由 (phase, t, 属性) 决定，没有随机数。
import { boxAround, color, num, pt, type Box, type PartDef, type Props } from '../base';

export interface Dot {
  x: number;
  y: number;
}

const COLS = 6;

/** 固定的伪随机数（同一个序号永远得到同一个值，0–1） */
function rnd(i: number, k: number): number {
  const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

export interface ParticleLayout {
  width: number;
  height: number;
  r: number;
  n: number;
  /** 三种状态下每个颗粒的位置（相对盒子左上角）和游动幅度 */
  solid: Dot[];
  liquid: Dot[];
  gas: Dot[];
  amp: [number, number, number];
}

export function particleLayout(p: Props): ParticleLayout {
  const width = Math.max(40, num(p.width, 300));
  const height = Math.max(40, num(p.height, 260));
  const r = Math.max(2, num(p.radius, 9));
  const n = Math.max(1, Math.round(num(p.count, 36)));
  const rows = Math.ceil(n / COLS);
  const pad = r * 1.6;

  // 固态：整整齐齐的方阵，靠下居中
  const a = r * 2.4;
  const sx = (width - (COLS - 1) * a) / 2;
  const solid = Array.from({ length: n }, (_, i) => ({
    x: sx + (i % COLS) * a,
    y: height - pad - Math.floor(i / COLS) * a,
  }));

  // 液态：同样靠下，挨得很近但排得乱一点（每个颗粒偏一点）
  const b = r * 3;
  const lx = (width - (COLS - 1) * b) / 2;
  const liquid = Array.from({ length: n }, (_, i) => ({
    x: lx + (i % COLS) * b + (rnd(i, 1) - 0.5) * r * 0.7,
    y: height - pad - Math.floor(i / COLS) * b + (rnd(i, 2) - 0.5) * r * 0.7,
  }));

  // 气态：整个盒子里均匀地撒开，每个颗粒在自己的“格”里
  const cw = (width - pad * 2) / COLS;
  const ch = (height - pad * 2) / rows;
  const gas = Array.from({ length: n }, (_, i) => ({
    x: pad + (i % COLS) * cw + cw * (0.2 + 0.6 * rnd(i, 3)),
    y: pad + Math.floor(i / COLS) * ch + ch * (0.2 + 0.6 * rnd(i, 4)),
  }));

  return {
    width,
    height,
    r,
    n,
    solid,
    liquid,
    gas,
    amp: [r * 0.18, r * 0.55, Math.min(cw, ch) * 0.3],
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 第 i 个颗粒在 (phase, t) 时的位置（相对盒子左上角） */
export function particlePosition(L: ParticleLayout, i: number, phase: number, t: number): Dot {
  const ph = Math.max(0, Math.min(2, phase));
  const k = Math.min(1, Math.floor(ph)); // 0：固→液，1：液→气
  const f = ph - k;
  const from = k === 0 ? L.solid[i] : L.liquid[i];
  const to = k === 0 ? L.liquid[i] : L.gas[i];
  const amp = lerp(L.amp[k], L.amp[k + 1], f);
  // 越热抖得越快
  const speed = lerp(5, 9, ph / 2);
  return {
    x: lerp(from.x, to.x, f) + amp * Math.sin(t * speed * (0.7 + rnd(i, 5)) + rnd(i, 6) * 6.28),
    y: lerp(from.y, to.y, f) + amp * Math.sin(t * speed * (0.7 + rnd(i, 7)) + rnd(i, 8) * 6.28),
  };
}

export const particlesPart: PartDef = {
  type: 'particles',
  name: '粒子示意',
  anchor: 'center',
  props: ['width', 'height', 'radius', 'count', 'phase', 't'],
  bbox(p) {
    const [x, y] = pt(p.at);
    const L = particleLayout(p);
    return boxAround(x, y, L.width, L.height) satisfies Box;
  },
  Render({ p, ctx }) {
    const L = particleLayout(p);
    const [cx, cy] = pt(p.at);
    const x0 = cx - L.width / 2;
    const y0 = cy - L.height / 2;
    const phase = num(p.phase, 0);
    const t = num(p.t, 0);
    const fill = color(p.color, ctx.theme, 'blue');
    return (
      <g>
        <rect
          x={x0}
          y={y0}
          width={L.width}
          height={L.height}
          rx={12}
          fill={ctx.theme.stageBg}
          stroke={ctx.theme.line}
          strokeWidth={3}
        />
        {Array.from({ length: L.n }, (_, i) => {
          const d = particlePosition(L, i, phase, t);
          return (
            <circle
              key={i}
              cx={x0 + d.x}
              cy={y0 + d.y}
              r={L.r}
              fill={fill}
              fillOpacity={0.85}
              stroke={ctx.theme.stageBg}
              strokeWidth={1.5}
            />
          );
        })}
      </g>
    );
  },
};
