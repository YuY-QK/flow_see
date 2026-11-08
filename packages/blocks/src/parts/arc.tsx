// 圆弧与弧形箭头：沿圆周画一段，适合循环示意图（植物的一生、水循环……）。
import { color, num, pt, type PartDef, type Props } from '../base';

/** 角度（度）：从正上方起顺时针；返回圆周上的点（舞台坐标，y 向下） */
export function arcPoint(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [cx + Math.sin(a) * r, cy - Math.cos(a) * r];
}

/** 弧的画法：起点、画出来的终点、方向（箭头）、箭头大小。`draw` 0–1 是从起点画出多少。 */
export function arcLayout(p: Props) {
  const [cx, cy] = pt(p.at);
  const r = Math.max(0, num(p.radius, 0));
  const start = num(p.start, 0);
  const end = num(p.end, 0);
  const draw = Math.max(0, Math.min(1, num(p.draw, 1)));
  const span = (end - start) * draw;
  const tip = start + span;
  const w = num(p.width, 0);
  const head = w * 3.5;
  const sign = end >= start ? 1 : -1;
  // 箭头沿切线方向：角度 θ（顺时针）处，向增大的方向走的切线方向角恰好是 θ；逆时针则反过来
  const dir = (tip * Math.PI) / 180 + (sign < 0 ? Math.PI : 0);
  const hasHead = p.arrow !== false && draw > 0 && r > 0;
  // 弧线在箭头处少画一点，让箭头尖正好落在 tip 上
  const back = hasHead && r > 0 ? ((head * 0.6) / r) * (180 / Math.PI) * sign : 0;
  const lineEnd = hasHead ? tip - back : tip;
  return {
    cx,
    cy,
    r,
    start,
    tip,
    lineEnd,
    sweep: sign > 0 ? 1 : 0,
    large: Math.abs(lineEnd - start) > 180 ? 1 : 0,
    from: arcPoint(cx, cy, r, start),
    to: arcPoint(cx, cy, r, lineEnd),
    tipPoint: arcPoint(cx, cy, r, tip),
    dir,
    head,
    hasHead,
    w,
  };
}

export const arcPart: PartDef = {
  type: 'arc',
  name: '圆弧',
  anchor: 'center',
  props: ['radius', 'start', 'end', 'width', 'dashed', 'draw', 'arrow'],
  bbox(p) {
    const L = arcLayout({ ...p, draw: 1 });
    // 取起点、终点和弧上经过的 90 度整数倍方向，求外接框
    const pts = [L.from, arcPoint(L.cx, L.cy, L.r, num(p.end, 0))];
    const lo = Math.min(L.start, num(p.end, 0));
    const hi = Math.max(L.start, num(p.end, 0));
    for (let d = Math.ceil(lo / 90) * 90; d <= hi; d += 90) pts.push(arcPoint(L.cx, L.cy, L.r, d));
    const xs = pts.map((q) => q[0]);
    const ys = pts.map((q) => q[1]);
    const pad = 12;
    const x = Math.min(...xs) - pad;
    const y = Math.min(...ys) - pad;
    return { x, y, w: Math.max(...xs) - x + pad, h: Math.max(...ys) - y + pad };
  },
  Render({ p, ctx }) {
    const L = arcLayout(p);
    const c = color(p.color, ctx.theme);
    if (L.r <= 0 || L.tip === L.start) return null;
    const w = L.w;
    const [tx, ty] = L.tipPoint;
    return (
      <g>
        <path
          d={`M${L.from[0]},${L.from[1]} A${L.r},${L.r} 0 ${L.large} ${L.sweep} ${L.to[0]},${L.to[1]}`}
          fill="none"
          stroke={c}
          strokeWidth={w}
          strokeLinecap="round"
          strokeDasharray={p.dashed ? `${w * 2.5} ${w * 2}` : undefined}
        />
        {L.hasHead ? (
          <path
            d={`M${tx},${ty} L${tx - Math.cos(L.dir - 0.45) * L.head},${ty - Math.sin(L.dir - 0.45) * L.head} L${tx - Math.cos(L.dir + 0.45) * L.head},${ty - Math.sin(L.dir + 0.45) * L.head} Z`}
            fill={c}
          />
        ) : null}
      </g>
    );
  },
};
