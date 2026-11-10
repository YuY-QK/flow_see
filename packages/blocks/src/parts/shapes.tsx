// 几何图形、线段与箭头、图片素材。
import { useState } from 'react';
import {
  boxAround,
  color,
  num,
  pt,
  str,
  type PartContext,
  type PartDef,
  type Point,
  type Props,
} from '../base';
import { sceneStyle } from '../style';

export const SHAPE_KINDS = ['rect', 'circle', 'triangle', 'sector'] as const;

export const shapePart: PartDef = {
  type: 'shape',
  name: '几何图形',
  anchor: 'center',
  props: ['shape', 'width', 'height', 'radius', 'angle', 'fill', 'stroke'],
  bbox(p) {
    const [x, y] = pt(p.at);
    const k = str(p.shape, 'rect');
    if (k === 'circle' || k === 'sector') {
      const r = num(p.radius, 0);
      return boxAround(x, y, r * 2 + 6, r * 2 + 6);
    }
    return boxAround(x, y, num(p.width, 0) + 6, num(p.height, 0) + 6);
  },
  Render({ p, ctx }) {
    const [x, y] = pt(p.at);
    const c = color(p.color, ctx.theme, 'blue');
    // fill: false 只画边框；fill 写颜色名时用它填充（半透明）
    const fill =
      p.fill === false ? 'none' : typeof p.fill === 'string' ? color(p.fill, ctx.theme) : c;
    const style = {
      fill,
      fillOpacity: p.fill === false ? 0 : 0.35,
      stroke: p.stroke === false ? 'none' : c,
      strokeWidth: 4,
      strokeLinejoin: 'round' as const,
    };
    const w = num(p.width, 0);
    const h = num(p.height, 0);
    const r = num(p.radius, 0);
    switch (str(p.shape, 'rect')) {
      case 'circle':
        return <circle cx={x} cy={y} r={r} {...style} />;
      case 'triangle':
        return (
          <path
            d={`M${x},${y - h / 2} L${x + w / 2},${y + h / 2} L${x - w / 2},${y + h / 2} Z`}
            {...style}
          />
        );
      case 'sector': {
        const a = (Math.max(1, Math.min(359.9, num(p.angle, 0))) * Math.PI) / 180;
        const x2 = x + Math.sin(a) * r;
        const y2 = y - Math.cos(a) * r;
        return (
          <path
            d={`M${x},${y} L${x},${y - r} A${r},${r} 0 ${a > Math.PI ? 1 : 0} 1 ${x2},${y2} Z`}
            {...style}
          />
        );
      }
      default:
        return <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={4} {...style} />;
    }
  },
};

/**
 * 计算射线 (x, y) 沿单位方向 (dx, dy) 到舞台矩形边界 [0, stageW] × [0, stageH] 的距离
 */
export function distanceToStageBoundary(
  x: number,
  y: number,
  dx: number,
  dy: number,
  stageW: number,
  stageH: number,
): number {
  let tx = Infinity;
  if (dx > 1e-9) {
    tx = (stageW - x) / dx;
  } else if (dx < -1e-9) {
    tx = -x / dx;
  }

  let ty = Infinity;
  if (dy > 1e-9) {
    ty = (stageH - y) / dy;
  } else if (dy < -1e-9) {
    ty = -y / dy;
  }

  const t = Math.min(tx, ty);
  return Number.isFinite(t) ? Math.max(0, t) : 0;
}

export interface LineLayout {
  from: Point;
  to: Point;
  leftEnd: 'point' | 'open';
  rightEnd: 'point' | 'open';
  hasLeftPoint: boolean;
  hasRightPoint: boolean;
  pointRadius: number;
  start: Point;
  end: Point;
  extend: number;
  leftDistance: number;
  rightDistance: number;
  length: number;
  fadeLeft: boolean;
  fadeRight: boolean;
  width: number;
  draw: number;
  currentEnd: Point;
}

function getStageSize(p?: Props): { width: number; height: number } {
  if (p?.stage && typeof p.stage === 'object') {
    const s = p.stage as { width?: unknown; height?: unknown };
    if (typeof s.width === 'number' && typeof s.height === 'number') {
      return { width: s.width, height: s.height };
    }
  }
  try {
    const s = sceneStyle().stage;
    if (s && typeof s.width === 'number' && typeof s.height === 'number') {
      return s;
    }
  } catch {
    // sceneStyle 未注入时的保底
  }
  return { width: 800, height: 450 };
}

export function lineLayout(
  p: Props,
  stage?: { width: number; height: number },
): LineLayout {
  const [x1, y1] = pt(p.from);
  const [x2, y2] = pt(p.to);
  const w = num(p.width, 4);
  const draw = Math.max(0, Math.min(1, num(p.draw, 1)));
  const extend = Math.max(0, Math.min(1, num(p.extend, 0)));

  const ends = Array.isArray(p.ends) ? p.ends : null;
  const leftEnd: 'point' | 'open' = ends && ends[0] === 'point' ? 'point' : 'open';
  const rightEnd: 'point' | 'open' = ends && ends[1] === 'point' ? 'point' : 'open';

  // 规则：ends 不写时不画端点，只有写了 point 的那一端才画
  const hasLeftPoint = Boolean(ends && ends[0] === 'point');
  const hasRightPoint = Boolean(ends && ends[1] === 'point');
  const pointRadius = w * 1.5;

  const st = stage ?? getStageSize(p);
  const stageW = st.width;
  const stageH = st.height;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const rawLen = Math.hypot(dx, dy);

  let start: Point = [x1, y1];
  let end: Point = [x2, y2];
  let leftDist = 0;
  let rightDist = 0;

  if (rawLen > 1e-6) {
    const ux = dx / rawLen;
    const uy = dy / rawLen;

    // 左端向外延长方向：-u
    leftDist = distanceToStageBoundary(x1, y1, -ux, -uy, stageW, stageH);
    if (leftEnd === 'open' && extend > 0) {
      start = [x1 - ux * extend * leftDist, y1 - uy * extend * leftDist];
    }

    // 右端向外延长方向：+u
    rightDist = distanceToStageBoundary(x2, y2, ux, uy, stageW, stageH);
    if (rightEnd === 'open' && extend > 0) {
      end = [x2 + ux * extend * rightDist, y2 + uy * extend * rightDist];
    }
  }

  const extDx = end[0] - start[0];
  const extDy = end[1] - start[1];
  const length = Math.hypot(extDx, extDy);

  const currentEnd: Point = [start[0] + extDx * draw, start[1] + extDy * draw];

  const fadeLeft = leftEnd === 'open' && extend >= 1 - 1e-4;
  const fadeRight = rightEnd === 'open' && extend >= 1 - 1e-4 && draw >= 1 - 1e-4;

  return {
    from: [x1, y1],
    to: [x2, y2],
    leftEnd,
    rightEnd,
    hasLeftPoint,
    hasRightPoint,
    pointRadius,
    start,
    end,
    extend,
    leftDistance: leftDist,
    rightDistance: rightDist,
    length,
    fadeLeft,
    fadeRight,
    width: w,
    draw,
    currentEnd,
  };
}

function lineBox(p: Props) {
  const L = lineLayout(p);
  const pad = Math.max(12, Math.ceil(L.pointRadius));
  const minX = Math.min(L.start[0], L.end[0]);
  const minY = Math.min(L.start[1], L.end[1]);
  const maxX = Math.max(L.start[0], L.end[0]);
  const maxY = Math.max(L.start[1], L.end[1]);
  return {
    x: minX - pad,
    y: minY - pad,
    w: maxX - minX + pad * 2,
    h: maxY - minY + pad * 2,
  };
}

function renderGradientStops(L: LineLayout, c: string) {
  const fadePx = 30;
  const len = Math.hypot(L.currentEnd[0] - L.start[0], L.currentEnd[1] - L.start[1]);
  if (len <= 0) return null;

  if (L.fadeLeft && L.fadeRight) {
    const maxFade = Math.min(fadePx, len / 2);
    const o1 = maxFade / len;
    const o2 = 1 - maxFade / len;
    return (
      <>
        <stop offset="0" stopColor={c} stopOpacity={0} />
        <stop offset={o1} stopColor={c} stopOpacity={1} />
        <stop offset={o2} stopColor={c} stopOpacity={1} />
        <stop offset="1" stopColor={c} stopOpacity={0} />
      </>
    );
  }

  if (L.fadeLeft) {
    const maxFade = Math.min(fadePx, len);
    const o1 = maxFade / len;
    return (
      <>
        <stop offset="0" stopColor={c} stopOpacity={0} />
        <stop offset={o1} stopColor={c} stopOpacity={1} />
        <stop offset="1" stopColor={c} stopOpacity={1} />
      </>
    );
  }

  if (L.fadeRight) {
    const maxFade = Math.min(fadePx, len);
    const o2 = 1 - maxFade / len;
    return (
      <>
        <stop offset="0" stopColor={c} stopOpacity={1} />
        <stop offset={o2} stopColor={c} stopOpacity={1} />
        <stop offset="1" stopColor={c} stopOpacity={0} />
      </>
    );
  }

  return null;
}

function renderLine(p: Props, ctx: PartContext, arrow: boolean) {
  const L = lineLayout(p, ctx.stage);
  const c = color(p.color, ctx.theme);
  const w = L.width;
  const draw = L.draw;
  const [sx, sy] = L.start;
  const [currentEx, currentEy] = L.currentEnd;

  if (draw <= 0) return null;

  const ang = Math.atan2(currentEy - sy, currentEx - sx);
  const head = w * 3.5;

  const hasFade = (L.fadeLeft || L.fadeRight) && L.length > 0;
  const gradId =
    typeof p.id === 'string' && p.id
      ? `line-grad-${p.id}`
      : `line-grad-${Math.round(sx)}_${Math.round(sy)}_${Math.round(currentEx)}_${Math.round(currentEy)}`;

  const line2X = arrow ? currentEx - Math.cos(ang) * head * 0.6 : currentEx;
  const line2Y = arrow ? currentEy - Math.sin(ang) * head * 0.6 : currentEy;

  return (
    <g>
      {hasFade ? (
        <defs>
          <linearGradient
            id={gradId}
            gradientUnits="userSpaceOnUse"
            x1={sx}
            y1={sy}
            x2={currentEx}
            y2={currentEy}
          >
            {renderGradientStops(L, c)}
          </linearGradient>
        </defs>
      ) : null}
      <line
        x1={sx}
        y1={sy}
        x2={line2X}
        y2={line2Y}
        stroke={hasFade ? `url(#${gradId})` : c}
        strokeWidth={w}
        strokeLinecap="round"
        strokeDasharray={p.dashed ? `${w * 2.5} ${w * 2}` : undefined}
      />
      {arrow && draw > 0 ? (
        <path
          d={`M${currentEx},${currentEy} L${currentEx - Math.cos(ang - 0.45) * head},${currentEy - Math.sin(ang - 0.45) * head} L${currentEx - Math.cos(ang + 0.45) * head},${currentEy - Math.sin(ang + 0.45) * head} Z`}
          fill={c}
        />
      ) : null}
      {L.hasLeftPoint && draw > 0 ? (
        <circle cx={L.from[0]} cy={L.from[1]} r={L.pointRadius} fill={c} />
      ) : null}
      {L.hasRightPoint && draw > 0 ? (
        <circle
          cx={draw >= 1 ? L.to[0] : currentEx}
          cy={draw >= 1 ? L.to[1] : currentEy}
          r={L.pointRadius}
          fill={c}
        />
      ) : null}
    </g>
  );
}

export const linePart: PartDef = {
  type: 'line',
  name: '线段',
  anchor: 'center',
  required: ['from', 'to'],
  props: ['from', 'to', 'width', 'dashed', 'draw', 'ends', 'extend'],
  bbox: lineBox,
  Render: ({ p, ctx }) => renderLine(p, ctx, false),
};

export const arrowPart: PartDef = {
  ...linePart,
  type: 'arrow',
  name: '箭头',
  Render: ({ p, ctx }) => renderLine(p, ctx, true),
};

/** 图片素材：asset 写 assets/manifest.yaml 里的 id；加载失败时显示灰色占位，动画继续 */
export const imagePart: PartDef = {
  type: 'image',
  name: '图片',
  anchor: 'center',
  required: ['asset'],
  props: ['asset', 'width', 'height'],
  bbox(p) {
    const [x, y] = pt(p.at);
    return boxAround(x, y, num(p.width, 0), num(p.height, 0));
  },
  Render: function ImageRender({ p, ctx }) {
    const [failed, setFailed] = useState(false);
    const b = imagePart.bbox(p);
    const url = ctx.assetUrl?.(str(p.asset));
    if (!url || failed)
      return (
        <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={8} fill={ctx.theme.dim} opacity={0.35} />
      );
    return (
      <image
        href={url}
        x={b.x}
        y={b.y}
        width={b.w}
        height={b.h}
        preserveAspectRatio="xMidYMid meet"
        onError={() => setFailed(true)}
      />
    );
  },
};
