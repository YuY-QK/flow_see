// 量角器零件：半圆刻度盘、内外两圈 0–180° 刻度数字、高亮整圈或指定度数刻度线、旋转与整体拖动把手。
import {
  boxAround,
  color,
  mixColor,
  num,
  pt,
  type Box,
  type Handle,
  type PartContext,
  type PartDef,
  type Point,
  type Props,
  type Subitem,
} from '../base';

export const PROTRACTOR_SCALES = ['inner', 'outer', 'both'] as const;
export type ProtractorScale = (typeof PROTRACTOR_SCALES)[number];
export type ProtractorHighlight = 'none' | 'inner' | 'outer' | number;

export const MINOR_TICK_LEN = 8;
export const MID_TICK_LEN = 12;
export const MAJOR_TICK_LEN = 18;
export const OUTER_FONT_SIZE = 16;
export const INNER_FONT_SIZE = 14;
export const OUTER_LABEL_INSET = 27;
export const INNER_LABEL_INSET = 45;
export const ROTATE_HANDLE_OFFSET = 20;

export interface ProtractorTick {
  deg: number;
  worldDeg: number;
  kind: 'major' | 'mid' | 'minor';
  length: number;
  strokeWidth: number;
  outerPt: Point;
  innerPt: Point;
}

export interface ProtractorScaleLabel {
  value: number;
  ring: 'outer' | 'inner';
  localDeg: number;
  worldDeg: number;
  pos: Point;
  fontSize: number;
  rotateDeg: number;
  highlighted: boolean;
}

export interface ProtractorHighlightLine {
  deg: number;
  localDeg: number;
  worldDeg: number;
  from: Point;
  to: Point;
}

export interface ProtractorLayout {
  cx: number;
  cy: number;
  radius: number;
  rotate: number;
  scale: ProtractorScale;
  highlight: ProtractorHighlight;
  leftEnd: Point;
  rightEnd: Point;
  apex: Point;
  rotateHandleAt: Point;
  arcPath: string;
  crosshair: {
    hFrom: Point;
    hTo: Point;
    vFrom: Point;
    vTo: Point;
  };
  ticks: ProtractorTick[];
  outerLabels: ProtractorScaleLabel[];
  innerLabels: ProtractorScaleLabel[];
  highlightLine?: ProtractorHighlightLine;
  centerBox: Box;
  zeroInnerBox: Box;
  zeroOuterBox: Box;
  bbox: Box;
}

/** 屏幕坐标系下按数学角（0° 水平向右，逆时针为正）求点 */
export function protractorPoint(cx: number, cy: number, r: number, worldDeg: number): Point {
  const rad = (worldDeg * Math.PI) / 180;
  return [cx + Math.cos(rad) * r, cy - Math.sin(rad) * r];
}

function parseScale(v: unknown): ProtractorScale {
  if (v === 'inner' || v === 'outer' || v === 'both') return v;
  return 'both';
}

function parseHighlight(v: unknown): ProtractorHighlight {
  if (v === 'none' || v === 'inner' || v === 'outer') return v;
  if (typeof v === 'number' && Number.isFinite(v)) {
    return Math.max(0, Math.min(180, v));
  }
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (trimmed !== '' && /^-?\d+(\.\d+)?$/.test(trimmed)) {
      const n = Number(trimmed);
      if (Number.isFinite(n)) return Math.max(0, Math.min(180, n));
    }
  }
  return 'none';
}

function isAngleInArc(targetDeg: number, startDeg: number): boolean {
  const diff = (((targetDeg - startDeg) % 360) + 360) % 360;
  return diff >= -1e-6 && diff <= 180 + 1e-6;
}

/** 量角器纯几何布局计算 */
export function protractorLayout(p: Props): ProtractorLayout {
  const [cx, cy] = pt(p.at, [0, 0]);
  const radius = Math.max(1, num(p.radius, 180));
  const rotate = num(p.rotate, 0);
  const scale = parseScale(p.scale);
  const highlight = parseHighlight(p.highlight);

  const rightEnd = protractorPoint(cx, cy, radius, rotate);
  const apex = protractorPoint(cx, cy, radius, 90 + rotate);
  const leftEnd = protractorPoint(cx, cy, radius, 180 + rotate);
  const rotateHandleAt = protractorPoint(cx, cy, radius + ROTATE_HANDLE_OFFSET, 90 + rotate);

  // 用两段 90° 圆弧拼接半圆，避免 180° 直径端点退化误差
  const arcPath = `M ${rightEnd[0]} ${rightEnd[1]} A ${radius} ${radius} 0 0 0 ${apex[0]} ${apex[1]} A ${radius} ${radius} 0 0 0 ${leftEnd[0]} ${leftEnd[1]} Z`;

  const crossArm = 6;
  const crosshair = {
    hFrom: protractorPoint(cx, cy, crossArm, 180 + rotate),
    hTo: protractorPoint(cx, cy, crossArm, rotate),
    vFrom: protractorPoint(cx, cy, 4, -90 + rotate),
    vTo: protractorPoint(cx, cy, crossArm + 2, 90 + rotate),
  };

  // 181 条刻度线（0°–180°）
  const ticks: ProtractorTick[] = [];
  for (let d = 0; d <= 180; d++) {
    const worldDeg = d + rotate;
    const isMajor = d % 10 === 0;
    const isMid = !isMajor && d % 5 === 0;
    const kind: ProtractorTick['kind'] = isMajor ? 'major' : isMid ? 'mid' : 'minor';
    const length = isMajor ? MAJOR_TICK_LEN : isMid ? MID_TICK_LEN : MINOR_TICK_LEN;
    const strokeWidth = isMajor ? 1.8 : isMid ? 1.2 : 0.8;
    ticks.push({
      deg: d,
      worldDeg,
      kind,
      length,
      strokeWidth,
      outerPt: protractorPoint(cx, cy, radius, worldDeg),
      innerPt: protractorPoint(cx, cy, Math.max(0, radius - length), worldDeg),
    });
  }

  const showOuter = scale === 'outer' || scale === 'both';
  const showInner = scale === 'inner' || scale === 'both';
  const outerLabelRadius = Math.max(8, radius - OUTER_LABEL_INSET);
  const innerLabelRadius = Math.max(4, radius - INNER_LABEL_INSET);

  const outerLabels: ProtractorScaleLabel[] = [];
  const innerLabels: ProtractorScaleLabel[] = [];

  for (let v = 0; v <= 180; v += 10) {
    if (showOuter) {
      // 外圈：从右往左 0–180（右端点 0°，逆时针到左端点 180°）
      const localDeg = v;
      const worldDeg = localDeg + rotate;
      const isHl =
        highlight === 'outer' || (typeof highlight === 'number' && Math.abs(highlight - v) < 1e-4);
      outerLabels.push({
        value: v,
        ring: 'outer',
        localDeg,
        worldDeg,
        pos: protractorPoint(cx, cy, outerLabelRadius, worldDeg),
        fontSize: OUTER_FONT_SIZE,
        rotateDeg: 90 - worldDeg,
        highlighted: isHl,
      });
    }

    if (showInner) {
      // 内圈：从左往右 0–180（左端点 180° 处为 0，顺时针到右端点 0° 处为 180）
      const localDeg = 180 - v;
      const worldDeg = localDeg + rotate;
      const isHl =
        highlight === 'inner' ||
        (typeof highlight === 'number' && scale === 'inner' && Math.abs(highlight - v) < 1e-4);
      innerLabels.push({
        value: v,
        ring: 'inner',
        localDeg,
        worldDeg,
        pos: protractorPoint(cx, cy, innerLabelRadius, worldDeg),
        fontSize: INNER_FONT_SIZE,
        rotateDeg: 90 - worldDeg,
        highlighted: isHl,
      });
    }
  }

  let highlightLine: ProtractorHighlightLine | undefined;
  if (typeof highlight === 'number') {
    const localDeg = scale === 'inner' ? 180 - highlight : highlight;
    const worldDeg = localDeg + rotate;
    highlightLine = {
      deg: highlight,
      localDeg,
      worldDeg,
      from: [cx, cy],
      to: protractorPoint(cx, cy, radius, worldDeg),
    };
  }

  const subSize = 28;
  const centerBox = boxAround(cx, cy, subSize, subSize);
  const zeroInnerBox = boxAround(leftEnd[0], leftEnd[1], subSize, subSize);
  const zeroOuterBox = boxAround(rightEnd[0], rightEnd[1], subSize, subSize);

  // 包围盒：精确覆盖旋转后的半圆弧、底边两端点与中心十字
  const boundaryPts: Point[] = [
    [cx, cy],
    rightEnd,
    apex,
    leftEnd,
    crosshair.hFrom,
    crosshair.hTo,
    crosshair.vFrom,
    crosshair.vTo,
  ];
  for (const cardDeg of [0, 90, 180, 270]) {
    if (isAngleInArc(cardDeg, rotate)) {
      boundaryPts.push(protractorPoint(cx, cy, radius, cardDeg));
    }
  }
  const pad = 4;
  const xs = boundaryPts.map((q) => q[0]);
  const ys = boundaryPts.map((q) => q[1]);
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const maxX = Math.max(...xs) + pad;
  const maxY = Math.max(...ys) + pad;
  const bbox: Box = {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
  };

  return {
    cx,
    cy,
    radius,
    rotate,
    scale,
    highlight,
    leftEnd,
    rightEnd,
    apex,
    rotateHandleAt,
    arcPath,
    crosshair,
    ticks,
    outerLabels,
    innerLabels,
    highlightLine,
    centerBox,
    zeroInnerBox,
    zeroOuterBox,
    bbox,
  };
}

export const protractorPart: PartDef = {
  type: 'protractor',
  name: '量角器',
  anchor: 'center',
  props: ['radius', 'rotate', 'scale', 'highlight'],
  bbox(p) {
    return protractorLayout(p).bbox;
  },
  subitems(p): Subitem[] {
    const L = protractorLayout(p);
    return [
      {
        name: 'center',
        box: L.centerBox,
      },
      {
        name: 'zero.inner',
        box: L.zeroInnerBox,
      },
      {
        name: 'zero.outer',
        box: L.zeroOuterBox,
      },
    ];
  },
  handles(p): Handle[] {
    const L = protractorLayout(p);
    const { cx, cy, rotate: currentRotate } = L;
    return [
      {
        prop: 'rotate',
        at: L.rotateHandleAt,
        kind: 'rotate',
        center: [cx, cy],
        min: -180,
        max: 180,
        valueAt(pointer: Point): number {
          const dx = pointer[0] - cx;
          const dy = pointer[1] - cy;
          if (Math.hypot(dx, dy) < 1e-6) return currentRotate;
          let deg = (Math.atan2(-dy, dx) * 180) / Math.PI - 90;
          while (deg <= -180) deg += 360;
          while (deg > 180) deg -= 360;
          const rounded = Math.round(deg * 100) / 100;
          return rounded === 0 ? 0 : rounded;
        },
      },
      {
        prop: 'at',
        at: [cx, cy],
        kind: 'drag',
        min: 0,
        max: 800,
        valueAt(pointer: Point): number {
          return Math.round(pointer[0]);
        },
        apply(curProps: Props, pointer: Point): Props {
          return {
            ...curProps,
            at: [Math.round(pointer[0]), Math.round(pointer[1])],
          };
        },
      },
    ];
  },
  Render({ p, ctx }: { p: Props; ctx: PartContext }) {
    const L = protractorLayout(p);
    const bodyFill = mixColor(ctx.theme.stageBg, color('blue', ctx.theme), 0.08);
    const lineColor = color('line', ctx.theme);
    const inkColor = color('ink', ctx.theme);
    const dimColor = color('dim', ctx.theme);
    const accentColor = color('accent', ctx.theme);

    const hasRingHighlight = L.highlight === 'outer' || L.highlight === 'inner';

    const renderScaleLabel = (lbl: ProtractorScaleLabel) => {
      const fill = lbl.highlighted
        ? accentColor
        : hasRingHighlight
          ? dimColor
          : inkColor;
      const weight = lbl.highlighted ? 700 : 500;
      const isBaselineEnd = lbl.localDeg === 0 || lbl.localDeg === 180;

      if (isBaselineEnd) {
        const endInset =
          lbl.ring === 'outer'
            ? lbl.value === 180
              ? 31
              : 25
            : lbl.value === 180
              ? 49
              : 52;
        const endR = Math.max(6, L.radius - endInset);
        const basePt = protractorPoint(L.cx, L.cy, endR, lbl.worldDeg);
        const upVec = protractorPoint(0, 0, 8, 90 + L.rotate);
        const tx = basePt[0] + upVec[0];
        const ty = basePt[1] + upVec[1];
        return (
          <text
            key={`${lbl.ring}-${lbl.value}`}
            x={0}
            y={0}
            transform={`translate(${tx} ${ty}) rotate(${-L.rotate})`}
            fill={fill}
            fontSize={lbl.fontSize}
            fontWeight={weight}
            letterSpacing={lbl.value >= 100 ? -0.8 : undefined}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {lbl.value}
          </text>
        );
      }

      return (
        <text
          key={`${lbl.ring}-${lbl.value}`}
          x={0}
          y={0}
          transform={`translate(${lbl.pos[0]} ${lbl.pos[1]}) rotate(${lbl.rotateDeg})`}
          fill={fill}
          fontSize={lbl.fontSize}
          fontWeight={weight}
          letterSpacing={lbl.value >= 100 ? -0.8 : undefined}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {lbl.value}
        </text>
      );
    };

    return (
      <g>
        {/* 半圆形盘体 */}
        <path
          d={L.arcPath}
          fill={bodyFill}
          fillOpacity={0.85}
          stroke={lineColor}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* 底边 0° 刻度直线 */}
        <line
          x1={L.leftEnd[0]}
          y1={L.leftEnd[1]}
          x2={L.rightEnd[0]}
          y2={L.rightEnd[1]}
          stroke={inkColor}
          strokeWidth={1.5}
          strokeOpacity={0.65}
        />

        {/* 1° / 5° / 10° 刻度线 */}
        {L.ticks.map((t) => (
          <line
            key={t.deg}
            x1={t.outerPt[0]}
            y1={t.outerPt[1]}
            x2={t.innerPt[0]}
            y2={t.innerPt[1]}
            stroke={t.kind === 'major' ? inkColor : lineColor}
            strokeWidth={t.strokeWidth}
            strokeLinecap="round"
          />
        ))}

        {/* 指定度数高亮线 */}
        {L.highlightLine ? (
          <line
            x1={L.highlightLine.from[0]}
            y1={L.highlightLine.from[1]}
            x2={L.highlightLine.to[0]}
            y2={L.highlightLine.to[1]}
            stroke={accentColor}
            strokeWidth={3}
            strokeLinecap="round"
          />
        ) : null}

        {/* 外圈与内圈数字 */}
        {L.outerLabels.map(renderScaleLabel)}
        {L.innerLabels.map(renderScaleLabel)}

        {/* 中心十字与小点 */}
        <line
          x1={L.crosshair.hFrom[0]}
          y1={L.crosshair.hFrom[1]}
          x2={L.crosshair.hTo[0]}
          y2={L.crosshair.hTo[1]}
          stroke={inkColor}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <line
          x1={L.crosshair.vFrom[0]}
          y1={L.crosshair.vFrom[1]}
          x2={L.crosshair.vTo[0]}
          y2={L.crosshair.vTo[1]}
          stroke={inkColor}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <circle cx={L.cx} cy={L.cy} r={2.5} fill={inkColor} />
      </g>
    );
  },
};
