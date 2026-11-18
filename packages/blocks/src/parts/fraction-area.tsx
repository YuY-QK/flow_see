// 分数与小数面积模型（B23）：用于分数乘分数、小数乘小数、面积法理解算理。
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

export const FRACTION_AREA_ROW_OPACITY = 0.35;
export const FRACTION_AREA_COL_OPACITY = 0.35;
export const FRACTION_AREA_OVERLAP_OPACITY = 0.75;
export const FRACTION_AREA_BORDER_WIDTH = 3;
export const FRACTION_AREA_GRID_WIDTH = 1;

export interface FractionAreaCell {
  row: number;
  col: number;
  box: Box;
}

export interface FractionAreaGridLine {
  kind: 'horizontal' | 'vertical';
  index: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface FractionAreaLayout {
  at: Point;
  x: number;
  y: number;
  rows: number;
  cols: number;
  size: number;
  cellW: number;
  cellH: number;
  shadeRows: number;
  shadeCols: number;
  shadeW: number;
  shadeH: number;
  color: string;
  color2: string;
  overlapColor: string;
  grid: boolean;
  rowOnlyBox?: Box;
  colOnlyBox?: Box;
  overlapBox?: Box;
  cells: FractionAreaCell[];
  gridLines: FractionAreaGridLine[];
  bbox: Box;
}

/** 纯布局计算：不依赖 DOM，便于单元测试直接验证涂色区、重叠区与格线坐标 */
export function fractionAreaLayout(p: Props): FractionAreaLayout {
  const at = pt(p.at);
  const [x, y] = at;
  const rows = Math.max(1, Math.round(num(p.rows, 3)));
  const cols = Math.max(1, Math.round(num(p.cols, 5)));
  const size = Math.max(0, num(p.size, 300));

  const shadeRows = Math.max(0, Math.min(rows, num(p.shadeRows, 0)));
  const shadeCols = Math.max(0, Math.min(cols, num(p.shadeCols, 0)));

  const cellW = size / cols;
  const cellH = size / rows;
  const shadeH = (shadeRows / rows) * size;
  const shadeW = (shadeCols / cols) * size;

  const rowColorName = str(p.color, 'blue') || 'blue';
  const colColorName = str(p.color2, 'orange') || 'orange';
  const overlapColorName = str(p.overlapColor, 'green') || 'green';
  const grid = typeof p.grid === 'boolean' ? p.grid : true;

  const rowOnlyW = Math.max(0, size - shadeW);
  const rowOnlyBox: Box | undefined =
    shadeH > 0 && rowOnlyW > 0
      ? { x: x + shadeW, y, w: rowOnlyW, h: shadeH }
      : undefined;

  const colOnlyH = Math.max(0, size - shadeH);
  const colOnlyBox: Box | undefined =
    shadeW > 0 && colOnlyH > 0
      ? { x, y: y + shadeH, w: shadeW, h: colOnlyH }
      : undefined;

  const overlapBox: Box | undefined =
    shadeW > 0 && shadeH > 0
      ? { x, y, w: shadeW, h: shadeH }
      : undefined;

  const cells: FractionAreaCell[] = [];
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      cells.push({
        row: r,
        col: c,
        box: {
          x: x + (c - 1) * cellW,
          y: y + (r - 1) * cellH,
          w: cellW,
          h: cellH,
        },
      });
    }
  }

  const gridLines: FractionAreaGridLine[] = [];
  if (grid && size > 0) {
    for (let r = 1; r < rows; r++) {
      const ly = y + r * cellH;
      gridLines.push({
        kind: 'horizontal',
        index: r,
        x1: x,
        y1: ly,
        x2: x + size,
        y2: ly,
      });
    }
    for (let c = 1; c < cols; c++) {
      const lx = x + c * cellW;
      gridLines.push({
        kind: 'vertical',
        index: c,
        x1: lx,
        y1: y,
        x2: lx,
        y2: y + size,
      });
    }
  }

  return {
    at,
    x,
    y,
    rows,
    cols,
    size,
    cellW,
    cellH,
    shadeRows,
    shadeCols,
    shadeW,
    shadeH,
    color: rowColorName,
    color2: colColorName,
    overlapColor: overlapColorName,
    grid,
    rowOnlyBox,
    colOnlyBox,
    overlapBox,
    cells,
    gridLines,
    bbox: { x, y, w: size, h: size },
  };
}

export const fractionAreaPart: PartDef = {
  type: 'fraction-area',
  name: '面积模型',
  anchor: 'start',
  props: ['rows', 'cols', 'shadeRows', 'shadeCols', 'size', 'color2', 'overlapColor', 'grid'],
  bbox(p) {
    return fractionAreaLayout(p).bbox;
  },
  subitems(p): Subitem[] {
    const L = fractionAreaLayout(p);
    const items: Subitem[] = L.cells.map((cell) => ({
      name: `cell.${cell.row}.${cell.col}`,
      box: cell.box,
    }));
    if (L.overlapBox) {
      items.push({
        name: 'overlap',
        box: L.overlapBox,
      });
    } else {
      // 尚未形成重叠时保留子项名供静态引用校验，标记 disabled
      items.push({
        name: 'overlap',
        box: { x: L.x, y: L.y, w: L.shadeW, h: L.shadeH },
        disabled: true,
      });
    }
    return items;
  },
  Render({ p, ctx }) {
    const L = fractionAreaLayout(p);
    const subColors =
      p._subColors && typeof p._subColors === 'object'
        ? (p._subColors as Record<string, string>)
        : undefined;

    const rowFill = color(L.color, ctx.theme, 'blue');
    const colFill = color(L.color2, ctx.theme, 'orange');
    const overlapFill = color(subColors?.overlap ?? L.overlapColor, ctx.theme, 'green');
    const lineStroke = color('line', ctx.theme);
    const borderStroke = color('ink', ctx.theme);

    return (
      <g>
        {/* 1. 正方形底板 */}
        <rect x={L.x} y={L.y} width={L.size} height={L.size} fill={ctx.theme.stageBg} />

        {/* 2. 仅行涂色区域（避免与列涂色、重叠区三层叠加变脏） */}
        {L.rowOnlyBox ? (
          <rect
            x={L.rowOnlyBox.x}
            y={L.rowOnlyBox.y}
            width={L.rowOnlyBox.w}
            height={L.rowOnlyBox.h}
            fill={rowFill}
            opacity={FRACTION_AREA_ROW_OPACITY}
          />
        ) : null}

        {/* 3. 仅列涂色区域 */}
        {L.colOnlyBox ? (
          <rect
            x={L.colOnlyBox.x}
            y={L.colOnlyBox.y}
            width={L.colOnlyBox.w}
            height={L.colOnlyBox.h}
            fill={colFill}
            opacity={FRACTION_AREA_COL_OPACITY}
          />
        ) : null}

        {/* 4. 行列重叠区域 */}
        {L.overlapBox ? (
          <rect
            x={L.overlapBox.x}
            y={L.overlapBox.y}
            width={L.overlapBox.w}
            height={L.overlapBox.h}
            fill={overlapFill}
            opacity={FRACTION_AREA_OVERLAP_OPACITY}
          />
        ) : null}

        {/* 5. 单格变色覆盖（color 动作作用于 cell.<r>.<c> 时生效） */}
        {subColors
          ? L.cells.map((cell) => {
              const customCol = subColors[`cell.${cell.row}.${cell.col}`];
              if (!customCol) return null;
              return (
                <rect
                  key={`sc-${cell.row}-${cell.col}`}
                  x={cell.box.x}
                  y={cell.box.y}
                  width={cell.box.w}
                  height={cell.box.h}
                  fill={color(customCol, ctx.theme)}
                  opacity={FRACTION_AREA_OVERLAP_OPACITY}
                />
              );
            })
          : null}

        {/* 6. 内部横竖格线（画在涂色层上方，保持锐利） */}
        {L.gridLines.map((gl) => (
          <line
            key={`${gl.kind}-${gl.index}`}
            x1={gl.x1}
            y1={gl.y1}
            x2={gl.x2}
            y2={gl.y2}
            stroke={lineStroke}
            strokeWidth={FRACTION_AREA_GRID_WIDTH}
          />
        ))}

        {/* 7. 正方形外框（最上层，线宽 3，ink 色） */}
        <rect
          x={L.x}
          y={L.y}
          width={L.size}
          height={L.size}
          fill="none"
          stroke={borderStroke}
          strokeWidth={FRACTION_AREA_BORDER_WIDTH}
        />
      </g>
    );
  },
};
