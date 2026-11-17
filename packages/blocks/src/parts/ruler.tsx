// 直尺与测量：刻度尺身、毫米与厘米分度、被测物体及位置对齐、局部放大镜。
/* eslint-disable react-refresh/only-export-components */
import { type ReactNode } from 'react';
import { formatNumber } from '@flow-see/core';
import {
  boxAround,
  color,
  mixColor,
  num,
  pt,
  str,
  type Box,
  type Handle,
  type PartContext,
  type PartDef,
  type Point,
  type Props,
  type Subitem,
} from '../base';
import { sceneStyle } from '../style';

export type RulerUnit = 'cm' | 'mm' | 'm' | 'dm' | 'km';

export const RULER_UNITS: readonly RulerUnit[] = ['cm', 'mm', 'm', 'dm', 'km'] as const;

export interface RulerTick {
  value: number;
  x: number;
  kind: 'major' | 'mid' | 'minor';
  height: number;
  strokeWidth: number;
  label?: string;
}

export interface RulerObjectLayout {
  asset?: string;
  shape?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface RulerMagnifierLayout {
  cx: number;
  cy: number;
  r: number;
  scale: number;
  zoomAt: number;
  handle: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    strokeWidth: number;
  };
  clipCircle: {
    cx: number;
    cy: number;
    r: number;
  };
}

export interface RulerLayout {
  at: Point;
  from: number;
  to: number;
  unit: string;
  length: number;
  minor: number;
  rulerHeight: number;
  bodyBox: Box;
  ticks: RulerTick[];
  object?: RulerObjectLayout;
  magnifier?: RulerMagnifierLayout;
  box: Box;
  unitLabel: {
    text: string;
    x: number;
    y: number;
  };
}

const RULER_HEIGHT = 60;
const OBJECT_HEIGHT = 36;
const OBJECT_GAP = 8;
const MAGNIFIER_RADIUS = 70;
const MAGNIFIER_CY_OFFSET = -50;
const MAGNIFIER_HANDLE_LEN = 60;
const COS_45 = Math.SQRT1_2; // 约 0.7071

export function rulerX(p: Props, v: number): number {
  const [x] = pt(p.at, [0, 0]);
  const from = num(p.from, 0);
  const to = num(p.to, 10);
  const length = Math.max(0, num(p.length, 600));
  const span = to - from || 1;
  return x + ((v - from) / span) * length;
}

/** 纯函数计算直尺所有几何元素坐标与包围盒 */
export function rulerLayout(p: Props): RulerLayout {
  const [x, y] = pt(p.at, [0, 0]);
  const from = num(p.from, 0);
  const to = num(p.to, 10);
  const length = Math.max(0, num(p.length, 600));
  const minor = Math.max(1, Math.round(num(p.minor, 10)));
  const unit = str(p.unit, 'cm');
  const span = to - from || 1;

  const X = (v: number) => x + ((v - from) / span) * length;

  // 1. 刻度计算
  const ticks: RulerTick[] = [];
  const majorSpan = to - from;
  const totalSteps = Math.max(0, Math.round(majorSpan * minor));

  for (let i = 0; i <= totalSteps; i++) {
    const val = from + i / minor;
    const isMajor = i % minor === 0;
    const isMid = !isMajor && minor % 2 === 0 && i % minor === minor / 2;

    const tx = X(val);
    if (isMajor) {
      ticks.push({
        value: Math.round(val * 1000) / 1000,
        x: tx,
        kind: 'major',
        height: 24,
        strokeWidth: 2,
        label: formatNumber(Math.round(val * 1000) / 1000),
      });
    } else if (isMid) {
      ticks.push({
        value: Math.round(val * 1000) / 1000,
        x: tx,
        kind: 'mid',
        height: 16,
        strokeWidth: 1.5,
      });
    } else {
      ticks.push({
        value: Math.round(val * 1000) / 1000,
        x: tx,
        kind: 'minor',
        height: 10,
        strokeWidth: 1,
      });
    }
  }

  // 2. 右侧单位文本
  const customUnit =
    typeof p.labels === 'object' && p.labels !== null
      ? (p.labels as Record<string, Record<string, string>>).units?.[unit]
      : undefined;
  const unitText = customUnit || unit;
  const unitLabel = {
    text: unitText,
    x: x + length - 16,
    y: y + 38,
  };

  // 3. 物体布局
  const hasObject = p.objectAsset !== undefined || p.objectShape !== undefined;
  let objectLayout: RulerObjectLayout | undefined;

  if (hasObject) {
    const objFrom = num(p.objectFrom, from);
    const objLen = Math.max(0, num(p.objectLength, 3));
    const objX = X(objFrom);
    const objW = (objLen / span) * length;
    const objY = y - OBJECT_GAP - OBJECT_HEIGHT;

    objectLayout = {
      asset: typeof p.objectAsset === 'string' && p.objectAsset ? p.objectAsset : undefined,
      shape: typeof p.objectShape === 'string' && p.objectShape ? p.objectShape : undefined,
      x: objX,
      y: objY,
      width: objW,
      height: OBJECT_HEIGHT,
      color: str(p.objectColor, 'orange'),
    };
  }

  // 4. 放大镜布局
  const zoomScale = num(p.zoomScale, 1);
  const hasMagnifier = zoomScale > 1;
  let magnifierLayout: RulerMagnifierLayout | undefined;

  if (hasMagnifier) {
    const zoomAt = num(p.zoomAt, from);
    const cx = X(zoomAt);
    const cy = y + MAGNIFIER_CY_OFFSET;
    const r = MAGNIFIER_RADIUS;

    const x1 = cx + r * COS_45;
    const y1 = cy + r * COS_45;
    const x2 = cx + (r + MAGNIFIER_HANDLE_LEN) * COS_45;
    const y2 = cy + (r + MAGNIFIER_HANDLE_LEN) * COS_45;

    magnifierLayout = {
      cx,
      cy,
      r,
      scale: zoomScale,
      zoomAt,
      handle: {
        x1,
        y1,
        x2,
        y2,
        strokeWidth: 10,
      },
      clipCircle: {
        cx,
        cy,
        r: r - 2,
      },
    };
  }

  // 5. 包围盒计算
  let minX = x - 2;
  let maxX = x + length + 2;
  let minY = y - 2;
  let maxY = y + RULER_HEIGHT + 2;

  if (objectLayout) {
    minX = Math.min(minX, objectLayout.x - 2);
    maxX = Math.max(maxX, objectLayout.x + objectLayout.width + 2);
    minY = Math.min(minY, objectLayout.y - 2);
  }

  if (magnifierLayout) {
    minX = Math.min(minX, magnifierLayout.cx - magnifierLayout.r - 4);
    maxX = Math.max(maxX, magnifierLayout.handle.x2 + 8);
    minY = Math.min(minY, magnifierLayout.cy - magnifierLayout.r - 4);
    maxY = Math.max(maxY, magnifierLayout.handle.y2 + 8);
  }

  const box: Box = {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
  };

  return {
    at: [x, y],
    from,
    to,
    unit,
    length,
    minor,
    rulerHeight: RULER_HEIGHT,
    bodyBox: { x, y, w: length, h: RULER_HEIGHT },
    ticks,
    object: objectLayout,
    magnifier: magnifierLayout,
    box,
    unitLabel,
  };
}

/** 零件渲染组件 */
function RulerView({ p, ctx }: { p: Props; ctx: PartContext }): ReactNode {
  const layout = rulerLayout(p);
  const [x, y] = layout.at;
  const rawId = str(p.id, '');
  const clipId = `ruler-zoom-clip-${rawId ? rawId.replace(/[^a-zA-Z0-9_-]/g, '_') : `${Math.round(x)}_${Math.round(y)}`}`;

  const { bodyBox, ticks, unitLabel, object, magnifier } = layout;

  const rulerFill = color(p.color || 'yellow', ctx.theme);
  const rulerStroke = color('line', ctx.theme);
  const tickColor = color('ink', ctx.theme);

  // 刻度线与文字渲染函数
  const renderTicksAndBody = (isInsideZoom = false) => {
    return (
      <g>
        <rect
          x={bodyBox.x}
          y={bodyBox.y}
          width={bodyBox.w}
          height={bodyBox.h}
          rx={6}
          ry={6}
          fill={rulerFill}
          fillOpacity={0.35}
          stroke={rulerStroke}
          strokeWidth={1.5}
        />
        {ticks.map((t, idx) => (
          <g key={idx}>
            <line
              x1={t.x}
              x2={t.x}
              y1={y}
              y2={y + t.height}
              stroke={tickColor}
              strokeWidth={t.strokeWidth}
              strokeLinecap="round"
            />
            {t.label !== undefined && (
              <text
                x={t.x}
                y={y + 26}
                textAnchor="middle"
                dominantBaseline="hanging"
                fontSize={20}
                fill={tickColor}
              >
                {t.label}
              </text>
            )}
          </g>
        ))}
        {!isInsideZoom && (
          <text
            x={unitLabel.x}
            y={unitLabel.y}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={20}
            fill={tickColor}
          >
            {unitLabel.text}
          </text>
        )}
      </g>
    );
  };

  // 物体渲染函数
  const renderObject = () => {
    if (!object) return null;
    const url = object.asset ? ctx.assetUrl?.(object.asset) : undefined;
    const objFill = color(object.color, ctx.theme);
    const objStroke = mixColor(objFill, ctx.theme.ink, sceneStyle().counterBorder.darken);

    if (url) {
      return (
        <image
          href={url}
          x={object.x}
          y={object.y}
          width={object.width}
          height={object.height}
          preserveAspectRatio="none"
        />
      );
    }

    return (
      <rect
        x={object.x}
        y={object.y}
        width={object.width}
        height={object.height}
        rx={4}
        ry={4}
        fill={objFill}
        stroke={objStroke}
        strokeWidth={2}
      />
    );
  };

  return (
    <g data-part="ruler">
      {/* 1. 尺身与主刻度 */}
      {renderTicksAndBody(false)}

      {/* 2. 被测物体 */}
      {renderObject()}

      {/* 3. 放大镜 */}
      {magnifier && (
        <g data-element="magnifier">
          <defs>
            <clipPath id={clipId}>
              <circle
                cx={magnifier.clipCircle.cx}
                cy={magnifier.clipCircle.cy}
                r={magnifier.clipCircle.r}
              />
            </clipPath>
          </defs>

          {/* 手柄 */}
          <line
            x1={magnifier.handle.x1}
            y1={magnifier.handle.y1}
            x2={magnifier.handle.x2}
            y2={magnifier.handle.y2}
            stroke={rulerStroke}
            strokeWidth={magnifier.handle.strokeWidth}
            strokeLinecap="round"
          />

          {/* 镜片背景遮挡底色 */}
          <circle cx={magnifier.cx} cy={magnifier.cy} r={magnifier.r} fill={ctx.theme.stageBg} />

          {/* 镜内局部刻度（缩放变换） */}
          <g clipPath={`url(#${clipId})`}>
            <g
              transform={`translate(${magnifier.cx}, ${magnifier.cy}) scale(${magnifier.scale}) translate(${-magnifier.cx}, ${-y})`}
            >
              <rect
                x={bodyBox.x - 500}
                y={y - 500}
                width={bodyBox.w + 1000}
                height={bodyBox.h + 1000}
                fill={ctx.theme.stageBg}
              />
              {renderTicksAndBody(true)}
              {renderObject()}
            </g>
          </g>

          {/* 镜框圆环描边 */}
          <circle
            cx={magnifier.cx}
            cy={magnifier.cy}
            r={magnifier.r}
            fill="none"
            stroke={rulerStroke}
            strokeWidth={4}
          />

          {/* 镜片微光高光弧 */}
          <path
            d={`M ${magnifier.cx - 48} ${magnifier.cy - 20} A 54 54 0 0 1 ${magnifier.cx + 20} ${magnifier.cy - 50}`}
            stroke={color('white', ctx.theme)}
            strokeWidth={3}
            strokeLinecap="round"
            opacity={0.35}
            fill="none"
          />
        </g>
      )}
    </g>
  );
}

export const rulerPart: PartDef = {
  type: 'ruler',
  name: '直尺',
  anchor: 'start',
  props: [
    'from',
    'to',
    'unit',
    'length',
    'minor',
    'zoomAt',
    'zoomScale',
    'objectAsset',
    'objectShape',
    'objectFrom',
    'objectLength',
    'objectColor',
    'labels',
  ],
  bbox(p: Props): Box {
    return rulerLayout(p).box;
  },
  subitems(p: Props): Subitem[] {
    const layout = rulerLayout(p);
    const [, y] = layout.at;
    const items: Subitem[] = [];

    // tick.<数>：各主刻度（及大格刻度）的包围盒，尺寸至少 40 × 40
    layout.ticks
      .filter((t) => t.kind === 'major')
      .forEach((t) => {
        const valStr = t.label ?? formatNumber(t.value);
        items.push({
          name: `tick.${valStr}`,
          box: boxAround(t.x, y + 15, 40, 40),
          value: t.value,
          label: valStr,
        });
      });

    // object：被测物体的包围盒
    if (layout.object) {
      items.push({
        name: 'object',
        box: {
          x: layout.object.x,
          y: layout.object.y,
          w: Math.max(layout.object.width, 40),
          h: Math.max(layout.object.height, 40),
        },
        label: layout.object.asset ?? layout.object.shape ?? 'object',
      });
    }

    return items;
  },
  handles(p: Props): Handle[] {
    const layout = rulerLayout(p);
    if (!layout.object) return [];

    const { from, to, length } = layout;
    const [x] = layout.at;
    const span = to - from || 1;
    const { object } = layout;

    return [
      {
        prop: 'objectFrom',
        kind: 'drag',
        at: [object.x, object.y + object.height / 2],
        min: from,
        max: to,
        valueAt(pointer: Point): number {
          const v = from + ((pointer[0] - x) / (length || 1)) * span;
          return Math.max(from, Math.min(to, Math.round(v * 100) / 100));
        },
      },
    ];
  },
  Render: RulerView,
};
