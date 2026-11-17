// 方格纸 / 数对格零件：网格、数对格点、行列号、坐标点标记。
import type { ReactNode } from 'react';
import {
  color,
  num,
  pt,
  str,
  type Box,
  type PartDef,
  type Point,
  type Props,
  type Subitem,
} from '../base';

export const COORDINATE_GRID_ORIGINS = ['bottom-left', 'top-left'] as const;
export type CoordinateGridOrigin = (typeof COORDINATE_GRID_ORIGINS)[number];

export interface CoordinateGridPointDef {
  at: [number, number]; // [col, row]
  label?: string;
  color?: string;
}

export interface CoordinateGridPointLayout {
  col: number;
  row: number;
  x: number;
  y: number;
  label?: string;
  color?: string;
}

export interface CoordinateGridLabelItem {
  kind: 'col' | 'row' | 'axis-col' | 'axis-row';
  text: string;
  x: number;
  y: number;
  value?: number;
}

export interface CoordinateGridLayout {
  at: Point;
  cols: number;
  rows: number;
  cell: number;
  labels: boolean;
  origin: CoordinateGridOrigin;
  color: string;
  axisLabels?: [string, string];
  points: CoordinateGridPointLayout[];
  innerCols: { x: number; y1: number; y2: number }[];
  innerRows: { y: number; x1: number; x2: number }[];
  border: Box;
  labelItems: CoordinateGridLabelItem[];
  gridBox: Box;
  box: Box;
}

/** 纯坐标换算函数：格点 (col, row) 到舞台绝对坐标 (x, y) */
export function gridPoint(
  props:
    | {
        at?: unknown;
        cols?: unknown;
        rows?: unknown;
        cell?: unknown;
        origin?: unknown;
      }
    | Props,
  col: number,
  row: number,
): Point {
  const at = pt(props.at, [0, 0]);
  const rows = Math.max(1, Math.round(num(props.rows, 8)));
  const cell = Math.max(1, num(props.cell, 40));
  const origin: CoordinateGridOrigin =
    props.origin === 'top-left' ? 'top-left' : 'bottom-left';

  const x = at[0] + col * cell;
  const y =
    origin === 'bottom-left'
      ? at[1] + (rows - row) * cell
      : at[1] + row * cell;

  return [x, y];
}

/** 纯函数计算方格纸与数对格的几何布局 */
export function coordinateGridLayout(p: Props): CoordinateGridLayout {
  const at = pt(p.at, [0, 0]);
  const cols = Math.max(1, Math.round(num(p.cols, 10)));
  const rows = Math.max(1, Math.round(num(p.rows, 8)));
  const cell = Math.max(1, num(p.cell, 40));
  const labels = Boolean(p.labels);
  const origin: CoordinateGridOrigin =
    p.origin === 'top-left' ? 'top-left' : 'bottom-left';
  const strokeColorName = str(p.color, 'line');

  let axisLabels: [string, string] | undefined;
  if (Array.isArray(p.axisLabels) && p.axisLabels.length >= 2) {
    axisLabels = [str(p.axisLabels[0]), str(p.axisLabels[1])];
  }

  const gridWidth = cols * cell;
  const gridHeight = rows * cell;
  const gridBox: Box = {
    x: at[0],
    y: at[1],
    w: gridWidth,
    h: gridHeight,
  };

  // 内垂直格线 (cols - 1 条)
  const innerCols: { x: number; y1: number; y2: number }[] = [];
  for (let c = 1; c < cols; c++) {
    innerCols.push({
      x: at[0] + c * cell,
      y1: at[1],
      y2: at[1] + gridHeight,
    });
  }

  // 内水平格线 (rows - 1 条)
  const innerRows: { y: number; x1: number; x2: number }[] = [];
  for (let r = 1; r < rows; r++) {
    innerRows.push({
      y: at[1] + r * cell,
      x1: at[0],
      x2: at[0] + gridWidth,
    });
  }

  // 点位布局
  const points: CoordinateGridPointLayout[] = [];
  if (Array.isArray(p.points)) {
    for (const raw of p.points) {
      if (!raw || typeof raw !== 'object') continue;
      const ptObj = raw as Record<string, unknown>;
      if (!Array.isArray(ptObj.at) || ptObj.at.length < 2) continue;
      const c = num(ptObj.at[0], NaN);
      const r = num(ptObj.at[1], NaN);
      if (Number.isNaN(c) || Number.isNaN(r)) continue;

      const [px, py] = gridPoint({ at, rows, cell, origin }, c, r);
      points.push({
        col: c,
        row: r,
        x: px,
        y: py,
        label: ptObj.label !== undefined ? str(ptObj.label) : undefined,
        color: typeof ptObj.color === 'string' ? ptObj.color : undefined,
      });
    }
  }

  // 坐标号与轴名文本
  const labelItems: CoordinateGridLabelItem[] = [];
  if (labels) {
    // 底部列号（0..cols）
    const colY = at[1] + gridHeight + 20;
    for (let c = 0; c <= cols; c++) {
      labelItems.push({
        kind: 'col',
        text: String(c),
        value: c,
        x: at[0] + c * cell,
        y: colY,
      });
    }

    // 左侧行号（0..rows）
    const rowX = at[0] - 16;
    for (let r = 0; r <= rows; r++) {
      const [, py] = gridPoint({ at, rows, cell, origin }, 0, r);
      labelItems.push({
        kind: 'row',
        text: String(r),
        value: r,
        x: rowX,
        y: py,
      });
    }

    // 轴名：底部列名放最右侧下方，左侧行名放最左侧上方
    if (axisLabels) {
      labelItems.push({
        kind: 'axis-col',
        text: axisLabels[0],
        x: at[0] + gridWidth + 24,
        y: colY,
      });
      labelItems.push({
        kind: 'axis-row',
        text: axisLabels[1],
        x: rowX,
        y: at[1] - 18,
      });
    }
  }

  // 整体包围盒：labels 为 true 时外扩包含文字和轴名
  let box: Box;
  if (!labels) {
    box = { ...gridBox };
  } else {
    const leftMargin = 36;
    const bottomMargin = 32;
    const topMargin = axisLabels ? 28 : 12;
    const rightMargin = axisLabels ? 36 : 12;
    box = {
      x: at[0] - leftMargin,
      y: at[1] - topMargin,
      w: gridWidth + leftMargin + rightMargin,
      h: gridHeight + topMargin + bottomMargin,
    };
  }

  return {
    at,
    cols,
    rows,
    cell,
    labels,
    origin,
    color: strokeColorName,
    axisLabels,
    points,
    innerCols,
    innerRows,
    border: gridBox,
    labelItems,
    gridBox,
    box,
  };
}

export const coordinateGridPart: PartDef = {
  type: 'coordinate-grid',
  name: '方格纸与数对格',
  anchor: 'start',
  props: ['cols', 'rows', 'cell', 'labels', 'origin', 'points', 'axisLabels', 'color'],
  bbox(p: Props): Box {
    return coordinateGridLayout(p).box;
  },
  subitems(p: Props): Subitem[] {
    const layout = coordinateGridLayout(p);
    const items: Subitem[] = [];

    // 1. 格点子项 pt.<col>.<row>：严格为 (cols + 1) * (rows + 1) 个
    for (let c = 0; c <= layout.cols; c++) {
      for (let r = 0; r <= layout.rows; r++) {
        const [x, y] = gridPoint(layout, c, r);
        items.push({
          name: `pt.${c}.${r}`,
          box: {
            x: x - 12,
            y: y - 12,
            w: 24,
            h: 24,
          },
        });
      }
    }

    // 2. 单元格子项 cell.<col>.<row>（1-based）：cols * rows 个
    for (let c = 1; c <= layout.cols; c++) {
      for (let r = 1; r <= layout.rows; r++) {
        const x = layout.at[0] + (c - 1) * layout.cell;
        const y =
          layout.origin === 'bottom-left'
            ? layout.at[1] + (layout.rows - r) * layout.cell
            : layout.at[1] + (r - 1) * layout.cell;
        items.push({
          name: `cell.${c}.${r}`,
          box: {
            x,
            y,
            w: layout.cell,
            h: layout.cell,
          },
        });
      }
    }

    return items;
  },
  Render({ p, ctx }): ReactNode {
    const layout = coordinateGridLayout(p);
    const strokeColor = color(layout.color, ctx.theme, 'line');
    const dimColor = color('dim', ctx.theme);
    const inkColor = color('ink', ctx.theme);

    return (
      <g>
        {/* 内格线（线宽 1） */}
        {layout.innerCols.map((c, i) => (
          <line
            key={`ic-${i}`}
            x1={c.x}
            y1={c.y1}
            x2={c.x}
            y2={c.y2}
            stroke={strokeColor}
            strokeWidth={1}
          />
        ))}
        {layout.innerRows.map((r, i) => (
          <line
            key={`ir-${i}`}
            x1={r.x1}
            y1={r.y}
            x2={r.x2}
            y2={r.y}
            stroke={strokeColor}
            strokeWidth={1}
          />
        ))}

        {/* 外边框（线宽 2） */}
        <rect
          x={layout.border.x}
          y={layout.border.y}
          width={layout.border.w}
          height={layout.border.h}
          fill="none"
          stroke={strokeColor}
          strokeWidth={2}
        />

        {/* 坐标号与轴名（字号 18，dim 色） */}
        {layout.labelItems.map((item, idx) => {
          let textAnchor: 'middle' | 'end' | 'start' = 'middle';
          let dominantBaseline: 'central' | 'hanging' | 'alphabetic' = 'central';

          if (item.kind === 'col') {
            textAnchor = 'middle';
            dominantBaseline = 'central';
          } else if (item.kind === 'row') {
            textAnchor = 'end';
            dominantBaseline = 'central';
          } else if (item.kind === 'axis-col') {
            textAnchor = 'start';
            dominantBaseline = 'central';
          } else if (item.kind === 'axis-row') {
            textAnchor = 'end';
            dominantBaseline = 'central';
          }

          return (
            <text
              key={`lbl-${idx}`}
              x={item.x}
              y={item.y}
              textAnchor={textAnchor}
              dominantBaseline={dominantBaseline}
              fontSize={18}
              fill={dimColor}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {item.text}
            </text>
          );
        })}

        {/* 实心点位（半径 7）与标签文本（字号 20，位于点右上方） */}
        {layout.points.map((ptItem, idx) => {
          const ptFill = color(ptItem.color ?? 'blue', ctx.theme, 'blue');
          return (
            <g key={`pt-${idx}`}>
              <circle cx={ptItem.x} cy={ptItem.y} r={7} fill={ptFill} />
              {ptItem.label ? (
                <text
                  x={ptItem.x + 10}
                  y={ptItem.y - 10}
                  textAnchor="start"
                  dominantBaseline="central"
                  fontSize={20}
                  fill={inkColor}
                  fontWeight={600}
                >
                  {ptItem.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </g>
    );
  },
};
