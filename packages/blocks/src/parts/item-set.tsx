// 物品组：一组各不相同的物品（水果、文具、小动物、图形），用于点数、序数、分类、比较、连加连减。
import type { ReactNode } from 'react';
import {
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

export const ITEM_SET_LAYOUTS = ['row', 'grid', 'pile'] as const;
export type ItemSetLayoutKind = (typeof ITEM_SET_LAYOUTS)[number];
export const ITEM_SET_SHAPES = ['circle', 'square', 'triangle', 'star'] as const;
export type ItemSetShapeKind = (typeof ITEM_SET_SHAPES)[number];

export interface ItemSetItem {
  asset?: string;
  shape?: ItemSetShapeKind;
  color?: string;
  size?: number;
  tags?: Record<string, string>;
  value?: number;
  label?: string;
}

export interface ItemSlot {
  index: number;
  item: ItemSetItem;
  at: Point;
  box: Box;
  labelBox?: Box;
  totalBox: Box;
  visible: boolean;
  opacity: number;
  hidden: boolean;
}

export interface ItemSetLayout {
  at: Point;
  layout: ItemSetLayoutKind;
  cols: number;
  size: number;
  gap: number;
  show: number;
  slots: ItemSlot[];
  box: Box;
}

function layoutOf(p: Props): ItemSetLayoutKind {
  const l = str(p.layout, 'row');
  return (ITEM_SET_LAYOUTS as readonly string[]).includes(l)
    ? (l as ItemSetLayoutKind)
    : 'row';
}

function itemsOf(p: Props): ItemSetItem[] {
  if (!Array.isArray(p.items)) return [];
  return p.items.filter((it): it is ItemSetItem => it !== null && typeof it === 'object');
}

/** 物品组的纯函数布局计算 */
export function itemSetLayout(p: Props): ItemSetLayout {
  const at = pt(p.at, [0, 0]);
  const lk = layoutOf(p);
  const items = itemsOf(p);
  const count = items.length;
  const size = Math.max(1, num(p.size, 56));
  const gap = Math.max(0, num(p.gap, 12));

  let cols = 1;
  if (lk === 'row') {
    cols = Math.max(1, count);
  } else if (lk === 'grid') {
    cols = Math.max(1, Math.round(num(p.cols, 5)));
  } else if (lk === 'pile') {
    cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  }

  const show = typeof p.show === 'number' && Number.isFinite(p.show) ? p.show : count;
  const hiddenList = numList(p.hiddenItems);
  const hiddenSet = new Set<number>(hiddenList);

  const maxVisibleIndex = Math.ceil(show);
  const fullVisibleIndex = Math.floor(show);

  const slots: ItemSlot[] = items.map((item, i) => {
    const n = i + 1; // 1-based index
    const colIdx = (n - 1) % cols;
    const rowIdx = Math.floor((n - 1) / cols);

    let x = at[0] + colIdx * (size + gap);
    let y = at[1] + rowIdx * (size + gap);

    if (lk === 'pile') {
      const dx = Math.sin(n * 2.4) * size * 0.35;
      const dy = Math.cos(n * 1.7) * size * 0.25;
      x += dx;
      y += dy;
    }

    const itemSize = Math.max(1, num(item.size, size));
    const boxX = x + (size - itemSize) / 2;
    const boxY = y + (size - itemSize) / 2;
    const box: Box = { x: boxX, y: boxY, w: itemSize, h: itemSize };

    let labelBox: Box | undefined;
    let totalBox: Box = { ...box };

    if (item.label) {
      const lbl = str(item.label);
      const lw = textWidth(lbl, 20);
      const lh = 20;
      const lx = boxX + itemSize / 2 - lw / 2;
      const ly = boxY + itemSize + 8;
      labelBox = { x: lx, y: ly, w: lw, h: lh };

      const minX = Math.min(box.x, labelBox.x);
      const minY = Math.min(box.y, labelBox.y);
      const maxX = Math.max(box.x + box.w, labelBox.x + labelBox.w);
      const maxY = Math.max(box.y + box.h, labelBox.y + labelBox.h);
      totalBox = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }

    const isHidden = hiddenSet.has(n);
    let opacity = 0;
    let visible = false;

    if (!isHidden && show > 0) {
      if (n <= fullVisibleIndex) {
        visible = true;
        opacity = 1;
      } else if (n === maxVisibleIndex) {
        visible = true;
        opacity = Math.max(0, Math.min(1, show - fullVisibleIndex));
      }
    }

    return {
      index: n,
      item,
      at: [x, y],
      box,
      labelBox,
      totalBox,
      visible,
      opacity,
      hidden: isHidden,
    };
  });

  // 包围盒：包住当前画出的全部内容（可见且未被隐藏）
  const drawnSlots = slots.filter((s) => s.visible && s.opacity > 0);
  const targetBoxes = (drawnSlots.length > 0 ? drawnSlots : slots).map((s) => s.totalBox);

  let bbox: Box;
  if (!targetBoxes.length) {
    bbox = { x: at[0], y: at[1], w: size, h: size };
  } else {
    const minX = Math.min(...targetBoxes.map((b) => b.x));
    const minY = Math.min(...targetBoxes.map((b) => b.y));
    const maxX = Math.max(...targetBoxes.map((b) => b.x + b.w));
    const maxY = Math.max(...targetBoxes.map((b) => b.y + b.h));
    bbox = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  return {
    at,
    layout: lk,
    cols,
    size,
    gap,
    show,
    slots,
    box: bbox,
  };
}

export const itemSetPart: PartDef = {
  type: 'item-set',
  name: '物品组',
  anchor: 'start',
  required: ['items'],
  props: ['items', 'layout', 'cols', 'size', 'gap', 'color', 'show', 'hiddenItems'],
  bbox(p) {
    return itemSetLayout(p).box;
  },
  subitems(p) {
    const layout = itemSetLayout(p);
    return layout.slots.map((slot) => {
      const isBeyondShow = slot.index > Math.ceil(layout.show);
      const sub: Subitem = {
        name: String(slot.index),
        box: slot.box,
        label: slot.item.label ? str(slot.item.label) : String(slot.index),
        disabled: slot.hidden || isBeyondShow,
      };
      if (typeof slot.item.value === 'number') {
        sub.value = slot.item.value;
      }
      if (slot.item.tags && typeof slot.item.tags === 'object') {
        sub.tags = slot.item.tags;
      }
      return sub;
    });
  },
  Render({ p, ctx }) {
    const layout = itemSetLayout(p);
    const baseColorName = str(p.color, 'blue');
    const { width: bw, darken } = sceneStyle().counterBorder;
    const darkest = color('black', ctx.theme);

    return (
      <g>
        {layout.slots.map((slot) => {
          if (!slot.visible || slot.opacity <= 0.001) return null;
          const { item, box, opacity, index } = slot;
          const cx = box.x + box.w / 2;
          const cy = box.y + box.h / 2;
          const d = box.w * 0.8;
          const r = d / 2;

          let shapeContent: ReactNode;
          if (item.asset) {
            const url = ctx.assetUrl?.(str(item.asset));
            if (!url) {
              shapeContent = (
                <rect
                  x={box.x}
                  y={box.y}
                  width={box.w}
                  height={box.h}
                  rx={8}
                  fill={ctx.theme.dim}
                  opacity={0.35}
                />
              );
            } else {
              shapeContent = (
                <image
                  href={url}
                  x={box.x}
                  y={box.y}
                  width={box.w}
                  height={box.h}
                  preserveAspectRatio="xMidYMid meet"
                />
              );
            }
          } else {
            const shapeKind = (item.shape as ItemSetShapeKind) || 'circle';
            const itemColorName = str(item.color || baseColorName, 'blue');
            const fillColor = color(itemColorName, ctx.theme, 'blue');
            const strokeColor = mixColor(fillColor, darkest, darken);

            switch (shapeKind) {
              case 'square': {
                const rx = d * 0.12;
                shapeContent = (
                  <rect
                    x={cx - r}
                    y={cy - r}
                    width={d}
                    height={d}
                    rx={rx}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={bw}
                  />
                );
                break;
              }
              case 'triangle': {
                shapeContent = (
                  <path
                    d={`M${cx},${cy - r} L${cx + r},${cy + r} L${cx - r},${cy + r} Z`}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={bw}
                    strokeLinejoin="round"
                  />
                );
                break;
              }
              case 'star': {
                const pts = Array.from({ length: 10 }, (_, k) => {
                  const theta = -Math.PI / 2 + (k * Math.PI) / 5;
                  const rad = k % 2 === 0 ? r : r * 0.4;
                  return `${cx + rad * Math.cos(theta)},${cy + rad * Math.sin(theta)}`;
                }).join(' L ');
                shapeContent = (
                  <path
                    d={`M ${pts} Z`}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={bw}
                    strokeLinejoin="round"
                  />
                );
                break;
              }
              default: {
                shapeContent = (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={bw}
                  />
                );
                break;
              }
            }
          }

          return (
            <g key={index} opacity={opacity}>
              {shapeContent}
              {item.label ? (
                <text
                  x={cx}
                  y={box.y + box.h + 8}
                  textAnchor="middle"
                  dominantBaseline="hanging"
                  fill={ctx.theme.ink}
                  fontSize={20}
                >
                  {item.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </g>
    );
  },
};
