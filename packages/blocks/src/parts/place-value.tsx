// 计数器 / 数位表：读数写数、数的组成、大数分级、小数数位、小数点移动。
import {
  color,
  mixColor,
  num,
  pt,
  str,
  textWidth,
  type Box,
  type PartDef,
  type Point,
  type Props,
  type Subitem,
} from '../base';
import { sceneStyle } from '../style';
import { BlankBox } from './mark';

export const PLACE_VALUE_STYLES = ['abacus', 'chart'] as const;
export type PlaceValueStyleKind = (typeof PLACE_VALUE_STYLES)[number];

export interface PlaceValueLabels {
  places?: string[];
  decimals?: string[];
  groups?: string[];
  point?: string;
}

export interface BeadInfo {
  x: number;
  y: number;
  rx: number;
  ry: number;
  opacity: number;
  falling?: boolean;
}

export interface PlaceColumn {
  key: string;
  power: number;
  digit: number;
  label: string;
  groupName?: string;
  x: number;
  box: Box;
  beads: BeadInfo[];
}

export interface GroupHeader {
  name: string;
  startCol: number;
  endCol: number;
  box: Box;
}

export interface PlaceValueLayout {
  at: Point;
  places: number;
  decimals: number;
  style: PlaceValueStyleKind;
  groups: boolean;
  showDigits: boolean;
  blank: string[];
  value: number;
  color: string;
  columns: PlaceColumn[];
  baseBox?: Box;
  point?: {
    x: number;
    y: number;
    box: Box;
    label: string;
  };
  groupHeaders: GroupHeader[];
  box: Box;
}

const COL_STEP = 70;
const BASE_H = 24;
const ROD_H = 260;
const BEAD_H = 20;
const BEAD_RX = 22;
const BEAD_RY = 10;
const CHART_CELL_H = 50;
const CHART_GROUP_H = 40;

function labelsOf(p: Props): PlaceValueLabels {
  let defaults: PlaceValueLabels = {};
  try {
    defaults = (sceneStyle().parts['place-value']?.labels as PlaceValueLabels | undefined) ?? {};
  } catch {
    // sceneStyle 未注入时的保底
  }
  const custom = (p.labels && typeof p.labels === 'object' ? p.labels : {}) as PlaceValueLabels;
  return {
    places: Array.isArray(custom.places)
      ? custom.places
      : Array.isArray(defaults.places)
        ? defaults.places
        : [],
    decimals: Array.isArray(custom.decimals)
      ? custom.decimals
      : Array.isArray(defaults.decimals)
        ? defaults.decimals
        : [],
    groups: Array.isArray(custom.groups)
      ? custom.groups
      : Array.isArray(defaults.groups)
        ? defaults.groups
        : [],
    point: custom.point ?? defaults.point,
  };
}

function styleOf(p: Props): PlaceValueStyleKind {
  const s = str(p.style, 'abacus');
  return s === 'chart' ? 'chart' : 'abacus';
}

/** 计数器与数位表的纯函数布局计算 */
export function placeValueLayout(p: Props): PlaceValueLayout {
  const at = pt(p.at, [400, 225]);
  const [cx, cy] = at;
  const places = Math.max(0, Math.round(num(p.places, 2)));
  const decimals = Math.max(0, Math.round(num(p.decimals, 0)));
  const style = styleOf(p);
  const groups = Boolean(p.groups);
  const showDigits = p.showDigits !== false;
  const rawValue = num(p.value, 0);
  const colorName = str(p.color, 'blue');
  const blank = Array.isArray(p.blank) ? p.blank.map(String) : [];
  const labels = labelsOf(p);

  const totalCols = places + 1 + decimals;
  const totalW = totalCols * COL_STEP;
  const leftX = cx - totalW / 2;

  // 1. 各列数位与数值计算
  // 从最高整数位 places 递减到 0，再从 -1 递减到 -decimals
  const powers: number[] = [];
  for (let k = places; k >= 0; k--) powers.push(k);
  for (let k = -1; k >= -decimals; k--) powers.push(k);

  const V = rawValue * Math.pow(10, decimals);
  const scaled = Math.round(V);
  const floorV = Math.floor(V);
  const frac = V - floorV;
  const isSteady = Math.abs(frac) < 1e-4 || Math.abs(frac - 1) < 1e-4;

  // 2. 纵向尺寸与几何参考
  let rodTopY = 0;
  let baseTopY = 0;
  let baseBox: Box | undefined;
  let layoutBox: Box;

  if (style === 'abacus') {
    const groupAboveH = groups ? 36 : 0;
    const belowBaseH = showDigits ? 68 : 34;
    const totalH = groupAboveH + ROD_H + BASE_H + belowBaseH;
    const topY = cy - totalH / 2;
    rodTopY = topY + groupAboveH;
    baseTopY = rodTopY + ROD_H;
    baseBox = { x: leftX, y: baseTopY, w: totalW, h: BASE_H };
    layoutBox = { x: leftX, y: topY, w: totalW, h: totalH };
  } else {
    const groupH = groups ? CHART_GROUP_H : 0;
    const totalH = groupH + CHART_CELL_H * 2;
    layoutBox = { x: leftX, y: cy - totalH / 2, w: totalW, h: totalH };
  }

  // 3. 构建各列数据
  const isCarry = !isSteady && floorV % 10 === 9;

  const columns: PlaceColumn[] = powers.map((power, colIdx) => {
    const key = `d${power}`;
    const pwrInScaled = power + decimals;
    const digit = Math.floor(Math.abs(scaled) / Math.pow(10, pwrInScaled)) % 10;
    const colX = leftX + (colIdx + 0.5) * COL_STEP;

    const label =
      power >= 0
        ? (labels.places?.[power] ?? key)
        : (labels.decimals?.[-power - 1] ?? key);

    let groupName: string | undefined;
    if (power >= 0) {
      const gIdx = Math.floor(power / 4);
      groupName = labels.groups?.[gIdx];
    }

    const colBox: Box = {
      x: leftX + colIdx * COL_STEP,
      y: layoutBox.y,
      w: COL_STEP,
      h: layoutBox.h,
    };

    // 珠子排列（仅 abacus）
    const beads: BeadInfo[] = [];
    if (style === 'abacus') {
      if (isSteady) {
        for (let j = 0; j < digit; j++) {
          const beadY = baseTopY - (j * BEAD_H + BEAD_RY);
          beads.push({
            x: colX,
            y: beadY,
            rx: BEAD_RX,
            ry: BEAD_RY,
            opacity: 1,
            falling: false,
          });
        }
      } else if (isCarry) {
        // 9 -> 10 进位过程
        if (pwrInScaled === 0) {
          // 当前位（个位）：10 颗珠子并拢、淡出
          const shrinkStep = BEAD_H * (1 - 0.25 * frac);
          const opacity = Math.max(0, 1 - frac);
          for (let j = 0; j < 10; j++) {
            const beadY = baseTopY - (j * shrinkStep + shrinkStep / 2);
            beads.push({
              x: colX,
              y: beadY,
              rx: BEAD_RX,
              ry: BEAD_RY,
              opacity,
              falling: false,
            });
          }
        } else if (pwrInScaled === 1) {
          // 高一位（十位）：十位落下 1 颗
          const baseDigit = Math.floor(floorV / 10) % 10;
          for (let j = 0; j < baseDigit; j++) {
            beads.push({
              x: colX,
              y: baseTopY - (j * BEAD_H + BEAD_RY),
              rx: BEAD_RX,
              ry: BEAD_RY,
              opacity: 1,
              falling: false,
            });
          }
          const restY = baseTopY - (baseDigit * BEAD_H + BEAD_RY);
          const fallY = rodTopY + frac * (restY - rodTopY);
          beads.push({
            x: colX,
            y: fallY,
            rx: BEAD_RX,
            ry: BEAD_RY,
            opacity: 1,
            falling: true,
          });
        } else {
          for (let j = 0; j < digit; j++) {
            beads.push({
              x: colX,
              y: baseTopY - (j * BEAD_H + BEAD_RY),
              rx: BEAD_RX,
              ry: BEAD_RY,
              opacity: 1,
              falling: false,
            });
          }
        }
      } else {
        // 普通连续递增过程（个位单颗珠子从杆顶落下）
        if (pwrInScaled === 0) {
          const baseDigit = floorV % 10;
          for (let j = 0; j < baseDigit; j++) {
            beads.push({
              x: colX,
              y: baseTopY - (j * BEAD_H + BEAD_RY),
              rx: BEAD_RX,
              ry: BEAD_RY,
              opacity: 1,
              falling: false,
            });
          }
          const progress = Math.min(1, frac / 0.2);
          const restY = baseTopY - (baseDigit * BEAD_H + BEAD_RY);
          const fallY = rodTopY + progress * (restY - rodTopY);
          beads.push({
            x: colX,
            y: fallY,
            rx: BEAD_RX,
            ry: BEAD_RY,
            opacity: Math.min(1, frac / 0.05),
            falling: progress < 1,
          });
        } else {
          for (let j = 0; j < digit; j++) {
            beads.push({
              x: colX,
              y: baseTopY - (j * BEAD_H + BEAD_RY),
              rx: BEAD_RX,
              ry: BEAD_RY,
              opacity: 1,
              falling: false,
            });
          }
        }
      }
    }

    return {
      key,
      power,
      digit,
      label,
      groupName,
      x: colX,
      box: colBox,
      beads,
    };
  });

  // 4. 小数点（个位与十分位之间）
  let point: PlaceValueLayout['point'];
  if (decimals > 0) {
    const d0Col = columns.find((c) => c.power === 0);
    const dNeg1Col = columns.find((c) => c.power === -1);
    if (d0Col && dNeg1Col) {
      const ptX = (d0Col.x + dNeg1Col.x) / 2;
      const ptY =
        style === 'abacus'
          ? baseTopY + BASE_H / 2
          : layoutBox.y + (groups ? CHART_GROUP_H : 0) + CHART_CELL_H + CHART_CELL_H / 2;
      point = {
        x: ptX,
        y: ptY,
        box: { x: ptX - 20, y: ptY - 20, w: 40, h: 40 },
        label: labels.point ?? 'point',
      };
    }
  }

  // 5. 分级表头（个级、万级、亿级）
  const groupHeaders: GroupHeader[] = [];
  if (groups) {
    const periodMap = new Map<number, { start: number; end: number; name: string }>();
    columns.forEach((col, idx) => {
      if (col.power >= 0) {
        const pIdx = Math.floor(col.power / 4);
        const name = labels.groups?.[pIdx] ?? `g${pIdx}`;
        if (!periodMap.has(pIdx)) {
          periodMap.set(pIdx, { start: idx, end: idx, name });
        } else {
          const entry = periodMap.get(pIdx)!;
          entry.end = Math.max(entry.end, idx);
          entry.start = Math.min(entry.start, idx);
        }
      }
    });

    for (const [, val] of periodMap.entries()) {
      const sX = leftX + val.start * COL_STEP;
      const spanCols = val.end - val.start + 1;
      const gW = spanCols * COL_STEP;
      const gH = style === 'abacus' ? 30 : CHART_GROUP_H;
      const gY = layoutBox.y;
      groupHeaders.push({
        name: val.name,
        startCol: val.start,
        endCol: val.end,
        box: { x: sX, y: gY, w: gW, h: gH },
      });
    }
  }

  return {
    at,
    places,
    decimals,
    style,
    groups,
    showDigits,
    blank,
    value: rawValue,
    color: colorName,
    columns,
    baseBox,
    point,
    groupHeaders,
    box: layoutBox,
  };
}

export const placeValuePart: PartDef = {
  type: 'place-value',
  name: '计数器',
  anchor: 'center',
  required: [],
  props: [
    'value',
    'places',
    'decimals',
    'style',
    'groups',
    'showDigits',
    'blank',
    'labels',
    'color',
  ],
  bbox(p) {
    return placeValueLayout(p).box;
  },
  subitems(p) {
    const layout = placeValueLayout(p);
    const subs: Subitem[] = layout.columns.map((col) => ({
      name: col.key,
      box: col.box,
      label: col.label,
      value: col.digit,
    }));
    if (layout.point) {
      subs.push({
        name: 'point',
        box: layout.point.box,
        label: layout.point.label,
      });
    }
    return subs;
  },
  Render({ p, ctx }) {
    const layout = placeValueLayout(p);
    const { darken, width: bw } = sceneStyle().counterBorder;
    const darkest = color('black', ctx.theme);
    const altColorName = layout.color === 'orange' ? 'blue' : 'orange';
    const blankSet = new Set(layout.blank);

    if (layout.style === 'abacus') {
      const base = layout.baseBox!;
      const groupAboveH = layout.groups ? 36 : 0;
      const rodTopY = layout.box.y + groupAboveH;
      const baseTopY = base.y;
      const baseBottomY = base.y + base.h;
      const digitY = baseBottomY + 28;
      const labelY = layout.showDigits ? baseBottomY + 56 : baseBottomY + 24;

      return (
        <g>
          {/* 分级表头与粗分隔线 */}
          {layout.groups && (
            <g>
              {layout.groupHeaders.map((gh, idx) => (
                <text
                  key={`gh-${idx}`}
                  x={gh.box.x + gh.box.w / 2}
                  y={gh.box.y + 18}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={20}
                  fontWeight="bold"
                  fill={color('dim', ctx.theme)}
                >
                  {gh.name}
                </text>
              ))}
              {layout.columns.map((col, idx) => {
                if (col.power > 0 && col.power % 4 === 0 && idx > 0) {
                  const divX = layout.box.x + idx * COL_STEP;
                  return (
                    <line
                      key={`gdiv-${idx}`}
                      x1={divX}
                      y1={rodTopY - 14}
                      x2={divX}
                      y2={baseBottomY}
                      stroke={color('dim', ctx.theme)}
                      strokeWidth={3}
                      strokeDasharray="8 6"
                    />
                  );
                }
                return null;
              })}
            </g>
          )}

          {/* 竖杆 */}
          {layout.columns.map((col) => (
            <line
              key={`rod-${col.key}`}
              x1={col.x}
              y1={rodTopY}
              x2={col.x}
              y2={baseTopY}
              stroke={color('dim', ctx.theme)}
              strokeWidth={4}
              strokeLinecap="round"
            />
          ))}

          {/* 珠子 */}
          {layout.columns.map((col) => {
            const isEven = Math.abs(col.power) % 2 === 0;
            const cName = isEven ? layout.color : altColorName;
            const fillColor = color(cName, ctx.theme);
            const strokeColor = mixColor(fillColor, darkest, darken);

            return (
              <g key={`beads-${col.key}`}>
                {col.beads.map((bead, bIdx) => (
                  <ellipse
                    key={`b-${col.key}-${bIdx}`}
                    cx={bead.x}
                    cy={bead.y}
                    rx={bead.rx}
                    ry={bead.ry}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={bw}
                    opacity={bead.opacity}
                  />
                ))}
              </g>
            );
          })}

          {/* 底座 */}
          <rect
            x={base.x}
            y={base.y}
            width={base.w}
            height={base.h}
            rx={6}
            fill={color('labelBg', ctx.theme)}
            stroke={color('line', ctx.theme)}
            strokeWidth={2}
          />

          {/* 小数点 */}
          {layout.point && (
            <circle
              cx={layout.point.x}
              cy={layout.point.y}
              r={6}
              fill={color('ink', ctx.theme)}
            />
          )}

          {/* 杆下方数字与位名 */}
          {layout.columns.map((col) => {
            const isBlank = blankSet.has(col.key);
            return (
              <g key={`label-group-${col.key}`}>
                {layout.showDigits && (
                  <>
                    {isBlank ? (
                      <BlankBox
                        cx={col.x}
                        cy={digitY}
                        textW={textWidth(String(col.digit), 32)}
                        size={32}
                        stroke={color('accent', ctx.theme)}
                      />
                    ) : (
                      <text
                        x={col.x}
                        y={digitY}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={32}
                        fontWeight="bold"
                        fill={color('ink', ctx.theme)}
                      >
                        {col.digit}
                      </text>
                    )}
                  </>
                )}
                <text
                  x={col.x}
                  y={labelY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={20}
                  fill={color('dim', ctx.theme)}
                >
                  {col.label}
                </text>
              </g>
            );
          })}
        </g>
      );
    }

    // style === 'chart'
    const tableX = layout.box.x;
    const tableY = layout.box.y;
    const tableW = layout.box.w;
    const tableH = layout.box.h;
    const groupH = layout.groups ? CHART_GROUP_H : 0;
    const headerY = tableY + groupH;
    const digitsY = headerY + CHART_CELL_H;

    return (
      <g>
        {/* 表格整体背景 */}
        <rect
          x={tableX}
          y={tableY}
          width={tableW}
          height={tableH}
          rx={6}
          fill={color('labelBg', ctx.theme)}
          stroke={color('line', ctx.theme)}
          strokeWidth={1}
        />

        {/* 级名行（跨列） */}
        {layout.groups &&
          layout.groupHeaders.map((gh, idx) => (
            <g key={`gh-chart-${idx}`}>
              <rect
                x={gh.box.x}
                y={gh.box.y}
                width={gh.box.w}
                height={gh.box.h}
                fill="none"
                stroke={color('line', ctx.theme)}
                strokeWidth={1}
              />
              <text
                x={gh.box.x + gh.box.w / 2}
                y={gh.box.y + gh.box.h / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={20}
                fontWeight="bold"
                fill={color('ink', ctx.theme)}
              >
                {gh.name}
              </text>
            </g>
          ))}

        {/* 位名表头行与数字行 */}
        {layout.columns.map((col, idx) => {
          const colLeft = tableX + idx * COL_STEP;
          const isBlank = blankSet.has(col.key);

          return (
            <g key={`cell-${col.key}`}>
              {/* 位名单元格 */}
              <rect
                x={colLeft}
                y={headerY}
                width={COL_STEP}
                height={CHART_CELL_H}
                fill="none"
                stroke={color('line', ctx.theme)}
                strokeWidth={1}
              />
              <text
                x={col.x}
                y={headerY + CHART_CELL_H / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={20}
                fill={color('dim', ctx.theme)}
              >
                {col.label}
              </text>

              {/* 数字单元格 */}
              <rect
                x={colLeft}
                y={digitsY}
                width={COL_STEP}
                height={CHART_CELL_H}
                fill="none"
                stroke={color('line', ctx.theme)}
                strokeWidth={1}
              />
              {isBlank ? (
                <BlankBox
                  cx={col.x}
                  cy={digitsY + CHART_CELL_H / 2}
                  textW={textWidth(String(col.digit), 36)}
                  size={36}
                  stroke={color('accent', ctx.theme)}
                />
              ) : (
                <text
                  x={col.x}
                  y={digitsY + CHART_CELL_H / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={36}
                  fontWeight="bold"
                  fill={color('ink', ctx.theme)}
                >
                  {col.digit}
                </text>
              )}
            </g>
          );
        })}

        {/* 小数点 */}
        {layout.point && (
          <circle
            cx={layout.point.x}
            cy={layout.point.y}
            r={5}
            fill={color('ink', ctx.theme)}
          />
        )}

        {/* groups 粗线分级分隔线 */}
        {layout.groups &&
          layout.columns.map((col, idx) => {
            if (col.power > 0 && col.power % 4 === 0 && idx > 0) {
              const divX = tableX + idx * COL_STEP;
              return (
                <line
                  key={`cdiv-${idx}`}
                  x1={divX}
                  y1={tableY}
                  x2={divX}
                  y2={tableY + tableH}
                  stroke={color('ink', ctx.theme)}
                  strokeWidth={3}
                />
              );
            }
            return null;
          })}
      </g>
    );
  },
};
