// 十进制块：小棒和捆、方块和条/片/大正方体；讲计数单位、进位（满十捆成一捆）、退位（拆开一捆）。
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

export const BASE_TEN_STYLES = ['stick', 'block'] as const;
export type BaseTenStyle = (typeof BASE_TEN_STYLES)[number];

const PLACE_NAMES = ['ones', 'tens', 'hundreds', 'thousands'] as const;
export type BaseTenPlaceName = (typeof PLACE_NAMES)[number];

const OBLIQUE_ANGLE = (30 * Math.PI) / 180;
const DEPTH_RATIO = 0.5;

export interface BaseTenStickItem {
  index: number;
  at: Point;
  box: Box;
}

export interface BaseTenBundleItem {
  index: number;
  at: Point;
  box: Box;
  rope?: { x1: number; y1: number; x2: number; y2: number };
}

export interface BaseTenBlockItem {
  index: number;
  at: Point;
  box: Box;
}

export interface BaseTenColumn {
  place: number;
  name: BaseTenPlaceName;
  label?: string;
  box: Box;
  contentBox: Box;
  labelBox?: Box;
  count: number;
  items: (BaseTenStickItem | BaseTenBundleItem | BaseTenBlockItem)[];
}

export interface BaseTenTransition {
  e: number;
  phase: 'gather' | 'move';
  hasRope: boolean;
  movingSticks: BaseTenStickItem[];
  movingBundle?: BaseTenBundleItem;
}

export interface BaseTenLayout {
  at: Point;
  style: BaseTenStyle;
  columns: boolean;
  unit: number;
  color: string;
  ones: number;
  tens: number;
  hundreds: number;
  thousands: number;
  columnList: BaseTenColumn[];
  transition?: BaseTenTransition;
  box: Box;
}

function labelsOf(p: Props): string[] {
  if (Array.isArray(p.labels)) {
    return p.labels.map(String);
  }
  try {
    const defaultLabels = sceneStyle().parts['base-ten']?.labels;
    if (Array.isArray(defaultLabels)) {
      return defaultLabels.map(String);
    }
  } catch {
    // sceneStyle not configured
  }
  return [];
}

/** 计算斜二测正方体的包围盒尺寸 */
export function cubeMetrics(unit: number): {
  w: number;
  h: number;
  dx: number;
  dy: number;
  totalW: number;
  totalH: number;
} {
  const w = 10 * unit;
  const h = 10 * unit;
  const depth = 10 * unit * DEPTH_RATIO;
  const dx = depth * Math.cos(OBLIQUE_ANGLE);
  const dy = depth * Math.sin(OBLIQUE_ANGLE);
  return {
    w,
    h,
    dx,
    dy,
    totalW: w + dx,
    totalH: h + dy,
  };
}

/** 十进制块的纯函数布局计算 */
export function baseTenLayout(p: Props): BaseTenLayout {
  const at = pt(p.at, [0, 0]);
  const sStr = str(p.style, 'stick');
  const style: BaseTenStyle = sStr === 'block' ? 'block' : 'stick';
  const unit = Math.max(1, num(p.unit, 16));
  const columns = p.columns === undefined ? true : Boolean(p.columns);
  const colorName = str(p.color, 'blue');

  const rawOnes = num(p.ones, 0);
  const rawTens = num(p.tens, 0);
  const rawHundreds = num(p.hundreds, 0);
  const rawThousands = num(p.thousands, 0);

  const labels = labelsOf(p);

  // 1. 判定进位/退位过渡 (捆与拆)
  let transitionProgress: number | undefined;
  if (typeof p.e === 'number' && Number.isFinite(p.e)) {
    transitionProgress = Math.max(0, Math.min(1, p.e));
  } else if (rawTens % 1 !== 0) {
    transitionProgress = rawTens % 1;
    if (transitionProgress < 0) transitionProgress += 1;
  } else if (rawOnes % 1 !== 0) {
    transitionProgress = rawOnes % 1;
    if (transitionProgress < 0) transitionProgress += 1;
  }

  const isTransitioning =
    style === 'stick' &&
    transitionProgress !== undefined &&
    transitionProgress > 0 &&
    transitionProgress < 1;

  const e = transitionProgress ?? 0;

  // 稳定状态下的计数
  const onesCount = Math.max(0, rawOnes);
  const tensCount = Math.max(0, rawTens);
  const hundredsCount = Math.max(0, rawHundreds);
  const thousandsCount = Math.max(0, rawThousands);

  // 几何常量
  const stickW = unit * 0.5;
  const stickH = unit * 6;
  const stickGap = unit * 0.4;
  const stickRowGap = unit * 0.8;

  const bundleW = 10 * stickW; // 5 * unit
  const bundleH = stickH;
  const bundleGap = unit * 1;
  const bundleRowGap = unit * 0.8;

  const blockOnesGap = unit * 0.25;
  const rodGap = unit * 0.5;
  const flatGap = unit;
  const cubeMetric = cubeMetrics(unit);
  const cubeGap = unit;

  // 2. 确定激活的数位
  const activePlaces: number[] = [];
  const explicitLabels = Array.isArray(p.labels) ? p.labels : undefined;
  if (columns) {
    if (thousandsCount > 0 || (explicitLabels && explicitLabels.length >= 4)) {
      activePlaces.push(3, 2, 1, 0);
    } else if (hundredsCount > 0 || (explicitLabels && explicitLabels.length === 3)) {
      activePlaces.push(2, 1, 0);
    } else if (explicitLabels && explicitLabels.length === 1) {
      activePlaces.push(0);
    } else {
      activePlaces.push(1, 0);
    }
  } else {
    const placesWithItems = [3, 2, 1, 0].filter((pl) => {
      const c = [onesCount, tensCount, hundredsCount, thousandsCount][pl];
      return c > 0;
    });
    if (placesWithItems.length > 0) {
      activePlaces.push(...placesWithItems);
    } else {
      activePlaces.push(0);
    }
  }

  // 3. 计算各列/各级内容宽度与排布
  // 若处于 stick 捆绑过渡状态，分离稳定根数与正在捆绑的 10 根
  let stableOnes = onesCount;
  let stableTens = tensCount;
  let transitionInfo: BaseTenTransition | undefined;

  if (isTransitioning) {
    stableTens = Math.floor(rawTens);
    stableOnes = Math.max(0, Math.round(rawOnes - 10 * (1 - e)));
  }

  // 计算每一级的独立排版
  interface PlaceLayoutResult {
    place: number;
    name: BaseTenPlaceName;
    w: number;
    h: number;
    count: number;
    items: (BaseTenStickItem | BaseTenBundleItem | BaseTenBlockItem)[];
  }

  function layoutPlace(place: number, count: number, startX: number, startY: number): PlaceLayoutResult {
    const name = PLACE_NAMES[place];
    const items: (BaseTenStickItem | BaseTenBundleItem | BaseTenBlockItem)[] = [];

    if (style === 'stick') {
      if (place === 0) {
        // ones 小棒
        const maxCols = 10;
        const total = Math.floor(count);
        let maxRowW = 0;
        let totalH = stickH;

        if (total === 0) {
          maxRowW = Math.max(24, stickW * 2);
        } else {
          const numRows = Math.ceil(total / maxCols);
          totalH = numRows * stickH + (numRows - 1) * stickRowGap;

          for (let i = 0; i < total; i++) {
            const row = Math.floor(i / maxCols);
            const col = i % maxCols;
            const itemsInThisRow = Math.min(maxCols, total - row * maxCols);
            const rowW = itemsInThisRow * stickW + (itemsInThisRow - 1) * stickGap;
            if (rowW > maxRowW) maxRowW = rowW;

            const x = startX + col * (stickW + stickGap);
            const y = startY + row * (stickH + stickRowGap);
            items.push({
              index: i + 1,
              at: [x, y],
              box: { x, y, w: stickW, h: stickH },
            });
          }
        }
        return { place, name, w: maxRowW, h: totalH, count: total, items };
      } else if (place === 1) {
        // tens 捆
        const maxCols = columns ? 5 : 10;
        const total = Math.floor(count);
        let maxRowW = 0;
        let totalH = bundleH;

        if (total === 0) {
          maxRowW = bundleW;
        } else {
          const numRows = Math.ceil(total / maxCols);
          totalH = numRows * bundleH + (numRows - 1) * bundleRowGap;

          for (let i = 0; i < total; i++) {
            const row = Math.floor(i / maxCols);
            const col = i % maxCols;
            const itemsInThisRow = Math.min(maxCols, total - row * maxCols);
            const rowW = itemsInThisRow * bundleW + (itemsInThisRow - 1) * bundleGap;
            if (rowW > maxRowW) maxRowW = rowW;

            const x = startX + col * (bundleW + bundleGap);
            const y = startY + row * (bundleH + bundleRowGap);
            items.push({
              index: i + 1,
              at: [x, y],
              box: { x, y, w: bundleW, h: bundleH },
              rope: {
                x1: x,
                y1: y + bundleH / 2,
                x2: x + bundleW,
                y2: y + bundleH / 2,
              },
            });
          }
        }
        return { place, name, w: maxRowW, h: totalH, count: total, items };
      } else if (place === 2) {
        // hundreds 大捆 (10捆并列)
        const total = Math.floor(count);
        const bigW = 10 * bundleW + 9 * (unit * 0.2);
        const bigH = bundleH;
        const maxRowW = total === 0 ? bundleW : total * bigW + (total - 1) * bundleGap;
        for (let i = 0; i < total; i++) {
          const x = startX + i * (bigW + bundleGap);
          const y = startY;
          items.push({
            index: i + 1,
            at: [x, y],
            box: { x, y, w: bigW, h: bigH },
          });
        }
        return { place, name, w: maxRowW, h: bigH, count: total, items };
      } else {
        // thousands
        const total = Math.floor(count);
        const tW = 10 * bundleW;
        const maxRowW = total === 0 ? bundleW : total * tW + (total - 1) * bundleGap;
        for (let i = 0; i < total; i++) {
          const x = startX + i * (tW + bundleGap);
          const y = startY;
          items.push({
            index: i + 1,
            at: [x, y],
            box: { x, y, w: tW, h: bundleH },
          });
        }
        return { place, name, w: maxRowW, h: bundleH, count: total, items };
      }
    } else {
      // block 方块
      if (place === 0) {
        // 个：小方块 unit x unit
        const maxCols = 10;
        const total = Math.floor(count);
        let maxRowW = 0;
        let totalH = unit;
        if (total === 0) {
          maxRowW = Math.max(24, unit);
        } else {
          const numRows = Math.ceil(total / maxCols);
          totalH = numRows * unit + (numRows - 1) * blockOnesGap;
          for (let i = 0; i < total; i++) {
            const row = Math.floor(i / maxCols);
            const col = i % maxCols;
            const itemsInThisRow = Math.min(maxCols, total - row * maxCols);
            const rowW = itemsInThisRow * unit + (itemsInThisRow - 1) * blockOnesGap;
            if (rowW > maxRowW) maxRowW = rowW;
            const x = startX + col * (unit + blockOnesGap);
            const y = startY + row * (unit + blockOnesGap);
            items.push({
              index: i + 1,
              at: [x, y],
              box: { x, y, w: unit, h: unit },
            });
          }
        }
        return { place, name, w: maxRowW, h: totalH, count: total, items };
      } else if (place === 1) {
        // 十：条 unit x 10*unit
        const maxCols = 5;
        const total = Math.floor(count);
        const rodH = 10 * unit;
        let maxRowW = 0;
        let totalH = rodH;
        if (total === 0) {
          maxRowW = Math.max(24, unit);
        } else {
          const numRows = Math.ceil(total / maxCols);
          totalH = numRows * rodH + (numRows - 1) * unit;
          for (let i = 0; i < total; i++) {
            const row = Math.floor(i / maxCols);
            const col = i % maxCols;
            const itemsInThisRow = Math.min(maxCols, total - row * maxCols);
            const rowW = itemsInThisRow * unit + (itemsInThisRow - 1) * rodGap;
            if (rowW > maxRowW) maxRowW = rowW;
            const x = startX + col * (unit + rodGap);
            const y = startY + row * (rodH + unit);
            items.push({
              index: i + 1,
              at: [x, y],
              box: { x, y, w: unit, h: rodH },
            });
          }
        }
        return { place, name, w: maxRowW, h: totalH, count: total, items };
      } else if (place === 2) {
        // 百：片 10*unit x 10*unit
        const maxCols = 3;
        const total = Math.floor(count);
        const flatW = 10 * unit;
        const flatH = 10 * unit;
        let maxRowW = 0;
        let totalH = flatH;
        if (total === 0) {
          maxRowW = flatW;
        } else {
          const numRows = Math.ceil(total / maxCols);
          totalH = numRows * flatH + (numRows - 1) * unit;
          for (let i = 0; i < total; i++) {
            const row = Math.floor(i / maxCols);
            const col = i % maxCols;
            const itemsInThisRow = Math.min(maxCols, total - row * maxCols);
            const rowW = itemsInThisRow * flatW + (itemsInThisRow - 1) * flatGap;
            if (rowW > maxRowW) maxRowW = rowW;
            const x = startX + col * (flatW + flatGap);
            const y = startY + row * (flatH + unit);
            items.push({
              index: i + 1,
              at: [x, y],
              box: { x, y, w: flatW, h: flatH },
            });
          }
        }
        return { place, name, w: maxRowW, h: totalH, count: total, items };
      } else {
        // 千：立方体 斜二测
        const total = Math.floor(count);
        const totalH = cubeMetric.totalH;
        const maxRowW = total === 0 ? cubeMetric.totalW : total * cubeMetric.totalW + (total - 1) * cubeGap;
        for (let i = 0; i < total; i++) {
          const x = startX + i * (cubeMetric.totalW + cubeGap);
          const y = startY;
          items.push({
            index: i + 1,
            at: [x, y],
            box: { x, y, w: cubeMetric.totalW, h: cubeMetric.totalH },
          });
        }
        return { place, name, w: maxRowW, h: totalH, count: total, items };
      }
    }
  }

  // 计算各列/级的排布
  const colGap = columns ? unit * 2 : unit;
  let curX = at[0];
  const startY = at[1];

  const placeCounts: Record<number, number> = {
    0: isTransitioning ? stableOnes : onesCount,
    1: isTransitioning ? stableTens : tensCount,
    2: hundredsCount,
    3: thousandsCount,
  };

  const results: PlaceLayoutResult[] = [];
  for (const place of activePlaces) {
    const res = layoutPlace(place, placeCounts[place] ?? 0, curX, startY);
    results.push(res);
    curX += res.w + colGap;
  }

  // 计算最大内容高度
  const maxContentH = Math.max(
    style === 'stick' ? stickH : cubeMetric.totalH,
    ...results.map((r) => r.h),
  );

  // 处理 transition 过程中的 10 根小棒并拢与移动
  if (isTransitioning) {
    const tensRes = results.find((r) => r.place === 1);
    const onesRes = results.find((r) => r.place === 0);

    const targetTensX = tensRes ? tensRes.items[0]?.box.x ?? at[0] : at[0];
    const targetTensY = tensRes ? tensRes.items[0]?.box.y ?? at[1] : at[1];
    const incomingBundleX =
      targetTensX + stableTens * (bundleW + bundleGap);

    const onesStartX = onesRes
      ? onesRes.items.length > 0
        ? (onesRes.items[onesRes.items.length - 1]?.box.x ?? at[0]) + stickW + stickGap
        : onesRes.w > 0
          ? onesRes.items[0]?.box.x ?? at[0]
          : at[0]
      : at[0] + 100;
    const onesStartY = onesRes?.items[0]?.box.y ?? startY;

    if (e <= 0.5) {
      // 前 50% 并拢
      const t = e / 0.5;
      const currentGap = stickGap * (1 - t);
      const movingSticks: BaseTenStickItem[] = [];

      for (let k = 0; k < 10; k++) {
        const sx = onesStartX + k * (stickW + currentGap);
        movingSticks.push({
          index: stableOnes + k + 1,
          at: [sx, onesStartY],
          box: { x: sx, y: onesStartY, w: stickW, h: stickH },
        });
      }

      transitionInfo = {
        e,
        phase: 'gather',
        hasRope: false,
        movingSticks,
      };
    } else {
      // 后 50% 移动并出现绳子
      const u = (e - 0.5) / 0.5;
      const curBundleX = (1 - u) * onesStartX + u * incomingBundleX;
      const curBundleY = (1 - u) * onesStartY + u * targetTensY;

      const movingSticks: BaseTenStickItem[] = [];
      for (let k = 0; k < 10; k++) {
        const sx = curBundleX + k * stickW;
        movingSticks.push({
          index: stableOnes + k + 1,
          at: [sx, curBundleY],
          box: { x: sx, y: curBundleY, w: stickW, h: stickH },
        });
      }

      transitionInfo = {
        e,
        phase: 'move',
        hasRope: true,
        movingSticks,
        movingBundle: {
          index: stableTens + 1,
          at: [curBundleX, curBundleY],
          box: { x: curBundleX, y: curBundleY, w: bundleW, h: bundleH },
          rope: {
            x1: curBundleX,
            y1: curBundleY + bundleH / 2,
            x2: curBundleX + bundleW,
            y2: curBundleY + bundleH / 2,
          },
        },
      };
    }
  }

  // 构造 BaseTenColumn 列表
  const labelY = startY + maxContentH + unit;
  const labelH = 22;

  const columnList: BaseTenColumn[] = results.map((res) => {
    const lbl = labels[res.place] ?? '';
    const colX = res.items[0]?.box.x ?? at[0];
    const contentBox: Box = {
      x: colX,
      y: startY,
      w: Math.max(res.w, columns && lbl ? textWidth(lbl, 22) : res.w),
      h: maxContentH,
    };

    let labelBox: Box | undefined;
    const totalColBox = { ...contentBox };

    if (columns && lbl) {
      const lw = textWidth(lbl, 22);
      const lx = contentBox.x + contentBox.w / 2 - lw / 2;
      labelBox = { x: lx, y: labelY, w: lw, h: labelH };
      totalColBox.h = maxContentH + unit + labelH;
    }

    return {
      place: res.place,
      name: res.name,
      label: lbl,
      box: totalColBox,
      contentBox,
      labelBox,
      count: res.count,
      items: res.items,
    };
  });

  // 计算全局整体包围盒
  const allBoxes: Box[] = [];
  for (const col of columnList) {
    allBoxes.push(col.box);
    for (const it of col.items) {
      allBoxes.push(it.box);
    }
  }

  if (transitionInfo) {
    for (const ms of transitionInfo.movingSticks) {
      allBoxes.push(ms.box);
    }
    if (transitionInfo.movingBundle) {
      allBoxes.push(transitionInfo.movingBundle.box);
    }
  }

  let totalBox: Box;
  if (allBoxes.length === 0) {
    totalBox = { x: at[0], y: at[1], w: unit * 4, h: maxContentH + (columns ? unit + labelH : 0) };
  } else {
    const minX = Math.min(...allBoxes.map((b) => b.x));
    const minY = Math.min(...allBoxes.map((b) => b.y));
    const maxX = Math.max(...allBoxes.map((b) => b.x + b.w));
    const maxY = Math.max(...allBoxes.map((b) => b.y + b.h));
    totalBox = {
      x: minX,
      y: minY,
      w: maxX - minX,
      h: maxY - minY,
    };
  }

  return {
    at,
    style,
    columns,
    unit,
    color: colorName,
    ones: rawOnes,
    tens: rawTens,
    hundreds: rawHundreds,
    thousands: rawThousands,
    columnList,
    transition: transitionInfo,
    box: totalBox,
  };
}

export const baseTenPart: PartDef = {
  type: 'base-ten',
  name: '十进制块',
  anchor: 'start',
  required: [],
  props: [
    'style',
    'ones',
    'tens',
    'hundreds',
    'thousands',
    'columns',
    'labels',
    'unit',
    'color',
    'e',
  ],
  bbox(p) {
    return baseTenLayout(p).box;
  },
  subitems(p) {
    const layout = baseTenLayout(p);
    const subs: Subitem[] = [];

    // 1. 各列 box（ones, tens, hundreds, thousands）
    for (const col of layout.columnList) {
      subs.push({
        name: col.name,
        box: col.box,
        label: col.label || col.name,
        disabled: false,
      });

      // 2. 内部项（tens.<n>、ones.<n> 等）
      for (const it of col.items) {
        subs.push({
          name: `${col.name}.${it.index}`,
          box: it.box,
          label: `${col.name}.${it.index}`,
          disabled: false,
        });
      }
    }

    return subs;
  },
  Render({ p, ctx }) {
    const layout = baseTenLayout(p);
    const { unit, style, color: colorName, transition } = layout;

    const fillColor = color(colorName, ctx.theme, 'blue');
    const darkest = color('black', ctx.theme);
    const { width: bw, darken } = sceneStyle().counterBorder;
    const strokeColor = mixColor(fillColor, darkest, darken);
    const accentColor = ctx.theme.accent;
    const dimColor = ctx.theme.dim;

    const stickW = unit * 0.5;
    const stickH = unit * 6;
    const bundleH = stickH;
    const stickRx = unit * 0.1;

    return (
      <g>
        {/* 1. 渲染各列/各级常规项 */}
        {layout.columnList.map((col) => {
          return (
            <g key={col.name}>
              {/* 各项 */}
              {col.items.map((item) => {
                if (style === 'stick') {
                  if (col.place === 0) {
                    // 个位单根小棒
                    return (
                      <rect
                        key={item.index}
                        x={item.box.x}
                        y={item.box.y}
                        width={item.box.w}
                        height={item.box.h}
                        rx={stickRx}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={bw}
                      />
                    );
                  } else if (col.place === 1) {
                    // 十位一捆（10 根贴靠 + 横向绳子）
                    const bundle = item as BaseTenBundleItem;
                    return (
                      <g key={item.index}>
                        {Array.from({ length: 10 }).map((_, k) => (
                          <rect
                            key={k}
                            x={bundle.box.x + k * stickW}
                            y={bundle.box.y}
                            width={stickW}
                            height={bundleH}
                            rx={stickRx}
                            fill={fillColor}
                            stroke={strokeColor}
                            strokeWidth={bw}
                          />
                        ))}
                        {bundle.rope ? (
                          <line
                            x1={bundle.rope.x1}
                            y1={bundle.rope.y1}
                            x2={bundle.rope.x2}
                            y2={bundle.rope.y2}
                            stroke={accentColor}
                            strokeWidth={3}
                            strokeLinecap="round"
                          />
                        ) : null}
                      </g>
                    );
                  } else {
                    // 百位及以上大捆
                    return (
                      <rect
                        key={item.index}
                        x={item.box.x}
                        y={item.box.y}
                        width={item.box.w}
                        height={item.box.h}
                        rx={stickRx}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={bw}
                      />
                    );
                  }
                } else {
                  // block 模式
                  if (col.place === 0) {
                    // 小方块
                    return (
                      <rect
                        key={item.index}
                        x={item.box.x}
                        y={item.box.y}
                        width={unit}
                        height={unit}
                        rx={unit * 0.12}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={bw}
                      />
                    );
                  } else if (col.place === 1) {
                    // 条（1x10 小方块竖排带格线）
                    return (
                      <g key={item.index}>
                        <rect
                          x={item.box.x}
                          y={item.box.y}
                          width={unit}
                          height={unit * 10}
                          rx={unit * 0.12}
                          fill={fillColor}
                          stroke={strokeColor}
                          strokeWidth={bw}
                        />
                        {Array.from({ length: 9 }).map((_, k) => (
                          <line
                            key={k}
                            x1={item.box.x}
                            y1={item.box.y + (k + 1) * unit}
                            x2={item.box.x + unit}
                            y2={item.box.y + (k + 1) * unit}
                            stroke={strokeColor}
                            strokeWidth={1}
                          />
                        ))}
                      </g>
                    );
                  } else if (col.place === 2) {
                    // 片（10x10 格线）
                    const fw = 10 * unit;
                    const fh = 10 * unit;
                    return (
                      <g key={item.index}>
                        <rect
                          x={item.box.x}
                          y={item.box.y}
                          width={fw}
                          height={fh}
                          rx={unit * 0.12}
                          fill={fillColor}
                          stroke={strokeColor}
                          strokeWidth={bw}
                        />
                        {Array.from({ length: 9 }).map((_, k) => (
                          <line
                            key={`h${k}`}
                            x1={item.box.x}
                            y1={item.box.y + (k + 1) * unit}
                            x2={item.box.x + fw}
                            y2={item.box.y + (k + 1) * unit}
                            stroke={strokeColor}
                            strokeWidth={1}
                          />
                        ))}
                        {Array.from({ length: 9 }).map((_, k) => (
                          <line
                            key={`v${k}`}
                            x1={item.box.x + (k + 1) * unit}
                            y1={item.box.y}
                            x2={item.box.x + (k + 1) * unit}
                            y2={item.box.y + fh}
                            stroke={strokeColor}
                            strokeWidth={1}
                          />
                        ))}
                      </g>
                    );
                  } else {
                    // 千：大正方体（斜二测）
                    const cm = cubeMetrics(unit);
                    const fx = item.box.x;
                    const fy = item.box.y + cm.dy; // 正面起始 y
                    const fw = cm.w;
                    const fh = cm.h;
                    const dx = cm.dx;
                    const dy = cm.dy;

                    const topPoints = `${fx},${fy} ${fx + fw},${fy} ${fx + fw + dx},${fy - dy} ${fx + dx},${fy - dy}`;
                    const rightPoints = `${fx + fw},${fy} ${fx + fw + dx},${fy - dy} ${fx + fw + dx},${fy - dy + fh} ${fx + fw},${fy + fh}`;

                    return (
                      <g key={item.index}>
                        {/* 顶面 */}
                        <polygon
                          points={topPoints}
                          fill={mixColor(fillColor, color('white', ctx.theme), 0.2)}
                          stroke={strokeColor}
                          strokeWidth={bw}
                        />
                        {Array.from({ length: 9 }).map((_, k) => {
                          const frac = (k + 1) / 10;
                          return (
                            <line
                              key={`th${k}`}
                              x1={fx + frac * dx}
                              y1={fy - frac * dy}
                              x2={fx + fw + frac * dx}
                              y2={fy - frac * dy}
                              stroke={strokeColor}
                              strokeWidth={1}
                            />
                          );
                        })}
                        {Array.from({ length: 9 }).map((_, k) => {
                          const frac = (k + 1) / 10;
                          return (
                            <line
                              key={`tv${k}`}
                              x1={fx + frac * fw}
                              y1={fy}
                              x2={fx + frac * fw + dx}
                              y2={fy - dy}
                              stroke={strokeColor}
                              strokeWidth={1}
                            />
                          );
                        })}

                        {/* 右侧面 */}
                        <polygon
                          points={rightPoints}
                          fill={mixColor(fillColor, darkest, 0.15)}
                          stroke={strokeColor}
                          strokeWidth={bw}
                        />
                        {Array.from({ length: 9 }).map((_, k) => {
                          const frac = (k + 1) / 10;
                          return (
                            <line
                              key={`rh${k}`}
                              x1={fx + fw}
                              y1={fy + frac * fh}
                              x2={fx + fw + dx}
                              y2={fy - dy + frac * fh}
                              stroke={strokeColor}
                              strokeWidth={1}
                            />
                          );
                        })}
                        {Array.from({ length: 9 }).map((_, k) => {
                          const frac = (k + 1) / 10;
                          return (
                            <line
                              key={`rv${k}`}
                              x1={fx + fw + frac * dx}
                              y1={fy - frac * dy}
                              x2={fx + fw + frac * dx}
                              y2={fy - frac * dy + fh}
                              stroke={strokeColor}
                              strokeWidth={1}
                            />
                          );
                        })}

                        {/* 正面 10x10 格 */}
                        <rect
                          x={fx}
                          y={fy}
                          width={fw}
                          height={fh}
                          fill={fillColor}
                          stroke={strokeColor}
                          strokeWidth={bw}
                        />
                        {Array.from({ length: 9 }).map((_, k) => (
                          <line
                            key={`fh${k}`}
                            x1={fx}
                            y1={fy + (k + 1) * unit}
                            x2={fx + fw}
                            y2={fy + (k + 1) * unit}
                            stroke={strokeColor}
                            strokeWidth={1}
                          />
                        ))}
                        {Array.from({ length: 9 }).map((_, k) => (
                          <line
                            key={`fv${k}`}
                            x1={fx + (k + 1) * unit}
                            y1={fy}
                            x2={fx + (k + 1) * unit}
                            y2={fy + fh}
                            stroke={strokeColor}
                            strokeWidth={1}
                          />
                        ))}
                      </g>
                    );
                  }
                }
              })}

              {/* 列标签（columns: true 时） */}
              {layout.columns && col.labelBox && col.label ? (
                <text
                  x={col.box.x + col.box.w / 2}
                  y={col.labelBox.y}
                  textAnchor="middle"
                  dominantBaseline="hanging"
                  fill={dimColor}
                  fontSize={22}
                >
                  {col.label}
                </text>
              ) : null}
            </g>
          );
        })}

        {/* 2. 渲染过渡（捆小棒）中的动态小棒与绳子 */}
        {transition ? (
          <g>
            {transition.movingSticks.map((ms, idx) => (
              <rect
                key={`trans_st_${idx}`}
                x={ms.box.x}
                y={ms.box.y}
                width={stickW}
                height={stickH}
                rx={stickRx}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={bw}
              />
            ))}
            {transition.hasRope && transition.movingBundle?.rope ? (
              <line
                x1={transition.movingBundle.rope.x1}
                y1={transition.movingBundle.rope.y1}
                x2={transition.movingBundle.rope.x2}
                y2={transition.movingBundle.rope.y2}
                stroke={accentColor}
                strokeWidth={3}
                strokeLinecap="round"
              />
            ) : null}
          </g>
        ) : null}
      </g>
    );
  },
};
