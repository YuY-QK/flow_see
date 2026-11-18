// 统计图零件：象形（picto）、单/复式条形（bar/bar2）、单/复式折线（line/line2）、扇形（pie）、坐标图（xy）。
/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react';
import { formatNumber } from '@flow-see/core';
import {
  boxAround,
  color,
  mixColor,
  num,
  numList,
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

export const CHART_KINDS = ['picto', 'bar', 'bar2', 'line', 'line2', 'pie', 'xy'] as const;
export type ChartKind = (typeof CHART_KINDS)[number];

export interface ChartLabels {
  average?: string;
}

export interface ChartAxisTick {
  value: number;
  text: string;
  x: number;
  y: number;
  box: Box;
}

export interface ChartCategoryLabel {
  index: number;
  text: string;
  x: number;
  y: number;
  box: Box;
}

export interface ChartValueLabel {
  text: string;
  x: number;
  y: number;
  opacity: number;
  box: Box;
}

export interface ChartBarItem {
  name: string;
  series: 1 | 2;
  categoryIndex: number;
  value: number;
  shownValue: number;
  x: number;
  y: number;
  w: number;
  h: number;
  targetY: number;
  targetH: number;
  color: string;
  subBox: Box;
  valueLabel?: ChartValueLabel;
}

export interface ChartPointItem {
  name: string;
  series: 1 | 2;
  index: number;
  xVal: number;
  value: number;
  x: number;
  y: number;
  r: number;
  color: string;
  visible: boolean;
  opacity: number;
  subBox: Box;
  valueLabel?: ChartValueLabel;
}

export interface ChartLineSeries {
  series: 1 | 2;
  color: string;
  points: ChartPointItem[];
  drawnPoints: Point[];
  path: string;
  totalLength: number;
  drawnLength: number;
}

export interface ChartPieSlice {
  index: number;
  name: string;
  category: string;
  value: number;
  percent: number;
  startAngle: number;
  endAngle: number;
  sweepAngle: number;
  drawnStartAngle: number;
  drawnEndAngle: number;
  drawnSweepAngle: number;
  midAngle: number;
  color: string;
  path: string;
  visible: boolean;
  labelText: string;
  labelPos: Point;
  labelAnchor: 'start' | 'middle' | 'end';
  labelVisible: boolean;
  labelOpacity: number;
  outside: boolean;
  leaderLine?: [Point, Point, Point];
  box: Box;
  labelBox: Box;
}

export interface ChartPieLayout {
  cx: number;
  cy: number;
  r: number;
  total: number;
  slices: ChartPieSlice[];
}

export interface ChartPictoIcon {
  slotIndex: number;
  box: Box;
  clipRatio: number;
  clipBox: Box;
  visible: boolean;
  opacity: number;
  icon: string;
  color: string;
}

export interface ChartPictoColumn {
  index: number;
  category: string;
  value: number;
  color: string;
  icon: string;
  icons: ChartPictoIcon[];
  valueLabel?: ChartValueLabel;
}

export interface ChartXYLayout {
  points: ChartPointItem[];
  path: string;
  isSmooth: boolean;
  throughOrigin: boolean;
  color: string;
}

export interface ChartAverageLine {
  value: number;
  y: number;
  x1: number;
  x2: number;
  labelText: string;
  labelX: number;
  labelY: number;
  labelBox: Box;
}

export interface ChartLegendItem {
  series: number;
  text: string;
  color: string;
  kind: 'bar' | 'line';
  x: number;
  y: number;
  box: Box;
}

export interface ChartColumnItem {
  index: number;
  name: string;
  box: Box;
  value?: number;
  label?: string;
}

export interface ChartAxisNameLabel {
  kind: 'x' | 'y';
  text: string;
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
  box: Box;
}

export interface ChartLayout {
  kind: ChartKind;
  at: Point;
  width: number;
  height: number;
  plotBox: Box;
  unit: number;
  max: number;
  xUnit: number;
  xMax: number;
  show: number;
  barRatio: number;
  pointRadius: number;
  labels: ChartLabels;
  categories: string[];
  categoryLabels: ChartCategoryLabel[];
  xAxis?: { x1: number; y1: number; x2: number; y2: number };
  yAxis?: { x1: number; y1: number; x2: number; y2: number };
  gridLinesH: { value: number; y: number; x1: number; x2: number }[];
  gridLinesV: { value: number; x: number; y1: number; y2: number }[];
  yTicks: ChartAxisTick[];
  xTicks: ChartAxisTick[];
  axisNameLabels: ChartAxisNameLabel[];
  bars: ChartBarItem[];
  lineSeries: ChartLineSeries[];
  pie?: ChartPieLayout;
  pictoColumns: ChartPictoColumn[];
  xy?: ChartXYLayout;
  averageLine?: ChartAverageLine;
  legendItems: ChartLegendItem[];
  columns: ChartColumnItem[];
  box: Box;
}

const TICK_FONT_SIZE = 18;
const CATEGORY_FONT_SIZE = 20;
const VALUE_FONT_SIZE = 18;
const LEGEND_FONT_SIZE = 18;
const PIE_FONT_SIZE = 18;

const PREFERRED_PIE_COLORS = [
  'blue',
  'orange',
  'green',
  'purple',
  'red',
  'yellow',
  'pink',
  'brown',
] as const;

function kindOf(v: unknown): ChartKind {
  const s = str(v, 'bar');
  return (CHART_KINDS as readonly string[]).includes(s) ? (s as ChartKind) : 'bar';
}

function chartDefaults(): Record<string, unknown> {
  try {
    return sceneStyle().parts.chart ?? {};
  } catch {
    return {};
  }
}

export function chartLabelsOf(p: Props): ChartLabels {
  const defs = chartDefaults();
  const base =
    defs.labels && typeof defs.labels === 'object' ? (defs.labels as ChartLabels) : {};
  const custom = p.labels && typeof p.labels === 'object' ? (p.labels as ChartLabels) : {};
  return {
    average: '',
    ...base,
    ...custom,
  };
}

/** 12 点方向为 0°、顺时针为正的极坐标转舞台坐标 */
export function piePoint(cx: number, cy: number, r: number, deg: number): Point {
  const rad = (deg * Math.PI) / 180;
  return [cx + Math.sin(rad) * r, cy - Math.cos(rad) * r];
}

function sectorSvgPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const sweep = endDeg - startDeg;
  if (sweep <= 1e-6 || r <= 0) return '';
  if (sweep >= 359.999) {
    const top = piePoint(cx, cy, r, startDeg);
    const mid = piePoint(cx, cy, r, startDeg + 180);
    return `M ${top[0]} ${top[1]} A ${r} ${r} 0 1 1 ${mid[0]} ${mid[1]} A ${r} ${r} 0 1 1 ${top[0]} ${top[1]} Z`;
  }
  const p1 = piePoint(cx, cy, r, startDeg);
  const p2 = piePoint(cx, cy, r, endDeg);
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${p1[0]} ${p1[1]} A ${r} ${r} 0 ${largeArc} 1 ${p2[0]} ${p2[1]} Z`;
}

function sectorBox(cx: number, cy: number, r: number, startDeg: number, endDeg: number): Box {
  if (endDeg - startDeg <= 1e-6) {
    const p = piePoint(cx, cy, r * 0.5, startDeg);
    return boxAround(p[0], p[1], 8, 8);
  }
  const samplePts: Point[] = [
    [cx, cy],
    piePoint(cx, cy, r, startDeg),
    piePoint(cx, cy, r, endDeg),
  ];
  for (const cardinal of [0, 90, 180, 270, 360, 450, 540, 630]) {
    if (cardinal > startDeg && cardinal < endDeg) {
      samplePts.push(piePoint(cx, cy, r, cardinal));
    }
  }
  const xs = samplePts.map((q) => q[0]);
  const ys = samplePts.map((q) => q[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    x: minX,
    y: minY,
    w: Math.max(4, maxX - minX),
    h: Math.max(4, maxY - minY),
  };
}

function unionBoxes(boxes: Box[]): Box {
  if (boxes.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of boxes) {
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.w > maxX) maxX = b.x + b.w;
    if (b.y + b.h > maxY) maxY = b.y + b.h;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function resolvePieColors(rawColors: string[], count: number): string[] {
  let availableKeys: string[] = [...PREFERRED_PIE_COLORS];
  try {
    const sceneKeys = Object.keys(sceneStyle().colors).filter(
      (k) => k !== 'white' && k !== 'black' && k !== 'gray',
    );
    const ordered = PREFERRED_PIE_COLORS.filter((k) => sceneKeys.includes(k));
    const extras = sceneKeys.filter((k) => !(PREFERRED_PIE_COLORS as readonly string[]).includes(k));
    if (ordered.length + extras.length > 0) {
      availableKeys = [...ordered, ...extras];
    }
  } catch {
    // fallback to PREFERRED_PIE_COLORS
  }

  if (rawColors.length >= count) {
    return rawColors.slice(0, count);
  }

  const out: string[] = [...rawColors];
  const used = new Set(out);
  let cursor = 0;
  while (out.length < count) {
    let picked: string | undefined;
    for (let tries = 0; tries < availableKeys.length; tries++) {
      const candidate = availableKeys[(cursor + tries) % availableKeys.length];
      if (!used.has(candidate)) {
        picked = candidate;
        cursor = (cursor + tries + 1) % availableKeys.length;
        break;
      }
    }
    if (!picked) {
      picked = availableKeys[out.length % availableKeys.length] ?? 'blue';
    }
    out.push(picked);
    used.add(picked);
  }
  return out;
}

function computePolylineProgress(pts: Point[], show: number): {
  cumLengths: number[];
  totalLength: number;
  drawnLength: number;
  drawnPoints: Point[];
  path: string;
} {
  if (pts.length === 0) {
    return { cumLengths: [], totalLength: 0, drawnLength: 0, drawnPoints: [], path: '' };
  }
  const cumLengths: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    cumLengths.push(cumLengths[i - 1] + d);
  }
  const totalLength = cumLengths[cumLengths.length - 1];
  if (show <= 0) {
    return { cumLengths, totalLength, drawnLength: 0, drawnPoints: [], path: '' };
  }
  if (pts.length === 1 || totalLength <= 1e-9) {
    const singlePath = `M ${pts[0][0]} ${pts[0][1]}`;
    return { cumLengths, totalLength, drawnLength: 0, drawnPoints: [pts[0]], path: singlePath };
  }

  const drawnLength = totalLength * Math.min(1, show);
  const drawnPoints: Point[] = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const segStart = cumLengths[i];
    const segEnd = cumLengths[i + 1];
    const segLen = segEnd - segStart;
    if (drawnLength >= segEnd - 1e-6) {
      drawnPoints.push(pts[i + 1]);
    } else if (drawnLength > segStart + 1e-6 && segLen > 1e-9) {
      const t = (drawnLength - segStart) / segLen;
      drawnPoints.push([
        pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t,
        pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t,
      ]);
      break;
    } else {
      break;
    }
  }
  const path =
    drawnPoints.length >= 2
      ? drawnPoints.map((q, idx) => `${idx === 0 ? 'M' : 'L'} ${q[0]} ${q[1]}`).join(' ')
      : '';
  return { cumLengths, totalLength, drawnLength, drawnPoints, path };
}

/** De Casteljau 算法在 t (0..1) 处截取三次贝塞尔曲线的前半段控制点 */
function splitCubicBezier(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number,
): [Point, Point, Point, Point] {
  const lerpPt = (a: Point, b: Point, u: number): Point => [
    a[0] + (b[0] - a[0]) * u,
    a[1] + (b[1] - a[1]) * u,
  ];
  const q0 = lerpPt(p0, p1, t);
  const q1 = lerpPt(p1, p2, t);
  const q2 = lerpPt(p2, p3, t);
  const r0 = lerpPt(q0, q1, t);
  const r1 = lerpPt(q1, q2, t);
  const s0 = lerpPt(r0, r1, t);
  return [p0, q0, r0, s0];
}

/** Catmull-Rom 平滑三次贝塞尔路径（支持 show 0..1 渐进绘制） */
function buildCatmullRomPath(pts: Point[], show: number): string {
  if (pts.length < 2 || show <= 0) return '';
  const segCount = pts.length - 1;
  const progress = Math.min(1, show) * segCount;
  const fullSegs = Math.floor(progress + 1e-9);
  const frac = progress - fullSegs;

  const commands: string[] = [`M ${pts[0][0]} ${pts[0][1]}`];
  for (let i = 0; i < segCount; i++) {
    if (i > fullSegs || (i === fullSegs && frac <= 1e-6)) break;
    const pPrev = i > 0 ? pts[i - 1] : pts[0];
    const pCurr = pts[i];
    const pNext = pts[i + 1];
    const pAfter = i + 2 < pts.length ? pts[i + 2] : pts[pts.length - 1];

    const c1: Point = [
      pCurr[0] + (pNext[0] - pPrev[0]) / 6,
      pCurr[1] + (pNext[1] - pPrev[1]) / 6,
    ];
    const c2: Point = [
      pNext[0] - (pAfter[0] - pCurr[0]) / 6,
      pNext[1] - (pAfter[1] - pCurr[1]) / 6,
    ];

    if (i < fullSegs) {
      commands.push(`C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${pNext[0]} ${pNext[1]}`);
    } else {
      const [, sc1, sc2, endPt] = splitCubicBezier(pCurr, c1, c2, pNext, frac);
      commands.push(`C ${sc1[0]} ${sc1[1]}, ${sc2[0]} ${sc2[1]}, ${endPt[0]} ${endPt[1]}`);
    }
  }
  return commands.join(' ');
}

function niceStep(maxVal: number): number {
  if (maxVal <= 10) return 1;
  const rough = maxVal / 8;
  const pow10 = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / pow10;
  if (norm <= 1) return pow10;
  if (norm <= 2) return 2 * pow10;
  if (norm <= 5) return 5 * pow10;
  return 10 * pow10;
}

/** 统计图纯函数几何布局计算 */
export function chartLayout(p: Props): ChartLayout {
  const defs = chartDefaults();
  const kind = kindOf(p.kind ?? defs.kind);
  const at = pt(p.at, [0, 0]);
  const originX = at[0];
  const originY = at[1];
  const width = Math.max(1, num(p.width, num(defs.width, 480)));
  const height = Math.max(1, num(p.height, num(defs.height, 300)));
  const plotBox: Box = { x: originX, y: originY - height, w: width, h: height };

  const unit = Math.max(1e-6, num(p.unit, num(defs.unit, 1)));
  const show = Math.max(0, Math.min(1, num(p.show, num(defs.show, 1))));
  const showValues =
    typeof p.showValues === 'boolean' ? p.showValues : Boolean(defs.showValues ?? false);
  const average = typeof p.average === 'boolean' ? p.average : Boolean(defs.average ?? false);
  const lineOpt = typeof p.line === 'boolean' ? p.line : Boolean(defs.line ?? true);
  const barRatio = Math.max(
    0.1,
    Math.min(0.95, num(p.barRatio, num(defs.barRatio, 0.6))),
  );
  const pointRadius = Math.max(1, num(p.pointRadius, num(defs.pointRadius, 6)));
  const labels = chartLabelsOf(p);

  const categories = Array.isArray(p.categories) ? p.categories.map((c) => str(c)) : [];
  const values = numList(p.values);
  const values2 = numList(p.values2);
  const xsRaw = numList(p.xs);

  const hasDualSeries = kind === 'bar2' || kind === 'line2';
  const legend =
    typeof p.legend === 'boolean' ? p.legend : hasDualSeries || values2.length > 0;

  let names: [string, string] | undefined;
  if (Array.isArray(p.names) && p.names.length >= 2) {
    names = [str(p.names[0]), str(p.names[1])];
  }

  let axisNames: [string, string] | undefined;
  if (Array.isArray(p.axisNames) && p.axisNames.length >= 2) {
    axisNames = [str(p.axisNames[0]), str(p.axisNames[1])];
  }

  const explicitColors = Array.isArray(p.colors)
    ? p.colors.map((c) => str(c)).filter(Boolean)
    : undefined;
  const fallbackColorList = Array.isArray(defs.colors)
    ? defs.colors.map((c) => str(c)).filter(Boolean)
    : ['blue', 'orange'];
  const baseColors =
    explicitColors && explicitColors.length > 0
      ? explicitColors
      : typeof p.color === 'string' && p.color
        ? [p.color, fallbackColorList[1] ?? 'orange']
        : fallbackColorList;

  // 计算 Y 轴 max
  const allY = hasDualSeries ? [...values, ...values2] : values;
  const rawMaxY = allY.length > 0 ? Math.max(0, ...allY) : 0;
  const autoMaxY = Math.max(unit, Math.ceil((rawMaxY - 1e-9) / unit) * unit);
  const yMax =
    typeof p.max === 'number' && Number.isFinite(p.max) && p.max > 0 ? p.max : autoMaxY;

  // 计算 X 轴 (xy 模式用)
  const rawMaxX = xsRaw.length > 0 ? Math.max(0, ...xsRaw) : 0;
  const xUnit =
    rawMaxX <= 10
      ? 1
      : unit > 1 && rawMaxX / unit >= 2 && rawMaxX / unit <= 15
        ? unit
        : niceStep(rawMaxX);
  const xMax = Math.max(xUnit, Math.ceil((rawMaxX - 1e-9) / xUnit) * xUnit);

  const bboxItems: Box[] = [plotBox];
  const gridLinesH: { value: number; y: number; x1: number; x2: number }[] = [];
  const gridLinesV: { value: number; x: number; y1: number; y2: number }[] = [];
  const yTicks: ChartAxisTick[] = [];
  const xTicks: ChartAxisTick[] = [];
  const categoryLabels: ChartCategoryLabel[] = [];
  const axisNameLabels: ChartAxisNameLabel[] = [];
  const bars: ChartBarItem[] = [];
  const lineSeries: ChartLineSeries[] = [];
  const pictoColumns: ChartPictoColumn[] = [];
  const legendItems: ChartLegendItem[] = [];
  const columns: ChartColumnItem[] = [];

  let xAxis: { x1: number; y1: number; x2: number; y2: number } | undefined;
  let yAxis: { x1: number; y1: number; x2: number; y2: number } | undefined;
  let pie: ChartPieLayout | undefined;
  let xy: ChartXYLayout | undefined;
  let averageLine: ChartAverageLine | undefined;

  // 1. 坐标轴、网格线与刻度
  if (kind !== 'pie') {
    xAxis = { x1: originX, y1: originY, x2: originX + width, y2: originY };
    if (kind !== 'picto') {
      yAxis = { x1: originX, y1: originY, x2: originX, y2: originY - height };
      const tickCount = Math.min(200, Math.max(1, Math.floor((yMax + 1e-7) / unit)));
      for (let k = 0; k <= tickCount; k++) {
        const val = Number((k * unit).toPrecision(10));
        const ty = originY - (val / yMax) * height;
        if (k > 0) {
          gridLinesH.push({ value: val, y: ty, x1: originX, x2: originX + width });
        }
        const txt = formatNumber(val);
        const tw = textWidth(txt, TICK_FONT_SIZE);
        const tx = originX - 10;
        const tBox: Box = {
          x: tx - tw,
          y: ty - TICK_FONT_SIZE / 2,
          w: tw,
          h: TICK_FONT_SIZE,
        };
        yTicks.push({ value: val, text: txt, x: tx, y: ty, box: tBox });
        bboxItems.push(tBox);
      }
      // 若 yMax 不是 unit 的整数倍，补顶线
      if (Math.abs(tickCount * unit - yMax) > 1e-5) {
        gridLinesH.push({ value: yMax, y: originY - height, x1: originX, x2: originX + width });
        const txt = formatNumber(yMax);
        const tw = textWidth(txt, TICK_FONT_SIZE);
        const tx = originX - 10;
        const tBox: Box = {
          x: tx - tw,
          y: originY - height - TICK_FONT_SIZE / 2,
          w: tw,
          h: TICK_FONT_SIZE,
        };
        yTicks.push({ value: yMax, text: txt, x: tx, y: originY - height, box: tBox });
        bboxItems.push(tBox);
      }
    }

    if (axisNames) {
      const [xName, yName] = axisNames;
      if (xName) {
        const xw = textWidth(xName, TICK_FONT_SIZE);
        const lx = originX + width + 8;
        const ly = originY;
        const b: Box = { x: lx, y: ly - TICK_FONT_SIZE / 2, w: xw, h: TICK_FONT_SIZE };
        axisNameLabels.push({ kind: 'x', text: xName, x: lx, y: ly, anchor: 'start', box: b });
        bboxItems.push(b);
      }
      if (yName) {
        const yw = textWidth(yName, TICK_FONT_SIZE);
        const lx = originX;
        const ly = originY - height - 24;
        const b = boxAround(lx, ly, yw, TICK_FONT_SIZE);
        axisNameLabels.push({ kind: 'y', text: yName, x: lx, y: ly, anchor: 'middle', box: b });
        bboxItems.push(b);
      }
    }
  }

  // 2. 各类统计图数据布局
  if (kind === 'pie') {
    const cx = originX + width / 2;
    const cy = originY - height / 2;
    const r = Math.min(width, height) / 2;
    const sliceCount = Math.max(categories.length, values.length);
    const total = values.reduce((acc, v) => acc + Math.max(0, v), 0);
    const pieColors = resolvePieColors(
      explicitColors ?? (typeof p.color === 'string' && p.color ? [p.color] : []),
      sliceCount,
    );
    const maxTotalAngle = 360 * show;

    const slices: ChartPieSlice[] = [];
    let curAngle = 0;
    for (let i = 0; i < sliceCount; i++) {
      const n = i + 1;
      const val = Math.max(0, values[i] ?? 0);
      const ratio = total > 0 ? val / total : 0;
      const sweepAngle = ratio * 360;
      const startAngle = curAngle;
      const endAngle = startAngle + sweepAngle;
      curAngle = endAngle;

      const drawnStartAngle = Math.min(startAngle, maxTotalAngle);
      const drawnEndAngle = Math.min(endAngle, maxTotalAngle);
      const drawnSweepAngle = Math.max(0, drawnEndAngle - drawnStartAngle);
      const visible = drawnSweepAngle > 1e-5;
      const path = sectorSvgPath(cx, cy, r, drawnStartAngle, drawnEndAngle);

      const percent = total > 0 ? Math.round(ratio * 100) : 0;
      const cat = categories[i] ?? '';
      const pctStr = `${formatNumber(percent)}%`;
      const labelText = cat ? `${cat} ${pctStr}` : pctStr;

      const midAngle = startAngle + sweepAngle / 2;
      const outside = sweepAngle > 0 && sweepAngle < 20;
      let labelPos: Point;
      let labelAnchor: 'start' | 'middle' | 'end';
      let leaderLine: [Point, Point, Point] | undefined;

      if (outside) {
        const pStart = piePoint(cx, cy, r * 0.92, midAngle);
        const pMid = piePoint(cx, cy, r + 16, midAngle);
        const onRight = Math.sin((midAngle * Math.PI) / 180) >= -1e-6;
        const pEnd: Point = [pMid[0] + (onRight ? 14 : -14), pMid[1]];
        leaderLine = [pStart, pMid, pEnd];
        labelPos = [pEnd[0] + (onRight ? 4 : -4), pEnd[1]];
        labelAnchor = onRight ? 'start' : 'end';
      } else {
        labelPos = piePoint(cx, cy, r * 0.6, midAngle);
        labelAnchor = 'middle';
      }

      const lw = textWidth(labelText, PIE_FONT_SIZE);
      const lh = PIE_FONT_SIZE;
      const lx =
        labelAnchor === 'middle'
          ? labelPos[0] - lw / 2
          : labelAnchor === 'start'
            ? labelPos[0]
            : labelPos[0] - lw;
      const labelBox: Box = { x: lx, y: labelPos[1] - lh / 2, w: lw, h: lh };
      if (outside && sweepAngle > 0) {
        bboxItems.push(labelBox);
      }

      const labelThreshold = startAngle + sweepAngle * 0.5;
      const labelVisible = sweepAngle > 0 && show > 0 && maxTotalAngle >= labelThreshold;
      const labelOpacity = labelVisible
        ? sweepAngle > 1e-5
          ? Math.min(1, (maxTotalAngle - labelThreshold) / (sweepAngle * 0.35) + 0.25)
          : 1
        : 0;

      const sBox = sectorBox(cx, cy, r, startAngle, endAngle);
      slices.push({
        index: n,
        name: `slice.${n}`,
        category: cat,
        value: val,
        percent,
        startAngle,
        endAngle,
        sweepAngle,
        drawnStartAngle,
        drawnEndAngle,
        drawnSweepAngle,
        midAngle,
        color: pieColors[i] ?? 'blue',
        path,
        visible,
        labelText,
        labelPos,
        labelAnchor,
        labelVisible,
        labelOpacity: Math.max(0, Math.min(1, labelOpacity)),
        outside,
        leaderLine,
        box: sBox,
        labelBox,
      });
    }
    pie = { cx, cy, r, total, slices };
  } else if (kind === 'xy') {
    // xy 模式：横纵轴都有刻度与网格
    const xTickCount = Math.min(200, Math.max(1, Math.floor((xMax + 1e-7) / xUnit)));
    for (let k = 0; k <= xTickCount; k++) {
      const val = Number((k * xUnit).toPrecision(10));
      const tx = originX + (val / xMax) * width;
      if (k > 0) {
        gridLinesV.push({ value: val, x: tx, y1: originY - height, y2: originY });
      }
      const txt = formatNumber(val);
      const tw = textWidth(txt, TICK_FONT_SIZE);
      const ty = originY + 18;
      const tBox = boxAround(tx, ty, tw, TICK_FONT_SIZE);
      xTicks.push({ value: val, text: txt, x: tx, y: ty, box: tBox });
      bboxItems.push(tBox);
    }

    const pairCount = Math.min(xsRaw.length, values.length);
    const rawPairs = Array.from({ length: pairCount }, (_, idx) => ({
      origIndex: idx + 1,
      xVal: xsRaw[idx],
      yVal: values[idx],
    }));
    // 按 xs 升序排列以便渐进绘制与曲线连接
    const sorted = [...rawPairs].sort((a, b) => a.xVal - b.xVal);
    const seriesColor = baseColors[0] ?? 'blue';

    // 判断共线与正比例过原点
    let isCollinear = true;
    let throughOrigin = false;
    if (sorted.length >= 2) {
      const x0 = sorted[0].xVal;
      const y0 = sorted[0].yVal;
      const dx1 = sorted[1].xVal - x0;
      const dy1 = sorted[1].yVal - y0;
      const scale = Math.max(1, xMax * yMax);
      for (let i = 2; i < sorted.length; i++) {
        const dxi = sorted[i].xVal - x0;
        const dyi = sorted[i].yVal - y0;
        if (Math.abs(dxi * dy1 - dyi * dx1) > 1e-5 * scale) {
          isCollinear = false;
          break;
        }
      }
      if (isCollinear && x0 > 0 && y0 >= 0) {
        const allProportional = sorted.every(
          (item) => Math.abs(item.xVal * y0 - item.yVal * x0) <= 1e-5 * scale,
        );
        if (allProportional) {
          throughOrigin = true;
        }
      }
    }

    const screenPts: Point[] = sorted.map((item) => [
      originX + (item.xVal / xMax) * width,
      originY - (item.yVal / yMax) * height,
    ]);

    let xyPath = '';
    const isSmooth = !isCollinear && sorted.length >= 3;
    const ptVisibilities: { visible: boolean; opacity: number }[] = sorted.map(() => ({
      visible: false,
      opacity: 0,
    }));

    if (sorted.length > 0 && show > 0) {
      if (isCollinear) {
        const linePts = throughOrigin ? ([[originX, originY], ...screenPts] as Point[]) : screenPts;
        const prog = computePolylineProgress(linePts, lineOpt ? show : 1);
        if (lineOpt) {
          xyPath = prog.path;
        }
        const offset = throughOrigin ? 1 : 0;
        for (let i = 0; i < sorted.length; i++) {
          const distAtPt = prog.cumLengths[i + offset] ?? 0;
          const targetDist = prog.totalLength * show;
          if ((i === 0 && !throughOrigin) || distAtPt <= targetDist + 1e-5 || show >= 1) {
            ptVisibilities[i] = { visible: true, opacity: 1 };
          }
        }
      } else {
        if (lineOpt) {
          xyPath = buildCatmullRomPath(screenPts, show);
        }
        const segCount = Math.max(1, sorted.length - 1);
        const progress = show * segCount;
        for (let i = 0; i < sorted.length; i++) {
          if (i === 0 || progress >= i - 1e-6 || show >= 1) {
            ptVisibilities[i] = { visible: true, opacity: 1 };
          }
        }
      }
    }

    const xyPoints: ChartPointItem[] = sorted.map((item, idx) => {
      const [px, py] = screenPts[idx];
      const vis = ptVisibilities[idx];
      const hitSize = Math.max(20, pointRadius * 3);
      let vLabel: ChartValueLabel | undefined;
      if (showValues && vis.visible) {
        const txt = formatNumber(item.yVal);
        const tw = textWidth(txt, VALUE_FONT_SIZE);
        const ly = py - pointRadius - 12;
        const b = boxAround(px, ly, tw, VALUE_FONT_SIZE);
        vLabel = { text: txt, x: px, y: ly, opacity: vis.opacity, box: b };
        bboxItems.push(b);
      }
      return {
        name: `pt.${item.origIndex}`,
        series: 1,
        index: item.origIndex,
        xVal: item.xVal,
        value: item.yVal,
        x: px,
        y: py,
        r: pointRadius,
        color: seriesColor,
        visible: vis.visible,
        opacity: vis.opacity,
        subBox: boxAround(px, py, hitSize, hitSize),
        valueLabel: vLabel,
      };
    });

    xy = {
      points: xyPoints,
      path: xyPath,
      isSmooth,
      throughOrigin,
      color: seriesColor,
    };
  } else {
    // 类别轴模式：picto / bar / bar2 / line / line2
    const catCount = Math.max(
      categories.length,
      values.length,
      hasDualSeries ? values2.length : 0,
    );
    const colW = catCount > 0 ? width / catCount : width;

    for (let i = 0; i < catCount; i++) {
      const catText = categories[i] ?? '';
      const cx = originX + (i + 0.5) * colW;
      const cy = originY + 22;
      const cw = textWidth(catText, CATEGORY_FONT_SIZE);
      const cBox = boxAround(cx, cy, Math.max(8, cw), CATEGORY_FONT_SIZE);
      categoryLabels.push({ index: i + 1, text: catText, x: cx, y: cy, box: cBox });
      if (catText) {
        bboxItems.push(cBox);
      }
    }

    if (kind === 'picto') {
      const iconList = Array.isArray(p.icon)
        ? p.icon.map((ic) => str(ic)).filter(Boolean)
        : [str(p.icon ?? defs.icon, 'dot')];

      const maxSlots = Math.max(
        1,
        ...values.map((v) => Math.ceil(Math.max(0, v) / unit - 1e-9)),
        typeof p.max === 'number' && p.max > 0 ? Math.ceil(p.max / unit - 1e-9) : 1,
      );
      const gapRatio = 0.12;
      const bottomPad = 6;
      const maxByHeight =
        (height - bottomPad - 2) / (maxSlots + Math.max(0, maxSlots - 1) * gapRatio);
      const iconSize = Math.max(8, Math.min(colW * 0.7, 48, maxByHeight));
      const iconGap = iconSize * gapRatio;
      const usePerCatColor = baseColors.length >= catCount && catCount > 0;

      for (let i = 0; i < catCount; i++) {
        const n = i + 1;
        const val = Math.max(0, values[i] ?? 0);
        const exactCount = val / unit;
        const slotCount = exactCount > 1e-9 ? Math.ceil(exactCount - 1e-9) : 0;
        const colIcon = iconList[i] ?? iconList[0] ?? 'dot';
        const colColor = usePerCatColor ? baseColors[i] : (baseColors[0] ?? 'blue');
        const cx = originX + (i + 0.5) * colW;
        const progress = exactCount * show;

        const icons: ChartPictoIcon[] = [];
        for (let k = 0; k < slotCount; k++) {
          const itemRatio =
            k < slotCount - 1 ? 1 : Math.max(0, Math.min(1, exactCount - k));
          const boxX = cx - iconSize / 2;
          const boxY = originY - bottomPad - (k + 1) * iconSize - k * iconGap;
          const iconBox: Box = { x: boxX, y: boxY, w: iconSize, h: iconSize };
          const clipBox: Box = {
            x: boxX,
            y: boxY,
            w: iconSize * itemRatio,
            h: iconSize,
          };

          let visible = false;
          let opacity = 0;
          if (show > 0 && progress > k + 1e-6) {
            visible = true;
            opacity =
              progress >= k + itemRatio - 1e-6
                ? 1
                : Math.max(0, Math.min(1, (progress - k) / Math.max(1e-6, itemRatio)));
          }

          icons.push({
            slotIndex: k + 1,
            box: iconBox,
            clipRatio: Number(itemRatio.toPrecision(10)),
            clipBox,
            visible,
            opacity,
            icon: colIcon,
            color: colColor,
          });
        }

        let vLabel: ChartValueLabel | undefined;
        const topIconY =
          slotCount > 0
            ? originY - bottomPad - slotCount * iconSize - (slotCount - 1) * iconGap
            : originY - bottomPad;
        if (showValues && show > 0) {
          const txt = formatNumber(val);
          const tw = textWidth(txt, VALUE_FONT_SIZE);
          const ly = topIconY - 12;
          const b = boxAround(cx, ly, tw, VALUE_FONT_SIZE);
          vLabel = { text: txt, x: cx, y: ly, opacity: show, box: b };
          bboxItems.push(b);
        }

        pictoColumns.push({
          index: n,
          category: categories[i] ?? '',
          value: val,
          color: colColor,
          icon: colIcon,
          icons,
          valueLabel: vLabel,
        });

        const catBox = categoryLabels[i]?.box;
        const colBoxW = Math.min(
          Math.max(16, colW - 8),
          Math.max(iconSize, catBox?.w ?? 0, colW * 0.5),
        );
        const colTop = slotCount > 0 ? topIconY : originY - iconSize;
        const colBottom = catBox ? catBox.y + catBox.h : originY + 32;
        columns.push({
          index: n,
          name: `col.${n}`,
          box: {
            x: cx - colBoxW / 2,
            y: colTop,
            w: colBoxW,
            h: Math.max(16, colBottom - colTop),
          },
          value: val,
          label: categories[i] ?? String(n),
        });
      }
    } else if (kind === 'bar' || kind === 'bar2') {
      const groupW = colW * barRatio;
      const usePerCatColor = kind === 'bar' && baseColors.length >= catCount && catCount > 0;

      for (let i = 0; i < catCount; i++) {
        const n = i + 1;
        const cx = originX + (i + 0.5) * colW;
        let minBarTop = originY - 24;

        if (kind === 'bar') {
          const val = Math.max(0, values[i] ?? 0);
          const shownVal = val * show;
          const barW = groupW;
          const bx = cx - barW / 2;
          const bh = (shownVal / yMax) * height;
          const by = originY - bh;
          const targetH = (val / yMax) * height;
          const targetY = originY - targetH;
          minBarTop = Math.min(minBarTop, targetY);
          const barColor = usePerCatColor ? baseColors[i] : (baseColors[0] ?? 'blue');

          let vLabel: ChartValueLabel | undefined;
          if (showValues && show > 0) {
            const txt = formatNumber(val);
            const tw = textWidth(txt, VALUE_FONT_SIZE);
            const ly = by - 12;
            const b = boxAround(cx, ly, tw, VALUE_FONT_SIZE);
            vLabel = { text: txt, x: cx, y: ly, opacity: show, box: b };
            bboxItems.push(b);
          }

          const subH = Math.max(6, bh > 0 ? bh : targetH);
          bars.push({
            name: `bar.${n}`,
            series: 1,
            categoryIndex: n,
            value: val,
            shownValue: shownVal,
            x: bx,
            y: by,
            w: barW,
            h: bh,
            targetY,
            targetH,
            color: barColor,
            subBox: { x: bx, y: originY - subH, w: barW, h: subH },
            valueLabel: vLabel,
          });
        } else {
          const halfW = groupW / 2;
          const pairs: [1 | 2, number, number, string][] = [
            [1, Math.max(0, values[i] ?? 0), cx - halfW, baseColors[0] ?? 'blue'],
            [2, Math.max(0, values2[i] ?? 0), cx, baseColors[1] ?? 'orange'],
          ];
          for (const [sIdx, val, bx, bColor] of pairs) {
            const shownVal = val * show;
            const bh = (shownVal / yMax) * height;
            const by = originY - bh;
            const targetH = (val / yMax) * height;
            const targetY = originY - targetH;
            minBarTop = Math.min(minBarTop, targetY);

            let vLabel: ChartValueLabel | undefined;
            if (showValues && show > 0) {
              const txt = formatNumber(val);
              const tw = textWidth(txt, VALUE_FONT_SIZE);
              const ly = by - 12;
              const b = boxAround(bx + halfW / 2, ly, tw, VALUE_FONT_SIZE);
              vLabel = { text: txt, x: bx + halfW / 2, y: ly, opacity: show, box: b };
              bboxItems.push(b);
            }

            const subH = Math.max(6, bh > 0 ? bh : targetH);
            bars.push({
              name: `bar.${sIdx}.${n}`,
              series: sIdx,
              categoryIndex: n,
              value: val,
              shownValue: shownVal,
              x: bx,
              y: by,
              w: halfW,
              h: bh,
              targetY,
              targetH,
              color: bColor,
              subBox: { x: bx, y: originY - subH, w: halfW, h: subH },
              valueLabel: vLabel,
            });
          }
        }

        const catBox = categoryLabels[i]?.box;
        const colBoxW = Math.min(
          Math.max(16, colW - 8),
          Math.max(groupW, catBox?.w ?? 0),
        );
        const colBottom = catBox ? catBox.y + catBox.h : originY + 32;
        columns.push({
          index: n,
          name: `col.${n}`,
          box: {
            x: cx - colBoxW / 2,
            y: minBarTop,
            w: colBoxW,
            h: Math.max(16, colBottom - minBarTop),
          },
          value: values[i],
          label: categories[i] ?? String(n),
        });
      }
    } else if (kind === 'line' || kind === 'line2') {
      const seriesDefs: [1 | 2, number[], string][] =
        kind === 'line2'
          ? [
              [1, values, baseColors[0] ?? 'blue'],
              [2, values2, baseColors[1] ?? 'orange'],
            ]
          : [[1, values, baseColors[0] ?? 'blue']];
      const usePerCatPointColor =
        kind === 'line' && baseColors.length >= catCount && catCount > 0;

      for (const [sIdx, sVals, sColor] of seriesDefs) {
        const rawPts: Point[] = [];
        for (let i = 0; i < catCount; i++) {
          const val = sVals[i] ?? 0;
          rawPts.push([originX + (i + 0.5) * colW, originY - (val / yMax) * height]);
        }
        const prog = computePolylineProgress(rawPts, show);
        const hitSize = Math.max(20, pointRadius * 3);

        const pts: ChartPointItem[] = rawPts.map(([px, py], i) => {
          const n = i + 1;
          const val = sVals[i] ?? 0;
          const distAtPt = prog.cumLengths[i] ?? 0;
          const visible =
            show > 0 && (i === 0 || distAtPt <= prog.drawnLength + 1e-5 || show >= 1);
          const opacity = visible ? 1 : 0;
          const ptName = kind === 'line2' ? `pt.${sIdx}.${n}` : `pt.${n}`;
          const ptColor = usePerCatPointColor ? baseColors[i] : sColor;

          let vLabel: ChartValueLabel | undefined;
          if (showValues && visible) {
            const txt = formatNumber(val);
            const tw = textWidth(txt, VALUE_FONT_SIZE);
            const ly = py - pointRadius - 12;
            const b = boxAround(px, ly, tw, VALUE_FONT_SIZE);
            vLabel = { text: txt, x: px, y: ly, opacity, box: b };
            bboxItems.push(b);
          }

          return {
            name: ptName,
            series: sIdx,
            index: n,
            xVal: n,
            value: val,
            x: px,
            y: py,
            r: pointRadius,
            color: ptColor,
            visible,
            opacity,
            subBox: boxAround(px, py, hitSize, hitSize),
            valueLabel: vLabel,
          };
        });

        lineSeries.push({
          series: sIdx,
          color: sColor,
          points: pts,
          drawnPoints: prog.drawnPoints,
          path: prog.path,
          totalLength: prog.totalLength,
          drawnLength: prog.drawnLength,
        });
      }

      for (let i = 0; i < catCount; i++) {
        const n = i + 1;
        const cx = originX + (i + 0.5) * colW;
        const ysAtCol = lineSeries
          .map((s) => s.points[i]?.y)
          .filter((y): y is number => typeof y === 'number');
        const minPtY = ysAtCol.length > 0 ? Math.min(...ysAtCol) - pointRadius : originY - 24;
        const catBox = categoryLabels[i]?.box;
        const colBoxW = Math.min(
          Math.max(16, colW - 8),
          Math.max(pointRadius * 3, catBox?.w ?? 0, colW * 0.45),
        );
        const colBottom = catBox ? catBox.y + catBox.h : originY + 32;
        columns.push({
          index: n,
          name: `col.${n}`,
          box: {
            x: cx - colBoxW / 2,
            y: minPtY,
            w: colBoxW,
            h: Math.max(16, colBottom - minPtY),
          },
          value: values[i],
          label: categories[i] ?? String(n),
        });
      }
    }
  }

  // 3. 平均线（average: true）
  if (average && values.length > 0 && kind !== 'pie') {
    const avgVal = values.reduce((acc, v) => acc + v, 0) / values.length;
    const avgY = originY - (avgVal / yMax) * height;
    const avgNumStr = formatNumber(avgVal);
    const labelText = labels.average ? `${labels.average} ${avgNumStr}` : avgNumStr;
    const lw = textWidth(labelText, TICK_FONT_SIZE);
    const lx = originX + width + 8;
    const lBox: Box = {
      x: lx,
      y: avgY - TICK_FONT_SIZE / 2,
      w: lw,
      h: TICK_FONT_SIZE,
    };
    averageLine = {
      value: avgVal,
      y: avgY,
      x1: originX,
      x2: originX + width,
      labelText,
      labelX: lx,
      labelY: avgY,
      labelBox: lBox,
    };
    bboxItems.push(lBox);
  }

  // 4. 图例（legend: true）
  if (legend && kind !== 'pie') {
    const legendKind: 'bar' | 'line' = kind === 'line' || kind === 'line2' ? 'line' : 'bar';
    const entries: { series: number; text: string; color: string }[] = [];
    if (hasDualSeries) {
      entries.push({
        series: 1,
        text: names?.[0] ?? '1',
        color: baseColors[0] ?? 'blue',
      });
      entries.push({
        series: 2,
        text: names?.[1] ?? '2',
        color: baseColors[1] ?? 'orange',
      });
    } else if (names?.[0]) {
      entries.push({
        series: 1,
        text: names[0],
        color: baseColors[0] ?? 'blue',
      });
    }

    const swatchW = legendKind === 'line' ? 24 : 16;
    const itemGap = 20;
    const ly = originY - height - 22;
    const widths = entries.map((e) => swatchW + 6 + textWidth(e.text, LEGEND_FONT_SIZE));
    const totalW =
      widths.reduce((acc, w) => acc + w, 0) + Math.max(0, entries.length - 1) * itemGap;
    let curX = originX + width - totalW;

    entries.forEach((entry, idx) => {
      const iw = widths[idx];
      const b: Box = {
        x: curX,
        y: ly - LEGEND_FONT_SIZE / 2,
        w: iw,
        h: LEGEND_FONT_SIZE,
      };
      legendItems.push({
        series: entry.series,
        text: entry.text,
        color: entry.color,
        kind: legendKind,
        x: curX,
        y: ly,
        box: b,
      });
      bboxItems.push(b);
      curX += iw + itemGap;
    });
  }

  return {
    kind,
    at,
    width,
    height,
    plotBox,
    unit,
    max: yMax,
    xUnit,
    xMax,
    show,
    barRatio,
    pointRadius,
    labels,
    categories,
    categoryLabels,
    xAxis,
    yAxis,
    gridLinesH,
    gridLinesV,
    yTicks,
    xTicks,
    axisNameLabels,
    bars,
    lineSeries,
    pie,
    pictoColumns,
    xy,
    averageLine,
    legendItems,
    columns,
    box: unionBoxes(bboxItems),
  };
}

function ChartRender({ p, ctx }: { p: Props; ctx: { theme: import('@flow-see/core').Theme; assetUrl?(id: string): string | undefined } }) {
  const L = chartLayout(p);
  const uid = `${str(p.id, 'ch').replace(/[^a-zA-Z0-9_-]/g, '')}-${Math.round(L.at[0])}-${Math.round(L.at[1])}`;
  const subColors =
    p._subColors && typeof p._subColors === 'object'
      ? (p._subColors as Record<string, string>)
      : undefined;

  const inkColor = color('ink', ctx.theme);
  const lineColor = color('line', ctx.theme);
  const dimColor = color('dim', ctx.theme);
  const accentColor = color('accent', ctx.theme);
  const darkest = color('black', ctx.theme);
  const stageBg = ctx.theme.stageBg;

  return (
    <g>
      {/* 横向与纵向网格线 */}
      {L.gridLinesH.map((gl, idx) => (
        <line
          key={`gh-${idx}`}
          x1={gl.x1}
          y1={gl.y}
          x2={gl.x2}
          y2={gl.y}
          stroke={lineColor}
          strokeWidth={1}
        />
      ))}
      {L.gridLinesV.map((gl, idx) => (
        <line
          key={`gv-${idx}`}
          x1={gl.x}
          y1={gl.y1}
          x2={gl.x}
          y2={gl.y2}
          stroke={lineColor}
          strokeWidth={1}
        />
      ))}

      {/* 条形图（bar / bar2） */}
      {L.bars.map((bar) => {
        if (bar.h <= 0.1) return null;
        const colOverride = subColors?.[`col.${bar.categoryIndex}`];
        const barColorName = subColors?.[bar.name] ?? colOverride ?? bar.color;
        const fillHex = color(barColorName, ctx.theme, 'blue');
        const strokeHex = mixColor(fillHex, darkest, 0.35);
        return (
          <rect
            key={bar.name}
            x={bar.x}
            y={bar.y}
            width={bar.w}
            height={bar.h}
            rx={2}
            fill={fillHex}
            fillOpacity={0.85}
            stroke={strokeHex}
            strokeWidth={2}
          />
        );
      })}

      {/* 象形统计图（picto） */}
      {L.pictoColumns.map((col) =>
        col.icons.map((item) => {
          if (!item.visible || item.opacity <= 0.001) return null;
          const itemColorName = subColors?.[`col.${col.index}`] ?? item.color;
          const fillHex = color(itemColorName, ctx.theme, 'blue');
          const strokeHex = mixColor(fillHex, darkest, 0.35);
          const cx = item.box.x + item.box.w / 2;
          const cy = item.box.y + item.box.h / 2;

          let iconNode: ReactNode;
          if (item.icon === 'dot') {
            iconNode = (
              <circle
                cx={cx}
                cy={cy}
                r={item.box.w * 0.42}
                fill={fillHex}
                fillOpacity={0.9}
                stroke={strokeHex}
                strokeWidth={2}
              />
            );
          } else {
            const url = ctx.assetUrl?.(item.icon);
            if (url) {
              iconNode = (
                <image
                  href={url}
                  x={item.box.x}
                  y={item.box.y}
                  width={item.box.w}
                  height={item.box.h}
                  preserveAspectRatio="xMidYMid meet"
                />
              );
            } else {
              iconNode = (
                <circle
                  cx={cx}
                  cy={cy}
                  r={item.box.w * 0.42}
                  fill={fillHex}
                  fillOpacity={0.85}
                  stroke={strokeHex}
                  strokeWidth={2}
                />
              );
            }
          }

          if (item.clipRatio < 0.999) {
            const clipId = `chart-picto-${uid}-${col.index}-${item.slotIndex}`;
            return (
              <g key={`${col.index}-${item.slotIndex}`} opacity={item.opacity}>
                <defs>
                  <clipPath id={clipId}>
                    <rect
                      x={item.clipBox.x}
                      y={item.clipBox.y}
                      width={item.clipBox.w}
                      height={item.clipBox.h}
                    />
                  </clipPath>
                </defs>
                <g clipPath={`url(#${clipId})`}>{iconNode}</g>
              </g>
            );
          }

          return (
            <g key={`${col.index}-${item.slotIndex}`} opacity={item.opacity}>
              {iconNode}
            </g>
          );
        }),
      )}

      {/* 扇形统计图（pie） */}
      {L.pie &&
        L.pie.slices.map((s) => {
          if (!s.visible || !s.path) return null;
          const sliceColorName = subColors?.[s.name] ?? s.color;
          const fillHex = color(sliceColorName, ctx.theme, 'blue');
          const strokeHex = mixColor(fillHex, darkest, 0.35);
          return (
            <path
              key={s.name}
              d={s.path}
              fill={fillHex}
              fillOpacity={0.85}
              stroke={strokeHex}
              strokeWidth={2}
              strokeLinejoin="round"
            />
          );
        })}

      {/* 坐标轴 */}
      {L.yAxis && (
        <line
          x1={L.yAxis.x1}
          y1={L.yAxis.y1}
          x2={L.yAxis.x2}
          y2={L.yAxis.y2}
          stroke={inkColor}
          strokeWidth={2}
          strokeLinecap="square"
        />
      )}
      {L.xAxis && (
        <line
          x1={L.xAxis.x1}
          y1={L.xAxis.y1}
          x2={L.xAxis.x2}
          y2={L.xAxis.y2}
          stroke={inkColor}
          strokeWidth={2}
          strokeLinecap="square"
        />
      )}

      {/* 折线统计图（line / line2） */}
      {L.lineSeries.map((series) => {
        const sColorHex = color(series.color, ctx.theme, 'blue');
        return (
          <g key={`series-${series.series}`}>
            {series.path && (
              <path
                d={series.path}
                fill="none"
                stroke={sColorHex}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {series.points.map((ptItem) => {
              if (!ptItem.visible || ptItem.opacity <= 0.001) return null;
              const colOverride = subColors?.[`col.${ptItem.index}`];
              const ptColorName = subColors?.[ptItem.name] ?? colOverride ?? ptItem.color;
              const ptHex = color(ptColorName, ctx.theme, 'blue');
              return (
                <circle
                  key={ptItem.name}
                  cx={ptItem.x}
                  cy={ptItem.y}
                  r={ptItem.r}
                  fill={stageBg}
                  stroke={ptHex}
                  strokeWidth={3}
                  opacity={ptItem.opacity}
                />
              );
            })}
          </g>
        );
      })}

      {/* 坐标图（xy） */}
      {L.xy && (
        <g>
          {L.xy.path && (
            <path
              d={L.xy.path}
              fill="none"
              stroke={color(L.xy.color, ctx.theme, 'blue')}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {L.xy.points.map((ptItem) => {
            if (!ptItem.visible || ptItem.opacity <= 0.001) return null;
            const ptColorName = subColors?.[ptItem.name] ?? ptItem.color;
            const ptHex = color(ptColorName, ctx.theme, 'blue');
            return (
              <circle
                key={ptItem.name}
                cx={ptItem.x}
                cy={ptItem.y}
                r={ptItem.r}
                fill={stageBg}
                stroke={ptHex}
                strokeWidth={3}
                opacity={ptItem.opacity}
              />
            );
          })}
        </g>
      )}

      {/* 平均线（average: true） */}
      {L.averageLine && (
        <g>
          <line
            x1={L.averageLine.x1}
            y1={L.averageLine.y}
            x2={L.averageLine.x2}
            y2={L.averageLine.y}
            stroke={accentColor}
            strokeWidth={2}
            strokeDasharray="6 4"
          />
          <text
            x={L.averageLine.labelX}
            y={L.averageLine.labelY}
            textAnchor="start"
            dominantBaseline="central"
            fontSize={TICK_FONT_SIZE}
            fontWeight={700}
            fill={accentColor}
          >
            {L.averageLine.labelText}
          </text>
        </g>
      )}

      {/* 数值标注（showValues: true） */}
      {L.bars.map(
        (bar) =>
          bar.valueLabel && (
            <text
              key={`vl-${bar.name}`}
              x={bar.valueLabel.x}
              y={bar.valueLabel.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={VALUE_FONT_SIZE}
              fontWeight={700}
              fill={inkColor}
              opacity={bar.valueLabel.opacity}
            >
              {bar.valueLabel.text}
            </text>
          ),
      )}
      {L.pictoColumns.map(
        (col) =>
          col.valueLabel && (
            <text
              key={`vl-picto-${col.index}`}
              x={col.valueLabel.x}
              y={col.valueLabel.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={VALUE_FONT_SIZE}
              fontWeight={700}
              fill={inkColor}
              opacity={col.valueLabel.opacity}
            >
              {col.valueLabel.text}
            </text>
          ),
      )}
      {L.lineSeries.flatMap((series) =>
        series.points.map(
          (ptItem) =>
            ptItem.valueLabel && (
              <text
                key={`vl-${ptItem.name}`}
                x={ptItem.valueLabel.x}
                y={ptItem.valueLabel.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={VALUE_FONT_SIZE}
                fontWeight={700}
                fill={inkColor}
                opacity={ptItem.valueLabel.opacity}
              >
                {ptItem.valueLabel.text}
              </text>
            ),
        ),
      )}
      {L.xy &&
        L.xy.points.map(
          (ptItem) =>
            ptItem.valueLabel && (
              <text
                key={`vl-xy-${ptItem.name}`}
                x={ptItem.valueLabel.x}
                y={ptItem.valueLabel.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={VALUE_FONT_SIZE}
                fontWeight={700}
                fill={inkColor}
                opacity={ptItem.valueLabel.opacity}
              >
                {ptItem.valueLabel.text}
              </text>
            ),
        )}

      {/* 扇形文字与外引线 */}
      {L.pie &&
        L.pie.slices.map((s) => {
          if (!s.labelVisible || s.labelOpacity <= 0.01) return null;
          return (
            <g key={`lbl-${s.name}`} opacity={s.labelOpacity}>
              {s.leaderLine && (
                <polyline
                  points={s.leaderLine.map((q) => `${q[0]},${q[1]}`).join(' ')}
                  fill="none"
                  stroke={dimColor}
                  strokeWidth={1.5}
                />
              )}
              <text
                x={s.labelPos[0]}
                y={s.labelPos[1]}
                textAnchor={s.labelAnchor}
                dominantBaseline="central"
                fontSize={PIE_FONT_SIZE}
                fontWeight={700}
                fill={inkColor}
                paintOrder="stroke"
                stroke={stageBg}
                strokeWidth={s.outside ? 0 : 3}
                strokeLinejoin="round"
              >
                {s.labelText}
              </text>
            </g>
          );
        })}

      {/* 纵轴刻度数字（字号 18） */}
      {L.yTicks.map((t, idx) => (
        <text
          key={`yt-${idx}`}
          x={t.x}
          y={t.y}
          textAnchor="end"
          dominantBaseline="central"
          fontSize={TICK_FONT_SIZE}
          fill={dimColor}
        >
          {t.text}
        </text>
      ))}

      {/* 横轴刻度数字（xy 模式，字号 18） */}
      {L.xTicks.map((t, idx) => (
        <text
          key={`xt-${idx}`}
          x={t.x}
          y={t.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={TICK_FONT_SIZE}
          fill={dimColor}
        >
          {t.text}
        </text>
      ))}

      {/* 横轴类别文字（字号 20） */}
      {L.categoryLabels.map(
        (cat) =>
          cat.text && (
            <text
              key={`cat-${cat.index}`}
              x={cat.x}
              y={cat.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={CATEGORY_FONT_SIZE}
              fontWeight={600}
              fill={inkColor}
            >
              {cat.text}
            </text>
          ),
      )}

      {/* 坐标轴名称 */}
      {L.axisNameLabels.map((an) => (
        <text
          key={`axis-${an.kind}`}
          x={an.x}
          y={an.y}
          textAnchor={an.anchor}
          dominantBaseline="central"
          fontSize={TICK_FONT_SIZE}
          fontWeight={600}
          fill={dimColor}
        >
          {an.text}
        </text>
      ))}

      {/* 图例 */}
      {L.legendItems.map((item) => {
        const cHex = color(item.color, ctx.theme, 'blue');
        const strokeHex = mixColor(cHex, darkest, 0.35);
        return (
          <g key={`leg-${item.series}`}>
            {item.kind === 'line' ? (
              <>
                <line
                  x1={item.x}
                  y1={item.y}
                  x2={item.x + 24}
                  y2={item.y}
                  stroke={cHex}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                <circle
                  cx={item.x + 12}
                  cy={item.y}
                  r={4.5}
                  fill={stageBg}
                  stroke={cHex}
                  strokeWidth={2.5}
                />
                <text
                  x={item.x + 30}
                  y={item.y}
                  textAnchor="start"
                  dominantBaseline="central"
                  fontSize={LEGEND_FONT_SIZE}
                  fontWeight={600}
                  fill={inkColor}
                >
                  {item.text}
                </text>
              </>
            ) : (
              <>
                <rect
                  x={item.x}
                  y={item.y - 7}
                  width={14}
                  height={14}
                  rx={3}
                  fill={cHex}
                  fillOpacity={0.85}
                  stroke={strokeHex}
                  strokeWidth={1.5}
                />
                <text
                  x={item.x + 20}
                  y={item.y}
                  textAnchor="start"
                  dominantBaseline="central"
                  fontSize={LEGEND_FONT_SIZE}
                  fontWeight={600}
                  fill={inkColor}
                >
                  {item.text}
                </text>
              </>
            )}
          </g>
        );
      })}
    </g>
  );
}

export const chartPart: PartDef = {
  type: 'chart',
  name: '统计图',
  anchor: 'start',
  required: ['values'],
  props: [
    'kind',
    'categories',
    'values',
    'values2',
    'xs',
    'names',
    'colors',
    'unit',
    'max',
    'width',
    'height',
    'legend',
    'average',
    'icon',
    'showValues',
    'axisNames',
    'show',
    'line',
    'labels',
    'barRatio',
    'pointRadius',
  ],
  bbox(p: Props): Box {
    return chartLayout(p).box;
  },
  subitems(p: Props): Subitem[] {
    const L = chartLayout(p);
    const items: Subitem[] = [];

    if (L.kind === 'pie' && L.pie) {
      for (const s of L.pie.slices) {
        items.push({
          name: s.name,
          box: s.box,
          value: s.value,
          label: s.category || String(s.index),
        });
      }
      return items;
    }

    if (L.kind === 'xy' && L.xy) {
      for (const ptItem of L.xy.points) {
        items.push({
          name: ptItem.name,
          box: ptItem.subBox,
          value: ptItem.value,
          label: String(ptItem.index),
        });
      }
      return items;
    }

    for (const bar of L.bars) {
      items.push({
        name: bar.name,
        box: bar.subBox,
        value: bar.value,
        label: L.categories[bar.categoryIndex - 1] || bar.name,
      });
    }

    for (const series of L.lineSeries) {
      for (const ptItem of series.points) {
        items.push({
          name: ptItem.name,
          box: ptItem.subBox,
          value: ptItem.value,
          label: L.categories[ptItem.index - 1] || ptItem.name,
        });
      }
    }

    for (const col of L.columns) {
      items.push({
        name: col.name,
        box: col.box,
        value: col.value,
        label: col.label,
      });
    }

    return items;
  },
  Render: ChartRender,
};
