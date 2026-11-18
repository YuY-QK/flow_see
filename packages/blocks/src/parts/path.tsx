// 路径与路线零件：周长、折线、路线图、拉直量一量。
import {
  color,
  isPoint,
  num,
  type Box,
  type PartDef,
  type Point,
  type Props,
  type Subitem,
} from '../base';

export interface PathSegment {
  index: number;
  from: Point;
  to: Point;
  len: number;
  mid: Point;
  normal: Point;
  label: string;
  labelPos: Point;
  box: Box;
}

export interface PathMarkerLayout {
  type: 'none' | 'dot' | 'asset';
  asset?: string;
  pt: Point;
  angleDeg: number;
  size: number;
}

export interface PathLayoutResult {
  points: Point[];
  closed: boolean;
  totalLength: number;
  drawnLength: number;
  segments: PathSegment[];
  drawnPoints: Point[];
  currentEnd: Point;
  tangent: Point;
  angleDeg: number;
  marker: PathMarkerLayout | null;
  bbox: Box;
}

/**
 * 路径与折线布局计算纯函数
 * 不依赖 DOM / 浏览器环境，可在 Node / Vitest 中直接测试
 */
export function pathLayout(p: Props): PathLayoutResult {
  const rawPoints = Array.isArray(p.points) ? (p.points as unknown[]) : [];
  const points: Point[] = [];
  for (const item of rawPoints) {
    if (isPoint(item)) {
      points.push([item[0], item[1]]);
    }
  }

  const isClosed = Boolean(p.closed);
  const width = Math.max(1, num(p.width, 5));
  const draw = Math.max(0, Math.min(1, num(p.draw, 1)));
  const markerRaw = p.marker != null ? String(p.marker) : 'none';
  const markerSize = Math.max(8, num(p.markerSize, 40));
  const lengths = Array.isArray(p.lengths)
    ? p.lengths.map((v) => (v != null ? String(v) : ''))
    : [];

  const N = points.length;

  // 1. 点数不足时的边界保护
  if (N === 0) {
    return {
      points: [],
      closed: isClosed,
      totalLength: 0,
      drawnLength: 0,
      segments: [],
      drawnPoints: [],
      currentEnd: [0, 0],
      tangent: [1, 0],
      angleDeg: 0,
      marker: null,
      bbox: { x: 0, y: 0, w: 0, h: 0 },
    };
  }

  if (N === 1) {
    const pt0 = points[0];
    const hasMarker = markerRaw !== 'none';
    const markerType = markerRaw === 'dot' ? 'dot' : hasMarker ? 'asset' : 'none';
    const marker: PathMarkerLayout | null = hasMarker
      ? {
          type: markerType,
          asset: markerType === 'asset' ? markerRaw : undefined,
          pt: pt0,
          angleDeg: 0,
          size: markerType === 'dot' ? 16 : markerSize,
        }
      : null;
    const r = marker ? marker.size / 2 : width / 2;
    return {
      points,
      closed: isClosed,
      totalLength: 0,
      drawnLength: 0,
      segments: [],
      drawnPoints: [pt0],
      currentEnd: pt0,
      tangent: [1, 0],
      angleDeg: 0,
      marker,
      bbox: { x: pt0[0] - r, y: pt0[1] - r, w: r * 2, h: r * 2 },
    };
  }

  // 2. 构建线段序列
  interface RawSeg {
    from: Point;
    to: Point;
  }
  const rawSegs: RawSeg[] = [];
  for (let i = 0; i < N - 1; i++) {
    rawSegs.push({ from: points[i], to: points[i + 1] });
  }

  // 若 closed 且首尾不重合，添加末尾闭合到起点的线段
  if (isClosed) {
    const pFirst = points[0];
    const pLast = points[N - 1];
    const endDist = Math.hypot(pLast[0] - pFirst[0], pLast[1] - pFirst[1]);
    if (endDist > 1e-4) {
      rawSegs.push({ from: pLast, to: pFirst });
    }
  }

  // 3. 计算多边形方向与外法线正负号
  let signedArea2 = 0;
  for (let i = 0; i < N; i++) {
    const curr = points[i];
    const next = points[(i + 1) % N];
    signedArea2 += curr[0] * next[1] - next[0] * curr[1];
  }
  // SVG 屏幕坐标系下 y 向下，顺时针时 signedArea2 >= 0
  const isCW = signedArea2 >= 0;
  const sign = isClosed && Math.abs(signedArea2) > 1e-6 ? (isCW ? 1 : -1) : 1;

  // 4. 计算每段信息
  const segments: PathSegment[] = [];
  let totalLength = 0;
  const pad = Math.max(width / 2, 6);

  for (let i = 0; i < rawSegs.length; i++) {
    const { from, to } = rawSegs[i];
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const len = Math.hypot(dx, dy);
    totalLength += len;

    const ux = len > 1e-6 ? dx / len : 1;
    const uy = len > 1e-6 ? dy / len : 0;

    // 法线向量（顺时针/开放路径外偏：nx = sign * uy, ny = sign * -ux）
    const nx = sign * uy;
    const ny = sign * -ux;

    const mid: Point = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
    const label = lengths[i] ?? '';
    // 任务卡规格：在每一段线段的中点沿法线方向外偏（14px）居中渲染长度文字
    const labelPos: Point = [mid[0] + nx * 14, mid[1] + ny * 14];

    const minX = Math.min(from[0], to[0]) - pad;
    const minY = Math.min(from[1], to[1]) - pad;
    const maxX = Math.max(from[0], to[0]) + pad;
    const maxY = Math.max(from[1], to[1]) + pad;

    segments.push({
      index: i,
      from,
      to,
      len,
      mid,
      normal: [nx, ny],
      label,
      labelPos,
      box: {
        x: minX,
        y: minY,
        w: maxX - minX,
        h: maxY - minY,
      },
    });
  }

  // 5. 根据 draw 比例裁剪折线与确定当前终点
  const drawnLength = totalLength * draw;
  let currentEnd: Point = points[0];
  let tangent: Point = [1, 0];
  const drawnPoints: Point[] = [];

  if (segments.length > 0 && segments[0].len > 1e-6) {
    const f0 = segments[0].from;
    const t0 = segments[0].to;
    tangent = [(t0[0] - f0[0]) / segments[0].len, (t0[1] - f0[1]) / segments[0].len];
  }

  if (draw <= 0 || totalLength <= 1e-6) {
    currentEnd = points[0];
    drawnPoints.push(points[0]);
  } else {
    drawnPoints.push(segments[0].from);
    let acc = 0;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const nextAcc = acc + seg.len;
      if (drawnLength >= nextAcc - 1e-6) {
        drawnPoints.push(seg.to);
        currentEnd = seg.to;
        if (seg.len > 1e-6) {
          tangent = [(seg.to[0] - seg.from[0]) / seg.len, (seg.to[1] - seg.from[1]) / seg.len];
        }
        acc = nextAcc;
        if (acc >= drawnLength - 1e-6) {
          break;
        }
      } else {
        const remain = Math.max(0, drawnLength - acc);
        const t = seg.len > 1e-6 ? remain / seg.len : 0;
        const partial: Point = [
          seg.from[0] + (seg.to[0] - seg.from[0]) * t,
          seg.from[1] + (seg.to[1] - seg.from[1]) * t,
        ];
        drawnPoints.push(partial);
        currentEnd = partial;
        if (seg.len > 1e-6) {
          tangent = [(seg.to[0] - seg.from[0]) / seg.len, (seg.to[1] - seg.from[1]) / seg.len];
        }
        break;
      }
    }
  }

  const angleDeg = (Math.atan2(tangent[1], tangent[0]) * 180) / Math.PI;

  // 6. marker 布局
  let marker: PathMarkerLayout | null = null;
  if (markerRaw !== 'none') {
    const isDot = markerRaw === 'dot';
    marker = {
      type: isDot ? 'dot' : 'asset',
      asset: isDot ? undefined : markerRaw,
      pt: currentEnd,
      angleDeg,
      size: isDot ? 16 : markerSize,
    };
  }

  // 7. 汇总计算总包围盒 bbox
  const allX: number[] = points.map((p) => p[0]);
  const allY: number[] = points.map((p) => p[1]);

  // 将 lengths 标注文字纳入包围盒
  for (const seg of segments) {
    if (seg.label) {
      allX.push(seg.labelPos[0] - 18, seg.labelPos[0] + 18);
      allY.push(seg.labelPos[1] - 12, seg.labelPos[1] + 12);
    }
  }

  // 将 marker 纳入包围盒
  if (marker) {
    const half = marker.size / 2;
    allX.push(marker.pt[0] - half, marker.pt[0] + half);
    allY.push(marker.pt[1] - half, marker.pt[1] + half);
  }

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
    closed: isClosed,
    totalLength,
    drawnLength,
    segments,
    drawnPoints,
    currentEnd,
    tangent,
    angleDeg,
    marker,
    bbox,
  };
}

export const pathPart: PartDef = {
  type: 'path',
  name: '路径',
  anchor: 'start',
  required: ['points'],
  rotatesPoints: true,
  props: [
    'points',
    'closed',
    'draw',
    'marker',
    'markerSize',
    'lengths',
    'width',
    'color',
    'dashed',
  ],
  bbox(p) {
    return pathLayout(p).bbox;
  },
  subitems(p) {
    const L = pathLayout(p);
    const list: Subitem[] = [];
    for (let i = 0; i < L.segments.length; i++) {
      list.push({
        name: `seg.${i + 1}`,
        box: L.segments[i].box,
      });
    }
    return list;
  },
  Render({ p, ctx }) {
    const L = pathLayout(p);
    const strokeColor = color(p.color ?? 'accent', ctx.theme, 'accent');
    const width = Math.max(1, num(p.width, 5));
    const isDashed = Boolean(p.dashed);

    // 生成当前绘制的折线路径
    let d = '';
    if (L.drawnPoints.length >= 2) {
      d = L.drawnPoints.reduce((acc, pt, idx) => {
        return idx === 0 ? `M ${pt[0]} ${pt[1]}` : `${acc} L ${pt[0]} ${pt[1]}`;
      }, '');
    }

    return (
      <g>
        {/* 折线本身 */}
        {d ? (
          <path
            d={d}
            fill="none"
            stroke={strokeColor}
            strokeWidth={width}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={isDashed ? '8 6' : undefined}
          />
        ) : null}

        {/* 边长标注文字 lengths */}
        {L.segments.map((seg, i) =>
          seg.label ? (
            <text
              key={`seg-len-${i}`}
              x={seg.labelPos[0]}
              y={seg.labelPos[1]}
              fill={ctx.theme.ink}
              fontSize={20}
              fontWeight="500"
              textAnchor="middle"
              dominantBaseline="central"
            >
              {seg.label}
            </text>
          ) : null,
        )}

        {/* marker：dot 实心圆点或素材图标 */}
        {L.marker && L.marker.type === 'dot' ? (
          <circle cx={L.marker.pt[0]} cy={L.marker.pt[1]} r={8} fill={strokeColor} />
        ) : null}

        {L.marker && L.marker.type === 'asset' && L.marker.asset ? (
          (() => {
            const url = ctx.assetUrl?.(L.marker.asset);
            const size = L.marker.size;
            // 像 ant 等素材默认朝上（-90度），顺时针旋转 90 度后使头部正对前进切线方向
            const rot = L.marker.asset === 'ant' ? L.marker.angleDeg + 90 : L.marker.angleDeg;
            return (
              <g transform={`translate(${L.marker.pt[0]}, ${L.marker.pt[1]}) rotate(${rot})`}>
                {url ? (
                  <image
                    href={url}
                    x={-size / 2}
                    y={-size / 2}
                    width={size}
                    height={size}
                    preserveAspectRatio="xMidYMid meet"
                  />
                ) : (
                  <rect
                    x={-size / 2}
                    y={-size / 2}
                    width={size}
                    height={size}
                    rx={4}
                    fill={ctx.theme.dim}
                    opacity={0.35}
                  />
                )}
              </g>
            );
          })()
        ) : null}
      </g>
    );
  },
};
