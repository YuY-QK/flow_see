// 角零件：表示角与旋转量度，支持度数、直角/平角/周角特化、射线箭头、角的种类标注与拖转把手。
import { formatNumber } from '@flow-see/core';
import {
  boxAround,
  color,
  num,
  pt,
  textWidth,
  type Box,
  type Handle,
  type PartContext,
  type PartDef,
  type Point,
  type Props,
  type Subitem,
} from '../base';

import { sceneStyle } from '../style';

export interface AngleLabels {
  acute?: string;
  right?: string;
  obtuse?: string;
  straight?: string;
  round?: string;
}

export type AngleKind = 'acute' | 'right' | 'obtuse' | 'straight' | 'round';

export function defaultAngleLabels(): Record<string, string> {
  try {
    return (sceneStyle().parts.angle?.labels as Record<string, string> | undefined) ?? {};
  } catch {
    return {};
  }
}

const EPS = 1e-4;

/** 根据角的大小判定角的分类（0 < size < 90 锐角、90 直角、90 < size < 180 钝角、180 平角、360 周角） */
export function getAngleKind(size: number): AngleKind | undefined {
  if (Math.abs(size - 90) < EPS) return 'right';
  if (Math.abs(size - 180) < EPS) return 'straight';
  if (Math.abs(size - 360) < EPS) return 'round';
  if (size > EPS && size < 90 - EPS) return 'acute';
  if (size > 90 + EPS && size < 180 - EPS) return 'obtuse';
  return undefined;
}

/** 角度（度）：0 水平向右，逆时针为正；返回屏幕坐标系下的点（y 向下） */
export function anglePoint(cx: number, cy: number, length: number, deg: number): Point {
  const rad = (deg * Math.PI) / 180;
  return [cx + Math.cos(rad) * length, cy - Math.sin(rad) * length];
}

export interface AngleRayLayout {
  tip: Point;
  p1: Point;
  p2: Point;
  lineEnd: Point;
}

export interface AngleLayout {
  cx: number;
  cy: number;
  from: number;
  size: number;
  length: number;
  arcRadius: number;
  side1Angle: number;
  side2Angle: number;
  side1End: Point;
  side2End: Point;
  kind?: AngleKind;
  kindText: string;
  isRight: boolean;
  isStraight: boolean;
  isRound: boolean;
  isZero: boolean;
  arcD?: string;
  rightAnglePts?: [Point, Point, Point];
  roundArrow?: {
    tip: Point;
    p1: Point;
    p2: Point;
    d: string;
  };
  ray1?: AngleRayLayout;
  ray2?: AngleRayLayout;
  showArc: boolean;
  showLabel: boolean;
  labelText: string;
  labelPos: Point;
  showKindLabel: boolean;
  kindLabelPos: Point;
  vertexBox: Box;
  side1Box: Box;
  side2Box: Box;
  bbox: Box;
}

function calcRay(cx: number, cy: number, length: number, deg: number, head: number): AngleRayLayout {
  const tip = anglePoint(cx, cy, length, deg);
  const rad = (deg * Math.PI) / 180;
  const ux = Math.cos(rad);
  const uy = -Math.sin(rad);
  const ang = Math.atan2(uy, ux);
  const p1: Point = [tip[0] - Math.cos(ang - 0.45) * head, tip[1] - Math.sin(ang - 0.45) * head];
  const p2: Point = [tip[0] - Math.cos(ang + 0.45) * head, tip[1] - Math.sin(ang + 0.45) * head];
  const lineEnd: Point = [tip[0] - ux * head * 0.6, tip[1] - uy * head * 0.6];
  return { tip, p1, p2, lineEnd };
}

function lineBoundingBox(p1: Point, p2: Point, pad = 12): Box {
  const minX = Math.min(p1[0], p2[0]) - pad;
  const minY = Math.min(p1[1], p2[1]) - pad;
  const maxX = Math.max(p1[0], p2[0]) + pad;
  const maxY = Math.max(p1[1], p2[1]) + pad;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** 角的纯几何布局计算 */
export function angleLayout(p: Props): AngleLayout {
  const [cx, cy] = pt(p.at);
  const from = num(p.from, 0);
  const size = Math.max(0, Math.min(360, num(p.size, 60)));
  const length = Math.max(1, num(p.length, 180));
  const arcRadius = 36;
  const sideWidth = 4;
  const rayHead = sideWidth * 3.5;

  const side1Angle = from;
  const side2Angle = from + size;
  const side1End = anglePoint(cx, cy, length, side1Angle);
  const side2End = anglePoint(cx, cy, length, side2Angle);

  const kind = getAngleKind(size);
  const defaultLabels = defaultAngleLabels();
  const userLabels = typeof p.labels === 'object' && p.labels !== null ? (p.labels as Record<string, string>) : {};
  const kindText = kind ? (userLabels[kind] ?? defaultLabels[kind] ?? '') : '';

  const isRight = Math.abs(size - 90) < EPS;
  const isStraight = Math.abs(size - 180) < EPS;
  const isRound = Math.abs(size - 360) < EPS;
  const isZero = Math.abs(size) < EPS;

  const rays = Boolean(p.rays);
  const ray1 = rays ? calcRay(cx, cy, length, side1Angle, rayHead) : undefined;
  const ray2 = rays ? calcRay(cx, cy, length, side2Angle, rayHead) : undefined;

  const showArc = p.arc !== false && !isZero;
  let arcD: string | undefined;
  let rightAnglePts: [Point, Point, Point] | undefined;
  let roundArrow: { tip: Point; p1: Point; p2: Point; d: string } | undefined;

  if (showArc) {
    if (isRight) {
      // 边长 16 的直角折线符号
      const raSize = 16;
      const rad1 = (side1Angle * Math.PI) / 180;
      const rad2 = (side2Angle * Math.PI) / 180;
      const u1: Point = [Math.cos(rad1), -Math.sin(rad1)];
      const u2: Point = [Math.cos(rad2), -Math.sin(rad2)];
      const pt1: Point = [cx + u1[0] * raSize, cy + u1[1] * raSize];
      const pt2: Point = [cx + (u1[0] + u2[0]) * raSize, cy + (u1[1] + u2[1]) * raSize];
      const pt3: Point = [cx + u2[0] * raSize, cy + u2[1] * raSize];
      rightAnglePts = [pt1, pt2, pt3];
      arcD = `M ${pt1[0]} ${pt1[1]} L ${pt2[0]} ${pt2[1]} L ${pt3[0]} ${pt3[1]}`;
    } else if (isRound) {
      // 周角：整圆带逆时针小箭头
      const tip = anglePoint(cx, cy, arcRadius, side1Angle);
      const rad1 = (side1Angle * Math.PI) / 180;
      const dir = Math.atan2(-Math.cos(rad1), -Math.sin(rad1));
      const aHead = 8;
      const p1: Point = [tip[0] - Math.cos(dir - 0.45) * aHead, tip[1] - Math.sin(dir - 0.45) * aHead];
      const p2: Point = [tip[0] - Math.cos(dir + 0.45) * aHead, tip[1] - Math.sin(dir + 0.45) * aHead];
      roundArrow = {
        tip,
        p1,
        p2,
        d: `M ${tip[0]} ${tip[1]} L ${p1[0]} ${p1[1]} L ${p2[0]} ${p2[1]} Z`,
      };
    } else if (isStraight) {
      // 平角半圆
      const startPt = anglePoint(cx, cy, arcRadius, side1Angle);
      const endPt = anglePoint(cx, cy, arcRadius, side2Angle);
      arcD = `M ${startPt[0]} ${startPt[1]} A ${arcRadius} ${arcRadius} 0 0 0 ${endPt[0]} ${endPt[1]}`;
    } else {
      // 普通圆弧
      const startPt = anglePoint(cx, cy, arcRadius, side1Angle);
      const endPt = anglePoint(cx, cy, arcRadius, side2Angle);
      const largeArc = size > 180 ? 1 : 0;
      arcD = `M ${startPt[0]} ${startPt[1]} A ${arcRadius} ${arcRadius} 0 ${largeArc} 0 ${endPt[0]} ${endPt[1]}`;
    }
  }

  // 标签计算
  const showLabel = Boolean(p.label);
  const showKindLabel = Boolean(p.kindLabel) && Boolean(kindText);
  const labelText = `${formatNumber(size)}°`;

  const midDeg = isRound ? from + 180 : from + size / 2;
  const midRad = (midDeg * Math.PI) / 180;
  const uMid: Point = [Math.cos(midRad), -Math.sin(midRad)];

  // 标签基准距离：较小角（张口小）外推到 95 像素处，在两边开阔处居中，避免挤压边线；普通角与周角在 66 像素处
  const baseDist = size < 60 && !isRound ? 95 : 66;

  let labelPos: Point;
  let kindLabelPos: Point;

  if (showLabel && showKindLabel) {
    // 两个都显示时垂直排成两行（上行种类，下行度数），排版工整清晰
    const centerPt: Point = [cx + uMid[0] * baseDist, cy + uMid[1] * baseDist];
    kindLabelPos = [centerPt[0], centerPt[1] - 15];
    labelPos = [centerPt[0], centerPt[1] + 15];
  } else {
    labelPos = [cx + uMid[0] * baseDist, cy + uMid[1] * baseDist];
    kindLabelPos = [cx + uMid[0] * baseDist, cy + uMid[1] * baseDist];
  }

  // 子项包围盒
  const vertexBox = boxAround(cx, cy, 24, 24);
  const side1Box = lineBoundingBox([cx, cy], side1End, 12);
  const side2Box = lineBoundingBox([cx, cy], side2End, 12);

  // 全局包围盒
  const pts: Point[] = [[cx, cy], side1End, side2End];
  if (showArc) {
    if (isRound) {
      pts.push([cx - arcRadius, cy], [cx + arcRadius, cy], [cx, cy - arcRadius], [cx, cy + arcRadius]);
    } else if (rightAnglePts) {
      pts.push(...rightAnglePts);
    } else {
      pts.push(anglePoint(cx, cy, arcRadius, side1Angle));
      pts.push(anglePoint(cx, cy, arcRadius, side2Angle));
      pts.push(anglePoint(cx, cy, arcRadius, midDeg));
    }
  }
  if (showLabel) {
    const w = textWidth(labelText, 24);
    pts.push([labelPos[0] - w / 2, labelPos[1] - 14], [labelPos[0] + w / 2, labelPos[1] + 14]);
  }
  if (showKindLabel) {
    const w = textWidth(kindText, 24);
    pts.push([kindLabelPos[0] - w / 2, kindLabelPos[1] - 14], [kindLabelPos[0] + w / 2, kindLabelPos[1] + 14]);
  }

  const xs = pts.map((pt) => pt[0]);
  const ys = pts.map((pt) => pt[1]);
  const pad = 12;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const maxX = Math.max(...xs) + pad;
  const maxY = Math.max(...ys) + pad;
  const bbox: Box = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };

  return {
    cx,
    cy,
    from,
    size,
    length,
    arcRadius,
    side1Angle,
    side2Angle,
    side1End,
    side2End,
    kind,
    kindText,
    isRight,
    isStraight,
    isRound,
    isZero,
    arcD,
    rightAnglePts,
    roundArrow,
    ray1,
    ray2,
    showArc,
    showLabel,
    labelText,
    labelPos,
    showKindLabel,
    kindLabelPos,
    vertexBox,
    side1Box,
    side2Box,
    bbox,
  };
}

export const anglePart: PartDef = {
  type: 'angle',
  name: '角',
  anchor: 'start',
  props: ['from', 'size', 'length', 'arc', 'label', 'rays', 'arcColor', 'kindLabel', 'labels'],
  bbox(p) {
    return angleLayout(p).bbox;
  },
  subitems(p): Subitem[] {
    const L = angleLayout(p);
    return [
      {
        name: 'vertex',
        box: L.vertexBox,
      },
      {
        name: 'side1',
        box: L.side1Box,
      },
      {
        name: 'side2',
        box: L.side2Box,
      },
    ];
  },
  handles(p): Handle[] {
    const L = angleLayout(p);
    const cx = L.cx;
    const cy = L.cy;
    const from = L.from;
    const currentSize = L.size;

    return [
      {
        prop: 'size',
        at: L.side2End,
        kind: 'rotate',
        center: [cx, cy],
        min: 0,
        max: 360,
        valueAt(pointer: Point): number {
          const dx = pointer[0] - cx;
          const dy = pointer[1] - cy;
          if (Math.hypot(dx, dy) < 1e-6) return currentSize;
          let deg = (Math.atan2(-dy, dx) * 180) / Math.PI;
          if (deg < 0) deg += 360;
          const fromNorm = ((from % 360) + 360) % 360;
          let diff = deg - fromNorm;
          diff = ((diff % 360) + 360) % 360;
          if (Math.abs(diff) < 1e-4 || Math.abs(diff - 360) < 1e-4) {
            return currentSize > 180 ? 360 : 0;
          }
          return Math.round(diff * 100) / 100;
        },
      },
    ];
  },
  Render({ p, ctx }: { p: Props; ctx: PartContext }) {
    const L = angleLayout(p);
    const strokeColor = color(p.color, ctx.theme, 'ink');
    const arcColor = color(p.arcColor, ctx.theme, 'accent');

    const s1End = L.ray1 ? L.ray1.lineEnd : L.side1End;
    const s2End = L.ray2 ? L.ray2.lineEnd : L.side2End;

    return (
      <g>
        {/* 起始边 side1 */}
        <line
          x1={L.cx}
          y1={L.cy}
          x2={s1End[0]}
          y2={s1End[1]}
          stroke={strokeColor}
          strokeWidth={4}
          strokeLinecap="round"
        />
        {L.ray1 ? (
          <path
            d={`M ${L.ray1.tip[0]} ${L.ray1.tip[1]} L ${L.ray1.p1[0]} ${L.ray1.p1[1]} L ${L.ray1.p2[0]} ${L.ray1.p2[1]} Z`}
            fill={strokeColor}
          />
        ) : null}

        {/* 终止边 side2 */}
        <line
          x1={L.cx}
          y1={L.cy}
          x2={s2End[0]}
          y2={s2End[1]}
          stroke={strokeColor}
          strokeWidth={4}
          strokeLinecap="round"
        />
        {L.ray2 ? (
          <path
            d={`M ${L.ray2.tip[0]} ${L.ray2.tip[1]} L ${L.ray2.p1[0]} ${L.ray2.p1[1]} L ${L.ray2.p2[0]} ${L.ray2.p2[1]} Z`}
            fill={strokeColor}
          />
        ) : null}

        {/* 角弧 / 直角折线 / 整圆 */}
        {L.showArc && L.arcD ? (
          <path
            d={L.arcD}
            fill="none"
            stroke={arcColor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="miter"
          />
        ) : null}

        {/* 周角特化：整圆及旋转箭头 */}
        {L.showArc && L.isRound ? (
          <g>
            <circle
              cx={L.cx}
              cy={L.cy}
              r={L.arcRadius}
              fill="none"
              stroke={arcColor}
              strokeWidth={2}
            />
            {L.roundArrow ? (
              <path d={L.roundArrow.d} fill={arcColor} />
            ) : null}
          </g>
        ) : null}

        {/* 顶点实心圆（半径 5） */}
        <circle cx={L.cx} cy={L.cy} r={5} fill={strokeColor} />

        {/* 度数标签 */}
        {L.showLabel ? (
          <text
            x={L.labelPos[0]}
            y={L.labelPos[1]}
            fill={ctx.theme.ink}
            fontSize={24}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {L.labelText}
          </text>
        ) : null}

        {/* 角的种类标签 */}
        {L.showKindLabel ? (
          <text
            x={L.kindLabelPos[0]}
            y={L.kindLabelPos[1]}
            fill={ctx.theme.ink}
            fontSize={24}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {L.kindText}
          </text>
        ) : null}
      </g>
    );
  },
};
