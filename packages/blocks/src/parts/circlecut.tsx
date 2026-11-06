// 切圆拼图：把圆平均切成 parts 个扇形，再交错拼成近似的长方形（圆的面积用）。
//
//   t = 0：扇形围成一个圆，圆心在 at；
//   t = 1：扇形一上一下交错排成一排（像平行四边形），中心也在 at；
//   之间连续变化（用 set 动作改 t），每个扇形一边移动一边转。
// parts 越大，拼出来越接近长方形：长 ≈ 圆周长的一半（π r），宽 ≈ 半径 r。
// parts = 1 时是一个整圆；parts 写成奇数时按大一个的偶数算。
import { boxAround, color, num, pt, type PartDef, type Props } from '../base';

export interface CircleCutLayout {
  r: number;
  /** 扇形个数：1 或偶数 */
  n: number;
  /** 圆心角（度） */
  angle: number;
  /** 一个扇形的弦长、弦到圆心的距离 */
  chord: number;
  height: number;
  /** 拼好以后整排的宽、高（不含弧的鼓出，只算弦） */
  stripW: number;
  stripH: number;
  /** 每个扇形：圆里的朝向（度，顺时针，0 向上）、拼好后的顶点位置（相对 at）和朝向 */
  sectors: {
    circleHeading: number;
    stripAt: [number, number];
    stripHeading: number;
  }[];
}

export function circleCutLayout(p: Props): CircleCutLayout {
  const r = Math.max(1, num(p.radius, 100));
  const raw = Math.round(num(p.parts, 1));
  const n = raw < 2 ? 1 : raw % 2 === 0 ? raw : raw + 1;
  const angle = 360 / n;
  const half = (angle / 2) * (Math.PI / 180);
  const chord = 2 * r * Math.sin(half);
  const height = r * Math.cos(half);
  const stripW = n > 1 ? ((n + 1) * chord) / 2 : 2 * r;
  const x0 = -stripW / 2 + chord / 2;
  const sectors = Array.from({ length: n }, (_, i) => {
    const down = i % 2 === 0; // 偶数个：顶点在下、弧朝上（朝向 0）；奇数个：顶点在上、弧朝下（朝向 180）
    return {
      circleHeading: (i + 0.5) * angle,
      stripAt: [x0 + (i * chord) / 2, down ? height / 2 : -height / 2] as [number, number],
      stripHeading: down ? 0 : 180,
    };
  });
  return { r, n, angle, chord, height, stripW, stripH: height, sectors };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 朝向插值：把目标角度换成离起点最近的等价角度，转得最短 */
const unwrap = (from: number, to: number) => to + 360 * Math.round((from - to) / 360);

export const circleCutPart: PartDef = {
  type: 'circle-cut',
  name: '切圆拼图',
  anchor: 'center',
  props: ['radius', 'parts', 'color2', 't'],
  bbox(p) {
    const L = circleCutLayout(p);
    const [x, y] = pt(p.at);
    const t = Math.max(0, Math.min(1, num(p.t, 0)));
    // 圆（2r × 2r）和拼好的一排（宽 stripW，高约 r）之间插值
    return boxAround(x, y, lerp(2 * L.r, L.stripW, t) + 6, lerp(2 * L.r, L.r, t) + 6);
  },
  Render({ p, ctx }) {
    const L = circleCutLayout(p);
    const [cx, cy] = pt(p.at);
    const t = Math.max(0, Math.min(1, num(p.t, 0)));
    const c1 = color(p.color, ctx.theme, 'blue');
    const c2 = color(p.color2, ctx.theme, 'orange');
    const common = {
      stroke: ctx.theme.stageBg,
      strokeWidth: 1.5,
      strokeLinejoin: 'round' as const,
    };
    if (L.n === 1)
      return <circle cx={cx} cy={cy} r={L.r} fill={c1} fillOpacity={0.85} {...common} />;
    const half = L.angle / 2;
    return (
      <g>
        {L.sectors.map((s, i) => {
          const ax = lerp(cx, cx + s.stripAt[0], t);
          const ay = lerp(cy, cy + s.stripAt[1], t);
          const head = lerp(s.circleHeading, unwrap(s.circleHeading, s.stripHeading), t);
          const pt2 = (deg: number): [number, number] => {
            const a = (deg * Math.PI) / 180;
            return [ax + Math.sin(a) * L.r, ay - Math.cos(a) * L.r];
          };
          const [x1, y1] = pt2(head - half);
          const [x2, y2] = pt2(head + half);
          return (
            <path
              key={i}
              d={`M${ax},${ay} L${x1},${y1} A${L.r},${L.r} 0 0 1 ${x2},${y2} Z`}
              fill={i % 2 === 0 ? c1 : c2}
              fillOpacity={0.85}
              {...common}
            />
          );
        })}
      </g>
    );
  },
};
