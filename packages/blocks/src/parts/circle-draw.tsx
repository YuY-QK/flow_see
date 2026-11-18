// 圆规画圆与圆的认识零件：支持圆规动态画圆、圆心/半径/直径标注及圆滚一周测周长。
import {
  color,
  num,
  pt,
  textWidth,
  type Box,
  type PartContext,
  type PartDef,
  type Point,
  type Props,
  type Subitem,
} from '../base';
import { sceneStyle } from '../style';

export interface CircleDrawLabels {
  center?: string;
  r?: string;
  d?: string;
  circumference?: string;
}

export interface CircleDrawCompassLayout {
  needleTip: Point;
  penTip: Point;
  midpoint: Point;
  hinge: Point;
  handleTop: Point;
  legLength: number;
}

export interface CircleDrawRollLayout {
  baselineStart: Point;
  baselineEnd: Point;
  rolledStart: Point;
  rolledEnd: Point;
  redDot: Point;
  circumferenceLabel: string;
  circumferenceLabelPos: Point;
}

export interface CircleDrawLayout {
  /** 起始圆心（at 坐标） */
  startCenter: Point;
  /** 当前圆心（滚动后右移 2πr × roll） */
  cx: number;
  cy: number;
  radius: number;
  draw: number;
  roll: number;
  /** 圆规当前笔脚在圆周上的位置（从正右方 0° 逆时针转 2π × draw） */
  penTip: Point;
  isZeroDraw: boolean;
  isFullCircle: boolean;
  arcPath?: string;
  showCompass: boolean;
  compass?: CircleDrawCompassLayout;
  showCenter: boolean;
  centerLabelPos: Point;
  radiiCount: number;
  radiiEnds: Point[];
  showRadiusLabel: boolean;
  radiusLabelPos: Point;
  showDiameter: boolean;
  diameterStart: Point;
  diameterEnd: Point;
  diameterLabelPos: Point;
  showRoll: boolean;
  /** 圆上红点当前坐标（从底部切点随圆向右顺时针滚动） */
  rollPoint: Point;
  rollLayout?: CircleDrawRollLayout;
  labels: Required<CircleDrawLabels>;
  centerBox: Box;
  radiusBox: Box;
  diameterBox: Box;
  bbox: Box;
}

export const CIRCLE_DRAW_STROKE_WIDTH = 4;
export const CIRCLE_DRAW_LABEL_SIZE = 24;
const COMPASS_HANDLE_LEN = 14;
const EPS = 1e-4;

export function defaultCircleDrawLabels(): Required<CircleDrawLabels> {
  let cfg: Record<string, unknown> | undefined;
  try {
    cfg = sceneStyle().parts['circle-draw']?.labels as Record<string, unknown> | undefined;
  } catch {
    cfg = undefined;
  }
  return {
    center: typeof cfg?.center === 'string' ? cfg.center : 'O',
    r: typeof cfg?.r === 'string' ? cfg.r : 'r',
    d: typeof cfg?.d === 'string' ? cfg.d : 'd',
    circumference: typeof cfg?.circumference === 'string' ? cfg.circumference : '',
  };
}

function safeTextWidth(text: string, size: number): number {
  try {
    return textWidth(text, size);
  } catch {
    return text.length * size * 0.8;
  }
}

function boxFromPoints(pts: Point[], pad = 0): Box {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return {
    x: minX - pad,
    y: minY - pad,
    w: maxX - minX + pad * 2,
    h: maxY - minY + pad * 2,
  };
}

/** 圆规画圆与圆的认识纯几何布局计算 */
export function circleDrawLayout(p: Props): CircleDrawLayout {
  const [atX, atY] = pt(p.at);
  const startCenter: Point = [atX, atY];
  const radius = Math.max(1, num(p.radius, 120));
  const draw = Math.max(0, Math.min(1, num(p.draw, 1)));
  const roll = Math.max(0, Math.min(1, num(p.roll, 0)));

  // 滚动距离与当前圆心
  const rolledDist = 2 * Math.PI * radius * roll;
  const cx = atX + rolledDist;
  const cy = atY;

  // 圆规笔脚（从正右方 0° 逆时针旋转 2π × draw）
  const theta = 2 * Math.PI * draw;
  const penTip: Point = [cx + radius * Math.cos(theta), cy - radius * Math.sin(theta)];
  const isZeroDraw = draw <= EPS;
  const isFullCircle = draw >= 1 - EPS;

  let arcPath: string | undefined;
  if (!isZeroDraw && !isFullCircle) {
    const startPt: Point = [cx + radius, cy];
    const largeArc = draw > 0.5 ? 1 : 0;
    arcPath = `M ${startPt[0]} ${startPt[1]} A ${radius} ${radius} 0 ${largeArc} 0 ${penTip[0]} ${penTip[1]}`;
  }

  // 圆规几何：针脚在圆心，笔脚在 penTip，两脚铰接点在两脚中点上方（等腰三角形脚长 max(0.75 * r, 160)）
  const showCompass = Boolean(p.compass);
  let compass: CircleDrawCompassLayout | undefined;
  if (showCompass) {
    const legLength = Math.max(radius * 0.75, 160);
    const needleTip: Point = [cx, cy];
    const midpoint: Point = [(cx + penTip[0]) / 2, (cy + penTip[1]) / 2];
    const dx = penTip[0] - cx;
    const dy = penTip[1] - cy;
    const dist = Math.hypot(dx, dy);
    const h = Math.sqrt(Math.max(0, legLength * legLength - (dist / 2) * (dist / 2)));

    let nx = 0;
    let ny = -1;
    if (dist > 1e-9) {
      if (dx >= -1e-9) {
        nx = dy / dist;
        ny = -dx / dist;
      } else {
        nx = -dy / dist;
        ny = dx / dist;
      }
    }

    const hinge: Point = [midpoint[0] + nx * h, midpoint[1] + ny * h];
    const handleTop: Point = [
      hinge[0] + nx * COMPASS_HANDLE_LEN,
      hinge[1] + ny * COMPASS_HANDLE_LEN,
    ];
    compass = {
      needleTip,
      penTip,
      midpoint,
      hinge,
      handleTop,
      legLength,
    };
  }

  // 标签读取（默认值来自 site.yaml，支持局部覆盖）
  const defLabels = defaultCircleDrawLabels();
  const rawLabels =
    typeof p.labels === 'object' && p.labels !== null ? (p.labels as Record<string, unknown>) : {};
  const labels: Required<CircleDrawLabels> = {
    center: typeof rawLabels.center === 'string' ? rawLabels.center : defLabels.center,
    r: typeof rawLabels.r === 'string' ? rawLabels.r : defLabels.r,
    d: typeof rawLabels.d === 'string' ? rawLabels.d : defLabels.d,
    circumference:
      typeof rawLabels.circumference === 'string'
        ? rawLabels.circumference
        : defLabels.circumference,
  };

  // 圆心、半径、直径
  const showCenter = p.center !== false;
  const centerLabelPos: Point = [cx - 16, cy + 20];

  const radiiCount = Math.max(0, Math.round(num(p.radii, 0)));
  const radiiEnds: Point[] = [];
  for (let i = 0; i < radiiCount; i++) {
    const ang = (i * 2 * Math.PI) / radiiCount;
    radiiEnds.push([cx + radius * Math.cos(ang), cy - radius * Math.sin(ang)]);
  }

  const showRadiusLabel = Boolean(p.radiusLabel) && radiiCount >= 1 && labels.r.length > 0;
  const radiusLabelPos: Point = [cx + radius * 0.5, cy - 18];

  const showDiameter = Boolean(p.diameter);
  const diameterStart: Point = [cx - radius, cy];
  const diameterEnd: Point = [cx + radius, cy];
  const diameterLabelPos: Point = showRadiusLabel
    ? [cx - radius * 0.45, cy - 18]
    : [cx + radius * 0.35, cy - 18];

  // 滚动（roll）：圆向右顺时针滚动，底部起点 (0, r) 顺时针旋转 2π × roll 后为 (-r sin θ, r cos θ)
  const rollAngle = 2 * Math.PI * roll;
  const rollPoint: Point = [
    cx - radius * Math.sin(rollAngle),
    cy + radius * Math.cos(rollAngle),
  ];
  const showRoll = roll > 0;
  let rollLayout: CircleDrawRollLayout | undefined;
  if (showRoll) {
    const baselineY = cy + radius;
    const baselineStart: Point = [atX, baselineY];
    const baselineEnd: Point = [atX + 2 * Math.PI * radius + 40, baselineY];
    const rolledStart: Point = [atX, baselineY];
    const rolledEnd: Point = [cx, baselineY];
    const circumferenceLabel = labels.circumference;
    const circumferenceLabelPos: Point = [(atX + cx) / 2, baselineY + 24];
    rollLayout = {
      baselineStart,
      baselineEnd,
      rolledStart,
      rolledEnd,
      redDot: rollPoint,
      circumferenceLabel,
      circumferenceLabelPos,
    };
  }

  // 子项包围盒
  const centerPts: Point[] = [
    [cx - 16, cy - 16],
    [cx + 16, cy + 16],
  ];
  if (showCenter && labels.center) {
    const cw = safeTextWidth(labels.center, CIRCLE_DRAW_LABEL_SIZE);
    centerPts.push(
      [centerLabelPos[0] - cw / 2 - 4, centerLabelPos[1] - 14],
      [centerLabelPos[0] + cw / 2 + 4, centerLabelPos[1] + 14],
    );
  }
  const centerBox = boxFromPoints(centerPts);

  const subPad = 14;
  const radiusPts: Point[] = [
    [cx - subPad, cy - subPad],
    [cx + radius + subPad, cy + subPad],
  ];
  if (showRadiusLabel) {
    const rw = safeTextWidth(labels.r, CIRCLE_DRAW_LABEL_SIZE);
    radiusPts.push(
      [radiusLabelPos[0] - rw / 2 - 4, radiusLabelPos[1] - 14],
      [radiusLabelPos[0] + rw / 2 + 4, radiusLabelPos[1] + 14],
    );
  }
  const radiusBox = boxFromPoints(radiusPts);

  const diameterPts: Point[] = [
    [cx - radius - subPad, cy - subPad],
    [cx + radius + subPad, cy + subPad],
  ];
  if (showDiameter && labels.d) {
    const dw = safeTextWidth(labels.d, CIRCLE_DRAW_LABEL_SIZE);
    diameterPts.push(
      [diameterLabelPos[0] - dw / 2 - 4, diameterLabelPos[1] - 14],
      [diameterLabelPos[0] + dw / 2 + 4, diameterLabelPos[1] + 14],
    );
  }
  const diameterBox = boxFromPoints(diameterPts);

  // 整体包围盒
  const bboxPts: Point[] = [
    [cx - radius, cy - radius],
    [cx + radius, cy + radius],
  ];

  if (compass) {
    bboxPts.push(compass.hinge, compass.handleTop, compass.needleTip, compass.penTip);
  }

  if (showCenter && labels.center) {
    const cw = safeTextWidth(labels.center, CIRCLE_DRAW_LABEL_SIZE);
    bboxPts.push(
      [centerLabelPos[0] - cw / 2, centerLabelPos[1] - 14],
      [centerLabelPos[0] + cw / 2, centerLabelPos[1] + 14],
    );
  }

  if (showRadiusLabel) {
    const rw = safeTextWidth(labels.r, CIRCLE_DRAW_LABEL_SIZE);
    bboxPts.push(
      [radiusLabelPos[0] - rw / 2, radiusLabelPos[1] - 14],
      [radiusLabelPos[0] + rw / 2, radiusLabelPos[1] + 14],
    );
  }

  if (showDiameter && labels.d) {
    const dw = safeTextWidth(labels.d, CIRCLE_DRAW_LABEL_SIZE);
    bboxPts.push(
      [diameterLabelPos[0] - dw / 2, diameterLabelPos[1] - 14],
      [diameterLabelPos[0] + dw / 2, diameterLabelPos[1] + 14],
    );
  }

  if (showRoll && rollLayout) {
    bboxPts.push(rollLayout.baselineStart, rollLayout.baselineEnd, rollLayout.redDot);
    if (rollLayout.circumferenceLabel) {
      const lw = safeTextWidth(rollLayout.circumferenceLabel, CIRCLE_DRAW_LABEL_SIZE);
      bboxPts.push(
        [rollLayout.circumferenceLabelPos[0] - lw / 2, rollLayout.circumferenceLabelPos[1] - 14],
        [rollLayout.circumferenceLabelPos[0] + lw / 2, rollLayout.circumferenceLabelPos[1] + 14],
      );
    }
  }

  const bbox = boxFromPoints(bboxPts, 6);

  return {
    startCenter,
    cx,
    cy,
    radius,
    draw,
    roll,
    penTip,
    isZeroDraw,
    isFullCircle,
    arcPath,
    showCompass,
    compass,
    showCenter,
    centerLabelPos,
    radiiCount,
    radiiEnds,
    showRadiusLabel,
    radiusLabelPos,
    showDiameter,
    diameterStart,
    diameterEnd,
    diameterLabelPos,
    showRoll,
    rollPoint,
    rollLayout,
    labels,
    centerBox,
    radiusBox,
    diameterBox,
    bbox,
  };
}

function lerpPoint(a: Point, b: Point, t: number): Point {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

export const circleDrawPart: PartDef = {
  type: 'circle-draw',
  name: '圆规画圆',
  anchor: 'center',
  props: [
    'radius',
    'draw',
    'compass',
    'center',
    'radii',
    'radiusLabel',
    'diameter',
    'roll',
    'labels',
  ],
  bbox(p) {
    return circleDrawLayout(p).bbox;
  },
  subitems(p): Subitem[] {
    const L = circleDrawLayout(p);
    return [
      {
        name: 'center',
        box: L.centerBox,
        label: L.labels.center,
      },
      {
        name: 'radius',
        box: L.radiusBox,
        label: L.labels.r,
      },
      {
        name: 'diameter',
        box: L.diameterBox,
        label: L.labels.d,
      },
    ];
  },
  Render({ p, ctx }: { p: Props; ctx: PartContext }) {
    const L = circleDrawLayout(p);
    const subColors =
      p._subColors && typeof p._subColors === 'object'
        ? (p._subColors as Record<string, string>)
        : undefined;

    const circleColor = color(p.color, ctx.theme, 'blue');
    const inkColor = color('ink', ctx.theme);
    const dimColor = color('dim', ctx.theme);
    const lineColor = color('line', ctx.theme);
    const accentColor = color('accent', ctx.theme);
    const redColor = color('red', ctx.theme);
    const whiteColor = color('white', ctx.theme);
    const centerColor = color(subColors?.center, ctx.theme, 'ink');
    const radiusColor = color(subColors?.radius, ctx.theme, 'orange');
    const diameterColor = color(subColors?.diameter, ctx.theme, 'green');

    const textHalo = {
      paintOrder: 'stroke' as const,
      stroke: ctx.theme.stageBg,
      strokeWidth: 4,
      strokeLinejoin: 'round' as const,
    };

    const needleSplit = L.compass ? lerpPoint(L.compass.hinge, L.compass.needleTip, 0.85) : null;
    const penSplit = L.compass ? lerpPoint(L.compass.hinge, L.compass.penTip, 0.85) : null;

    return (
      <g>
        {/* 圆周与填充（draw = 1 时填充 color 0.15） */}
        {L.isFullCircle ? (
          <circle
            cx={L.cx}
            cy={L.cy}
            r={L.radius}
            fill={circleColor}
            fillOpacity={0.15}
            stroke={circleColor}
            strokeWidth={CIRCLE_DRAW_STROKE_WIDTH}
          />
        ) : !L.isZeroDraw && L.arcPath ? (
          <path
            d={L.arcPath}
            fill="none"
            stroke={circleColor}
            strokeWidth={CIRCLE_DRAW_STROKE_WIDTH}
            strokeLinecap="round"
          />
        ) : null}

        {/* 下方滚动水平基线与已滚过距离 */}
        {L.showRoll && L.rollLayout ? (
          <g>
            <line
              x1={L.rollLayout.baselineStart[0]}
              y1={L.rollLayout.baselineStart[1]}
              x2={L.rollLayout.baselineEnd[0]}
              y2={L.rollLayout.baselineEnd[1]}
              stroke={lineColor}
              strokeWidth={2}
              strokeLinecap="round"
            />
            <line
              x1={L.rollLayout.rolledStart[0]}
              y1={L.rollLayout.rolledStart[1] - 5}
              x2={L.rollLayout.rolledStart[0]}
              y2={L.rollLayout.rolledStart[1] + 5}
              stroke={accentColor}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <line
              x1={L.rollLayout.rolledEnd[0]}
              y1={L.rollLayout.rolledEnd[1] - 5}
              x2={L.rollLayout.rolledEnd[0]}
              y2={L.rollLayout.rolledEnd[1] + 5}
              stroke={accentColor}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <line
              x1={L.rollLayout.rolledStart[0]}
              y1={L.rollLayout.rolledStart[1]}
              x2={L.rollLayout.rolledEnd[0]}
              y2={L.rollLayout.rolledEnd[1]}
              stroke={accentColor}
              strokeWidth={5}
              strokeLinecap="round"
            />
            {L.rollLayout.circumferenceLabel ? (
              <text
                x={L.rollLayout.circumferenceLabelPos[0]}
                y={L.rollLayout.circumferenceLabelPos[1]}
                fill={accentColor}
                fontSize={CIRCLE_DRAW_LABEL_SIZE}
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="central"
              >
                {L.rollLayout.circumferenceLabel}
              </text>
            ) : null}
          </g>
        ) : null}

        {/* 水平直径 */}
        {L.showDiameter ? (
          <g>
            <line
              x1={L.diameterStart[0]}
              y1={L.diameterStart[1]}
              x2={L.diameterEnd[0]}
              y2={L.diameterEnd[1]}
              stroke={diameterColor}
              strokeWidth={3}
              strokeLinecap="round"
            />
            <circle cx={L.diameterStart[0]} cy={L.diameterStart[1]} r={3.5} fill={diameterColor} />
            <circle cx={L.diameterEnd[0]} cy={L.diameterEnd[1]} r={3.5} fill={diameterColor} />
          </g>
        ) : null}

        {/* 半径列表（均匀分布，第一条指向右） */}
        {L.radiiEnds.map((end, idx) =>
          idx === 0 ? null : (
            <line
              key={`radius-${idx}`}
              x1={L.cx}
              y1={L.cy}
              x2={end[0]}
              y2={end[1]}
              stroke={radiusColor}
              strokeWidth={2.5}
              strokeOpacity={0.8}
              strokeLinecap="round"
            />
          ),
        )}
        {L.radiiEnds.length >= 1 ? (
          <g>
            <line
              x1={L.cx}
              y1={L.cy}
              x2={L.radiiEnds[0][0]}
              y2={L.radiiEnds[0][1]}
              stroke={radiusColor}
              strokeWidth={3}
              strokeLinecap="round"
            />
            <circle cx={L.radiiEnds[0][0]} cy={L.radiiEnds[0][1]} r={3.5} fill={radiusColor} />
          </g>
        ) : null}

        {/* 圆心点 */}
        {L.showCenter ? <circle cx={L.cx} cy={L.cy} r={5} fill={centerColor} /> : null}

        {/* 圆滚动起点红点 */}
        {L.showRoll ? (
          <circle
            cx={L.rollPoint[0]}
            cy={L.rollPoint[1]}
            r={6}
            fill={redColor}
            stroke={whiteColor}
            strokeWidth={2}
          />
        ) : null}

        {/* 标注文字（O、r、d） */}
        {L.showCenter && L.labels.center ? (
          <text
            x={L.centerLabelPos[0]}
            y={L.centerLabelPos[1]}
            fill={centerColor}
            fontSize={CIRCLE_DRAW_LABEL_SIZE}
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="central"
            {...textHalo}
          >
            {L.labels.center}
          </text>
        ) : null}

        {L.showRadiusLabel && L.labels.r ? (
          <text
            x={L.radiusLabelPos[0]}
            y={L.radiusLabelPos[1]}
            fill={radiusColor}
            fontSize={CIRCLE_DRAW_LABEL_SIZE}
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="central"
            {...textHalo}
          >
            {L.labels.r}
          </text>
        ) : null}

        {L.showDiameter && L.labels.d ? (
          <text
            x={L.diameterLabelPos[0]}
            y={L.diameterLabelPos[1]}
            fill={diameterColor}
            fontSize={CIRCLE_DRAW_LABEL_SIZE}
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="central"
            {...textHalo}
          >
            {L.labels.d}
          </text>
        ) : null}

        {/* 圆规（针脚、笔脚、铰接点与握柄） */}
        {L.showCompass && L.compass && needleSplit && penSplit ? (
          <g>
            <line
              x1={L.compass.hinge[0]}
              y1={L.compass.hinge[1]}
              x2={L.compass.handleTop[0]}
              y2={L.compass.handleTop[1]}
              stroke={inkColor}
              strokeWidth={5}
              strokeLinecap="round"
            />
            <line
              x1={L.compass.hinge[0]}
              y1={L.compass.hinge[1]}
              x2={needleSplit[0]}
              y2={needleSplit[1]}
              stroke={inkColor}
              strokeWidth={4}
              strokeLinecap="round"
            />
            <line
              x1={needleSplit[0]}
              y1={needleSplit[1]}
              x2={L.compass.needleTip[0]}
              y2={L.compass.needleTip[1]}
              stroke={dimColor}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <line
              x1={L.compass.hinge[0]}
              y1={L.compass.hinge[1]}
              x2={penSplit[0]}
              y2={penSplit[1]}
              stroke={inkColor}
              strokeWidth={4}
              strokeLinecap="round"
            />
            <line
              x1={penSplit[0]}
              y1={penSplit[1]}
              x2={L.compass.penTip[0]}
              y2={L.compass.penTip[1]}
              stroke={circleColor}
              strokeWidth={4}
              strokeLinecap="round"
            />
            <circle cx={L.compass.penTip[0]} cy={L.compass.penTip[1]} r={3.5} fill={circleColor} />
            <circle
              cx={L.compass.hinge[0]}
              cy={L.compass.hinge[1]}
              r={6}
              fill={whiteColor}
              stroke={inkColor}
              strokeWidth={2.5}
            />
          </g>
        ) : null}
      </g>
    );
  },
};
