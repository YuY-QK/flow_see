// 百数表零件：数序、找规律、倍数特征、质数筛。
import type { ReactNode } from 'react';
import {
  color,
  num,
  pt,
  type Box,
  type PartDef,
  type Point,
  type Props,
  type Subitem,
} from '../base';

export const NUMBER_CHART_MARK_STYLES = ['circle', 'fill', 'cross'] as const;
export type NumberChartMarkStyle = (typeof NUMBER_CHART_MARK_STYLES)[number];

export interface NumberChartMarkDef {
  multiplesOf: number;
  color?: string;
  style?: NumberChartMarkStyle;
  keepSelf?: boolean;
}

export interface NumberChartCellMark {
  groupIndex: number;
  multiplesOf: number;
  color: string;
  style: NumberChartMarkStyle;
  opacity: number;
}

export interface NumberChartCell {
  num: number;
  row: number; // 1-based 行号
  col: number; // 1-based 列号
  x: number;
  y: number;
  box: Box;
  marks: NumberChartCellMark[];
}

export interface NumberChartRow {
  row: number; // 1-based
  box: Box;
}

export interface NumberChartCol {
  col: number; // 1-based
  box: Box;
}

export interface NumberChartLayout {
  at: Point;
  from: number;
  to: number;
  cols: number;
  rows: number;
  cell: number;
  size: number;
  reveal: number;
  marks: NumberChartMarkDef[];
  cells: NumberChartCell[];
  rowBoxes: NumberChartRow[];
  colBoxes: NumberChartCol[];
  box: Box;
}

function parseMarks(raw: unknown): NumberChartMarkDef[] {
  if (!Array.isArray(raw)) return [];
  const result: NumberChartMarkDef[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const m = item as Record<string, unknown>;
    const mult = typeof m.multiplesOf === 'number' && Number.isFinite(m.multiplesOf) ? Math.round(m.multiplesOf) : 0;
    if (mult <= 0) continue;
    const styleVal = typeof m.style === 'string' && (NUMBER_CHART_MARK_STYLES as readonly string[]).includes(m.style)
      ? (m.style as NumberChartMarkStyle)
      : 'circle';
    result.push({
      multiplesOf: mult,
      color: typeof m.color === 'string' ? m.color : 'blue',
      style: styleVal,
      keepSelf: Boolean(m.keepSelf),
    });
  }
  return result;
}

function markZOrder(style: NumberChartMarkStyle): number {
  return style === 'fill' ? 0 : 1;
}

/** 百数表的纯函数布局计算 */
export function numberChartLayout(p: Props): NumberChartLayout {
  const at = pt(p.at, [0, 0]);
  const from = Math.round(num(p.from, 1));
  const to = Math.round(num(p.to, 100));
  const cols = Math.max(1, Math.round(num(p.cols, 10)));
  const cell = Math.max(1, num(p.cell, 38));
  const size = Math.max(1, num(p.size, 18));
  const reveal = Math.max(0, num(p.reveal, 0));
  const marks = parseMarks(p.marks);

  const count = to >= from ? to - from + 1 : 0;
  const rows = count > 0 ? Math.ceil(count / cols) : 0;
  const totalW = cols * cell;
  const totalH = rows * cell;
  const bbox: Box = { x: at[0], y: at[1], w: totalW, h: totalH };

  // 每行每列的包围盒
  const rowBoxes: NumberChartRow[] = [];
  for (let r = 1; r <= rows; r++) {
    rowBoxes.push({
      row: r,
      box: {
        x: at[0],
        y: at[1] + (r - 1) * cell,
        w: totalW,
        h: cell,
      },
    });
  }

  const colBoxes: NumberChartCol[] = [];
  for (let c = 1; c <= cols; c++) {
    colBoxes.push({
      col: c,
      box: {
        x: at[0] + (c - 1) * cell,
        y: at[1],
        w: cell,
        h: totalH,
      },
    });
  }

  // 计算每组 mark 中各个数字的命中情况及不透明度
  // num -> marks
  const cellMarksMap = new Map<number, NumberChartCellMark[]>();

  marks.forEach((mark, groupIdx) => {
    // 找出该组所有命中目标数（从小到大排序）
    const targetNums: number[] = [];
    for (let val = from; val <= to; val++) {
      if (val % mark.multiplesOf === 0) {
        if (mark.keepSelf && val === mark.multiplesOf) {
          continue;
        }
        targetNums.push(val);
      }
    }

    const totalTargets = targetNums.length;
    if (totalTargets === 0) return;

    // 根据 reveal 计算当前组可见情况
    // reveal: 整数部分 = 已完全出现的组数；小数部分 = 当前组按从小到大出现的比例
    if (reveal >= groupIdx + 1) {
      // 整组完全出现
      for (const val of targetNums) {
        const list = cellMarksMap.get(val) ?? [];
        list.push({
          groupIndex: groupIdx,
          multiplesOf: mark.multiplesOf,
          color: mark.color ?? 'blue',
          style: mark.style ?? 'circle',
          opacity: 1,
        });
        cellMarksMap.set(val, list);
      }
    } else if (reveal > groupIdx) {
      // 当前组部分出现
      const progress = reveal - groupIdx; // 0 < progress < 1
      const exactCount = progress * totalTargets;
      const fullCount = Math.floor(exactCount);

      for (let i = 0; i < totalTargets; i++) {
        let opacity = 0;
        if (i < fullCount) {
          opacity = 1;
        } else if (i === fullCount && exactCount > fullCount) {
          opacity = exactCount - fullCount;
        }

        if (opacity > 0.001) {
          const val = targetNums[i];
          const list = cellMarksMap.get(val) ?? [];
          list.push({
            groupIndex: groupIdx,
            multiplesOf: mark.multiplesOf,
            color: mark.color ?? 'blue',
            style: mark.style ?? 'circle',
            opacity,
          });
          cellMarksMap.set(val, list);
        }
      }
    }
  });

  // 构建各格子数据
  const cells: NumberChartCell[] = [];
  for (let i = 0; i < count; i++) {
    const val = from + i;
    const rIdx = Math.floor(i / cols); // 0-based
    const cIdx = i % cols; // 0-based
    const x = at[0] + cIdx * cell;
    const y = at[1] + rIdx * cell;
    const box: Box = { x, y, w: cell, h: cell };

    const rawCellMarks = cellMarksMap.get(val) ?? [];
    // 同一格多组标记叠加时：fill 在最底层，circle 和 cross 在上层
    const sortedMarks = [...rawCellMarks].sort((a, b) => {
      const zDiff = markZOrder(a.style) - markZOrder(b.style);
      if (zDiff !== 0) return zDiff;
      return a.groupIndex - b.groupIndex;
    });

    cells.push({
      num: val,
      row: rIdx + 1,
      col: cIdx + 1,
      x,
      y,
      box,
      marks: sortedMarks,
    });
  }

  return {
    at,
    from,
    to,
    cols,
    rows,
    cell,
    size,
    reveal,
    marks,
    cells,
    rowBoxes,
    colBoxes,
    box: bbox,
  };
}

export const numberChartPart: PartDef = {
  type: 'number-chart',
  name: '百数表',
  anchor: 'start',
  props: ['from', 'to', 'cols', 'cell', 'marks', 'reveal', 'size'],
  bbox(p: Props): Box {
    return numberChartLayout(p).box;
  },
  subitems(p: Props): Subitem[] {
    const layout = numberChartLayout(p);
    const items: Subitem[] = [];

    // 1. 各数字格子 n.<数>
    for (const cell of layout.cells) {
      items.push({
        name: `n.${cell.num}`,
        value: cell.num,
        box: cell.box,
      });
    }

    // 2. 各行 row.<n>
    for (const rb of layout.rowBoxes) {
      items.push({
        name: `row.${rb.row}`,
        box: rb.box,
      });
    }

    // 3. 各列 col.<n>
    for (const cb of layout.colBoxes) {
      items.push({
        name: `col.${cb.col}`,
        box: cb.box,
      });
    }

    return items;
  },
  Render({ p, ctx }): ReactNode {
    const layout = numberChartLayout(p);
    const lineColor = color('line', ctx.theme);
    const inkColor = color('ink', ctx.theme);

    return (
      <g>
        {layout.cells.map((cell) => {
          const { x, y, box, marks, num: cellNum } = cell;
          const cx = x + box.w / 2;
          const cy = y + box.h / 2;

          const fillMarks = marks.filter((m) => m.style === 'fill');
          const topMarks = marks.filter((m) => m.style !== 'fill');

          return (
            <g key={cellNum}>
              {/* 格子背景与底边框 */}
              <rect
                x={x}
                y={y}
                width={box.w}
                height={box.h}
                fill="none"
                stroke={lineColor}
                strokeWidth={1}
              />

              {/* fill 标记（最底层） */}
              {fillMarks.map((m, idx) => {
                const markColor = color(m.color, ctx.theme, 'blue');
                return (
                  <rect
                    key={`f-${idx}-${m.groupIndex}`}
                    x={x}
                    y={y}
                    width={box.w}
                    height={box.h}
                    fill={markColor}
                    fillOpacity={0.35 * m.opacity}
                  />
                );
              })}

              {/* 居中数字 */}
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={layout.size}
                fill={inkColor}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {cellNum}
              </text>

              {/* circle 与 cross 标记（上层） */}
              {topMarks.map((m, idx) => {
                const markColor = color(m.color, ctx.theme, 'blue');
                if (m.style === 'circle') {
                  const r = box.w * 0.38;
                  return (
                    <circle
                      key={`c-${idx}-${m.groupIndex}`}
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill="none"
                      stroke={markColor}
                      strokeWidth={3}
                      opacity={m.opacity}
                    />
                  );
                }
                if (m.style === 'cross') {
                  return (
                    <line
                      key={`x-${idx}-${m.groupIndex}`}
                      x1={x}
                      y1={y + box.h}
                      x2={x + box.w}
                      y2={y}
                      stroke={markColor}
                      strokeWidth={3}
                      strokeLinecap="round"
                      opacity={m.opacity}
                    />
                  );
                }
                return null;
              })}
            </g>
          );
        })}
      </g>
    );
  },
};
