// 多边形零件：三角形、四边形、割补、七巧板、对称、平移、旋转。
import {
  color,
  isPoint,
  mixColor,
  str,
  type Box,
  type Handle,
  type PartDef,
  type Point,
  type Props,
  type Subitem,
} from '../base';
import { sceneStyle } from '../style';

export interface PolygonEdge {
  from: Point;
  to: Point;
  mid: Point;
  len: number;
  normal: Point;
  label: string;
  labelPos: Point;
  box: Box;
}

export interface PolygonVertex {
  pt: Point;
  label: string;
  outerBisector: Point;
  labelPos: Point;
  box: Box;
}

export interface PolygonAngle {
  vertexIndex: number;
  arc: {
    startPt: Point;
    endPt: Point;
    r: number;
    sweep: number;
    large: number;
    d: string;
  };
  label: string;
  labelPos: Point;
  box: Box;
}

export interface PolygonRightAngle {
  vertexIndex: number;
  pts: [Point, Point, Point];
  d: string;
}

export interface PolygonHeight {
  from: number;
  to: number;
  fromPt: Point;
  footPt: Point;
  hasExtension: boolean;
  extFromPt: Point | null;
  extToPt: Point | null;
  rightAnglePts: [Point, Point, Point];
}

export interface PolygonCut {
  from: Point;
  to: Point;
  mid: Point;
  angleDeg: number;
}

export interface PolygonLayoutResult {
  points: Point[];
  ox: number;
  oy: number;
  isCW: boolean;
  edges: PolygonEdge[];
  vertices: PolygonVertex[];
  angles: PolygonAngle[];
  allAngleBoxes: Record<string, Box>;
  rightAngles: PolygonRightAngle[];
  heights: PolygonHeight[];
  cut?: PolygonCut;
  bbox: Box;
}

function parseIdx(v: unknown, maxLen: number): number {
  if (typeof v === 'string') {
    const numPart = v.replace(/^[vea]/i, '');
    const n = parseInt(numPart, 10);
    if (Number.isFinite(n) && n >= 1 && n <= maxLen) return n - 1;
  }
  if (typeof v === 'number' && Number.isFinite(v)) {
    const n = Math.round(v);
    if (n >= 1 && n <= maxLen) return n - 1;
    if (n === 0 && maxLen > 0) return 0;
  }
  return -1;
}

/** 布局计算纯函数：供 bbox、subitems、handles、Render 调用 */
export function polygonLayout(p: Props): PolygonLayoutResult {
  const [ox, oy] = isPoint(p.at) ? p.at : [0, 0];
  const rawPoints = Array.isArray(p.points) ? (p.points as unknown[]) : [];
  const points: Point[] = [];
  for (const item of rawPoints) {
    if (isPoint(item)) {
      points.push([item[0] + ox, item[1] + oy]);
    }
  }

  const N = points.length;
  if (N < 3) {
    const singleBbox: Box = {
      x: points[0]?.[0] ?? ox,
      y: points[0]?.[1] ?? oy,
      w: 0,
      h: 0,
    };
    return {
      points,
      ox,
      oy,
      isCW: true,
      edges: [],
      vertices: [],
      angles: [],
      allAngleBoxes: {},
      rightAngles: [],
      heights: [],
      bbox: singleBbox,
    };
  }

  // 1. 多边形方向（顺时针/逆时针，SVG 中 y 向下）
  let signedArea2 = 0;
  for (let i = 0; i < N; i++) {
    const curr = points[i];
    const next = points[(i + 1) % N];
    signedArea2 += curr[0] * next[1] - next[0] * curr[1];
  }
  const isCW = signedArea2 >= 0;
  const sign = isCW ? 1 : -1;

  // 2. 边与外法线
  const sideLabels = Array.isArray(p.sideLabels) ? p.sideLabels.map((s) => str(s)) : [];
  const edges: PolygonEdge[] = [];
  for (let i = 0; i < N; i++) {
    const from = points[i];
    const to = points[(i + 1) % N];
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const len = Math.hypot(dx, dy);
    const ux = len > 0 ? dx / len : 0;
    const uy = len > 0 ? dy / len : 0;
    // 顺时针（y 向下）时，外法线指向 (dy, -dx) 方向
    const nx = sign * uy;
    const ny = sign * -ux;
    const mid: Point = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
    const label = sideLabels[i] ?? '';
    const labelPos: Point = [mid[0] + nx * 18, mid[1] + ny * 18];
    const minX = Math.min(from[0], to[0]) - 10;
    const minY = Math.min(from[1], to[1]) - 10;
    const maxX = Math.max(from[0], to[0]) + 10;
    const maxY = Math.max(from[1], to[1]) + 10;
    edges.push({
      from,
      to,
      mid,
      len,
      normal: [nx, ny],
      label,
      labelPos,
      box: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
    });
  }

  // 3. 顶点与角平分线反方向
  const vertexLabels = Array.isArray(p.vertexLabels) ? p.vertexLabels.map((s) => str(s)) : [];
  const vertices: PolygonVertex[] = [];
  for (let i = 0; i < N; i++) {
    const ptCurr = points[i];
    const prevEdge = edges[(i - 1 + N) % N];
    const currEdge = edges[i];
    const bx = prevEdge.normal[0] + currEdge.normal[0];
    const by = prevEdge.normal[1] + currEdge.normal[1];
    const bLen = Math.hypot(bx, by);
    const outerBisector: Point =
      bLen > 1e-6 ? [bx / bLen, by / bLen] : [prevEdge.normal[0], prevEdge.normal[1]];
    const label = vertexLabels[i] ?? '';
    const labelPos: Point = [
      ptCurr[0] + outerBisector[0] * 20,
      ptCurr[1] + outerBisector[1] * 20,
    ];
    vertices.push({
      pt: ptCurr,
      label,
      outerBisector,
      labelPos,
      box: { x: ptCurr[0] - 12, y: ptCurr[1] - 12, w: 24, h: 24 },
    });
  }

  // 4. 计算所有顶点的内角弧几何与包围盒（供 subitems 及 angles 绘制使用）
  const allAngleArcs: Record<
    number,
    {
      startPt: Point;
      endPt: Point;
      midPt: Point;
      r: number;
      sweep: number;
      large: number;
      d: string;
      labelPos: Point;
      box: Box;
    }
  > = {};
  const allAngleBoxes: Record<string, Box> = {};

  for (let i = 0; i < N; i++) {
    const V = points[i];
    const Pprev = points[(i - 1 + N) % N];
    const Pnext = points[(i + 1) % N];
    const vPrevX = Pprev[0] - V[0];
    const vPrevY = Pprev[1] - V[1];
    const vNextX = Pnext[0] - V[0];
    const vNextY = Pnext[1] - V[1];

    const thetaPrev = Math.atan2(vPrevY, vPrevX);
    const thetaNext = Math.atan2(vNextY, vNextX);

    let theta1: number;
    let theta2: number;
    if (isCW) {
      theta1 = thetaNext;
      theta2 = thetaPrev;
    } else {
      theta1 = thetaPrev;
      theta2 = thetaNext;
    }

    let deltaTheta = (theta2 - theta1) % (2 * Math.PI);
    if (deltaTheta <= 0) deltaTheta += 2 * Math.PI;

    const midTheta = theta1 + deltaTheta / 2;
    const r = 26;
    const startPt: Point = [V[0] + r * Math.cos(theta1), V[1] + r * Math.sin(theta1)];
    const endPt: Point = [V[0] + r * Math.cos(theta2), V[1] + r * Math.sin(theta2)];
    const midPt: Point = [V[0] + r * Math.cos(midTheta), V[1] + r * Math.sin(midTheta)];
    const large = deltaTheta > Math.PI ? 1 : 0;
    const d = `M ${startPt[0]} ${startPt[1]} A ${r} ${r} 0 ${large} 1 ${endPt[0]} ${endPt[1]}`;
    const labelPos: Point = [
      V[0] + (r + 14) * Math.cos(midTheta),
      V[1] + (r + 14) * Math.sin(midTheta),
    ];

    const xs = [V[0], startPt[0], endPt[0], midPt[0]];
    const ys = [V[1], startPt[1], endPt[1], midPt[1]];
    const minX = Math.min(...xs) - 4;
    const minY = Math.min(...ys) - 4;
    const maxX = Math.max(...xs) + 4;
    const maxY = Math.max(...ys) + 4;
    const aBox: Box = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };

    allAngleArcs[i] = {
      startPt,
      endPt,
      midPt,
      r,
      sweep: 1,
      large,
      d,
      labelPos,
      box: aBox,
    };
    allAngleBoxes[`a${i + 1}`] = aBox;
  }

  // 5. angles 属性配置的角弧与文字
  const anglesConfig = Array.isArray(p.angles) ? p.angles : [];
  const angleLabels = Array.isArray(p.angleLabels) ? p.angleLabels.map((s) => str(s)) : [];
  const angles: PolygonAngle[] = [];
  for (let idx = 0; idx < anglesConfig.length; idx++) {
    const vIdx = parseIdx(anglesConfig[idx], N);
    if (vIdx >= 0 && allAngleArcs[vIdx]) {
      const geo = allAngleArcs[vIdx];
      const label = angleLabels[idx] ?? '';
      angles.push({
        vertexIndex: vIdx,
        arc: {
          startPt: geo.startPt,
          endPt: geo.endPt,
          r: geo.r,
          sweep: geo.sweep,
          large: geo.large,
          d: geo.d,
        },
        label,
        labelPos: geo.labelPos,
        box: geo.box,
      });
    }
  }

  // 6. rightAngles 直角符号
  const rightAnglesConfig = Array.isArray(p.rightAngles) ? p.rightAngles : [];
  const rightAngles: PolygonRightAngle[] = [];
  const raSize = 16;
  for (const item of rightAnglesConfig) {
    const vIdx = parseIdx(item, N);
    if (vIdx >= 0) {
      const V = points[vIdx];
      const Pprev = points[(vIdx - 1 + N) % N];
      const Pnext = points[(vIdx + 1) % N];
      const d1x = Pnext[0] - V[0];
      const d1y = Pnext[1] - V[1];
      const l1 = Math.hypot(d1x, d1y);
      const d2x = Pprev[0] - V[0];
      const d2y = Pprev[1] - V[1];
      const l2 = Math.hypot(d2x, d2y);
      if (l1 > 0 && l2 > 0) {
        const u1x = d1x / l1;
        const u1y = d1y / l1;
        const u2x = d2x / l2;
        const u2y = d2y / l2;
        const p1: Point = [V[0] + u1x * raSize, V[1] + u1y * raSize];
        const p2: Point = [V[0] + (u1x + u2x) * raSize, V[1] + (u1y + u2y) * raSize];
        const p3: Point = [V[0] + u2x * raSize, V[1] + u2y * raSize];
        const d = `M ${p1[0]} ${p1[1]} L ${p2[0]} ${p2[1]} L ${p3[0]} ${p3[1]}`;
        rightAngles.push({ vertexIndex: vIdx, pts: [p1, p2, p3], d });
      }
    }
  }

  // 7. heights 垂线与垂足
  const heightsConfig = Array.isArray(p.heights)
    ? (p.heights as Record<string, unknown>[])
    : [];
  const heights: PolygonHeight[] = [];
  for (const hItem of heightsConfig) {
    if (!hItem || typeof hItem !== 'object') continue;
    const fromIdx = parseIdx(hItem.from, N);
    const toIdx = parseIdx(hItem.to, N);
    if (fromIdx >= 0 && toIdx >= 0) {
      const V = points[fromIdx];
      const A = points[toIdx];
      const B = points[(toIdx + 1) % N];
      const abx = B[0] - A[0];
      const aby = B[1] - A[1];
      const abLen2 = abx * abx + aby * aby;
      if (abLen2 > 1e-9) {
        const avx = V[0] - A[0];
        const avy = V[1] - A[1];
        const t = (avx * abx + avy * aby) / abLen2;
        const footPt: Point = [A[0] + t * abx, A[1] + t * aby];
        let hasExtension = false;
        let extFromPt: Point | null = null;
        let extToPt: Point | null = null;
        if (t < 0) {
          hasExtension = true;
          extFromPt = A;
          extToPt = footPt;
        } else if (t > 1) {
          hasExtension = true;
          extFromPt = B;
          extToPt = footPt;
        }

        // 垂足处的直角符号
        const hvx = V[0] - footPt[0];
        const hvy = V[1] - footPt[1];
        const hvLen = Math.hypot(hvx, hvy);
        const uhvx = hvLen > 0 ? hvx / hvLen : 0;
        const uhvy = hvLen > 0 ? hvy / hvLen : 0;

        const midEdge: Point = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
        const toMidX = midEdge[0] - footPt[0];
        const toMidY = midEdge[1] - footPt[1];
        const toMidLen = Math.hypot(toMidX, toMidY);
        let ubx = toMidLen > 0 ? toMidX / toMidLen : abx / Math.sqrt(abLen2);
        let uby = toMidLen > 0 ? toMidY / toMidLen : aby / Math.sqrt(abLen2);
        if (toMidLen === 0) {
          ubx = abx / Math.sqrt(abLen2);
          uby = aby / Math.sqrt(abLen2);
        }

        const r1: Point = [footPt[0] + uhvx * raSize, footPt[1] + uhvy * raSize];
        const r2: Point = [
          footPt[0] + (uhvx + ubx) * raSize,
          footPt[1] + (uhvy + uby) * raSize,
        ];
        const r3: Point = [footPt[0] + ubx * raSize, footPt[1] + uby * raSize];

        heights.push({
          from: fromIdx + 1,
          to: toIdx + 1,
          fromPt: V,
          footPt,
          hasExtension,
          extFromPt,
          extToPt,
          rightAnglePts: [r1, r2, r3],
        });
      }
    }
  }

  // 8. cut 剪开线与剪刀
  let cut: PolygonCut | undefined;
  if (
    Array.isArray(p.cut) &&
    p.cut.length === 2 &&
    isPoint(p.cut[0]) &&
    isPoint(p.cut[1])
  ) {
    const c1: Point = [p.cut[0][0] + ox, p.cut[0][1] + oy];
    const c2: Point = [p.cut[1][0] + ox, p.cut[1][1] + oy];
    const cMid: Point = [(c1[0] + c2[0]) / 2, (c1[1] + c2[1]) / 2];
    const angleDeg = (Math.atan2(c2[1] - c1[1], c2[0] - c1[0]) * 180) / Math.PI;
    cut = { from: c1, to: c2, mid: cMid, angleDeg };
  }

  // 9. 计算包围盒
  const allX: number[] = points.map((pt) => pt[0]);
  const allY: number[] = points.map((pt) => pt[1]);

  for (const e of edges) {
    if (e.label) {
      allX.push(e.labelPos[0] - 14, e.labelPos[0] + 14);
      allY.push(e.labelPos[1] - 12, e.labelPos[1] + 12);
    }
  }
  for (const v of vertices) {
    if (v.label) {
      allX.push(v.labelPos[0] - 14, v.labelPos[0] + 14);
      allY.push(v.labelPos[1] - 14, v.labelPos[1] + 14);
    }
  }
  for (const a of angles) {
    allX.push(a.arc.startPt[0], a.arc.endPt[0]);
    allY.push(a.arc.startPt[1], a.arc.endPt[1]);
    if (a.label) {
      allX.push(a.labelPos[0] - 14, a.labelPos[0] + 14);
      allY.push(a.labelPos[1] - 12, a.labelPos[1] + 12);
    }
  }
  for (const ra of rightAngles) {
    for (const ptItem of ra.pts) {
      allX.push(ptItem[0]);
      allY.push(ptItem[1]);
    }
  }
  for (const h of heights) {
    allX.push(h.footPt[0]);
    allY.push(h.footPt[1]);
    if (h.hasExtension && h.extFromPt && h.extToPt) {
      allX.push(h.extFromPt[0], h.extToPt[0]);
      allY.push(h.extFromPt[1], h.extToPt[1]);
    }
    for (const rpt of h.rightAnglePts) {
      allX.push(rpt[0]);
      allY.push(rpt[1]);
    }
  }
  if (cut) {
    allX.push(cut.from[0], cut.to[0], cut.mid[0] - 16, cut.mid[0] + 16);
    allY.push(cut.from[1], cut.to[1], cut.mid[1] - 16, cut.mid[1] + 16);
  }

  const pad = 4;
  const minX = Math.min(...allX) - pad;
  const minY = Math.min(...allY) - pad;
  const maxX = Math.max(...allX) + pad;
  const maxY = Math.max(...allY) + pad;

  const bbox: Box = {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
  };

  return {
    points,
    ox,
    oy,
    isCW,
    edges,
    vertices,
    angles,
    allAngleBoxes,
    rightAngles,
    heights,
    cut,
    bbox,
  };
}

export const polygonPart: PartDef = {
  type: 'polygon',
  name: '多边形',
  anchor: 'start',
  required: ['points'],
  rotatesPoints: true,
  props: [
    'points',
    'fill',
    'color',
    'sideLabels',
    'vertexLabels',
    'angles',
    'angleLabels',
    'rightAngles',
    'heights',
    'cut',
    'dashed',
  ],
  bbox(p) {
    return polygonLayout(p).bbox;
  },
  subitems(p) {
    const L = polygonLayout(p);
    const res: Subitem[] = [];
    for (let i = 0; i < L.vertices.length; i++) {
      res.push({
        name: `v${i + 1}`,
        box: L.vertices[i].box,
      });
    }
    for (let i = 0; i < L.edges.length; i++) {
      res.push({
        name: `e${i + 1}`,
        box: L.edges[i].box,
      });
    }
    for (let i = 0; i < L.vertices.length; i++) {
      const aName = `a${i + 1}`;
      if (L.allAngleBoxes[aName]) {
        res.push({
          name: aName,
          box: L.allAngleBoxes[aName],
        });
      }
    }
    return res;
  },
  handles(p) {
    const L = polygonLayout(p);
    const handles: Handle[] = [];
    for (let i = 0; i < L.points.length; i++) {
      const idx = i;
      handles.push({
        prop: 'points',
        at: L.points[i],
        kind: 'drag',
        index: idx,
        min: 0,
        max: 0,
        valueAt: () => 0,
        apply(props: Props, pointer: Point): Props {
          const [ox, oy] = isPoint(props.at) ? props.at : [0, 0];
          const rawPts = Array.isArray(props.points) ? (props.points as Point[]) : [];
          const next = rawPts.map((q, j) =>
            j === idx ? ([pointer[0] - ox, pointer[1] - oy] as Point) : q,
          );
          return { ...props, points: next };
        },
      });
    }
    return handles;
  },
  Render({ p, ctx }) {
    const L = polygonLayout(p);
    if (L.points.length < 3) return null;

    const fillColor = color(p.color, ctx.theme, 'blue');
    const strokeColor =
      p.fill === false
        ? fillColor
        : mixColor(fillColor, ctx.theme.ink, sceneStyle().counterBorder.darken);
    const redColor = color('red', ctx.theme, 'accent');

    const ptsAttr = L.points.map((ptItem) => `${ptItem[0]},${ptItem[1]}`).join(' ');

    return (
      <g>
        {/* 多边形本体 */}
        <polygon
          points={ptsAttr}
          fill={p.fill === false ? 'none' : fillColor}
          fillOpacity={p.fill === false ? undefined : 0.85}
          stroke={strokeColor}
          strokeWidth={3}
          strokeLinejoin="round"
          strokeDasharray={p.dashed ? '8 6' : undefined}
        />

        {/* 垂线与延长线 */}
        {L.heights.map((h, i) => (
          <g key={`height-${i}`}>
            {h.hasExtension && h.extFromPt && h.extToPt ? (
              <line
                x1={h.extFromPt[0]}
                y1={h.extFromPt[1]}
                x2={h.extToPt[0]}
                y2={h.extToPt[1]}
                stroke={ctx.theme.line}
                strokeWidth={2}
                strokeDasharray="8 6"
              />
            ) : null}
            <line
              x1={h.fromPt[0]}
              y1={h.fromPt[1]}
              x2={h.footPt[0]}
              y2={h.footPt[1]}
              stroke={ctx.theme.line}
              strokeWidth={2}
              strokeDasharray="8 6"
            />
            <path
              d={`M ${h.rightAnglePts[0][0]} ${h.rightAnglePts[0][1]} L ${h.rightAnglePts[1][0]} ${h.rightAnglePts[1][1]} L ${h.rightAnglePts[2][0]} ${h.rightAnglePts[2][1]}`}
              fill="none"
              stroke={ctx.theme.line}
              strokeWidth={2}
              strokeLinejoin="miter"
            />
          </g>
        ))}

        {/* 直角符号 */}
        {L.rightAngles.map((ra, i) => (
          <path
            key={`right-angle-${i}`}
            d={ra.d}
            fill="none"
            stroke={ctx.theme.line}
            strokeWidth={2}
            strokeLinejoin="miter"
          />
        ))}

        {/* 角弧与度数文字 */}
        {L.angles.map((a, i) => (
          <g key={`angle-${i}`}>
            <path
              d={a.arc.d}
              fill="none"
              stroke={ctx.theme.accent}
              strokeWidth={2}
              strokeLinecap="round"
            />
            {a.label ? (
              <text
                x={a.labelPos[0]}
                y={a.labelPos[1]}
                fill={ctx.theme.ink}
                fontSize={20}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {a.label}
              </text>
            ) : null}
          </g>
        ))}

        {/* 边长文字 */}
        {L.edges.map((e, i) =>
          e.label ? (
            <text
              key={`side-label-${i}`}
              x={e.labelPos[0]}
              y={e.labelPos[1]}
              fill={ctx.theme.ink}
              fontSize={22}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {e.label}
            </text>
          ) : null,
        )}

        {/* 顶点字母 */}
        {L.vertices.map((v, i) =>
          v.label ? (
            <text
              key={`vertex-label-${i}`}
              x={v.labelPos[0]}
              y={v.labelPos[1]}
              fill={ctx.theme.ink}
              fontSize={24}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {v.label}
            </text>
          ) : null,
        )}

        {/* 剪开线与剪刀 */}
        {L.cut ? (
          <g key="cut">
            <line
              x1={L.cut.from[0]}
              y1={L.cut.from[1]}
              x2={L.cut.to[0]}
              y2={L.cut.to[1]}
              stroke={redColor}
              strokeWidth={2}
              strokeDasharray="6 4"
            />
            <g
              transform={`translate(${L.cut.mid[0]}, ${L.cut.mid[1]}) rotate(${L.cut.angleDeg})`}
            >
              <path
                d="M -6 -5 L 12 4"
                stroke={redColor}
                strokeWidth={1.5}
                strokeLinecap="round"
              />
              <path
                d="M -6 5 L 12 -4"
                stroke={redColor}
                strokeWidth={1.5}
                strokeLinecap="round"
              />
              <circle
                cx={-10}
                cy={-6}
                r={4.5}
                fill="none"
                stroke={redColor}
                strokeWidth={1.5}
              />
              <circle
                cx={-10}
                cy={6}
                r={4.5}
                fill="none"
                stroke={redColor}
                strokeWidth={1.5}
              />
              <circle cx={0} cy={0} r={1.5} fill={redColor} />
            </g>
          </g>
        ) : null}
      </g>
    );
  },
};
