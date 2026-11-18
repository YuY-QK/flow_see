// 线段图零件（任务卡 B21）：倍、和差、分数应用题、工程问题、比、百分数、运算定律。
import {
  boxAround,
  color,
  pt,
  str,
  type Box,
  type PartContext,
  type PartDef,
  type Point,
  type Props,
  type Subitem,
} from '../base';
import { RichLine, richSpans, textWidth } from './text';

export const DEFAULT_SEG_COLORS = [
  'blue',
  'orange',
  'green',
  'purple',
  'red',
  'yellow',
  'pink',
] as const;

export const TAPE_LABEL_POSITIONS = ['above', 'inside'] as const;
export type TapeLabelPos = (typeof TAPE_LABEL_POSITIONS)[number];

export const TAPE_BRACE_SIDES = ['top', 'bottom'] as const;
export type TapeBraceSide = (typeof TAPE_BRACE_SIDES)[number];

export const TAPE_STROKE_WIDTH = 5;
export const TAPE_END_TICK_HEIGHT = 14;
export const TAPE_SUB_TICK_HEIGHT = 10;
export const TAPE_FILL_HEIGHT = 14;
export const TAPE_FONT_SIZE = 24;
export const TAPE_ROW_LABEL_GAP = 16;
export const TAPE_SEG_LABEL_OFFSET = 16;
export const TAPE_BRACE_HEIGHT = 18;
export const TAPE_BRACE_GAP = 10;
export const TAPE_BRACE_LABEL_OFFSET = 15;

const RICH_MARKUP = /\[([^\]]*)\]\(([^)]*)\)/;

export interface TapeBraceSpec {
  row: number;
  from: number;
  to: number;
  label?: string;
  side?: TapeBraceSide;
}

export interface TapeSegmentLayout {
  rowIndex: number;
  segIndex: number;
  rowNumber: number;
  segNumber: number;
  globalIndex: number;
  name: string;
  len: number;
  fullWidth: number;
  drawnWidth: number;
  start: Point;
  end: Point;
  drawnEnd: Point;
  x1: number;
  x2: number;
  drawnX2: number;
  y: number;
  color: string;
  label: string;
  labelCenter: Point;
  labelBox?: Box;
  progress: number;
  visible: boolean;
  subBox: Box;
}

export interface TapeTickLayout {
  x: number;
  y1: number;
  y2: number;
  kind: 'boundary' | 'sub';
}

export interface TapeRowLayout {
  rowIndex: number;
  rowNumber: number;
  name: string;
  y: number;
  x1: number;
  x2: number;
  drawnX2: number;
  fullWidth: number;
  drawnWidth: number;
  rowLabel: string;
  rowLabelAnchor: Point;
  rowLabelBox?: Box;
  segments: TapeSegmentLayout[];
  boundaryTicks: TapeTickLayout[];
  subTicks: TapeTickLayout[];
  tickParts: number;
  visible: boolean;
  opacity: number;
  box: Box;
}

export interface TapeBraceLayout {
  index: number;
  braceNumber: number;
  name: string;
  row: number;
  from: number;
  to: number;
  side: TapeBraceSide;
  x1: number;
  x2: number;
  midX: number;
  baseY: number;
  tipY: number;
  tip: Point;
  path: string;
  label: string;
  labelCenter: Point;
  labelBox?: Box;
  opacity: number;
  visible: boolean;
  box: Box;
}

export interface TapeFillBarLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  ratio: number;
  rowFullWidth: number;
}

export interface TapeDiagramLayout {
  at: Point;
  unit: number;
  rowGap: number;
  reveal: number;
  fill: number;
  labelPos: TapeLabelPos;
  rows: TapeRowLayout[];
  segments: TapeSegmentLayout[];
  braces: TapeBraceLayout[];
  fillBar?: TapeFillBarLayout;
  box: Box;
}

/** 兼容数字及参数填充后的数字字符串 */
function toNum(v: unknown, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const parsed = Number(v);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function unionBoxes(boxes: Box[], fallback: Box): Box {
  if (boxes.length === 0) return fallback;
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
  return {
    x: minX,
    y: minY,
    w: Math.max(1, maxX - minX),
    h: Math.max(1, maxY - minY),
  };
}

function richTextBox(cx: number, cy: number, raw: string, size: number): Box {
  const spans = richSpans(raw);
  const hasFrac = spans.some((s) => !!s.frac);
  const w = Math.max(textWidth(raw, size), size * 0.6);
  const h = size * (hasFrac ? 1.6 : 1.25);
  return boxAround(cx, cy, w, h);
}

/** 二次贝塞尔曲线绘制标准水平花括号（两端向内弯、中间尖端向外凸，高 H） */
export function buildCurlyBracePath(
  x1: number,
  x2: number,
  baseY: number,
  side: TapeBraceSide,
  height = TAPE_BRACE_HEIGHT,
): { path: string; midX: number; tipY: number } {
  const left = Math.min(x1, x2);
  const right = Math.max(x1, x2);
  const w = Math.max(0, right - left);
  const xm = (left + right) / 2;
  const dir = side === 'top' ? -1 : 1;
  const spineY = baseY + dir * (height / 2);
  const tipY = baseY + dir * height;
  const r = Math.min(12, w / 4);

  const path = [
    `M ${left} ${baseY}`,
    `Q ${left} ${spineY} ${left + r} ${spineY}`,
    `L ${xm - r} ${spineY}`,
    `Q ${xm} ${spineY} ${xm} ${tipY}`,
    `Q ${xm} ${spineY} ${xm + r} ${spineY}`,
    `L ${right - r} ${spineY}`,
    `Q ${right} ${spineY} ${right} ${baseY}`,
  ].join(' ');

  return { path, midX: xm, tipY };
}

/** 将配置中的数字字符串规范化为数值，保证引擎 blend 连续插值 */
export function normalizeTapeDiagramProps(raw: Props): Props {
  const out: Props = { ...raw };
  if (Array.isArray(raw.lens)) {
    out.lens = raw.lens.map((row) =>
      Array.isArray(row) ? row.map((v) => toNum(v, 0)) : [],
    );
  }
  if (Array.isArray(raw.ticks)) {
    out.ticks = raw.ticks.map((v) => Math.max(1, Math.round(toNum(v, 1))));
  }
  if (raw.unit !== undefined) out.unit = toNum(raw.unit, 60);
  if (raw.rowGap !== undefined) out.rowGap = toNum(raw.rowGap, 70);
  if (raw.reveal !== undefined) out.reveal = toNum(raw.reveal, 9999);
  if (raw.fill !== undefined) out.fill = toNum(raw.fill, 0);
  return out;
}

/** 线段图纯几何布局计算（不依赖 DOM） */
export function tapeDiagramLayout(p: Props): TapeDiagramLayout {
  const at = pt(p.at);
  const [x0, y0] = at;
  const unit = Math.max(1, toNum(p.unit, 60));
  const rowGap = Math.max(1, toNum(p.rowGap, 70));
  const hasExplicitReveal = p.reveal !== undefined;
  const reveal = Math.max(0, toNum(p.reveal, 9999));
  const fillRatio = Math.max(0, Math.min(1, toNum(p.fill, 0)));
  const labelPos: TapeLabelPos = p.labelPos === 'inside' ? 'inside' : 'above';

  const rawLens = Array.isArray(p.lens) ? p.lens : [];
  const rawSegLabels = Array.isArray(p.segLabels) ? p.segLabels : [];
  const rawSegColors = Array.isArray(p.segColors) ? p.segColors : [];
  const rawRowLabels = Array.isArray(p.rowLabels) ? p.rowLabels : [];
  const rawTicks = Array.isArray(p.ticks) ? p.ticks : [];
  const rawBraces = Array.isArray(p.braces) ? p.braces : [];

  const rows: TapeRowLayout[] = [];
  const allSegments: TapeSegmentLayout[] = [];
  const visibleBoxes: Box[] = [];

  let globalIdx = 0;

  for (let r = 0; r < rawLens.length; r++) {
    const rowArr = Array.isArray(rawLens[r]) ? rawLens[r] : [];
    const labelArr = Array.isArray(rawSegLabels[r]) ? rawSegLabels[r] : [];
    const colorArr = Array.isArray(rawSegColors[r]) ? rawSegColors[r] : [];
    const rowY = y0 + r * rowGap;
    const rowLabel = rawRowLabels[r] !== undefined ? str(rawRowLabels[r]) : '';
    const tickParts = Math.max(1, Math.round(toNum(rawTicks[r], 1)));

    let curX = x0;
    const rowSegments: TapeSegmentLayout[] = [];

    for (let s = 0; s < rowArr.length; s++) {
      const segLen = Math.max(0, toNum(rowArr[s], 0));
      const fullWidth = segLen * unit;
      const segX1 = curX;
      const segX2 = curX + fullWidth;
      curX = segX2;

      const progress = Math.max(0, Math.min(1, reveal - globalIdx));
      const visible = progress > 0;
      const drawnWidth = fullWidth * progress;
      const drawnX2 = segX1 + drawnWidth;

      const defaultCol = DEFAULT_SEG_COLORS[s % DEFAULT_SEG_COLORS.length];
      const rawCol = colorArr[s];
      const segCol =
        typeof rawCol === 'string' && rawCol.trim() !== ''
          ? rawCol.trim()
          : typeof p.color === 'string' && p.color.trim() !== ''
            ? p.color.trim()
            : defaultCol;

      const segLabel = labelArr[s] !== undefined ? str(labelArr[s]) : '';
      const labelCenterX =
        progress >= 1 || !visible ? (segX1 + segX2) / 2 : (segX1 + drawnX2) / 2;
      const labelCenterY =
        labelPos === 'above' ? rowY - TAPE_SEG_LABEL_OFFSET : rowY;
      const labelCenter: Point = [labelCenterX, labelCenterY];
      const labelBox =
        segLabel !== ''
          ? richTextBox(labelCenterX, labelCenterY, segLabel, TAPE_FONT_SIZE)
          : undefined;

      // 子项包围盒：适当上下外扩（至少高 24），若上方有文字也一并纳入
      const baseSegBox: Box = {
        x: fullWidth >= 16 ? segX1 : (segX1 + segX2) / 2 - 8,
        y: rowY - 12,
        w: Math.max(16, fullWidth),
        h: 24,
      };
      const subBox = labelBox ? unionBoxes([baseSegBox, labelBox], baseSegBox) : baseSegBox;

      const segLayout: TapeSegmentLayout = {
        rowIndex: r,
        segIndex: s,
        rowNumber: r + 1,
        segNumber: s + 1,
        globalIndex: globalIdx,
        name: `seg.${r + 1}.${s + 1}`,
        len: segLen,
        fullWidth,
        drawnWidth,
        start: [segX1, rowY],
        end: [segX2, rowY],
        drawnEnd: [drawnX2, rowY],
        x1: segX1,
        x2: segX2,
        drawnX2,
        y: rowY,
        color: segCol,
        label: segLabel,
        labelCenter,
        labelBox,
        progress,
        visible,
        subBox,
      };

      rowSegments.push(segLayout);
      allSegments.push(segLayout);

      if (visible) {
        visibleBoxes.push({
          x: segX1 - TAPE_STROKE_WIDTH / 2,
          y: rowY - TAPE_END_TICK_HEIGHT / 2,
          w: Math.max(1, drawnWidth) + TAPE_STROKE_WIDTH,
          h: TAPE_END_TICK_HEIGHT,
        });
        if (labelBox) {
          visibleBoxes.push(labelBox);
        }
      }

      globalIdx++;
    }

    const rowFullWidth = curX - x0;
    const rowDrawnX2 = rowSegments.reduce(
      (mx, seg) => (seg.visible ? Math.max(mx, seg.drawnX2) : mx),
      x0,
    );
    const rowDrawnWidth = rowDrawnX2 - x0;
    const anySegVisible = rowSegments.some((seg) => seg.visible);
    const rowVisible =
      !hasExplicitReveal || rowSegments.length === 0 || anySegVisible;
    const rowOpacity = rowSegments.length > 0 && hasExplicitReveal
      ? Math.min(1, (rowSegments[0]?.progress ?? 0) * 2)
      : 1;

    // 分界竖线（高 14，相邻段共用同一 x 坐标）
    const boundaryXs: number[] = [];
    const pushUniqueX = (xv: number) => {
      if (!boundaryXs.some((bx) => Math.abs(bx - xv) < 0.5)) {
        boundaryXs.push(xv);
      }
    };
    if (anySegVisible) {
      pushUniqueX(x0);
      for (const seg of rowSegments) {
        if (seg.progress >= 1 - 1e-6) {
          pushUniqueX(seg.x2);
        }
      }
    }
    const boundaryTicks: TapeTickLayout[] = boundaryXs.map((tx) => ({
      x: tx,
      y1: rowY - TAPE_END_TICK_HEIGHT / 2,
      y2: rowY + TAPE_END_TICK_HEIGHT / 2,
      kind: 'boundary',
    }));

    // 等分刻度竖线（高 10）
    const subTicks: TapeTickLayout[] = [];
    if (tickParts > 1 && rowFullWidth > 0 && anySegVisible) {
      const stepPx = rowFullWidth / tickParts;
      for (let k = 1; k < tickParts; k++) {
        const tx = x0 + k * stepPx;
        if (tx > rowDrawnX2 + 1e-6) continue;
        if (boundaryXs.some((bx) => Math.abs(bx - tx) < 0.5)) continue;
        subTicks.push({
          x: tx,
          y1: rowY - TAPE_SUB_TICK_HEIGHT / 2,
          y2: rowY + TAPE_SUB_TICK_HEIGHT / 2,
          kind: 'sub',
        });
      }
    }

    // 行首名称：右对齐到 at.x - 16
    const rowLabelAnchor: Point = [x0 - TAPE_ROW_LABEL_GAP, rowY];
    let rowLabelBox: Box | undefined;
    if (rowLabel !== '') {
      const spans = richSpans(rowLabel);
      const hasFrac = spans.some((s) => !!s.frac);
      const rw = Math.max(textWidth(rowLabel, TAPE_FONT_SIZE), TAPE_FONT_SIZE * 0.6);
      const rh = TAPE_FONT_SIZE * (hasFrac ? 1.6 : 1.25);
      rowLabelBox = {
        x: rowLabelAnchor[0] - rw,
        y: rowY - rh / 2,
        w: rw,
        h: rh,
      };
      if (rowVisible) {
        visibleBoxes.push(rowLabelBox);
      }
    }

    const rowLineBox: Box = {
      x: x0,
      y: rowY - 12,
      w: Math.max(16, rowFullWidth),
      h: 24,
    };
    const rowSubItemsToUnion: Box[] = [
      rowLineBox,
      ...rowSegments.map((seg) => seg.subBox),
      ...(rowLabelBox ? [rowLabelBox] : []),
    ];
    const rowBox = unionBoxes(rowSubItemsToUnion, rowLineBox);

    rows.push({
      rowIndex: r,
      rowNumber: r + 1,
      name: `row.${r + 1}`,
      y: rowY,
      x1: x0,
      x2: x0 + rowFullWidth,
      drawnX2: rowDrawnX2,
      fullWidth: rowFullWidth,
      drawnWidth: rowDrawnWidth,
      rowLabel,
      rowLabelAnchor,
      rowLabelBox,
      segments: rowSegments,
      boundaryTicks,
      subTicks,
      tickParts,
      visible: rowVisible,
      opacity: rowOpacity,
      box: rowBox,
    });
  }

  // 第一行进度填色条（工程问题 fill 0..1）
  let fillBar: TapeFillBarLayout | undefined;
  if (rows.length > 0) {
    const row0FullWidth = rows[0].fullWidth;
    const fillW = row0FullWidth * fillRatio;
    fillBar = {
      x: x0,
      y: y0 - TAPE_FILL_HEIGHT / 2,
      w: fillW,
      h: TAPE_FILL_HEIGHT,
      ratio: fillRatio,
      rowFullWidth: row0FullWidth,
    };
    if (fillW > 0) {
      visibleBoxes.push({
        x: fillBar.x,
        y: fillBar.y,
        w: fillBar.w,
        h: fillBar.h,
      });
    }
  }

  // 大括号布局
  const braces: TapeBraceLayout[] = [];
  for (let i = 0; i < rawBraces.length; i++) {
    const bRaw = rawBraces[i];
    if (!bRaw || typeof bRaw !== 'object' || Array.isArray(bRaw)) continue;
    const rec = bRaw as Record<string, unknown>;
    const rowNum = Math.round(toNum(rec.row, 1));
    const fromNum = Math.round(toNum(rec.from, 1));
    const toNumVal = Math.round(toNum(rec.to, fromNum));
    const side: TapeBraceSide = rec.side === 'top' ? 'top' : 'bottom';
    const bLabel = rec.label !== undefined ? str(rec.label) : '';

    const targetRow = rows[rowNum - 1];
    if (!targetRow || targetRow.segments.length === 0) continue;

    const clampedFrom = Math.max(1, Math.min(targetRow.segments.length, fromNum));
    const clampedTo = Math.max(clampedFrom, Math.min(targetRow.segments.length, toNumVal));
    const startSeg = targetRow.segments[clampedFrom - 1];
    const endSeg = targetRow.segments[clampedTo - 1];

    const bx1 = startSeg.x1;
    const bx2 = endSeg.x2;

    // 若同侧在被括范围内有段文字，避开段文字以防重叠
    const spannedSegs = targetRow.segments.slice(clampedFrom - 1, clampedTo);
    const hasSpannedLabels = spannedSegs.some((s) => s.label !== '');

    let baseY: number;
    if (side === 'top') {
      baseY =
        labelPos === 'above' && hasSpannedLabels
          ? targetRow.y - 28
          : targetRow.y - TAPE_BRACE_GAP;
    } else {
      baseY =
        labelPos === 'inside' && hasSpannedLabels
          ? targetRow.y + 14
          : targetRow.y + TAPE_BRACE_GAP;
    }

    // 同行同侧若有水平重叠的已有大括号，向外再错开一层
    for (const prev of braces) {
      if (
        prev.row === rowNum &&
        prev.side === side &&
        Math.min(prev.x2, bx2) > Math.max(prev.x1, bx1) + 1e-6
      ) {
        const shift = prev.label !== '' ? 46 : 24;
        baseY = side === 'top' ? Math.min(baseY, prev.baseY - shift) : Math.max(baseY, prev.baseY + shift);
      }
    }

    const { path, midX, tipY } = buildCurlyBracePath(
      bx1,
      bx2,
      baseY,
      side,
      TAPE_BRACE_HEIGHT,
    );
    const dir = side === 'top' ? -1 : 1;
    const labelY = tipY + dir * TAPE_BRACE_LABEL_OFFSET;
    const labelCenter: Point = [midX, labelY];
    const labelBox =
      bLabel !== ''
        ? richTextBox(midX, labelY, bLabel, TAPE_FONT_SIZE)
        : undefined;

    const opacity = hasExplicitReveal ? endSeg.progress : 1;
    const visible = opacity > 0;

    const curveBox: Box = {
      x: bx1,
      y: Math.min(baseY, tipY) - 2,
      w: Math.max(16, bx2 - bx1),
      h: Math.max(20, Math.abs(tipY - baseY) + 4),
    };
    const braceBox = labelBox ? unionBoxes([curveBox, labelBox], curveBox) : curveBox;

    braces.push({
      index: i,
      braceNumber: braces.length + 1,
      name: `brace.${braces.length + 1}`,
      row: rowNum,
      from: clampedFrom,
      to: clampedTo,
      side,
      x1: bx1,
      x2: bx2,
      midX,
      baseY,
      tipY,
      tip: [midX, tipY],
      path,
      label: bLabel,
      labelCenter,
      labelBox,
      opacity,
      visible,
      box: braceBox,
    });

    if (visible) {
      visibleBoxes.push(braceBox);
    }
  }

  const fallbackBox: Box = {
    x: x0,
    y: y0 - TAPE_END_TICK_HEIGHT / 2,
    w: unit,
    h: TAPE_END_TICK_HEIGHT,
  };
  const box = unionBoxes(visibleBoxes, fallbackBox);

  return {
    at,
    unit,
    rowGap,
    reveal,
    fill: fillRatio,
    labelPos,
    rows,
    segments: allSegments,
    braces,
    fillBar,
    box,
  };
}

type Refs = Record<string, { color?: unknown; highlight?: number }>;

function resolveColorName(
  raw: string,
  refs: Refs | undefined,
  theme: PartContext['theme'],
  fallback = 'ink',
): string {
  if (raw.startsWith('@') && refs) {
    const refCol = refs[raw.slice(1)]?.color;
    if (typeof refCol === 'string' && refCol) {
      return color(refCol, theme, fallback);
    }
  }
  return color(raw, theme, fallback);
}

const renderTapeDiagram = ({ p, ctx }: { p: Props; ctx: PartContext }) => {
  const L = tapeDiagramLayout(p);
  const subColors =
    p._subColors && typeof p._subColors === 'object'
      ? (p._subColors as Record<string, string>)
      : undefined;
  const refs = p.refs && typeof p.refs === 'object' ? (p.refs as Refs) : undefined;

  const inkCol = color('ink', ctx.theme);
  const accentCol = color('accent', ctx.theme);

  return (
    <g>
      {/* 第一行工程进度填充条 */}
      {L.fillBar && L.fillBar.w > 0 ? (
        <rect
          x={L.fillBar.x}
          y={L.fillBar.y}
          width={L.fillBar.w}
          height={L.fillBar.h}
          rx={2}
          fill={accentCol}
          fillOpacity={0.4}
        />
      ) : null}

      {/* 各行线段、分界竖线、等分刻度与文字 */}
      {L.rows.map((row) => (
        <g key={row.name}>
          {/* 行首标签（右对齐到 at.x - 16） */}
          {row.rowLabel !== '' && row.visible ? (
            <g opacity={row.opacity}>
              {RICH_MARKUP.test(row.rowLabel) && row.rowLabelBox ? (
                <RichLine
                  p={p}
                  text={row.rowLabel}
                  theme={ctx.theme}
                  x={row.rowLabelBox.x + row.rowLabelBox.w / 2}
                  y={row.y}
                  size={TAPE_FONT_SIZE}
                  fill={
                    subColors?.[row.name]
                      ? resolveColorName(subColors[row.name], refs, ctx.theme)
                      : inkCol
                  }
                  weight="bold"
                />
              ) : (
                <text
                  x={row.rowLabelAnchor[0]}
                  y={row.rowLabelAnchor[1]}
                  textAnchor="end"
                  dominantBaseline="central"
                  fontSize={TAPE_FONT_SIZE}
                  fontWeight="bold"
                  fill={
                    subColors?.[row.name]
                      ? resolveColorName(subColors[row.name], refs, ctx.theme)
                      : inkCol
                  }
                >
                  {row.rowLabel}
                </text>
              )}
            </g>
          ) : null}

          {/* 各段水平线 */}
          {row.segments.map((seg) => {
            if (!seg.visible || seg.drawnWidth <= 0) return null;
            const colOverride = subColors?.[seg.name] ?? subColors?.[row.name];
            const segStroke = resolveColorName(
              colOverride ?? seg.color,
              refs,
              ctx.theme,
              'blue',
            );
            return (
              <line
                key={seg.name}
                x1={seg.x1}
                y1={seg.y}
                x2={seg.drawnX2}
                y2={seg.y}
                stroke={segStroke}
                strokeWidth={TAPE_STROKE_WIDTH}
                strokeLinecap="butt"
              />
            );
          })}

          {/* 等分短竖线（高 10） */}
          {row.subTicks.map((tk, idx) => (
            <line
              key={`subtick-${row.rowNumber}-${idx}`}
              x1={tk.x}
              y1={tk.y1}
              x2={tk.x}
              y2={tk.y2}
              stroke={inkCol}
              strokeWidth={2}
              strokeLinecap="round"
            />
          ))}

          {/* 两端及段间共用分界竖线（高 14） */}
          {row.boundaryTicks.map((tk, idx) => (
            <line
              key={`btick-${row.rowNumber}-${idx}`}
              x1={tk.x}
              y1={tk.y1}
              x2={tk.x}
              y2={tk.y2}
              stroke={inkCol}
              strokeWidth={3}
              strokeLinecap="round"
            />
          ))}

          {/* 段文字（above 在上方 16px 居中；inside 在段中心衬底色显示） */}
          {row.segments.map((seg) => {
            if (!seg.visible || seg.label === '') return null;
            const colOverride = subColors?.[seg.name] ?? subColors?.[row.name];
            const labelFill = colOverride
              ? resolveColorName(colOverride, refs, ctx.theme)
              : inkCol;
            return (
              <g key={`lbl-${seg.name}`} opacity={seg.progress}>
                {L.labelPos === 'inside' && seg.labelBox ? (
                  <rect
                    x={seg.labelBox.x - 4}
                    y={seg.labelBox.y + 2}
                    width={seg.labelBox.w + 8}
                    height={Math.max(16, seg.labelBox.h - 4)}
                    rx={4}
                    fill={ctx.theme.stageBg}
                  />
                ) : null}
                <RichLine
                  p={p}
                  text={seg.label}
                  theme={ctx.theme}
                  x={seg.labelCenter[0]}
                  y={seg.labelCenter[1]}
                  size={TAPE_FONT_SIZE}
                  fill={labelFill}
                  weight="bold"
                />
              </g>
            );
          })}
        </g>
      ))}

      {/* 花括号及外侧标签 */}
      {L.braces.map((br) => {
        if (!br.visible) return null;
        const braceCol = subColors?.[br.name]
          ? resolveColorName(subColors[br.name], refs, ctx.theme)
          : inkCol;
        return (
          <g key={br.name} opacity={br.opacity}>
            <path
              d={br.path}
              fill="none"
              stroke={braceCol}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {br.label !== '' ? (
              <RichLine
                p={p}
                text={br.label}
                theme={ctx.theme}
                x={br.labelCenter[0]}
                y={br.labelCenter[1]}
                size={TAPE_FONT_SIZE}
                fill={braceCol}
                weight="bold"
              />
            ) : null}
          </g>
        );
      })}
    </g>
  );
};

export const tapeDiagramPart: PartDef = {
  type: 'tape-diagram',
  name: '线段图',
  anchor: 'start',
  required: ['lens'],
  props: [
    'lens',
    'segLabels',
    'segColors',
    'rowLabels',
    'unit',
    'rowGap',
    'braces',
    'ticks',
    'reveal',
    'fill',
    'labelPos',
  ],
  normalize: normalizeTapeDiagramProps,
  bbox(p: Props): Box {
    return tapeDiagramLayout(p).box;
  },
  subitems(p: Props): Subitem[] {
    const L = tapeDiagramLayout(p);
    const items: Subitem[] = [];

    for (const seg of L.segments) {
      items.push({
        name: seg.name,
        box: seg.subBox,
        label: seg.label || String(seg.len),
        value: seg.len,
        disabled: !seg.visible,
      });
    }

    for (const br of L.braces) {
      items.push({
        name: br.name,
        box: br.box,
        label: br.label || br.name,
        disabled: !br.visible,
      });
    }

    for (const row of L.rows) {
      items.push({
        name: row.name,
        box: row.box,
        label: row.rowLabel || row.name,
        value: row.segments.reduce((sum, s) => sum + s.len, 0),
        disabled: !row.visible,
      });
    }

    return items;
  },
  Render: renderTapeDiagram,
};
