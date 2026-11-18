// 行程图零件（任务卡 B22）：跑道、两端地名、相向/同向运动人物、相遇截断、已走路程与剩余路程、时刻竖标。
import { formatNumber } from '@flow-see/core';
import {
  boxAround,
  color,
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

export type TrackMoverFrom = 0 | 1;
export type TrackLane = 'top' | 'bottom';

export interface TrackMoverInput {
  from: TrackMoverFrom;
  speed: number | string;
  asset?: string;
  color?: string;
  label?: string;
}

export interface TrackLabels {
  gap?: string;
  minute?: string;
  [key: string]: string | undefined;
}

export interface TrackTraveledLineLayout {
  x1: number;
  x2: number;
  y: number;
  label: string;
  labelPos: Point;
  labelBox: Box;
}

export interface TrackMoverLayout {
  index: number;
  from: TrackMoverFrom;
  lane: TrackLane;
  speed: number;
  asset?: string;
  color: string;
  label?: string;
  pos: number;
  traveled: number;
  x: number;
  iconCenter: Point;
  iconSize: number;
  iconBox: Box;
  labelPos?: Point;
  labelBox?: Box;
  traveledLine?: TrackTraveledLineLayout;
  box: Box;
}

export interface TrackGapLayout {
  distance: number;
  visible: boolean;
  startPos: number;
  endPos: number;
  x1: number;
  x2: number;
  y: number;
  label: string;
  labelPos: Point;
  labelBox: Box;
  box: Box;
}

export interface TrackMarkItem {
  moverIndex: number;
  lane: TrackLane;
  minute: number;
  pos: number;
  x: number;
  tickY1: number;
  tickY2: number;
  label: string;
  labelPos: Point;
  labelBox: Box;
  color: string;
}

export interface TrackEndLayout {
  text: string;
  x: number;
  y: number;
  anchor: 'start' | 'end';
  box: Box;
}

export interface TrackLayoutResult {
  at: Point;
  x0: number;
  x1: number;
  y0: number;
  length: number;
  distance: number;
  unitText: string;
  t: number;
  effectiveT: number;
  meetTime: number | null;
  meetPos: number | null;
  meetX: number | null;
  hasMet: boolean;
  showGap: boolean;
  labels: { gap: string; minute: string };
  ends: [TrackEndLayout, TrackEndLayout];
  movers: TrackMoverLayout[];
  gap: TrackGapLayout;
  marks: TrackMarkItem[];
  bbox: Box;
}

export const TRACK_LINE_WIDTH = 6;
export const TRACK_END_POST_HALF = 12;
export const TRACK_END_FONT_SIZE = 24;
export const TRACK_END_GAP = 10;
export const TRACK_ICON_SIZE = 56;
export const TRACK_TRAVELED_WIDTH = 8;
export const TRACK_TRAVELED_FONT_SIZE = 20;
export const TRACK_GAP_FONT_SIZE = 18;
export const TRACK_MOVER_LABEL_SIZE = 18;
export const TRACK_MARK_FONT_SIZE = 15;

const DEFAULT_MOVER_COLORS = ['blue', 'orange', 'green', 'purple'] as const;

function toFiniteNum(v: unknown, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const parsed = Number(v);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function roundClean(v: number): number {
  return Math.round(v * 100) / 100;
}

function mergeBoxes(boxes: Box[]): Box {
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

interface TrackStyleDefaults {
  length: number;
  distance: number;
  unitText: string;
  ends: [string, string];
  showGap: boolean;
  labels: { gap: string; minute: string };
}

function getTrackDefaults(): TrackStyleDefaults {
  let raw: Record<string, unknown> = {};
  try {
    raw = (sceneStyle().parts.track as Record<string, unknown> | undefined) ?? {};
  } catch {
    // Fallback when sceneStyle is not yet configured
  }
  const rawEnds = Array.isArray(raw.ends) ? raw.ends : [];
  const rawLabels =
    raw.labels && typeof raw.labels === 'object' ? (raw.labels as Record<string, unknown>) : {};
  return {
    length: toFiniteNum(raw.length, 600),
    distance: toFiniteNum(raw.distance, 500),
    unitText: typeof raw.unitText === 'string' ? raw.unitText : 'm',
    ends: [
      rawEnds[0] !== undefined ? str(rawEnds[0], 'A') : 'A',
      rawEnds[1] !== undefined ? str(rawEnds[1], 'B') : 'B',
    ],
    showGap: typeof raw.showGap === 'boolean' ? raw.showGap : true,
    labels: {
      gap: typeof rawLabels.gap === 'string' ? rawLabels.gap : '{d} {u}',
      minute: typeof rawLabels.minute === 'string' ? rawLabels.minute : '{n} min',
    },
  };
}

export function trackLabelsOf(p: Props): { gap: string; minute: string } {
  const defs = getTrackDefaults().labels;
  const custom =
    p.labels && typeof p.labels === 'object' ? (p.labels as Record<string, unknown>) : {};
  return {
    gap: typeof custom.gap === 'string' ? custom.gap : defs.gap,
    minute: typeof custom.minute === 'string' ? custom.minute : defs.minute,
  };
}

function formatGapText(template: string, dist: number, unitText: string): string {
  return template
    .replaceAll('{d}', formatNumber(roundClean(dist)))
    .replaceAll('{u}', unitText)
    .trim();
}

function formatMinuteText(template: string, minute: number): string {
  return template.replaceAll('{n}', formatNumber(roundClean(minute)));
}

/**
 * 纯函数计算行程图所有几何坐标、运动学相遇截断与完整包围盒。
 * 不依赖 DOM / 浏览器环境，可直接用于单元测试。
 */
export function trackLayout(p: Props): TrackLayoutResult {
  const defs = getTrackDefaults();
  const [x0, y0] = pt(p.at, [0, 0]);
  const length = Math.max(1, toFiniteNum(p.length, defs.length));
  const distance = Math.max(1e-6, toFiniteNum(p.distance, defs.distance));
  const x1 = x0 + length;
  const unitText = p.unitText !== undefined ? str(p.unitText, defs.unitText) : defs.unitText;
  const rawT = Math.max(0, toFiniteNum(p.t, 0));
  const showGap = typeof p.showGap === 'boolean' ? p.showGap : defs.showGap;
  const labels = trackLabelsOf(p);

  const rawEnds = Array.isArray(p.ends) ? p.ends : defs.ends;
  const leftEndText = rawEnds[0] !== undefined ? str(rawEnds[0], defs.ends[0]) : defs.ends[0];
  const rightEndText = rawEnds[1] !== undefined ? str(rawEnds[1], defs.ends[1]) : defs.ends[1];

  const posToX = (pos: number) => x0 + (clamp(pos, 0, distance) / distance) * length;

  // 1. 解析 movers 与通道分配（from: 0 默认在上，from: 1 默认在下；同向多人时自动上下错开）
  interface ParsedMover {
    index: number;
    from: TrackMoverFrom;
    lane: TrackLane;
    speed: number;
    asset?: string;
    color: string;
    label?: string;
  }

  const rawMovers = Array.isArray(p.movers) ? p.movers : [];
  let topUsed = false;
  let bottomUsed = false;
  const parsedMovers: ParsedMover[] = [];

  for (let i = 0; i < rawMovers.length; i++) {
    const raw = rawMovers[i];
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    const fromNum = toFiniteNum(item.from, 0);
    const from: TrackMoverFrom = fromNum === 1 ? 1 : 0;
    const speed = Math.max(0, toFiniteNum(item.speed, 0));
    const asset = typeof item.asset === 'string' && item.asset.trim() !== '' ? item.asset : undefined;
    const defaultCol = DEFAULT_MOVER_COLORS[i % DEFAULT_MOVER_COLORS.length];
    const moverColor =
      typeof item.color === 'string' && item.color.trim() !== '' ? item.color : defaultCol;
    const label =
      item.label !== undefined && str(item.label) !== '' ? str(item.label) : undefined;

    let lane: TrackLane;
    if (from === 0) {
      if (!topUsed) {
        lane = 'top';
        topUsed = true;
      } else if (!bottomUsed) {
        lane = 'bottom';
        bottomUsed = true;
      } else {
        lane = 'top';
      }
    } else {
      if (!bottomUsed) {
        lane = 'bottom';
        bottomUsed = true;
      } else if (!topUsed) {
        lane = 'top';
        topUsed = true;
      } else {
        lane = 'bottom';
      }
    }

    parsedMovers.push({
      index: i + 1,
      from,
      lane,
      speed,
      asset,
      color: moverColor,
      label,
    });
  }

  // 2. 相遇时刻与相遇截断计算
  const primaryLeft =
    parsedMovers.find((m) => m.from === 0 && m.speed > 0) ??
    parsedMovers.find((m) => m.from === 0);
  const primaryRight =
    parsedMovers.find((m) => m.from === 1 && m.speed > 0) ??
    parsedMovers.find((m) => m.from === 1);

  let meetTime: number | null = null;
  let meetPos: number | null = null;
  let meetX: number | null = null;
  let hasMet = false;

  if (primaryLeft && primaryRight && primaryLeft.speed + primaryRight.speed > 0) {
    const sumSpeed = primaryLeft.speed + primaryRight.speed;
    meetTime = distance / sumSpeed;
    meetPos = (primaryLeft.speed / sumSpeed) * distance;
    meetX = posToX(meetPos);
    hasMet = rawT >= meetTime - 1e-9;
  }

  const effectiveT = meetTime !== null && hasMet ? meetTime : rawT;

  // 3. 解析 marks 时刻列表（过滤有效非负数）
  const rawMarks = Array.isArray(p.marks) ? p.marks : [];
  const validMarkMinutes: number[] = [];
  for (const mk of rawMarks) {
    const mVal = toFiniteNum(mk, NaN);
    if (Number.isFinite(mVal) && mVal >= 0) {
      validMarkMinutes.push(mVal);
    }
  }
  const hasMarks = validMarkMinutes.length > 0 && parsedMovers.length > 0;

  // 垂直分层偏移常量（确保各层文字、图标、粗线绝不重叠）
  const traveledBarOffset = 15;
  const traveledTextOffset = 33;
  const markTextOffset = showGap ? 52 : 33;
  const iconCenterOffset = hasMarks && showGap ? 90 : 73;
  const moverLabelOffset = iconCenterOffset + 39;

  // 4. 两端地名布局
  const leftEndW = leftEndText ? textWidth(leftEndText, TRACK_END_FONT_SIZE) : 0;
  const rightEndW = rightEndText ? textWidth(rightEndText, TRACK_END_FONT_SIZE) : 0;
  const leftEndX = x0 - TRACK_END_GAP;
  const rightEndX = x1 + TRACK_END_GAP;

  const leftEndLayout: TrackEndLayout = {
    text: leftEndText,
    x: leftEndX,
    y: y0,
    anchor: 'end',
    box: {
      x: leftEndX - leftEndW,
      y: y0 - TRACK_END_FONT_SIZE / 2,
      w: leftEndW,
      h: TRACK_END_FONT_SIZE,
    },
  };

  const rightEndLayout: TrackEndLayout = {
    text: rightEndText,
    x: rightEndX,
    y: y0,
    anchor: 'start',
    box: {
      x: rightEndX,
      y: y0 - TRACK_END_FONT_SIZE / 2,
      w: rightEndW,
      h: TRACK_END_FONT_SIZE,
    },
  };

  const allBoxes: Box[] = [
    // 跑道主线与两端竖标
    {
      x: x0 - 2,
      y: y0 - TRACK_END_POST_HALF,
      w: length + 4,
      h: TRACK_END_POST_HALF * 2,
    },
  ];
  if (leftEndText) allBoxes.push(leftEndLayout.box);
  if (rightEndText) allBoxes.push(rightEndLayout.box);

  // 5. 每个运动者的位置、图标、标签与已走路程线
  const moverLayouts: TrackMoverLayout[] = parsedMovers.map((m) => {
    const sign = m.lane === 'top' ? -1 : 1;
    let pos: number;
    if (
      hasMet &&
      meetPos !== null &&
      (m.index === primaryLeft?.index || m.index === primaryRight?.index)
    ) {
      pos = meetPos;
    } else if (m.from === 0) {
      pos = clamp(m.speed * effectiveT, 0, distance);
    } else {
      pos = clamp(distance - m.speed * effectiveT, 0, distance);
    }

    const traveled = m.from === 0 ? pos : distance - pos;
    const mx = posToX(pos);
    const my = y0 + sign * iconCenterOffset;
    const iconBox = boxAround(mx, my, TRACK_ICON_SIZE, TRACK_ICON_SIZE);

    let labelPos: Point | undefined;
    let labelBox: Box | undefined;
    if (m.label) {
      const ly = y0 + sign * moverLabelOffset;
      const lw = textWidth(m.label, TRACK_MOVER_LABEL_SIZE);
      labelPos = [mx, ly];
      labelBox = boxAround(mx, ly, lw, TRACK_MOVER_LABEL_SIZE);
    }

    let traveledLine: TrackTraveledLineLayout | undefined;
    if (showGap && traveled > 1e-4) {
      const startX = m.from === 0 ? x0 : x1;
      const endX = mx;
      const barY = y0 + sign * traveledBarOffset;
      const txtY = y0 + sign * traveledTextOffset;
      const txt = `${formatNumber(roundClean(traveled))}${unitText}`;
      const tw = textWidth(txt, TRACK_TRAVELED_FONT_SIZE);
      const midX = (startX + endX) / 2;
      const tBox = boxAround(midX, txtY, tw, TRACK_TRAVELED_FONT_SIZE);
      traveledLine = {
        x1: startX,
        x2: endX,
        y: barY,
        label: txt,
        labelPos: [midX, txtY],
        labelBox: tBox,
      };
      allBoxes.push(
        {
          x: Math.min(startX, endX),
          y: barY - TRACK_TRAVELED_WIDTH / 2,
          w: Math.abs(endX - startX),
          h: TRACK_TRAVELED_WIDTH,
        },
        tBox,
      );
    }

    const moverBox = labelBox ? mergeBoxes([iconBox, labelBox]) : iconBox;
    allBoxes.push(moverBox);

    return {
      index: m.index,
      from: m.from,
      lane: m.lane,
      speed: m.speed,
      asset: m.asset,
      color: m.color,
      label: m.label,
      pos,
      traveled,
      x: mx,
      iconCenter: [mx, my],
      iconSize: TRACK_ICON_SIZE,
      iconBox,
      labelPos,
      labelBox,
      traveledLine,
      box: moverBox,
    };
  });

  // 6. 中间剩余路程 gap 计算
  const leftMoverLayout =
    moverLayouts.find((m) => m.index === primaryLeft?.index) ??
    moverLayouts.find((m) => m.from === 0);
  const rightMoverLayout =
    moverLayouts.find((m) => m.index === primaryRight?.index) ??
    moverLayouts.find((m) => m.from === 1);

  let gapStartPos = 0;
  let gapEndPos = distance;
  let hasGapRelation = false;

  if (leftMoverLayout && rightMoverLayout) {
    gapStartPos = Math.min(leftMoverLayout.pos, rightMoverLayout.pos);
    gapEndPos = Math.max(leftMoverLayout.pos, rightMoverLayout.pos);
    hasGapRelation = true;
  } else if (moverLayouts.length === 1) {
    const single = moverLayouts[0];
    if (single.from === 0) {
      gapStartPos = single.pos;
      gapEndPos = distance;
    } else {
      gapStartPos = 0;
      gapEndPos = single.pos;
    }
    hasGapRelation = true;
  }

  const gapDist = hasGapRelation ? Math.max(0, gapEndPos - gapStartPos) : 0;
  const gapX1 = posToX(gapStartPos);
  const gapX2 = posToX(gapEndPos);
  const gapMidX = (gapX1 + gapX2) / 2;
  const gapVisible = showGap && hasGapRelation && gapDist > 1e-4;
  const gapText = formatGapText(labels.gap, gapDist, unitText);
  const gapTextW = textWidth(gapText, TRACK_GAP_FONT_SIZE) + 16;
  const gapPillH = TRACK_GAP_FONT_SIZE + 6;
  // 保持标签胶囊在跑道端点之内，避免遮挡两端地名
  const safeHalf = Math.min(gapTextW / 2, length / 2);
  const gapLabelX = clamp(gapMidX, x0 + safeHalf + 2, x1 - safeHalf - 2);
  const gapLabelBox = boxAround(gapLabelX, y0, gapTextW, gapPillH);

  const gapBox: Box =
    gapDist > 1e-4
      ? mergeBoxes([
          {
            x: gapX1,
            y: y0 - 16,
            w: Math.max(24, gapX2 - gapX1),
            h: 32,
          },
          ...(gapVisible ? [gapLabelBox] : []),
        ])
      : boxAround(meetX ?? gapMidX, y0, 28, 32);

  if (gapVisible) {
    allBoxes.push(gapLabelBox);
  }

  const gapLayout: TrackGapLayout = {
    distance: gapDist,
    visible: gapVisible,
    startPos: gapStartPos,
    endPos: gapEndPos,
    x1: gapX1,
    x2: gapX2,
    y: y0,
    label: gapText,
    labelPos: [gapLabelX, y0],
    labelBox: gapLabelBox,
    box: gapBox,
  };

  // 7. marks 时刻竖标与文字
  const markItems: TrackMarkItem[] = [];
  for (const mk of validMarkMinutes) {
    const effMk = meetTime !== null ? Math.min(mk, meetTime) : mk;
    const mkText = formatMinuteText(labels.minute, mk);
    const mkW = textWidth(mkText, TRACK_MARK_FONT_SIZE);

    for (const m of moverLayouts) {
      const sign = m.lane === 'top' ? -1 : 1;
      const mPos =
        m.from === 0
          ? clamp(m.speed * effMk, 0, distance)
          : clamp(distance - m.speed * effMk, 0, distance);
      const mx = posToX(mPos);
      const tickY1 = y0 + sign * 4;
      const tickY2 = y0 + sign * 22;
      const ly = y0 + sign * markTextOffset;
      const lBox = boxAround(mx, ly, mkW, TRACK_MARK_FONT_SIZE);

      markItems.push({
        moverIndex: m.index,
        lane: m.lane,
        minute: mk,
        pos: mPos,
        x: mx,
        tickY1,
        tickY2,
        label: mkText,
        labelPos: [mx, ly],
        labelBox: lBox,
        color: m.color,
      });
      allBoxes.push(
        {
          x: mx - 2,
          y: Math.min(tickY1, tickY2),
          w: 4,
          h: Math.abs(tickY2 - tickY1),
        },
        lBox,
      );
    }
  }

  // 8. 合并整体包围盒（留 2px 安全边距）
  const rawBbox = mergeBoxes(allBoxes);
  const pad = 2;
  const bbox: Box = {
    x: rawBbox.x - pad,
    y: rawBbox.y - pad,
    w: rawBbox.w + pad * 2,
    h: rawBbox.h + pad * 2,
  };

  return {
    at: [x0, y0],
    x0,
    x1,
    y0,
    length,
    distance,
    unitText,
    t: rawT,
    effectiveT,
    meetTime,
    meetPos,
    meetX,
    hasMet,
    showGap,
    labels,
    ends: [leftEndLayout, rightEndLayout],
    movers: moverLayouts,
    gap: gapLayout,
    marks: markItems,
    bbox,
  };
}

export const trackPart: PartDef = {
  type: 'track',
  name: '行程图',
  anchor: 'start',
  props: ['length', 'distance', 'unitText', 'ends', 'movers', 't', 'showGap', 'marks', 'labels'],
  bbox(p) {
    return trackLayout(p).bbox;
  },
  subitems(p): Subitem[] {
    const L = trackLayout(p);
    const items: Subitem[] = L.movers.map((m) => ({
      name: `mover.${m.index}`,
      box: m.box,
      label: m.label ?? String(m.index),
      value: roundClean(m.pos),
    }));
    items.push({
      name: 'gap',
      box: L.gap.box,
      label: L.gap.label,
      value: roundClean(L.gap.distance),
    });
    return items;
  },
  Render({ p, ctx }) {
    const L = trackLayout(p);
    const subColors =
      p._subColors && typeof p._subColors === 'object'
        ? (p._subColors as Record<string, string>)
        : undefined;

    const lineCol = color('line', ctx.theme);
    const inkCol = color(p.color, ctx.theme, 'ink');
    const gapCol = color(subColors?.gap, ctx.theme, 'accent');
    const bgCol = ctx.theme.stageBg;

    return (
      <g data-part="track">
        {/* 1. 跑道主线 */}
        <line
          x1={L.x0}
          y1={L.y0}
          x2={L.x1}
          y2={L.y0}
          stroke={lineCol}
          strokeWidth={TRACK_LINE_WIDTH}
          strokeLinecap="round"
        />

        {/* 2. 中间剩余路程（虚线 + 胶囊标签） */}
        {L.gap.visible && (
          <g data-subitem="gap">
            <line
              x1={L.gap.x1}
              y1={L.gap.y}
              x2={L.gap.x2}
              y2={L.gap.y}
              stroke={bgCol}
              strokeWidth={TRACK_LINE_WIDTH + 2}
            />
            <line
              x1={L.gap.x1}
              y1={L.gap.y}
              x2={L.gap.x2}
              y2={L.gap.y}
              stroke={gapCol}
              strokeWidth={4}
              strokeDasharray="8 6"
              strokeLinecap="round"
            />
            <rect
              x={L.gap.labelBox.x}
              y={L.gap.labelBox.y}
              width={L.gap.labelBox.w}
              height={L.gap.labelBox.h}
              rx={8}
              fill={bgCol}
              stroke={gapCol}
              strokeWidth={1.8}
            />
            <text
              x={L.gap.labelPos[0]}
              y={L.gap.labelPos[1]}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={TRACK_GAP_FONT_SIZE}
              fontWeight="600"
              fill={gapCol}
              style={{ userSelect: 'none' }}
            >
              {L.gap.label}
            </text>
          </g>
        )}

        {/* 3. 跑道两端竖线与两端地名 */}
        <line
          x1={L.x0}
          y1={L.y0 - TRACK_END_POST_HALF}
          x2={L.x0}
          y2={L.y0 + TRACK_END_POST_HALF}
          stroke={lineCol}
          strokeWidth={4}
          strokeLinecap="round"
        />
        <line
          x1={L.x1}
          y1={L.y0 - TRACK_END_POST_HALF}
          x2={L.x1}
          y2={L.y0 + TRACK_END_POST_HALF}
          stroke={lineCol}
          strokeWidth={4}
          strokeLinecap="round"
        />
        {L.ends.map((endItem, idx) =>
          endItem.text ? (
            <text
              key={`end-${idx}`}
              x={endItem.x}
              y={endItem.y}
              textAnchor={endItem.anchor}
              dominantBaseline="central"
              fontSize={TRACK_END_FONT_SIZE}
              fontWeight="600"
              fill={inkCol}
              style={{ userSelect: 'none' }}
            >
              {endItem.text}
            </text>
          ) : null,
        )}

        {/* 4. 已走路程粗线与路程数值 */}
        {L.movers.map((m) => {
          if (!m.traveledLine) return null;
          const mCol = color(subColors?.[`mover.${m.index}`] ?? m.color, ctx.theme, 'blue');
          return (
            <g key={`traveled-${m.index}`} data-traveled={m.index}>
              <line
                x1={m.traveledLine.x1}
                y1={m.traveledLine.y}
                x2={m.traveledLine.x2}
                y2={m.traveledLine.y}
                stroke={mCol}
                strokeWidth={TRACK_TRAVELED_WIDTH}
                strokeLinecap="round"
              />
              <text
                x={m.traveledLine.labelPos[0]}
                y={m.traveledLine.labelPos[1]}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={TRACK_TRAVELED_FONT_SIZE}
                fontWeight="600"
                fill={mCol}
                style={{ userSelect: 'none' }}
              >
                {m.traveledLine.label}
              </text>
            </g>
          );
        })}

        {/* 5. 相遇点标记（两人相遇时在跑道上画醒目小圆点） */}
        {L.hasMet && L.meetX !== null && (
          <circle
            cx={L.meetX}
            cy={L.y0}
            r={6}
            fill={gapCol}
            stroke={bgCol}
            strokeWidth={2}
          />
        )}

        {/* 6. marks 时刻小竖标与分钟标签 */}
        {L.marks.map((mk, idx) => {
          const mkCol = color(
            subColors?.[`mover.${mk.moverIndex}`] ?? mk.color,
            ctx.theme,
            'blue',
          );
          return (
            <g key={`mark-${mk.moverIndex}-${mk.minute}-${idx}`} data-mark={mk.minute}>
              <line
                x1={mk.x}
                y1={mk.tickY1}
                x2={mk.x}
                y2={mk.tickY2}
                stroke={mkCol}
                strokeWidth={2.5}
                strokeLinecap="round"
              />
              <text
                x={mk.labelPos[0]}
                y={mk.labelPos[1]}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={TRACK_MARK_FONT_SIZE}
                fill={mkCol}
                style={{ userSelect: 'none' }}
              >
                {mk.label}
              </text>
            </g>
          );
        })}

        {/* 7. 运动人物图标（支持素材与圆形人物图标保底）与速度/名称标签 */}
        {L.movers.map((m) => {
          const mCol = color(subColors?.[`mover.${m.index}`] ?? m.color, ctx.theme, 'blue');
          const url = m.asset ? ctx.assetUrl?.(m.asset) : undefined;
          const [cx, cy] = m.iconCenter;
          const half = m.iconSize / 2;

          return (
            <g key={`mover-${m.index}`} data-subitem={`mover.${m.index}`}>
              {/* 指向跑道当前位置的辅助虚线针脚 */}
              <line
                x1={m.x}
                y1={cy + (m.lane === 'top' ? half - 2 : -half + 2)}
                x2={m.x}
                y2={L.y0 + (m.lane === 'top' ? -4 : 4)}
                stroke={mCol}
                strokeWidth={1.8}
                strokeDasharray="3 3"
                opacity={0.65}
              />
              {url ? (
                <image
                  href={url}
                  x={cx - half}
                  y={cy - half}
                  width={m.iconSize}
                  height={m.iconSize}
                  preserveAspectRatio="xMidYMid meet"
                />
              ) : (
                <g>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={half - 4}
                    fill={bgCol}
                    stroke={mCol}
                    strokeWidth={3}
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={half - 4}
                    fill={mCol}
                    fillOpacity={0.16}
                  />
                  <circle cx={cx} cy={cy - 7} r={7} fill={mCol} />
                  <path
                    d={`M ${cx - 11} ${cy + 13} Q ${cx - 11} ${cy + 2} ${cx} ${cy + 2} Q ${cx + 11} ${cy + 2} ${cx + 11} ${cy + 13} Z`}
                    fill={mCol}
                  />
                </g>
              )}
              {m.label && m.labelPos && (
                <text
                  x={m.labelPos[0]}
                  y={m.labelPos[1]}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={TRACK_MOVER_LABEL_SIZE}
                  fontWeight="600"
                  fill={mCol}
                  style={{ userSelect: 'none' }}
                >
                  {m.label}
                </text>
              )}
            </g>
          );
        })}
      </g>
    );
  },
};
