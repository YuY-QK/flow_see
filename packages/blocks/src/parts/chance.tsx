// 摸球 / 转盘 / 抛硬币（B20）：用于随机现象（一定、可能、不可能）、可能性大小、游戏公平性与频率统计。
import {
  boxAround,
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

export const CHANCE_KINDS = ['bag', 'spinner', 'coin'] as const;
export type ChanceKind = (typeof CHANCE_KINDS)[number];

export const COIN_FACES = ['heads', 'tails'] as const;
export type CoinFace = (typeof COIN_FACES)[number];

export const MAX_BAG_BALLS_PER_ROW = 10;
export const BAG_BALL_RADIUS = 18;
export const SPINNER_RADIUS = 92;
export const COIN_RADIUS = 56;

export interface ChanceItem {
  color: string;
  count: number;
}

export interface ChanceLabels {
  heads?: string;
  tails?: string;
  times?: string;
  [key: string]: string | undefined;
}

export interface GenerateChanceOptions {
  kind?: ChanceKind;
  items?: readonly ChanceItem[];
  count: number;
  seed?: number;
  results?: readonly string[];
}

export interface ChanceDrawnBallLayout {
  index: number;
  color: string;
  row: number;
  col: number;
  pos: Point;
  radius: number;
  box: Box;
}

export interface ChanceHandLayout {
  pos: Point;
  phase: 'reaching' | 'pulling';
  opacity: number;
  box: Box;
}

export interface ChanceActiveBallLayout {
  index: number;
  color: string;
  pos: Point;
  radius: number;
  box: Box;
}

export interface ChanceBagLayout {
  bagBox: Box;
  mouthPos: Point;
  neckY: number;
  bodyPath: string;
  mouthBackPath: string;
  mouthFrontPath: string;
  tiePath: string;
  bowPath: string;
  ballRadius: number;
  drawnBalls: ChanceDrawnBallLayout[];
  hand?: ChanceHandLayout;
  activeBall?: ChanceActiveBallLayout;
}

export interface ChanceSectorLayout {
  index: number;
  color: string;
  count: number;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  halfWidth: number;
  path: string;
  unitAngles: number[];
  box: Box;
}

export interface ChanceSpinnerLayout {
  radius: number;
  wheelBox: Box;
  totalShares: number;
  sectors: ChanceSectorLayout[];
  landingAngles: number[];
  pointerAngle: number;
  pointerTotalDeg: number;
  isSpinning: boolean;
  pointerTip: Point;
}

export interface ChanceCoinLayout {
  radius: number;
  pos: Point;
  tossOffsetY: number;
  flipScaleY: number;
  ry: number;
  face: CoinFace;
  faceLabel: string;
  isFlipping: boolean;
  textOpacity: number;
  coinBox: Box;
}

export interface ChanceTallyRowLayout {
  key: string;
  isCoinFace: boolean;
  color?: string;
  label?: string;
  count: number;
  countText: string;
  rowY: number;
  swatchPos: Point;
}

export interface ChanceTallyLayout {
  box: Box;
  fontSize: number;
  swatchRadius: number;
  rows: ChanceTallyRowLayout[];
}

export interface ChanceLayoutResult {
  kind: ChanceKind;
  cx: number;
  cy: number;
  size: number;
  seed: number;
  draw: number;
  completedCount: number;
  frac: number;
  tally: boolean;
  labels: Required<Pick<ChanceLabels, 'heads' | 'tails' | 'times'>> & ChanceLabels;
  items: ChanceItem[];
  results: string[];
  completedResults: string[];
  activeResult?: string;
  bag?: ChanceBagLayout;
  spinner?: ChanceSpinnerLayout;
  coin?: ChanceCoinLayout;
  tallyPanel?: ChanceTallyLayout;
  bbox: Box;
}

/** 确定性伪随机数生成器（Mulberry32），返回 [0, 1) 浮点数 */
export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 按权重或正反面等概率确定性生成结果序列 */
export function generateChanceResults(options: GenerateChanceOptions): string[];
export function generateChanceResults(
  items: readonly ChanceItem[],
  count: number,
  seed?: number,
  existingResults?: readonly string[],
): string[];
export function generateChanceResults(
  arg0: GenerateChanceOptions | readonly ChanceItem[],
  arg1?: number,
  arg2?: number,
  arg3?: readonly string[],
): string[] {
  let kind: ChanceKind = 'bag';
  let items: readonly ChanceItem[];
  let count: number;
  let seed: number;
  let existing: readonly string[];

  if (Array.isArray(arg0)) {
    items = arg0;
    count = arg1 ?? 0;
    seed = arg2 ?? 1;
    existing = arg3 ?? [];
  } else {
    const opts = arg0 as GenerateChanceOptions;
    kind = opts.kind ?? 'bag';
    items = opts.items ?? [];
    count = opts.count;
    seed = opts.seed ?? 1;
    existing = opts.results ?? [];
  }

  const totalNeeded = Math.max(0, Math.ceil(count), existing.length);
  if (totalNeeded === 0) return [];

  const rng = mulberry32(Math.trunc(seed));
  const validItems = items.filter((it) => it.count > 0 && Boolean(it.color));
  const totalWeight = validItems.reduce((acc, it) => acc + it.count, 0);

  const out: string[] = [];
  for (let i = 0; i < totalNeeded; i++) {
    const u = rng();
    const preset = existing[i];
    if (typeof preset === 'string' && preset.length > 0) {
      out.push(preset);
      continue;
    }

    if (kind === 'coin') {
      out.push(u < 0.5 ? 'heads' : 'tails');
    } else if (totalWeight <= 0) {
      out.push(items[0]?.color || 'blue');
    } else {
      const target = u * totalWeight;
      let acc = 0;
      let picked = validItems[validItems.length - 1].color;
      for (const it of validItems) {
        acc += it.count;
        if (target < acc) {
          picked = it.color;
          break;
        }
      }
      out.push(picked);
    }
  }
  return out;
}

export function chanceLabelsOf(
  p: Props,
): Required<Pick<ChanceLabels, 'heads' | 'tails' | 'times'>> & ChanceLabels {
  let defaults: ChanceLabels = {};
  try {
    defaults = (sceneStyle().parts.chance?.labels as ChanceLabels | undefined) ?? {};
  } catch {
    // sceneStyle 未注入时的保底
  }
  const custom = (p.labels && typeof p.labels === 'object' ? p.labels : {}) as ChanceLabels;
  return {
    heads: 'H',
    tails: 'T',
    times: '{n}',
    ...defaults,
    ...custom,
  };
}

function parseChanceItems(raw: unknown): ChanceItem[] {
  if (!Array.isArray(raw)) return [];
  const list: ChanceItem[] = [];
  for (const it of raw) {
    if (it && typeof it === 'object') {
      const rec = it as Record<string, unknown>;
      const c = str(rec.color, '').trim();
      const cnt = num(rec.count, 0);
      if (c) {
        list.push({ color: c, count: Math.max(0, cnt) });
      }
    }
  }
  return list;
}

function parseResults(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((v) => str(v, '').trim()).filter((s) => s.length > 0);
}

/** 角度（度，0 正上方，顺时针为正）转舞台坐标 */
export function chancePolarPoint(cx: number, cy: number, r: number, deg: number): Point {
  const rad = (deg * Math.PI) / 180;
  return [cx + Math.sin(rad) * r, cy - Math.cos(rad) * r];
}

function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function sectorPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const sweep = endDeg - startDeg;
  if (sweep >= 359.999) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`;
  }
  const [x1, y1] = chancePolarPoint(cx, cy, r, startDeg);
  const [x2, y2] = chancePolarPoint(cx, cy, r, endDeg);
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

function sectorBBox(cx: number, cy: number, r: number, startDeg: number, endDeg: number): Box {
  const sweep = endDeg - startDeg;
  if (sweep >= 359.999) {
    return boxAround(cx, cy, r * 2, r * 2);
  }
  const pts: Point[] = [
    [cx, cy],
    chancePolarPoint(cx, cy, r, startDeg),
    chancePolarPoint(cx, cy, r, endDeg),
  ];
  for (const card of [0, 90, 180, 270, 360, 450, 540, 630]) {
    if (card > startDeg && card < endDeg) {
      pts.push(chancePolarPoint(cx, cy, r, card));
    }
  }
  const xs = pts.map((q) => q[0]);
  const ys = pts.map((q) => q[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function unionBoxes(boxes: readonly Box[]): Box {
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

function formatTimes(template: string, count: number): string {
  if (template.includes('{n}')) {
    return template.replaceAll('{n}', String(count));
  }
  return `${count}`;
}

/** 纯布局计算：不依赖 DOM，统一产出三种形态几何、动画中间帧、计分板与包围盒 */
export function chanceLayout(p: Props): ChanceLayoutResult {
  const [cx, cy] = pt(p.at, [400, 225]);
  const rawKind = str(p.kind, 'bag');
  const kind: ChanceKind =
    rawKind === 'spinner' || rawKind === 'coin' ? rawKind : 'bag';
  const size = Math.max(0.1, num(p.size, 1));
  const seed = Math.trunc(num(p.seed, 1));
  const draw = Math.max(0, num(p.draw, 0));
  const completedCount = Math.floor(draw);
  const rawFrac = draw - completedCount;
  const frac = rawFrac < 1e-7 ? 0 : rawFrac;
  const tally = Boolean(p.tally);

  const labels = chanceLabelsOf(p);
  const items = parseChanceItems(p.items);
  const explicitResults = parseResults(p.results);

  const neededCount = frac > 0 ? completedCount + 1 : completedCount;
  const results = generateChanceResults({
    kind,
    items,
    count: neededCount,
    seed,
    results: explicitResults,
  });
  const completedResults = results.slice(0, completedCount);
  const activeResult = frac > 0 ? results[completedCount] : undefined;

  const boxes: Box[] = [];
  let bag: ChanceBagLayout | undefined;
  let spinner: ChanceSpinnerLayout | undefined;
  let coin: ChanceCoinLayout | undefined;
  let tallyAnchorX = cx;

  if (kind === 'bag') {
    const topY = cy - 52 * size;
    const neckY = cy - 32 * size;
    const botY = cy + 54 * size;
    const mouthHalfW = 28 * size;
    const neckHalfW = 20 * size;
    const botHalfW = 46 * size;

    // 袋口后沿与褶皱（手伸入时在其后方）
    const mouthBackPath = [
      `M ${cx - neckHalfW} ${neckY}`,
      `L ${cx - mouthHalfW} ${topY + 4 * size}`,
      `Q ${cx - mouthHalfW * 0.5} ${topY - 6 * size} ${cx - mouthHalfW * 0.15} ${topY + 2 * size}`,
      `Q ${cx} ${topY - 6 * size} ${cx + mouthHalfW * 0.15} ${topY + 2 * size}`,
      `Q ${cx + mouthHalfW * 0.5} ${topY - 6 * size} ${cx + mouthHalfW} ${topY + 4 * size}`,
      `L ${cx + neckHalfW} ${neckY}`,
      'Z',
    ].join(' ');

    // 梯形圆润布袋袋身（遮住伸入袋内的手指和未摸出的球）
    const bodyPath = [
      `M ${cx - neckHalfW} ${neckY}`,
      `C ${cx - botHalfW * 0.85} ${neckY + 18 * size} ${cx - botHalfW - 4 * size} ${botY - 22 * size} ${cx - botHalfW + 8 * size} ${botY}`,
      `Q ${cx} ${botY + 6 * size} ${cx + botHalfW - 8 * size} ${botY}`,
      `C ${cx + botHalfW + 4 * size} ${botY - 22 * size} ${cx + botHalfW * 0.85} ${neckY + 18 * size} ${cx + neckHalfW} ${neckY}`,
      'Z',
    ].join(' ');

    // 袋口前沿弧线
    const mouthFrontPath = `M ${cx - neckHalfW} ${neckY} Q ${cx} ${neckY + 5 * size} ${cx + neckHalfW} ${neckY}`;

    // 收口系带与蝴蝶结
    const tieH = 5 * size;
    const tiePath = `M ${cx - neckHalfW - 2 * size} ${neckY - tieH / 2} L ${cx + neckHalfW + 2 * size} ${neckY - tieH / 2} L ${cx + neckHalfW + 2 * size} ${neckY + tieH / 2} L ${cx - neckHalfW - 2 * size} ${neckY + tieH / 2} Z`;
    const bx = cx + neckHalfW + 2 * size;
    const by = neckY;
    const bowPath = [
      `M ${bx} ${by}`,
      `C ${bx + 12 * size} ${by - 10 * size} ${bx + 16 * size} ${by + 2 * size} ${bx} ${by + 2 * size}`,
      `M ${bx} ${by + 1 * size}`,
      `L ${bx + 11 * size} ${by + 14 * size}`,
      `M ${bx} ${by + 1 * size}`,
      `L ${bx + 5 * size} ${by + 16 * size}`,
    ].join(' ');

    const bagBox: Box = {
      x: cx - botHalfW - 4 * size,
      y: topY - 6 * size,
      w: (botHalfW + 4 * size) * 2 + 12 * size,
      h: botY - topY + 14 * size,
    };
    boxes.push(bagBox);

    const ballR = BAG_BALL_RADIUS * size;
    const ballGap = 6 * size;
    const ballPitch = ballR * 2 + ballGap;
    const queueStartX = cx + botHalfW + 12 * size + ballR;
    const row0Y = cy - 8 * size;

    const slotPos = (idx: number): Point => {
      const col = idx % MAX_BAG_BALLS_PER_ROW;
      const row = Math.floor(idx / MAX_BAG_BALLS_PER_ROW);
      return [queueStartX + col * ballPitch, row0Y + row * ballPitch];
    };

    const drawnBalls: ChanceDrawnBallLayout[] = completedResults.map((colName, idx) => {
      const pos = slotPos(idx);
      const col = idx % MAX_BAG_BALLS_PER_ROW;
      const row = Math.floor(idx / MAX_BAG_BALLS_PER_ROW);
      const b = boxAround(pos[0], pos[1], ballR * 2, ballR * 2);
      boxes.push(b);
      return {
        index: idx + 1,
        color: colName,
        row,
        col,
        pos,
        radius: ballR,
        box: b,
      };
    });

    const mouthPos: Point = [cx, neckY - 4 * size];
    let hand: ChanceHandLayout | undefined;
    let activeBall: ChanceActiveBallLayout | undefined;

    if (frac > 0 && activeResult) {
      if (frac < 0.5) {
        // 0..0.5：小手从袋口上方伸进袋口
        const t1 = frac / 0.5;
        const ease = 1 - (1 - t1) * (1 - t1);
        const startY = topY - 24 * size;
        const endY = neckY + 4 * size;
        const hy = startY + (endY - startY) * ease;
        const hPos: Point = [cx, hy];
        const hBox = boxAround(hPos[0], hPos[1] - 8 * size, 32 * size, 36 * size);
        hand = { pos: hPos, phase: 'reaching', opacity: 1, box: hBox };
        boxes.push(hBox);
      } else {
        // 0.5..1：手拿着该次结果颜色的球从袋口移到右边队列
        const t2 = (frac - 0.5) / 0.5;
        const ease = 1 - Math.pow(1 - t2, 2.5);
        const dest = slotPos(completedCount);
        const arcLift = -28 * size * Math.sin(Math.PI * ease);
        const bxPos = mouthPos[0] + (dest[0] - mouthPos[0]) * ease;
        const byPos = mouthPos[1] + (dest[1] - mouthPos[1]) * ease + arcLift;
        const bPos: Point = [bxPos, byPos];
        const bBox = boxAround(bPos[0], bPos[1], ballR * 2, ballR * 2);

        activeBall = {
          index: completedCount + 1,
          color: activeResult,
          pos: bPos,
          radius: ballR,
          box: bBox,
        };
        boxes.push(bBox);

        const hPos: Point = [bxPos, byPos - ballR * 0.9];
        const hOpacity = t2 > 0.85 ? Math.max(0.25, (1 - t2) / 0.15) : 1;
        const hBox = boxAround(hPos[0], hPos[1] - 6 * size, 32 * size, 34 * size);
        hand = { pos: hPos, phase: 'pulling', opacity: hOpacity, box: hBox };
        boxes.push(hBox);
      }
    }

    const reservedSlots = Math.min(
      MAX_BAG_BALLS_PER_ROW,
      Math.max(completedCount + (frac > 0 ? 1 : 0), explicitResults.length),
    );
    tallyAnchorX =
      reservedSlots > 0
        ? queueStartX + (reservedSlots - 1) * ballPitch + ballR + 18 * size
        : cx + botHalfW + 22 * size;

    bag = {
      bagBox,
      mouthPos,
      neckY,
      bodyPath,
      mouthBackPath,
      mouthFrontPath,
      tiePath,
      bowPath,
      ballRadius: ballR,
      drawnBalls,
      hand,
      activeBall,
    };
  } else if (kind === 'spinner') {
    const r = SPINNER_RADIUS * size;
    const wheelBox = boxAround(cx, cy, r * 2 + 8 * size, r * 2 + 8 * size);
    boxes.push(wheelBox);

    const validItems = items.filter((it) => it.count > 0);
    const effectiveItems = validItems.length > 0 ? validItems : [{ color: 'blue', count: 1 }];
    const totalShares = effectiveItems.reduce((acc, it) => acc + it.count, 0);

    let cumShares = 0;
    const sectors: ChanceSectorLayout[] = effectiveItems.map((it, idx) => {
      const startAngle = (cumShares / totalShares) * 360;
      const sweepAngle = (it.count / totalShares) * 360;
      const endAngle = startAngle + sweepAngle;
      const midAngle = startAngle + sweepAngle / 2;
      const halfWidth = sweepAngle / 2;

      const unitAngles: number[] = [];
      if (totalShares <= 24 && Number.isInteger(it.count) && it.count > 1) {
        for (let k = 1; k < it.count; k++) {
          unitAngles.push(((cumShares + k) / totalShares) * 360);
        }
      }
      cumShares += it.count;

      return {
        index: idx + 1,
        color: it.color,
        count: it.count,
        startAngle,
        endAngle,
        midAngle,
        halfWidth,
        path: sectorPath(cx, cy, r, startAngle, endAngle),
        unitAngles,
        box: sectorBBox(cx, cy, r, startAngle, endAngle),
      };
    });

    // 用独立确定性流计算每次落点偏移（±扇形半宽 × 0.6）
    const jitterRng = mulberry32((seed ^ 0x9e3779b9) | 0);
    const landingAngles: number[] = results.map((resColor) => {
      const u = jitterRng();
      const matching = sectors.filter((s) => s.color === resColor);
      const targetSector =
        matching.length > 0
          ? matching[Math.min(matching.length - 1, Math.floor(u * matching.length))]
          : sectors[0];
      const uOffset = jitterRng();
      const offset = (uOffset * 2 - 1) * targetSector.halfWidth * 0.6;
      return normalizeDeg(targetSector.midAngle + offset);
    });

    let pointerTotalDeg = 0;
    let pointerAngle = 0;
    if (frac === 0) {
      if (completedCount >= 1 && landingAngles[completedCount - 1] !== undefined) {
        pointerAngle = landingAngles[completedCount - 1];
        pointerTotalDeg = pointerAngle;
      }
    } else {
      const prevAngle =
        completedCount >= 1 && landingAngles[completedCount - 1] !== undefined
          ? landingAngles[completedCount - 1]
          : 0;
      const targetLanding = landingAngles[completedCount] ?? 0;
      const cwDelta = normalizeDeg(targetLanding - prevAngle);
      // 先快后慢 cubic-out：旋转 2 整圈 + 目标落点角差
      const eased = 1 - Math.pow(1 - frac, 3);
      pointerTotalDeg = prevAngle + (720 + cwDelta) * eased;
      pointerAngle = normalizeDeg(pointerTotalDeg);
    }

    const pointerTip = chancePolarPoint(cx, cy, r * 0.74, pointerAngle);
    tallyAnchorX = cx + r + 18 * size;

    spinner = {
      radius: r,
      wheelBox,
      totalShares,
      sectors,
      landingAngles,
      pointerAngle,
      pointerTotalDeg,
      isSpinning: frac > 0,
      pointerTip,
    };
  } else {
    // coin 抛硬币
    const r = COIN_RADIUS * size;
    const isFlipping = frac > 0;
    const tossOffsetY = isFlipping ? -32 * size * Math.sin(Math.PI * frac) : 0;
    const flipScaleY = isFlipping ? Math.abs(Math.cos(3 * Math.PI * frac)) : 1;
    const ry = r * Math.max(0.08, flipScaleY);
    const pos: Point = [cx, cy + tossOffsetY];

    const settledFace: CoinFace =
      completedCount >= 1 && completedResults[completedCount - 1] === 'tails'
        ? 'tails'
        : 'heads';
    const nextFace: CoinFace = activeResult === 'tails' ? 'tails' : 'heads';
    const oppositeFace: CoinFace = nextFace === 'heads' ? 'tails' : 'heads';

    let face: CoinFace = settledFace;
    if (isFlipping) {
      if (frac < 1 / 6) {
        face = settledFace;
      } else if (frac < 3 / 6) {
        face = nextFace;
      } else if (frac < 5 / 6) {
        face = oppositeFace;
      } else {
        face = nextFace;
      }
    }

    const faceLabel = face === 'tails' ? labels.tails : labels.heads;
    const textOpacity = isFlipping ? Math.max(0, Math.min(1, (flipScaleY - 0.25) / 0.6)) : 1;
    const coinBox: Box = {
      x: cx - r - 4 * size,
      y: Math.min(cy - r, pos[1] - ry) - 4 * size,
      w: r * 2 + 8 * size,
      h: Math.max(cy + r, pos[1] + ry) - Math.min(cy - r, pos[1] - ry) + 8 * size,
    };
    boxes.push(coinBox);
    tallyAnchorX = cx + r + 22 * size;

    coin = {
      radius: r,
      pos,
      tossOffsetY,
      flipScaleY,
      ry,
      face,
      faceLabel,
      isFlipping,
      textOpacity,
      coinBox,
    };
  }

  let tallyPanel: ChanceTallyLayout | undefined;
  if (tally) {
    const fontSize = 20 * size;
    const rowH = 30 * size;
    const padX = 12 * size;
    const padY = 10 * size;
    const swatchRadius = 8 * size;

    const rawRows: { key: string; isCoinFace: boolean; color?: string; label?: string; count: number }[] = [];

    if (kind === 'coin') {
      const headsCnt = completedResults.filter((r) => r === 'heads').length;
      const tailsCnt = completedResults.filter((r) => r === 'tails').length;
      rawRows.push({
        key: 'heads',
        isCoinFace: true,
        label: labels.heads,
        count: headsCnt,
      });
      rawRows.push({
        key: 'tails',
        isCoinFace: true,
        label: labels.tails,
        count: tailsCnt,
      });
    } else {
      const uniqueColors: string[] = [];
      for (const it of items) {
        if (it.color && !uniqueColors.includes(it.color)) {
          uniqueColors.push(it.color);
        }
      }
      for (const rc of completedResults) {
        if (rc && !uniqueColors.includes(rc)) {
          uniqueColors.push(rc);
        }
      }
      for (const c of uniqueColors) {
        const cnt = completedResults.filter((r) => r === c).length;
        rawRows.push({
          key: c,
          isCoinFace: false,
          color: c,
          count: cnt,
        });
      }
    }

    const panelH = Math.max(rowH, rawRows.length * rowH) + padY * 2;
    const panelY = cy - panelH / 2;

    let maxRowContentW = 64 * size;
    const rows: ChanceTallyRowLayout[] = rawRows.map((r, idx) => {
      const countText = formatTimes(labels.times, r.count);
      const countW = textWidth(countText, fontSize);
      const leadW = r.isCoinFace
        ? textWidth(r.label ?? '', fontSize * 0.9) + 10 * size
        : swatchRadius * 2 + 10 * size;
      maxRowContentW = Math.max(maxRowContentW, leadW + countW);

      const rowY = panelY + padY + idx * rowH + rowH / 2;
      return {
        key: r.key,
        isCoinFace: r.isCoinFace,
        color: r.color,
        label: r.label,
        count: r.count,
        countText,
        rowY,
        swatchPos: [tallyAnchorX + padX + swatchRadius, rowY],
      };
    });

    const panelBox: Box = {
      x: tallyAnchorX,
      y: panelY,
      w: maxRowContentW + padX * 2,
      h: panelH,
    };
    boxes.push(panelBox);

    tallyPanel = {
      box: panelBox,
      fontSize,
      swatchRadius,
      rows,
    };
  }

  return {
    kind,
    cx,
    cy,
    size,
    seed,
    draw,
    completedCount,
    frac,
    tally,
    labels,
    items,
    results,
    completedResults,
    activeResult,
    bag,
    spinner,
    coin,
    tallyPanel,
    bbox: unionBoxes(boxes),
  };
}

function renderHand(
  pos: Point,
  size: number,
  opacity: number,
  skinFill: string,
  strokeColor: string,
) {
  const [hx, hy] = pos;
  const sw = Math.max(1.5, 2.4 * size);
  const rPalm = 10 * size;
  return (
    <g opacity={opacity}>
      {/* 手腕与手掌轮廓 + 三根手指弧线 */}
      <path
        d={[
          `M ${hx - 6 * size} ${hy - 22 * size}`,
          `L ${hx - 7 * size} ${hy - 10 * size}`,
          `Q ${hx - 14 * size} ${hy - 6 * size} ${hx - 12 * size} ${hy + 2 * size}`,
          `Q ${hx - 9 * size} ${hy + 8 * size} ${hx - 5 * size} ${hy + 4 * size}`,
          `Q ${hx - 3 * size} ${hy + 10 * size} ${hx + 1 * size} ${hy + 5 * size}`,
          `Q ${hx + 5 * size} ${hy + 10 * size} ${hx + 8 * size} ${hy + 4 * size}`,
          `Q ${hx + 13 * size} ${hy + 6 * size} ${hx + 12 * size} ${hy - 3 * size}`,
          `Q ${hx + 11 * size} ${hy - 10 * size} ${hx + 6 * size} ${hy - 12 * size}`,
          `L ${hx + 5 * size} ${hy - 22 * size}`,
          'Z',
        ].join(' ')}
        fill={skinFill}
        stroke={strokeColor}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={hx}
        cy={hy - 5 * size}
        r={rPalm * 0.32}
        fill="none"
        stroke={strokeColor}
        strokeWidth={Math.max(1, 1.4 * size)}
        opacity={0.35}
      />
    </g>
  );
}

function renderBall(
  key: number | string,
  pos: Point,
  radius: number,
  fillColor: string,
  strokeColor: string,
  shineColor: string,
  size: number,
) {
  const [bx, by] = pos;
  return (
    <g key={key}>
      <circle
        cx={bx}
        cy={by}
        r={radius}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={Math.max(1.5, 2.5 * size)}
      />
      <circle
        cx={bx - radius * 0.3}
        cy={by - radius * 0.32}
        r={radius * 0.22}
        fill={shineColor}
        fillOpacity={0.4}
      />
    </g>
  );
}

export const chancePart: PartDef = {
  type: 'chance',
  name: '摸球 / 转盘 / 硬币',
  anchor: 'center',
  props: ['kind', 'items', 'results', 'seed', 'draw', 'tally', 'size', 'labels'],
  bbox(p) {
    return chanceLayout(p).bbox;
  },
  subitems(p): Subitem[] {
    const L = chanceLayout(p);
    const subs: Subitem[] = [];

    if (L.kind === 'bag' && L.bag) {
      const colorOrder: string[] = [];
      for (const it of L.items) {
        if (it.count > 0 && !colorOrder.includes(it.color)) {
          colorOrder.push(it.color);
        }
      }
      for (const b of L.bag.drawnBalls) {
        if (!colorOrder.includes(b.color)) {
          colorOrder.push(b.color);
        }
      }

      for (const c of colorOrder) {
        const matched = L.bag.drawnBalls.filter((b) => b.color === c);
        if (matched.length > 0) {
          subs.push({
            name: `color.${c}`,
            box: unionBoxes(matched.map((b) => b.box)),
            value: matched.length,
            label: c,
          });
        } else {
          // 尚未摸出该颜色时保留子项名供静态引用校验，标记 disabled
          subs.push({
            name: `color.${c}`,
            box: L.bag.bagBox,
            value: 0,
            label: c,
            disabled: true,
          });
        }
      }
    } else if (L.kind === 'spinner' && L.spinner) {
      const colorOrder: string[] = [];
      for (const s of L.spinner.sectors) {
        if (!colorOrder.includes(s.color)) {
          colorOrder.push(s.color);
        }
      }
      for (const c of colorOrder) {
        const matched = L.spinner.sectors.filter((s) => s.color === c);
        const totalShare = matched.reduce((acc, s) => acc + s.count, 0);
        subs.push({
          name: `color.${c}`,
          box: unionBoxes(matched.map((s) => s.box)),
          value: totalShare,
          label: c,
        });
      }
    }

    return subs;
  },
  Render({ p, ctx }) {
    const L = chanceLayout(p);
    const { size, cx, cy } = L;
    const { darken } = sceneStyle().counterBorder;
    const blackHex = color('black', ctx.theme);
    const whiteHex = color('white', ctx.theme);
    const lineHex = ctx.theme.line;
    const inkHex = ctx.theme.ink;

    return (
      <g>
        {/* 1. 摸球袋模式 */}
        {L.kind === 'bag' && L.bag ? (
          <g>
            {/* 袋口后沿 */}
            <path
              d={L.bag.mouthBackPath}
              fill={mixColor(whiteHex, color('brown', ctx.theme), 0.42)}
              stroke={lineHex}
              strokeWidth={Math.max(1.5, 2.8 * size)}
              strokeLinejoin="round"
            />

            {/* 0..0.5 阶段：手伸进袋内（画在袋身后面，自然被袋口遮住下半截） */}
            {L.bag.hand && L.bag.hand.phase === 'reaching'
              ? renderHand(
                  L.bag.hand.pos,
                  size,
                  L.bag.hand.opacity,
                  mixColor(whiteHex, color('orange', ctx.theme), 0.22),
                  inkHex,
                )
              : null}

            {/* 布袋主体：mixColor(white, brown, 0.3) 填充 + line 描边 */}
            <path
              d={L.bag.bodyPath}
              fill={mixColor(whiteHex, color('brown', ctx.theme), 0.3)}
              stroke={lineHex}
              strokeWidth={Math.max(1.5, 3 * size)}
              strokeLinejoin="round"
            />
            <path
              d={L.bag.mouthFrontPath}
              fill="none"
              stroke={lineHex}
              strokeWidth={Math.max(1.5, 2.5 * size)}
              strokeLinecap="round"
            />

            {/* 系带与蝴蝶结 */}
            <path
              d={L.bag.tiePath}
              fill={color('brown', ctx.theme)}
              stroke={mixColor(color('brown', ctx.theme), blackHex, 0.35)}
              strokeWidth={Math.max(1, 1.8 * size)}
              strokeLinejoin="round"
            />
            <path
              d={L.bag.bowPath}
              fill="none"
              stroke={color('brown', ctx.theme)}
              strokeWidth={Math.max(1.5, 2.6 * size)}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* 已摸出的球队列 */}
            {L.bag.drawnBalls.map((ball) => {
              const fillHex = color(ball.color, ctx.theme);
              const strokeHex = mixColor(fillHex, blackHex, darken);
              return renderBall(
                ball.index,
                ball.pos,
                ball.radius,
                fillHex,
                strokeHex,
                whiteHex,
                size,
              );
            })}

            {/* 0.5..1 阶段：手拿着球移向已摸出队列 */}
            {L.bag.activeBall
              ? renderBall(
                  'active',
                  L.bag.activeBall.pos,
                  L.bag.activeBall.radius,
                  color(L.bag.activeBall.color, ctx.theme),
                  mixColor(color(L.bag.activeBall.color, ctx.theme), blackHex, darken),
                  whiteHex,
                  size,
                )
              : null}
            {L.bag.hand && L.bag.hand.phase === 'pulling'
              ? renderHand(
                  L.bag.hand.pos,
                  size,
                  L.bag.hand.opacity,
                  mixColor(whiteHex, color('orange', ctx.theme), 0.22),
                  inkHex,
                )
              : null}
          </g>
        ) : null}

        {/* 2. 转盘模式 */}
        {L.kind === 'spinner' && L.spinner ? (
          <g>
            {/* 底盘背景 */}
            <circle cx={cx} cy={cy} r={L.spinner.radius} fill={ctx.theme.stageBg} />

            {/* 各色扇形（透明度 0.85） */}
            {L.spinner.sectors.map((sec) => {
              const fillHex = color(sec.color, ctx.theme);
              return (
                <g key={sec.index}>
                  <path
                    d={sec.path}
                    fill={fillHex}
                    fillOpacity={0.85}
                    stroke={lineHex}
                    strokeWidth={Math.max(1.5, 2.4 * size)}
                    strokeLinejoin="round"
                  />
                  {/* 同色多份时的等份辅助细虚线 */}
                  {sec.unitAngles.map((ua, ui) => {
                    const [ux, uy] = chancePolarPoint(cx, cy, L.spinner!.radius, ua);
                    return (
                      <line
                        key={ui}
                        x1={cx}
                        y1={cy}
                        x2={ux}
                        y2={uy}
                        stroke={ctx.theme.stageBg}
                        strokeWidth={Math.max(1, 1.8 * size)}
                        strokeDasharray={`${5 * size} ${4 * size}`}
                        opacity={0.65}
                      />
                    );
                  })}
                </g>
              );
            })}

            {/* 外圈轮缘 */}
            <circle
              cx={cx}
              cy={cy}
              r={L.spinner.radius}
              fill="none"
              stroke={inkHex}
              strokeWidth={Math.max(2, 3.2 * size)}
            />

            {/* 中心旋转指针 */}
            <g transform={`rotate(${L.spinner.pointerAngle}, ${cx}, ${cy})`}>
              {/* 指针白边衬底保证深浅扇形上均清晰 */}
              <line
                x1={cx}
                y1={cy + 16 * size}
                x2={cx}
                y2={cy - L.spinner.radius * 0.68}
                stroke={ctx.theme.stageBg}
                strokeWidth={Math.max(4, 7 * size)}
                strokeLinecap="round"
              />
              <line
                x1={cx}
                y1={cy + 16 * size}
                x2={cx}
                y2={cy - L.spinner.radius * 0.66}
                stroke={inkHex}
                strokeWidth={Math.max(2.5, 4.2 * size)}
                strokeLinecap="round"
              />
              {/* 箭头尖端 */}
              <polygon
                points={`${cx},${cy - L.spinner.radius * 0.78} ${cx - 8 * size},${cy - L.spinner.radius * 0.58} ${cx + 8 * size},${cy - L.spinner.radius * 0.58}`}
                fill={inkHex}
                stroke={ctx.theme.stageBg}
                strokeWidth={Math.max(1, 1.5 * size)}
                strokeLinejoin="round"
              />
              {/* 中心轴帽 */}
              <circle
                cx={cx}
                cy={cy}
                r={8 * size}
                fill={inkHex}
                stroke={ctx.theme.stageBg}
                strokeWidth={Math.max(1.5, 2 * size)}
              />
              <circle cx={cx} cy={cy} r={3 * size} fill={ctx.theme.stageBg} />
            </g>
          </g>
        ) : null}

        {/* 3. 抛硬币模式 */}
        {L.kind === 'coin' && L.coin ? (
          <g>
            {/* 落地微阴影 */}
            <ellipse
              cx={cx}
              cy={cy + L.coin.radius + 10 * size}
              rx={L.coin.radius * (L.coin.isFlipping ? 0.65 : 0.8)}
              ry={6 * size}
              fill={inkHex}
              opacity={L.coin.isFlipping ? 0.1 : 0.16}
            />
            {/* 硬币主体椭圆（竖直压扁展开模拟翻转） */}
            {(() => {
              const baseGray = color('gray', ctx.theme);
              const coinFill = mixColor(baseGray, whiteHex, 0.22);
              const coinStroke = mixColor(baseGray, blackHex, 0.42);
              const innerRx = Math.max(2, L.coin.radius - 7 * size);
              const innerRy = Math.max(1, L.coin.ry - 7 * size * (L.coin.ry / L.coin.radius));
              return (
                <g>
                  <ellipse
                    cx={L.coin.pos[0]}
                    cy={L.coin.pos[1]}
                    rx={L.coin.radius}
                    ry={L.coin.ry}
                    fill={coinFill}
                    stroke={coinStroke}
                    strokeWidth={Math.max(2, 3 * size)}
                  />
                  {L.coin.ry > 8 * size ? (
                    <ellipse
                      cx={L.coin.pos[0]}
                      cy={L.coin.pos[1]}
                      rx={innerRx}
                      ry={innerRy}
                      fill="none"
                      stroke={coinStroke}
                      strokeWidth={Math.max(1, 1.6 * size)}
                      opacity={0.55}
                    />
                  ) : null}
                  {L.coin.textOpacity > 0.02 ? (
                    <g
                      transform={`translate(${L.coin.pos[0]}, ${L.coin.pos[1]}) scale(1, ${Math.max(0.2, L.coin.flipScaleY)})`}
                      opacity={L.coin.textOpacity}
                    >
                      <text
                        x={0}
                        y={0}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={mixColor(blackHex, coinStroke, 0.25)}
                        fontSize={24 * size}
                        fontWeight="bold"
                      >
                        {L.coin.faceLabel}
                      </text>
                    </g>
                  ) : null}
                </g>
              );
            })()}
          </g>
        ) : null}

        {/* 4. 右侧累计次数小面板（tally: true） */}
        {L.tallyPanel ? (
          <g>
            <rect
              x={L.tallyPanel.box.x}
              y={L.tallyPanel.box.y}
              width={L.tallyPanel.box.w}
              height={L.tallyPanel.box.h}
              rx={8 * size}
              fill={ctx.theme.labelBg}
              stroke={lineHex}
              strokeWidth={Math.max(1.2, 2 * size)}
            />
            {L.tallyPanel.rows.map((row) => {
              const rightTextX = L.tallyPanel!.box.x + L.tallyPanel!.box.w - 12 * size;
              return (
                <g key={row.key}>
                  {row.isCoinFace ? (
                    <text
                      x={L.tallyPanel!.box.x + 12 * size}
                      y={row.rowY}
                      textAnchor="start"
                      dominantBaseline="central"
                      fill={mixColor(inkHex, ctx.theme.dim, 0.3)}
                      fontSize={L.tallyPanel!.fontSize * 0.9}
                      fontWeight={600}
                    >
                      {row.label}
                    </text>
                  ) : (
                    <circle
                      cx={row.swatchPos[0]}
                      cy={row.swatchPos[1]}
                      r={L.tallyPanel!.swatchRadius}
                      fill={color(row.color, ctx.theme)}
                      stroke={mixColor(color(row.color, ctx.theme), blackHex, darken)}
                      strokeWidth={Math.max(1, 1.8 * size)}
                    />
                  )}
                  <text
                    x={rightTextX}
                    y={row.rowY}
                    textAnchor="end"
                    dominantBaseline="central"
                    fill={inkHex}
                    fontSize={L.tallyPanel!.fontSize}
                    fontWeight="bold"
                  >
                    {row.countText}
                  </text>
                </g>
              );
            })}
          </g>
        ) : null}
      </g>
    );
  },
};
