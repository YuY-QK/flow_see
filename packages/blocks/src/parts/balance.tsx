// 天平与秤零件：托盘天平（beam）、跷跷板（seesaw）、台秤（dial）
import type { ReactNode } from 'react';
import {
  color,
  mixColor,
  num,
  pt,
  str,
  type Box,
  type PartContext,
  type PartDef,
  type Point,
  type Props,
  type Subitem,
} from '../base';
import { sceneStyle } from '../style';

export const BALANCE_KINDS = ['beam', 'seesaw', 'dial'] as const;
export type BalanceKind = (typeof BALANCE_KINDS)[number];

export interface BalanceLabels {
  unit: string;
  left: string;
  right: string;
}

export interface BalanceItemSlot {
  id: string;
  box: Box;
}

export interface BalanceDialTick {
  val: number;
  angleDeg: number;
  p1: Point;
  p2: Point;
  textPos: Point;
  isMajor: boolean;
}

export interface BalanceLayout {
  kind: BalanceKind;
  at: Point;
  width: number;
  left: number;
  right: number;
  max: number;
  unit: string;
  labels: BalanceLabels;
  maxTilt: number;
  tilt: number;
  dialAngle: number;
  leftBox: Box;
  rightBox: Box;
  box: Box;
  // beam 专有
  beam?: {
    pivot: Point;
    postTop: Point;
    postHeight: number;
    baseW: number;
    baseH: number;
    leftPivot: Point;
    rightPivot: Point;
    pointerTip: Point;
    leftPanTopY: number;
    rightPanTopY: number;
    panW: number;
    panH: number;
    leftItems: BalanceItemSlot[];
    rightItems: BalanceItemSlot[];
  };
  // seesaw 专有
  seesaw?: {
    pivot: Point;
    fulcrumW: number;
    fulcrumH: number;
    boardL: number;
    boardThick: number;
    leftCenterLocal: Point;
    rightCenterLocal: Point;
    leftItemsLocal: BalanceItemSlot[];
    rightItemsLocal: BalanceItemSlot[];
  };
  // dial 专有
  dial?: {
    bodyBox: Box;
    dialCenter: Point;
    dialR: number;
    trayBox: Box;
    ticks: BalanceDialTick[];
    items: BalanceItemSlot[];
  };
}

/**
 * 倾斜角数学计算：
 * tilt = maxTilt × clamp((right − left) / Math.max(left, right, 1), −1, 1)
 * 右边重时向右下倾斜（角度为正）。left === right 时水平（tilt = 0）。
 */
export function balanceTilt(left: number, right: number, maxTilt = 15): number {
  if (left === right) return 0;
  const denom = Math.max(left, right, 1);
  const raw = (right - left) / denom;
  const clamped = Math.max(-1, Math.min(1, raw));
  return maxTilt * clamped;
}

/**
 * 台秤指针角度计算：
 * 指针角度 = (left / max) × 330°（从 12 点钟方向顺时针）
 */
export function balanceDialAngle(left: number, max = 1000): number {
  if (max <= 0) return 0;
  const clamped = Math.max(0, Math.min(max, left));
  return (clamped / max) * 330;
}

function kindOf(p: Props): BalanceKind {
  const k = str(p.kind, 'beam');
  return (BALANCE_KINDS as readonly string[]).includes(k) ? (k as BalanceKind) : 'beam';
}

function labelsOf(p: Props): BalanceLabels {
  let defaults: Record<string, string> = {};
  try {
    defaults = (sceneStyle().parts.balance?.labels as Record<string, string> | undefined) ?? {};
  } catch {
    // sceneStyle not injected
  }
  const custom = (p.labels as Record<string, string> | undefined) ?? {};
  return {
    unit: str(p.unit ?? custom.unit ?? defaults.unit, 'g'),
    left: str(custom.left ?? defaults.left, 'left'),
    right: str(custom.right ?? defaults.right, 'right'),
  };
}

function itemsList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map(String)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 6);
}

function layoutItemsGrid(
  items: string[],
  baseCx: number,
  surfaceTopY: number,
  itemSize: number,
  gap = 4,
): BalanceItemSlot[] {
  const count = items.length;
  if (count === 0) return [];

  const bottomCount = count <= 3 ? count : Math.ceil(count / 2);
  const topCount = count - bottomCount;

  const slots: BalanceItemSlot[] = [];

  // 底层
  const bottomW = bottomCount * itemSize + (bottomCount - 1) * gap;
  const bottomStartX = baseCx - bottomW / 2;
  const bottomY = surfaceTopY - itemSize;
  for (let i = 0; i < bottomCount; i++) {
    slots.push({
      id: items[i],
      box: {
        x: bottomStartX + i * (itemSize + gap),
        y: bottomY,
        w: itemSize,
        h: itemSize,
      },
    });
  }

  // 顶层
  if (topCount > 0) {
    const topW = topCount * itemSize + (topCount - 1) * gap;
    const topStartX = baseCx - topW / 2;
    const topY = bottomY - itemSize;
    for (let i = 0; i < topCount; i++) {
      slots.push({
        id: items[bottomCount + i],
        box: {
          x: topStartX + i * (itemSize + gap),
          y: topY,
          w: itemSize,
          h: itemSize,
        },
      });
    }
  }

  return slots;
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

function rotatePoint(pt: Point, center: Point, rad: number): Point {
  const dx = pt[0] - center[0];
  const dy = pt[1] - center[1];
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [center[0] + dx * cos - dy * sin, center[1] + dx * sin + dy * cos];
}

function boxFromRotatedRect(cx: number, cy: number, w: number, h: number, rad: number): Box {
  const hw = w / 2;
  const hh = h / 2;
  const corners: Point[] = [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ];
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const pts = corners.map(
    ([x, y]) => [cx + x * cos - y * sin, cy + x * sin + y * cos] as [number, number],
  );
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** 天平零件的纯函数布局计算 */
export function balanceLayout(p: Props): BalanceLayout {
  const at = pt(p.at, [400, 360]);
  const [cx, cy] = at;
  const width = Math.max(80, num(p.width, 360));
  const kind = kindOf(p);
  const left = num(p.left, 0);
  const right = num(p.right, 0);
  const maxTilt = num(p.maxTilt, 15);
  const max = Math.max(1, num(p.max, 1000));
  const labels = labelsOf(p);
  const unit = labels.unit;
  const leftItems = itemsList(p.leftItems);
  const rightItems = itemsList(p.rightItems);

  if (kind === 'beam') {
    const tilt = balanceTilt(left, right, maxTilt);
    const rad = (tilt * Math.PI) / 180;
    const postHeight = width * 0.45;
    const pivot: Point = [cx, cy - postHeight];
    const halfW = width / 2;

    const leftPivot: Point = [
      pivot[0] - halfW * Math.cos(rad),
      pivot[1] - halfW * Math.sin(rad),
    ];
    const rightPivot: Point = [
      pivot[0] + halfW * Math.cos(rad),
      pivot[1] + halfW * Math.sin(rad),
    ];

    // 指针（垂直于横梁向上）
    const pointerLen = width * 0.16;
    const pointerTip: Point = [
      pivot[0] + pointerLen * Math.sin(rad),
      pivot[1] - pointerLen * Math.cos(rad),
    ];

    // 底座与挂盘
    const baseW = width * 0.36;
    const baseH = width * 0.08;
    const panW = width * 0.28;
    const panH = 14;
    const stringLen = width * 0.22;

    const leftPanTopY = leftPivot[1] + stringLen;
    const rightPanTopY = rightPivot[1] + stringLen;

    const itemSize = Math.max(20, Math.min(38, panW * 0.32));
    const leftSlots = layoutItemsGrid(leftItems, leftPivot[0], leftPanTopY, itemSize);
    const rightSlots = layoutItemsGrid(rightItems, rightPivot[0], rightPanTopY, itemSize);

    // left 子项包围盒（托盘及盘内物品）
    const leftPanBox: Box = {
      x: leftPivot[0] - panW / 2,
      y: leftPanTopY,
      w: panW,
      h: panH,
    };
    const leftBoxes = [
      leftPanBox,
      ...leftSlots.map((s) => s.box),
      ...(leftSlots.length === 0
        ? [{ x: leftPanBox.x, y: leftPanTopY - 24, w: panW, h: 24 }]
        : []),
    ];
    const leftBox = mergeBoxes(leftBoxes);

    // right 子项包围盒（托盘及盘内物品）
    const rightPanBox: Box = {
      x: rightPivot[0] - panW / 2,
      y: rightPanTopY,
      w: panW,
      h: panH,
    };
    const rightBoxes = [
      rightPanBox,
      ...rightSlots.map((s) => s.box),
      ...(rightSlots.length === 0
        ? [{ x: rightPanBox.x, y: rightPanTopY - 24, w: panW, h: 24 }]
        : []),
    ];
    const rightBox = mergeBoxes(rightBoxes);

    // 整个天平的包围盒
    const baseBox: Box = {
      x: cx - baseW / 2,
      y: cy - baseH,
      w: baseW,
      h: baseH,
    };
    const beamBox = boxFromRotatedRect(pivot[0], pivot[1], width, 6, rad);
    const pointerBox: Box = {
      x: Math.min(pivot[0], pointerTip[0]) - 4,
      y: Math.min(pivot[1], pointerTip[1]) - 4,
      w: Math.abs(pointerTip[0] - pivot[0]) + 8,
      h: Math.abs(pointerTip[1] - pivot[1]) + 8,
    };

    const leftStringBox: Box = {
      x: leftPivot[0] - panW * 0.45,
      y: leftPivot[1],
      w: panW * 0.9,
      h: stringLen,
    };
    const rightStringBox: Box = {
      x: rightPivot[0] - panW * 0.45,
      y: rightPivot[1],
      w: panW * 0.9,
      h: stringLen,
    };

    const overallBox = mergeBoxes([
      baseBox,
      beamBox,
      pointerBox,
      leftStringBox,
      rightStringBox,
      leftBox,
      rightBox,
    ]);
    // 确保底部包含锚点 y
    if (overallBox.y + overallBox.h < cy) {
      overallBox.h = cy - overallBox.y;
    }

    return {
      kind: 'beam',
      at,
      width,
      left,
      right,
      max,
      unit,
      labels,
      maxTilt,
      tilt,
      dialAngle: 0,
      leftBox,
      rightBox,
      box: overallBox,
      beam: {
        pivot,
        postTop: pivot,
        postHeight,
        baseW,
        baseH,
        leftPivot,
        rightPivot,
        pointerTip,
        leftPanTopY,
        rightPanTopY,
        panW,
        panH,
        leftItems: leftSlots,
        rightItems: rightSlots,
      },
    };
  }

  if (kind === 'seesaw') {
    const tilt = balanceTilt(left, right, maxTilt);
    const rad = (tilt * Math.PI) / 180;
    const fulcrumH = width * 0.22;
    const fulcrumW = width * 0.26;
    const pivot: Point = [cx, cy - fulcrumH];
    const boardL = width;
    const boardThick = 12;

    const offset = boardL * 0.38;
    const localSurfaceY = -boardThick / 2;
    const itemSize = Math.max(22, Math.min(44, width * 0.1));

    const leftCenterLocal: Point = [-offset, localSurfaceY];
    const rightCenterLocal: Point = [offset, localSurfaceY];

    const leftSlotsLocal = layoutItemsGrid(leftItems, -offset, localSurfaceY, itemSize);
    const rightSlotsLocal = layoutItemsGrid(rightItems, offset, localSurfaceY, itemSize);

    // 将木板和物品的局部坐标转换到舞台坐标求 bbox
    const boardBox = boxFromRotatedRect(pivot[0], pivot[1], boardL, boardThick, rad);
    const fulcrumBox: Box = {
      x: cx - fulcrumW / 2,
      y: cy - fulcrumH,
      w: fulcrumW,
      h: fulcrumH,
    };

    const transformSlotToStageBox = (slot: BalanceItemSlot): Box => {
      const b = slot.box;
      const slotCenterLocal: Point = [b.x + b.w / 2, b.y + b.h / 2];
      const slotCenterStage = rotatePoint(
        [pivot[0] + slotCenterLocal[0], pivot[1] + slotCenterLocal[1]],
        pivot,
        rad,
      );
      return boxFromRotatedRect(slotCenterStage[0], slotCenterStage[1], b.w, b.h, rad);
    };

    const leftItemStageBoxes = leftSlotsLocal.map(transformSlotToStageBox);
    const rightItemStageBoxes = rightSlotsLocal.map(transformSlotToStageBox);

    // left 木板端包围盒
    const leftEndCenterLocal: Point = [(-boardL * 3) / 8, 0];
    const leftEndCenterStage = rotatePoint(
      [pivot[0] + leftEndCenterLocal[0], pivot[1] + leftEndCenterLocal[1]],
      pivot,
      rad,
    );
    const leftBoardEndBox = boxFromRotatedRect(
      leftEndCenterStage[0],
      leftEndCenterStage[1],
      boardL / 4,
      boardThick + 20,
      rad,
    );
    const leftBox = mergeBoxes([leftBoardEndBox, ...leftItemStageBoxes]);

    // right 木板端包围盒
    const rightEndCenterLocal: Point = [(boardL * 3) / 8, 0];
    const rightEndCenterStage = rotatePoint(
      [pivot[0] + rightEndCenterLocal[0], pivot[1] + rightEndCenterLocal[1]],
      pivot,
      rad,
    );
    const rightBoardEndBox = boxFromRotatedRect(
      rightEndCenterStage[0],
      rightEndCenterStage[1],
      boardL / 4,
      boardThick + 20,
      rad,
    );
    const rightBox = mergeBoxes([rightBoardEndBox, ...rightItemStageBoxes]);

    const overallBox = mergeBoxes([fulcrumBox, boardBox, leftBox, rightBox]);
    if (overallBox.y + overallBox.h < cy) {
      overallBox.h = cy - overallBox.y;
    }

    return {
      kind: 'seesaw',
      at,
      width,
      left,
      right,
      max,
      unit,
      labels,
      maxTilt,
      tilt,
      dialAngle: 0,
      leftBox,
      rightBox,
      box: overallBox,
      seesaw: {
        pivot,
        fulcrumW,
        fulcrumH,
        boardL,
        boardThick,
        leftCenterLocal,
        rightCenterLocal,
        leftItemsLocal: leftSlotsLocal,
        rightItemsLocal: rightSlotsLocal,
      },
    };
  }

  // dial: 台秤
  const dialAngle = balanceDialAngle(left, max);
  const bodyW = width * 0.72;
  const bodyH = width * 0.65;
  const bodyBox: Box = {
    x: cx - bodyW / 2,
    y: cy - bodyH,
    w: bodyW,
    h: bodyH,
  };

  const dialR = width * 0.3;
  const dialCenter: Point = [cx, cy - bodyH * 0.46];

  // 顶部托盘
  const stemH = width * 0.08;
  const panH = 10;
  const panW = width * 0.78;
  const trayTopY = cy - bodyH - stemH;
  const trayBox: Box = {
    x: cx - panW / 2,
    y: trayTopY,
    w: panW,
    h: panH,
  };

  // 物品放在托盘上
  const itemSize = Math.max(22, Math.min(42, width * 0.11));
  const items = layoutItemsGrid(leftItems, cx, trayTopY, itemSize);

  // 刻度
  const ticks: BalanceDialTick[] = [];
  for (let i = 0; i <= 10; i++) {
    const angleDeg = (i / 10) * 330;
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const val = Math.round((i * max) / 10);
    const p1: Point = [dialCenter[0] + (dialR - 3) * cos, dialCenter[1] + (dialR - 3) * sin];
    const p2: Point = [dialCenter[0] + (dialR - 12) * cos, dialCenter[1] + (dialR - 12) * sin];
    const textPos: Point = [
      dialCenter[0] + (dialR - 26) * cos,
      dialCenter[1] + (dialR - 26) * sin,
    ];
    ticks.push({
      val,
      angleDeg,
      p1,
      p2,
      textPos,
      isMajor: true,
    });
  }

  // left: 顶部托盘与物品包围盒
  const leftBox = mergeBoxes([trayBox, ...items.map((s) => s.box)]);
  // right: 表盘区域
  const rightBox: Box = {
    x: dialCenter[0] - dialR,
    y: dialCenter[1] - dialR,
    w: dialR * 2,
    h: dialR * 2,
  };

  const overallBox = mergeBoxes([
    bodyBox,
    leftBox,
    rightBox,
    { x: cx - 12, y: cy - bodyH - stemH, w: 24, h: stemH },
  ]);
  if (overallBox.y + overallBox.h < cy) {
    overallBox.h = cy - overallBox.y;
  }

  return {
    kind: 'dial',
    at,
    width,
    left,
    right,
    max,
    unit,
    labels,
    maxTilt,
    tilt: 0,
    dialAngle,
    leftBox,
    rightBox,
    box: overallBox,
    dial: {
      bodyBox,
      dialCenter,
      dialR,
      trayBox,
      ticks,
      items,
    },
  };
}

function renderItemSlot(slot: BalanceItemSlot, ctx: PartContext, key: string | number): ReactNode {
  const { box, id } = slot;
  const url = ctx.assetUrl?.(id);
  if (!url) {
    return (
      <g key={key}>
        <rect
          x={box.x}
          y={box.y}
          width={box.w}
          height={box.h}
          rx={6}
          fill={color('dim', ctx.theme)}
          opacity={0.35}
        />
        <text
          x={box.x + box.w / 2}
          y={box.y + box.h / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={Math.max(12, box.w * 0.28)}
          fill={color('ink', ctx.theme)}
        >
          {id}
        </text>
      </g>
    );
  }
  return (
    <image
      key={key}
      href={url}
      x={box.x}
      y={box.y}
      width={box.w}
      height={box.h}
      preserveAspectRatio="xMidYMid meet"
    />
  );
}

export const balancePart: PartDef = {
  type: 'balance',
  name: '天平 / 秤',
  anchor: 'center',
  props: ['kind', 'left', 'right', 'leftItems', 'rightItems', 'max', 'unit', 'width', 'maxTilt', 'labels'],
  bbox(p: Props): Box {
    return balanceLayout(p).box;
  },
  subitems(p: Props): Subitem[] {
    const layout = balanceLayout(p);
    return [
      {
        name: 'left',
        box: layout.leftBox,
        label: layout.labels.left,
      },
      {
        name: 'right',
        box: layout.rightBox,
        label: layout.labels.right,
      },
    ];
  },
  Render({ p, ctx }: { p: Props; ctx: PartContext }) {
    const layout = balanceLayout(p);
    const ink = color('ink', ctx.theme);
    const dim = color('dim', ctx.theme);
    const line = color('line', ctx.theme);
    const accent = color('accent', ctx.theme);
    const red = color('red', ctx.theme);
    const gray = color('gray', ctx.theme);
    const orange = color('orange', ctx.theme);

    if (layout.kind === 'beam' && layout.beam) {
      const { beam } = layout;
      const {
        pivot,
        baseW,
        baseH,
        leftPivot,
        rightPivot,
        pointerTip,
        leftPanTopY,
        rightPanTopY,
        panW,
        panH,
        leftItems,
        rightItems,
      } = beam;
      const [cx, cy] = layout.at;

      // 弧形托盘 path
      const makePanPath = (panCx: number, panTopY: number) => {
        const hw = panW / 2;
        return `M ${panCx - hw} ${panTopY} Q ${panCx} ${panTopY + panH * 1.5} ${panCx + hw} ${panTopY} Z`;
      };

      return (
        <g>
          {/* 三角 / 梯形底座 */}
          <polygon
            points={`${cx - baseW / 2},${cy} ${cx + baseW / 2},${cy} ${cx + baseW * 0.16},${cy - baseH} ${cx - baseW * 0.16},${cy - baseH}`}
            fill={gray}
            stroke={ink}
            strokeWidth={3}
            strokeLinejoin="round"
          />

          {/* 立柱 */}
          <line
            x1={cx}
            y1={cy - baseH}
            x2={pivot[0]}
            y2={pivot[1]}
            stroke={ink}
            strokeWidth={8}
            strokeLinecap="round"
          />

          {/* 柱顶刻度盘小半圆（背景参考） */}
          <path
            d={`M ${cx - 24} ${pivot[1] - 8} A 24 24 0 0 1 ${cx + 24} ${pivot[1] - 8}`}
            fill="none"
            stroke={dim}
            strokeWidth={2}
          />
          <line
            x1={cx}
            y1={pivot[1] - 28}
            x2={cx}
            y2={pivot[1] - 34}
            stroke={dim}
            strokeWidth={2}
          />

          {/* 指针（垂直于横梁向上） */}
          <line
            x1={pivot[0]}
            y1={pivot[1]}
            x2={pointerTip[0]}
            y2={pointerTip[1]}
            stroke={accent}
            strokeWidth={4}
            strokeLinecap="round"
          />

          {/* 横梁（长 = width，线宽 6，绕柱顶转动） */}
          <line
            x1={leftPivot[0]}
            y1={leftPivot[1]}
            x2={rightPivot[0]}
            y2={rightPivot[1]}
            stroke={ink}
            strokeWidth={6}
            strokeLinecap="round"
          />

          {/* 柱顶旋转中心轴 */}
          <circle cx={pivot[0]} cy={pivot[1]} r={7} fill={accent} stroke={ink} strokeWidth={2} />

          {/* 两端小吊环 */}
          <circle cx={leftPivot[0]} cy={leftPivot[1]} r={4} fill={gray} stroke={ink} strokeWidth={2} />
          <circle cx={rightPivot[0]} cy={rightPivot[1]} r={4} fill={gray} stroke={ink} strokeWidth={2} />

          {/* 左托盘吊绳（两条细线三角形） */}
          <line
            x1={leftPivot[0]}
            y1={leftPivot[1]}
            x2={leftPivot[0] - panW * 0.42}
            y2={leftPanTopY}
            stroke={dim}
            strokeWidth={1.8}
          />
          <line
            x1={leftPivot[0]}
            y1={leftPivot[1]}
            x2={leftPivot[0] + panW * 0.42}
            y2={leftPanTopY}
            stroke={dim}
            strokeWidth={1.8}
          />

          {/* 左托盘 */}
          <path d={makePanPath(leftPivot[0], leftPanTopY)} fill={gray} stroke={ink} strokeWidth={3} />

          {/* 左盘物品 */}
          {leftItems.map((slot, idx) => renderItemSlot(slot, ctx, `left-${idx}`))}

          {/* 右托盘吊绳 */}
          <line
            x1={rightPivot[0]}
            y1={rightPivot[1]}
            x2={rightPivot[0] - panW * 0.42}
            y2={rightPanTopY}
            stroke={dim}
            strokeWidth={1.8}
          />
          <line
            x1={rightPivot[0]}
            y1={rightPivot[1]}
            x2={rightPivot[0] + panW * 0.42}
            y2={rightPanTopY}
            stroke={dim}
            strokeWidth={1.8}
          />

          {/* 右托盘 */}
          <path d={makePanPath(rightPivot[0], rightPanTopY)} fill={gray} stroke={ink} strokeWidth={3} />

          {/* 右盘物品 */}
          {rightItems.map((slot, idx) => renderItemSlot(slot, ctx, `right-${idx}`))}
        </g>
      );
    }

    if (layout.kind === 'seesaw' && layout.seesaw) {
      const { seesaw, tilt } = layout;
      const {
        pivot,
        fulcrumW,
        boardL,
        boardThick,
        leftItemsLocal,
        rightItemsLocal,
      } = seesaw;
      const [cx, cy] = layout.at;

      return (
        <g>
          {/* 三角支点 */}
          <polygon
            points={`${cx - fulcrumW / 2},${cy} ${cx + fulcrumW / 2},${cy} ${pivot[0]},${pivot[1]}`}
            fill={gray}
            stroke={ink}
            strokeWidth={3}
            strokeLinejoin="round"
          />
          <circle cx={pivot[0]} cy={pivot[1]} r={6} fill={accent} stroke={ink} strokeWidth={2} />

          {/* 木板和其上的物品随木板一同旋转 */}
          <g transform={`translate(${pivot[0]}, ${pivot[1]}) rotate(${tilt})`}>
            {/* 长木板 */}
            <rect
              x={-boardL / 2}
              y={-boardThick / 2}
              width={boardL}
              height={boardThick}
              rx={boardThick * 0.25}
              fill={orange}
              stroke={mixColor(orange, ink, 0.4)}
              strokeWidth={3}
            />

            {/* 站在木板上的左端物品 */}
            {leftItemsLocal.map((slot, idx) => renderItemSlot(slot, ctx, `sw-l-${idx}`))}

            {/* 站在木板上的右端物品 */}
            {rightItemsLocal.map((slot, idx) => renderItemSlot(slot, ctx, `sw-r-${idx}`))}
          </g>
        </g>
      );
    }

    if (layout.kind === 'dial' && layout.dial) {
      const { dial, dialAngle, unit } = layout;
      const { bodyBox, dialCenter, dialR, trayBox, ticks, items } = dial;
      const [cx] = layout.at;

      // 指针尖端
      const pointerRad = ((dialAngle - 90) * Math.PI) / 180;
      const pointerLen = dialR * 0.74;
      const pointerTipX = dialCenter[0] + pointerLen * Math.cos(pointerRad);
      const pointerTipY = dialCenter[1] + pointerLen * Math.sin(pointerRad);

      return (
        <g>
          {/* 托盘连接立柱 */}
          <rect
            x={cx - 10}
            y={trayBox.y + trayBox.h}
            width={20}
            height={bodyBox.y - (trayBox.y + trayBox.h)}
            fill={line}
            stroke={ink}
            strokeWidth={2}
          />

          {/* 顶部金属托盘 */}
          <rect
            x={trayBox.x}
            y={trayBox.y}
            width={trayBox.w}
            height={trayBox.h}
            rx={4}
            fill={gray}
            stroke={ink}
            strokeWidth={3}
          />

          {/* 托盘上的物品 */}
          {items.map((slot, idx) => renderItemSlot(slot, ctx, `dial-item-${idx}`))}

          {/* 方形秤身 */}
          <rect
            x={bodyBox.x}
            y={bodyBox.y}
            width={bodyBox.w}
            height={bodyBox.h}
            rx={16}
            fill={gray}
            stroke={ink}
            strokeWidth={3}
          />

          {/* 圆形表盘 */}
          <circle
            cx={dialCenter[0]}
            cy={dialCenter[1]}
            r={dialR}
            fill={ctx.theme.stageBg}
            stroke={ink}
            strokeWidth={3}
          />

          {/* 表盘刻度与数值 */}
          {ticks.map((t, idx) => (
            <g key={`tick-${idx}`}>
              <line
                x1={t.p1[0]}
                y1={t.p1[1]}
                x2={t.p2[0]}
                y2={t.p2[1]}
                stroke={ink}
                strokeWidth={2}
              />
              <text
                x={t.textPos[0]}
                y={t.textPos[1]}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={20}
                fill={ink}
              >
                {t.val}
              </text>
            </g>
          ))}

          {/* 单位标签 */}
          {unit ? (
            <text
              x={dialCenter[0]}
              y={dialCenter[1] + dialR * 0.44}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={20}
              fill={dim}
            >
              {unit}
            </text>
          ) : null}

          {/* 指针 */}
          <line
            x1={dialCenter[0]}
            y1={dialCenter[1]}
            x2={pointerTipX}
            y2={pointerTipY}
            stroke={red}
            strokeWidth={4}
            strokeLinecap="round"
          />

          {/* 轴心盖 */}
          <circle cx={dialCenter[0]} cy={dialCenter[1]} r={8} fill={ink} />
        </g>
      );
    }

    return null;
  },
};
