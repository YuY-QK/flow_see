// 方向标与方位图：八方向罗盘、几点钟方向钟面、方位角标定、周围地点目标与线段比例尺。
import {
  boxAround,
  color,
  num,
  pt,
  str,
  textWidth,
  type Box,
  type Handle,
  type PartDef,
  type Point,
  type Props,
  type Subitem,
} from '../base';
import { sceneStyle } from '../style';

export type DirectionMode = 'compass' | 'clock' | 'bearing';

export interface DirectionTarget {
  bearing: number;
  distance: number;
  asset?: string;
  label?: string;
}

export interface DirectionScaleBar {
  km: number;
  px: number;
}

export interface DirectionLabels {
  N?: string;
  NE?: string;
  E?: string;
  SE?: string;
  S?: string;
  SW?: string;
  W?: string;
  NW?: string;
  beiPian?: string;
  nanPian?: string;
  km?: string;
  oClock?: string;
  me?: string;
  target?: string;
  [key: string]: string | undefined;
}

export const COMPASS_DIRS = [
  { key: 'N', deg: 0, isMajor: true, colorKey: 'red' as const },
  { key: 'NE', deg: 45, isMajor: false, colorKey: 'ink' as const },
  { key: 'E', deg: 90, isMajor: true, colorKey: 'ink' as const },
  { key: 'SE', deg: 135, isMajor: false, colorKey: 'ink' as const },
  { key: 'S', deg: 180, isMajor: true, colorKey: 'ink' as const },
  { key: 'SW', deg: 225, isMajor: false, colorKey: 'ink' as const },
  { key: 'W', deg: 270, isMajor: true, colorKey: 'ink' as const },
  { key: 'NW', deg: 315, isMajor: false, colorKey: 'ink' as const },
] as const;

export const COMPASS_LABEL_GAP = 16;
export const COMPASS_LABEL_SIZE = 24;
export const CLOCK_NUM_SIZE = 20;
export const TARGET_ICON_SIZE = 56;

export function labelsOf(p: Props): DirectionLabels {
  let defaults: DirectionLabels = {};
  try {
    defaults = (sceneStyle().parts.direction?.labels as DirectionLabels | undefined) ?? {};
  } catch {
    // sceneStyle 未注入时的保底
  }
  const custom = (p.labels && typeof p.labels === 'object' ? p.labels : {}) as DirectionLabels;
  return {
    ...defaults,
    ...custom,
  };
}

/** 角度（度，0 正北/正上方，顺时针为正）转屏幕坐标（舞台坐标系，y 向下） */
export function directionPoint(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [cx + Math.sin(rad) * r, cy - Math.cos(rad) * r];
}

export interface CompassDirLabelLayout {
  key: string;
  text: string;
  deg: number;
  pos: [number, number];
  isMajor: boolean;
  colorKey: 'red' | 'ink';
  box: Box;
}

export interface CompassArrowLayout {
  key: string;
  deg: number;
  isMajor: boolean;
  colorKey: 'red' | 'ink';
  tip: [number, number];
  path: string;
}

export interface ClockTickLayout {
  hour: number;
  deg: number;
  outer: [number, number];
  inner: [number, number];
  isMajor: boolean;
}

export interface ClockNumberLayout {
  hour: number;
  deg: number;
  pos: [number, number];
  box: Box;
}

export interface TargetLayout {
  index: number;
  bearing: number;
  distance: number;
  pos: [number, number];
  asset?: string;
  label?: string;
  iconBox: Box;
  box: Box;
}

export interface ScaleBarLayout {
  km: number;
  px: number;
  line: [[number, number], [number, number]];
  leftTick: [[number, number], [number, number]];
  rightTick: [[number, number], [number, number]];
  leftText: string;
  leftTextPos: [number, number];
  rightText: string;
  rightTextPos: [number, number];
  box: Box;
}

export interface DirectionLayoutResult {
  mode: DirectionMode;
  cx: number;
  cy: number;
  radius: number;
  pointer: number;
  showPointer: boolean;
  pointerTip: [number, number];
  labels: DirectionLabels;
  // compass
  compassCircle?: { cx: number; cy: number; r: number };
  compassArrows?: CompassArrowLayout[];
  dirLabels: CompassDirLabelLayout[];
  // clock
  clockTicks?: ClockTickLayout[];
  clockNumbers?: ClockNumberLayout[];
  // bearing
  bearingCross?: {
    ns: [[number, number], [number, number]];
    ew: [[number, number], [number, number]];
  };
  bearingArc?: {
    r: number;
    bearing: number;
    start: number;
    end: number;
    sweep: number;
    path: string;
    text: string;
    textPos: [number, number];
  };
  // targets
  targets: TargetLayout[];
  // scaleBar
  scaleBar?: ScaleBarLayout;
  bbox: Box;
}

/** 布局纯函数：计算所有几何要素、子项包围盒及整体 bbox */
export function directionLayout(p: Props): DirectionLayoutResult {
  const [cx, cy] = pt(p.at, [400, 225]);
  const radius = Math.max(10, num(p.radius, 140));
  const rawMode = str(p.mode, 'compass');
  const mode: DirectionMode =
    rawMode === 'clock' || rawMode === 'bearing' ? rawMode : 'compass';
  const pointer = num(p.pointer, 0);
  const showPointer = p.showPointer !== false;

  const labels = labelsOf(p);

  const pointerLen = radius * 0.85;
  const pointerTip = directionPoint(cx, cy, pointerLen, pointer);

  let compassCircle: { cx: number; cy: number; r: number } | undefined;
  let compassArrows: CompassArrowLayout[] | undefined;
  const dirLabels: CompassDirLabelLayout[] = [];
  let clockTicks: ClockTickLayout[] | undefined;
  let clockNumbers: ClockNumberLayout[] | undefined;
  let bearingCross: DirectionLayoutResult['bearingCross'];
  let bearingArc: DirectionLayoutResult['bearingArc'];

  const boxesToMerge: Box[] = [];

  if (mode === 'compass') {
    compassCircle = { cx, cy, r: radius };
    compassArrows = [];
    boxesToMerge.push(boxAround(cx, cy, radius * 2, radius * 2));

    const majorLen = radius;
    const minorLen = radius * 0.68;
    const majorBase = 10;
    const minorBase = 7;

    for (const d of COMPASS_DIRS) {
      const isMajor = d.isMajor;
      const len = isMajor ? majorLen : minorLen;
      const baseW = isMajor ? majorBase : minorBase;
      const tip = directionPoint(cx, cy, len, d.deg);

      const rad = (d.deg * Math.PI) / 180;
      const perpX = -Math.cos(rad);
      const perpY = -Math.sin(rad);

      const pLeft: [number, number] = [cx + perpX * baseW, cy + perpY * baseW];
      const pRight: [number, number] = [cx - perpX * baseW, cy - perpY * baseW];

      const path = `M ${cx} ${cy} L ${pLeft[0]} ${pLeft[1]} L ${tip[0]} ${tip[1]} L ${pRight[0]} ${pRight[1]} Z`;

      compassArrows.push({
        key: d.key,
        deg: d.deg,
        isMajor,
        colorKey: d.colorKey,
        tip,
        path,
      });

      const labelDist = radius + COMPASS_LABEL_GAP;
      const pos = directionPoint(cx, cy, labelDist, d.deg);
      const text = labels[d.key] ?? d.key;
      const w = Math.max(COMPASS_LABEL_SIZE, textWidth(text, COMPASS_LABEL_SIZE));
      const h = COMPASS_LABEL_SIZE;
      const labelBox = boxAround(pos[0], pos[1], w + 8, h + 8);

      dirLabels.push({
        key: d.key,
        text,
        deg: d.deg,
        pos,
        isMajor,
        colorKey: d.colorKey,
        box: labelBox,
      });

      boxesToMerge.push(labelBox);
    }
  } else if (mode === 'clock') {
    compassCircle = { cx, cy, r: radius };
    clockTicks = [];
    clockNumbers = [];
    boxesToMerge.push(boxAround(cx, cy, radius * 2, radius * 2));

    for (let h = 1; h <= 12; h++) {
      const deg = h * 30;
      const isMajor = h % 3 === 0;
      const tickLen = isMajor ? 12 : 8;

      const outer = directionPoint(cx, cy, radius, deg);
      const inner = directionPoint(cx, cy, radius - tickLen, deg);
      clockTicks.push({ hour: h, deg, outer, inner, isMajor });

      const numDist = radius - 24;
      const numPos = directionPoint(cx, cy, numDist, deg);
      const numBox = boxAround(numPos[0], numPos[1], 28, 28);

      clockNumbers.push({
        hour: h,
        deg,
        pos: numPos,
        box: numBox,
      });
      boxesToMerge.push(numBox);
    }
  } else if (mode === 'bearing') {
    const crossLen = radius;
    bearingCross = {
      ns: [
        directionPoint(cx, cy, crossLen, 0),
        directionPoint(cx, cy, crossLen, 180),
      ],
      ew: [
        directionPoint(cx, cy, crossLen, 270),
        directionPoint(cx, cy, crossLen, 90),
      ],
    };
    boxesToMerge.push(boxAround(cx, cy, crossLen * 2, crossLen * 2));

    const mainDirs = [
      { key: 'N', deg: 0, colorKey: 'red' as const },
      { key: 'E', deg: 90, colorKey: 'ink' as const },
      { key: 'S', deg: 180, colorKey: 'ink' as const },
      { key: 'W', deg: 270, colorKey: 'ink' as const },
    ] as const;

    for (const d of mainDirs) {
      const pos = directionPoint(cx, cy, radius + COMPASS_LABEL_GAP, d.deg);
      const text = labels[d.key] ?? d.key;
      const w = Math.max(COMPASS_LABEL_SIZE, textWidth(text, COMPASS_LABEL_SIZE));
      const h = COMPASS_LABEL_SIZE;
      const labelBox = boxAround(pos[0], pos[1], w + 8, h + 8);
      dirLabels.push({
        key: d.key,
        text,
        deg: d.deg,
        pos,
        isMajor: true,
        colorKey: d.colorKey,
        box: labelBox,
      });
      boxesToMerge.push(labelBox);
    }

    const bVal = typeof p.bearing === 'number' && Number.isFinite(p.bearing) ? p.bearing : undefined;
    if (bVal !== undefined && bVal !== 0) {
      const arcR = Math.min(50, Math.max(25, radius * 0.35));
      const sweep = bVal > 0 ? 1 : 0;
      const fromPt = directionPoint(cx, cy, arcR, 0);
      const toPt = directionPoint(cx, cy, arcR, bVal);
      const largeArc = Math.abs(bVal) > 180 ? 1 : 0;
      const path = `M ${fromPt[0]} ${fromPt[1]} A ${arcR} ${arcR} 0 ${largeArc} ${sweep} ${toPt[0]} ${toPt[1]}`;

      const midDeg = bVal / 2;
      const textPos = directionPoint(cx, cy, arcR + 16, midDeg);
      const degText = `${Math.round(Math.abs(bVal) * 10) / 10}°`;

      bearingArc = {
        r: arcR,
        bearing: bVal,
        start: 0,
        end: bVal,
        sweep,
        path,
        text: degText,
        textPos,
      };
      boxesToMerge.push(boxAround(textPos[0], textPos[1], 40, 24));
    }
  }

  // targets
  const rawTargets = Array.isArray(p.targets) ? p.targets : [];
  const targets: TargetLayout[] = [];

  rawTargets.forEach((t, i) => {
    if (!t || typeof t !== 'object') return;
    const item = t as DirectionTarget;
    const bearing = num(item.bearing, 0);
    const distance = Math.max(0, num(item.distance, 0));
    const pos = directionPoint(cx, cy, distance, bearing);
    const asset = typeof item.asset === 'string' && item.asset ? item.asset : undefined;
    const label = typeof item.label === 'string' && item.label ? item.label : undefined;

    const iconBox = boxAround(pos[0], pos[1], TARGET_ICON_SIZE, TARGET_ICON_SIZE);
    let targetBox = iconBox;

    if (label) {
      const lw = textWidth(label, 18);
      const totalW = Math.max(TARGET_ICON_SIZE, lw) + 8;
      const totalH = TARGET_ICON_SIZE + 24 + 4;
      targetBox = {
        x: pos[0] - totalW / 2,
        y: pos[1] - TARGET_ICON_SIZE / 2,
        w: totalW,
        h: totalH,
      };
    }

    targets.push({
      index: i + 1,
      bearing,
      distance,
      pos,
      asset,
      label,
      iconBox,
      box: targetBox,
    });
    boxesToMerge.push(targetBox);
  });

  // scaleBar
  let scaleBar: ScaleBarLayout | undefined;
  if (p.scaleBar && typeof p.scaleBar === 'object') {
    const sb = p.scaleBar as DirectionScaleBar;
    const km = num(sb.km, 0);
    const barPx = Math.max(10, num(sb.px, 60));

    const barX = cx - radius;
    const barY = cy + radius + 20;

    const line: [[number, number], [number, number]] = [
      [barX, barY],
      [barX + barPx, barY],
    ];
    const leftTick: [[number, number], [number, number]] = [
      [barX, barY - 4],
      [barX, barY + 4],
    ];
    const rightTick: [[number, number], [number, number]] = [
      [barX + barPx, barY - 4],
      [barX + barPx, barY + 4],
    ];

    const kmUnit = labels.km ?? 'km';
    const leftText = '0';
    const rightText = `${km} ${kmUnit}`;

    const leftTextPos: [number, number] = [barX, barY - 8];
    const rightTextPos: [number, number] = [barX + barPx, barY - 8];

    const barBox: Box = {
      x: barX - 12,
      y: barY - 24,
      w: barPx + 40,
      h: 36,
    };

    scaleBar = {
      km,
      px: barPx,
      line,
      leftTick,
      rightTick,
      leftText,
      leftTextPos,
      rightText,
      rightTextPos,
      box: barBox,
    };
    boxesToMerge.push(barBox);
  }

  // 计算最终总体 bbox
  let minX = cx - radius;
  let maxX = cx + radius;
  let minY = cy - radius;
  let maxY = cy + radius;

  for (const b of boxesToMerge) {
    if (b.x < minX) minX = b.x;
    if (b.x + b.w > maxX) maxX = b.x + b.w;
    if (b.y < minY) minY = b.y;
    if (b.y + b.h > maxY) maxY = b.y + b.h;
  }

  const pad = 10;
  const bbox: Box = {
    x: minX - pad,
    y: minY - pad,
    w: maxX - minX + pad * 2,
    h: maxY - minY + pad * 2,
  };

  return {
    mode,
    cx,
    cy,
    radius,
    pointer,
    showPointer,
    pointerTip,
    labels,
    compassCircle,
    compassArrows,
    dirLabels,
    clockTicks,
    clockNumbers,
    bearingCross,
    bearingArc,
    targets,
    scaleBar,
    bbox,
  };
}

export const directionPart: PartDef = {
  type: 'direction',
  name: '方向标 / 方位图',
  anchor: 'center',
  props: [
    'mode',
    'radius',
    'pointer',
    'showPointer',
    'bearing',
    'targets',
    'scaleBar',
    'labels',
  ],
  bbox(p) {
    return directionLayout(p).bbox;
  },
  handles(p): Handle[] {
    const layout = directionLayout(p);
    if (!layout.showPointer) return [];

    return [
      {
        prop: 'pointer',
        at: layout.pointerTip,
        kind: 'rotate',
        center: [layout.cx, layout.cy],
        min: 0,
        max: 360,
        valueAt(pointerPos: Point): number {
          const dx = pointerPos[0] - layout.cx;
          const dy = pointerPos[1] - layout.cy;
          if (dx === 0 && dy === 0) return layout.pointer;
          let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
          if (deg < 0) deg += 360;
          return deg;
        },
      },
    ];
  },
  subitems(p): Subitem[] {
    const layout = directionLayout(p);
    const res: Subitem[] = [];

    // 方向文字子项
    for (const d of layout.dirLabels) {
      res.push({
        name: `dir.${d.key}`,
        box: d.box,
        label: d.text,
      });
    }

    // clock 模式数字子项
    if (layout.mode === 'clock' && layout.clockNumbers) {
      const oClockUnit = layout.labels.oClock ?? '';
      for (const cn of layout.clockNumbers) {
        res.push({
          name: `dir.${cn.hour}`,
          box: cn.box,
          label: `${cn.hour}${oClockUnit}`,
          value: cn.hour,
        });
      }
    }

    // target 子项
    const targetPrefix = layout.labels.target ?? 'target';
    for (const t of layout.targets) {
      res.push({
        name: `target.${t.index}`,
        box: t.box,
        label: t.label ?? `${targetPrefix} ${t.index}`,
        value: t.distance,
      });
    }

    return res;
  },
  Render({ p, ctx }) {
    const L = directionLayout(p);
    const lineColor = color('line', ctx.theme);
    const inkColor = color('ink', ctx.theme);
    const dimColor = color('dim', ctx.theme);
    const redColor = color('red', ctx.theme);
    const accentColor = color('accent', ctx.theme);
    const whiteColor = color('white', ctx.theme);
    const labelBgColor = color('labelBg', ctx.theme);

    return (
      <g className="direction-part" style={{ pointerEvents: 'none' }}>
        {/* 外圈圆（compass / clock 模式） */}
        {L.compassCircle && (
          <circle
            cx={L.compassCircle.cx}
            cy={L.compassCircle.cy}
            r={L.compassCircle.r}
            fill="none"
            stroke={lineColor}
            strokeWidth={1.5}
          />
        )}

        {/* compass 模式：八方向箭头 */}
        {L.compassArrows && (
          <g className="compass-arrows">
            {L.compassArrows.map((arrow) => {
              const fillColor = arrow.colorKey === 'red' ? redColor : inkColor;
              return (
                <path
                  key={arrow.key}
                  d={arrow.path}
                  fill={fillColor}
                  opacity={arrow.isMajor ? 0.9 : 0.65}
                />
              );
            })}
          </g>
        )}

        {/* compass / bearing 模式：方向文字 */}
        {L.dirLabels.length > 0 && (
          <g className="compass-dir-labels">
            {L.dirLabels.map((lbl) => {
              const textColor = lbl.colorKey === 'red' ? redColor : inkColor;
              return (
                <text
                  key={lbl.key}
                  x={lbl.pos[0]}
                  y={lbl.pos[1]}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={COMPASS_LABEL_SIZE}
                  fontWeight={lbl.isMajor ? 'bold' : 'normal'}
                  fill={textColor}
                  style={{ userSelect: 'none' }}
                >
                  {lbl.text}
                </text>
              );
            })}
          </g>
        )}

        {/* clock 模式：刻度线与数字 */}
        {L.clockTicks && (
          <g className="clock-ticks">
            {L.clockTicks.map((tick) => (
              <line
                key={`tick-${tick.hour}`}
                x1={tick.outer[0]}
                y1={tick.outer[1]}
                x2={tick.inner[0]}
                y2={tick.inner[1]}
                stroke={tick.isMajor ? inkColor : dimColor}
                strokeWidth={tick.isMajor ? 2.5 : 1.5}
                strokeLinecap="round"
              />
            ))}
          </g>
        )}
        {L.clockNumbers && (
          <g className="clock-numbers">
            {L.clockNumbers.map((numItem) => (
              <text
                key={`num-${numItem.hour}`}
                x={numItem.pos[0]}
                y={numItem.pos[1]}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={CLOCK_NUM_SIZE}
                fontWeight="500"
                fill={inkColor}
                style={{ userSelect: 'none' }}
              >
                {numItem.hour}
              </text>
            ))}
          </g>
        )}
        {L.mode === 'clock' && (
          <g className="clock-center-me">
            {(() => {
              const kidUrl = ctx.assetUrl?.('kid');
              if (kidUrl) {
                return (
                  <image
                    href={kidUrl}
                    x={L.cx - 20}
                    y={L.cy - 20}
                    width={40}
                    height={40}
                  />
                );
              }
              const meText = L.labels.me ?? '';
              return (
                <g>
                  <circle cx={L.cx} cy={L.cy} r={12} fill={accentColor} />
                  {meText ? (
                    <text
                      x={L.cx}
                      y={L.cy}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={12}
                      fill={whiteColor}
                      fontWeight="bold"
                    >
                      {meText}
                    </text>
                  ) : null}
                </g>
              );
            })()}
          </g>
        )}

        {/* bearing 模式：十字标线与角弧 */}
        {L.bearingCross && (
          <g className="bearing-cross">
            <line
              x1={L.bearingCross.ns[0][0]}
              y1={L.bearingCross.ns[0][1]}
              x2={L.bearingCross.ns[1][0]}
              y2={L.bearingCross.ns[1][1]}
              stroke={lineColor}
              strokeWidth={1.5}
            />
            <line
              x1={L.bearingCross.ew[0][0]}
              y1={L.bearingCross.ew[0][1]}
              x2={L.bearingCross.ew[1][0]}
              y2={L.bearingCross.ew[1][1]}
              stroke={lineColor}
              strokeWidth={1.5}
            />
          </g>
        )}
        {L.bearingArc && (
          <g className="bearing-arc">
            <path
              d={L.bearingArc.path}
              fill="none"
              stroke={accentColor}
              strokeWidth={2}
            />
            <text
              x={L.bearingArc.textPos[0]}
              y={L.bearingArc.textPos[1]}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={18}
              fontWeight="bold"
              fill={accentColor}
            >
              {L.bearingArc.text}
            </text>
          </g>
        )}

        {/* targets：引线、素材图标与标签 */}
        {L.targets.length > 0 && (
          <g className="direction-targets">
            {L.targets.map((tgt) => {
              const url = tgt.asset ? ctx.assetUrl?.(tgt.asset) : undefined;
              return (
                <g key={`target-${tgt.index}`} className="target-item">
                  {/* 中心到目标的辅助虚线 */}
                  <line
                    x1={L.cx}
                    y1={L.cy}
                    x2={tgt.pos[0]}
                    y2={tgt.pos[1]}
                    stroke={lineColor}
                    strokeWidth={1}
                    strokeDasharray="4 3"
                    opacity={0.7}
                  />
                  {/* 素材图标 */}
                  {url ? (
                    <image
                      href={url}
                      x={tgt.pos[0] - TARGET_ICON_SIZE / 2}
                      y={tgt.pos[1] - TARGET_ICON_SIZE / 2}
                      width={TARGET_ICON_SIZE}
                      height={TARGET_ICON_SIZE}
                    />
                  ) : (
                    <g>
                      <rect
                        x={tgt.pos[0] - TARGET_ICON_SIZE / 2}
                        y={tgt.pos[1] - TARGET_ICON_SIZE / 2}
                        width={TARGET_ICON_SIZE}
                        height={TARGET_ICON_SIZE}
                        rx={8}
                        fill={labelBgColor}
                        stroke={lineColor}
                        strokeWidth={1.5}
                      />
                      <circle cx={tgt.pos[0]} cy={tgt.pos[1] - 4} r={10} fill={accentColor} />
                      <circle cx={tgt.pos[0]} cy={tgt.pos[1] - 4} r={4} fill={whiteColor} />
                    </g>
                  )}
                  {/* 目标文字标签 */}
                  {tgt.label && (
                    <text
                      x={tgt.pos[0]}
                      y={tgt.pos[1] + TARGET_ICON_SIZE / 2 + 14}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={18}
                      fontWeight="500"
                      fill={inkColor}
                      style={{ userSelect: 'none' }}
                    >
                      {tgt.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        )}

        {/* scaleBar：线段比例尺 */}
        {L.scaleBar && (
          <g className="direction-scale-bar">
            {/* 主横线 */}
            <line
              x1={L.scaleBar.line[0][0]}
              y1={L.scaleBar.line[0][1]}
              x2={L.scaleBar.line[1][0]}
              y2={L.scaleBar.line[1][1]}
              stroke={inkColor}
              strokeWidth={2}
            />
            {/* 左端短竖线 */}
            <line
              x1={L.scaleBar.leftTick[0][0]}
              y1={L.scaleBar.leftTick[0][1]}
              x2={L.scaleBar.leftTick[1][0]}
              y2={L.scaleBar.leftTick[1][1]}
              stroke={inkColor}
              strokeWidth={2}
            />
            {/* 右端短竖线 */}
            <line
              x1={L.scaleBar.rightTick[0][0]}
              y1={L.scaleBar.rightTick[0][1]}
              x2={L.scaleBar.rightTick[1][0]}
              y2={L.scaleBar.rightTick[1][1]}
              stroke={inkColor}
              strokeWidth={2}
            />
            {/* 刻度文字 */}
            <text
              x={L.scaleBar.leftTextPos[0]}
              y={L.scaleBar.leftTextPos[1]}
              textAnchor="start"
              dominantBaseline="auto"
              fontSize={14}
              fill={inkColor}
              style={{ userSelect: 'none' }}
            >
              {L.scaleBar.leftText}
            </text>
            <text
              x={L.scaleBar.rightTextPos[0]}
              y={L.scaleBar.rightTextPos[1]}
              textAnchor="end"
              dominantBaseline="auto"
              fontSize={14}
              fill={inkColor}
              style={{ userSelect: 'none' }}
            >
              {L.scaleBar.rightText}
            </text>
          </g>
        )}

        {/* pointer 旋转指针 */}
        {L.showPointer && (
          <g className="direction-pointer">
            {(() => {
              const rad = (L.pointer * Math.PI) / 180;
              const perpX = -Math.cos(rad);
              const perpY = -Math.sin(rad);

              const pTip = L.pointerTip;
              const halfBase = 5;
              const tailLen = 16;
              const tailTip: [number, number] = [
                L.cx - Math.sin(rad) * tailLen,
                L.cy + Math.cos(rad) * tailLen,
              ];

              const pLeft: [number, number] = [L.cx + perpX * halfBase, L.cy + perpY * halfBase];
              const pRight: [number, number] = [L.cx - perpX * halfBase, L.cy - perpY * halfBase];

              const pointerPath = `M ${tailTip[0]} ${tailTip[1]} L ${pLeft[0]} ${pLeft[1]} L ${pTip[0]} ${pTip[1]} L ${pRight[0]} ${pRight[1]} Z`;

              return (
                <g>
                  {/* 指针主体（磁针造型，带微阴影与高亮） */}
                  <path
                    d={pointerPath}
                    fill={redColor}
                    stroke={inkColor}
                    strokeWidth={1}
                  />
                  {/* 中心轴圆 */}
                  <circle
                    cx={L.cx}
                    cy={L.cy}
                    r={6}
                    fill={inkColor}
                    stroke={whiteColor}
                    strokeWidth={1.5}
                  />
                </g>
              );
            })()}
          </g>
        )}
      </g>
    );
  },
};
