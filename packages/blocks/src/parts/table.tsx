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
import { RichLine } from './text';

export interface TallyStroke {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strokeIndex: number;
  charIndex: number;
  globalIndex: number;
  visible: boolean;
  progress: number;
}

export interface TableCellDiagonal {
  line: { x1: number; y1: number; x2: number; y2: number };
  topRight: { text: string; x: number; y: number };
  bottomLeft: { text: string; x: number; y: number };
}

export interface TableCellTally {
  value: number;
  strokes: TallyStroke[];
}

export interface TableCell {
  row: number;
  col: number;
  rowNumber: number;
  colNumber: number;
  box: Box;
  text: string;
  isHeader: boolean;
  visible: boolean;
  opacity: number;
  diagonal?: TableCellDiagonal;
  tally?: TableCellTally;
}

export interface TableRow {
  index: number;
  box: Box;
}

export interface TableCol {
  index: number;
  box: Box;
}

export interface TableGridLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface TableLayout {
  at: Point;
  box: Box;
  numRows: number;
  numCols: number;
  rows: TableRow[];
  cols: TableCol[];
  cells: TableCell[];
  gridLines: {
    horizontal: TableGridLine[];
    vertical: TableGridLine[];
  };
  diagonal?: TableCellDiagonal;
  header: boolean;
  headerCol: boolean;
  size: number;
  show: number;
  tallyShow: number;
}

export function parseTallyValue(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const v = parseInt(trimmed, 10);
  return Number.isFinite(v) && v >= 0 ? v : null;
}

function createTallyStrokes(
  gx: number,
  gy: number,
  size: number,
  numStrokes: number,
  charIndex: number,
  startGlobalIdx: number,
  tallyShow: number,
): TallyStroke[] {
  const gw = size * 0.85;
  const gh = size * 0.9;
  const xLeft = gx - gw / 2;
  const xRight = gx + gw / 2;
  const xMid = gx;
  const yTop = gy - gh / 2;
  const yBottom = gy + gh / 2;
  const yMid = gy;

  // 1: 上横, 2: 中竖, 3: 中横, 4: 左竖, 5: 下横
  const defs = [
    { x1: xLeft, y1: yTop, x2: xRight, y2: yTop },
    { x1: xMid, y1: yTop, x2: xMid, y2: yBottom },
    { x1: xMid, y1: yMid, x2: xRight - gw * 0.05, y2: yMid },
    { x1: xLeft + gw * 0.15, y1: yMid, x2: xLeft + gw * 0.15, y2: yBottom },
    { x1: xLeft, y1: yBottom, x2: xRight, y2: yBottom },
  ];

  const strokes: TallyStroke[] = [];
  const count = Math.min(numStrokes, 5);
  for (let s = 0; s < count; s++) {
    const globalIndex = startGlobalIdx + s;
    let visible = false;
    let progress = 0;

    if (globalIndex < Math.floor(tallyShow)) {
      visible = true;
      progress = 1;
    } else if (globalIndex === Math.floor(tallyShow)) {
      const frac = tallyShow - Math.floor(tallyShow);
      if (frac > 0) {
        visible = true;
        progress = frac;
      }
    }

    strokes.push({
      ...defs[s],
      strokeIndex: s,
      charIndex,
      globalIndex,
      visible,
      progress,
    });
  }

  return strokes;
}

export function tableLayout(p: Props): TableLayout {
  const [x0, y0] = pt(p.at);
  const size = Math.max(1, num(p.size, 24));
  const header = typeof p.header === 'boolean' ? p.header : true;
  const headerCol = typeof p.headerCol === 'boolean' ? p.headerCol : false;
  const tally = typeof p.tally === 'boolean' ? p.tally : false;
  const show = typeof p.show === 'number' && Number.isFinite(p.show) ? p.show : 9999;
  const tallyShow = typeof p.tallyShow === 'number' && Number.isFinite(p.tallyShow) ? p.tallyShow : 9999;

  const rawDiag = p.diagonal;
  const hasDiag =
    Array.isArray(rawDiag) &&
    rawDiag.length >= 2 &&
    typeof rawDiag[0] === 'string' &&
    typeof rawDiag[1] === 'string';
  const diagonalTexts: [string, string] | undefined = hasDiag
    ? [rawDiag[0] as string, rawDiag[1] as string]
    : undefined;

  const rawRows = Array.isArray(p.rows) ? p.rows : [];
  const numRows = Math.max(1, rawRows.length);
  const numCols = Math.max(
    1,
    ...rawRows.map((r) => (Array.isArray(r) ? r.length : 0)),
  );

  const rawColWidth = p.colWidth;
  const colWidths: number[] = [];
  for (let c = 0; c < numCols; c++) {
    if (Array.isArray(rawColWidth)) {
      const val = rawColWidth[c];
      colWidths.push(Math.max(1, num(val, 96)));
    } else {
      colWidths.push(Math.max(1, num(rawColWidth, 96)));
    }
  }

  const rawRowHeight = p.rowHeight;
  const rowHeights: number[] = [];
  for (let r = 0; r < numRows; r++) {
    if (Array.isArray(rawRowHeight)) {
      const val = rawRowHeight[r];
      rowHeights.push(Math.max(1, num(val, 48)));
    } else {
      rowHeights.push(Math.max(1, num(rawRowHeight, 48)));
    }
  }

  const totalW = colWidths.reduce((sum, w) => sum + w, 0);
  const totalH = rowHeights.reduce((sum, h) => sum + h, 0);
  const totalBox: Box = { x: x0, y: y0, w: totalW, h: totalH };

  const colStarts: number[] = [];
  let curX = x0;
  for (let c = 0; c < numCols; c++) {
    colStarts.push(curX);
    curX += colWidths[c];
  }

  const rowStarts: number[] = [];
  let curY = y0;
  for (let r = 0; r < numRows; r++) {
    rowStarts.push(curY);
    curY += rowHeights[r];
  }

  const tableRows: TableRow[] = rowStarts.map((ry, r) => ({
    index: r + 1,
    box: { x: x0, y: ry, w: totalW, h: rowHeights[r] },
  }));

  const tableCols: TableCol[] = colStarts.map((cx, c) => ({
    index: c + 1,
    box: { x: cx, y: y0, w: colWidths[c], h: totalH },
  }));

  const horizontalGridLines: TableGridLine[] = [];
  for (let r = 1; r < numRows; r++) {
    horizontalGridLines.push({
      x1: x0,
      y1: rowStarts[r],
      x2: x0 + totalW,
      y2: rowStarts[r],
    });
  }

  const verticalGridLines: TableGridLine[] = [];
  for (let c = 1; c < numCols; c++) {
    verticalGridLines.push({
      x1: colStarts[c],
      y1: y0,
      x2: colStarts[c],
      y2: y0 + totalH,
    });
  }

  let currentGlobalStrokeIdx = 0;
  let layoutDiagonal: TableCellDiagonal | undefined;
  const cells: TableCell[] = [];

  for (let r = 0; r < numRows; r++) {
    const rowArr = Array.isArray(rawRows[r]) ? rawRows[r] : [];
    for (let c = 0; c < numCols; c++) {
      const rawCell = rowArr[c];
      const cellText =
        rawCell === null || rawCell === undefined ? '' : String(rawCell);
      const cellBox: Box = {
        x: colStarts[c],
        y: rowStarts[r],
        w: colWidths[c],
        h: rowHeights[r],
      };

      const isHeader = (header && r === 0) || (headerCol && c === 0);
      const cellIdx = r * numCols + c;

      let visible = false;
      let opacity = 0;
      if (cellIdx < Math.floor(show)) {
        visible = true;
        opacity = 1;
      } else if (cellIdx === Math.floor(show)) {
        const frac = show - Math.floor(show);
        if (frac > 0) {
          visible = true;
          opacity = frac;
        }
      }

      let cellDiagonal: TableCellDiagonal | undefined;
      if (r === 0 && c === 0 && diagonalTexts) {
        cellDiagonal = {
          line: {
            x1: cellBox.x,
            y1: cellBox.y,
            x2: cellBox.x + cellBox.w,
            y2: cellBox.y + cellBox.h,
          },
          topRight: {
            text: diagonalTexts[0],
            x: cellBox.x + cellBox.w * (2 / 3),
            y: cellBox.y + cellBox.h * (1 / 3),
          },
          bottomLeft: {
            text: diagonalTexts[1],
            x: cellBox.x + cellBox.w * (1 / 3),
            y: cellBox.y + cellBox.h * (2 / 3),
          },
        };
        layoutDiagonal = cellDiagonal;
      }

      let cellTally: TableCellTally | undefined;
      if (!isHeader && tally) {
        const val = parseTallyValue(cellText);
        if (val !== null) {
          const numChars = Math.ceil(val / 5);
          const slotW = size * 1.2;
          const totalTallyW = numChars * slotW;
          const startX = cellBox.x + cellBox.w / 2 - totalTallyW / 2;
          const gy = cellBox.y + cellBox.h / 2;

          const strokes: TallyStroke[] = [];
          for (let k = 0; k < numChars; k++) {
            const gx = startX + (k + 0.5) * slotW;
            const fullChars = Math.floor(val / 5);
            const strokesInChar =
              k < fullChars ? 5 : val % 5 === 0 ? 5 : val % 5;
            const charStrokes = createTallyStrokes(
              gx,
              gy,
              size,
              strokesInChar,
              k,
              currentGlobalStrokeIdx,
              tallyShow,
            );
            strokes.push(...charStrokes);
            currentGlobalStrokeIdx += strokesInChar;
          }

          cellTally = { value: val, strokes };
        }
      }

      cells.push({
        row: r,
        col: c,
        rowNumber: r + 1,
        colNumber: c + 1,
        box: cellBox,
        text: cellText,
        isHeader,
        visible,
        opacity,
        diagonal: cellDiagonal,
        tally: cellTally,
      });
    }
  }

  return {
    at: [x0, y0],
    box: totalBox,
    numRows,
    numCols,
    rows: tableRows,
    cols: tableCols,
    cells,
    gridLines: {
      horizontal: horizontalGridLines,
      vertical: verticalGridLines,
    },
    diagonal: layoutDiagonal,
    header,
    headerCol,
    size,
    show,
    tallyShow,
  };
}

export const tablePart: PartDef = {
  type: 'table',
  name: '表格',
  anchor: 'start',
  required: [],
  props: [
    'rows',
    'header',
    'headerCol',
    'diagonal',
    'colWidth',
    'rowHeight',
    'tally',
    'show',
    'tallyShow',
    'size',
  ],
  bbox(p: Props): Box {
    return tableLayout(p).box;
  },
  subitems(p: Props): Subitem[] {
    const layout = tableLayout(p);
    const items: Subitem[] = [];

    for (const row of layout.rows) {
      items.push({
        name: `row.${row.index}`,
        box: row.box,
      });
    }

    for (const col of layout.cols) {
      items.push({
        name: `col.${col.index}`,
        box: col.box,
      });
    }

    for (const cell of layout.cells) {
      const numVal = parseTallyValue(cell.text);
      items.push({
        name: `cell.${cell.rowNumber}.${cell.colNumber}`,
        box: cell.box,
        label: cell.text,
        value: numVal !== null ? numVal : undefined,
        disabled: !cell.visible,
      });
    }

    return items;
  },
  Render({ p, ctx }) {
    const layout = tableLayout(p);
    const lineCol = color('line', ctx.theme);
    const inkCol = color('ink', ctx.theme);

    return (
      <g>
        {/* 表头单元格底色 */}
        {layout.cells.map((cell) => {
          if (!cell.isHeader || !cell.visible) return null;
          return (
            <rect
              key={`header-bg-${cell.rowNumber}-${cell.colNumber}`}
              x={cell.box.x}
              y={cell.box.y}
              width={cell.box.w}
              height={cell.box.h}
              fill={lineCol}
              fillOpacity={0.25 * cell.opacity}
              stroke="none"
            />
          );
        })}

        {/* 内线 */}
        {layout.gridLines.horizontal.map((line, idx) => (
          <line
            key={`gh-${idx}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={lineCol}
            strokeWidth={1}
          />
        ))}
        {layout.gridLines.vertical.map((line, idx) => (
          <line
            key={`gv-${idx}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={lineCol}
            strokeWidth={1}
          />
        ))}

        {/* 外框 */}
        <rect
          x={layout.box.x}
          y={layout.box.y}
          width={layout.box.w}
          height={layout.box.h}
          fill="none"
          stroke={lineCol}
          strokeWidth={2}
        />

        {/* 单元格内容 */}
        {layout.cells.map((cell) => {
          if (!cell.visible) return null;

          if (cell.diagonal) {
            const diag = cell.diagonal;
            return (
              <g
                key={`cell-${cell.rowNumber}-${cell.colNumber}`}
                opacity={cell.opacity}
              >
                <line
                  x1={diag.line.x1}
                  y1={diag.line.y1}
                  x2={diag.line.x2}
                  y2={diag.line.y2}
                  stroke={lineCol}
                  strokeWidth={1}
                />
                <RichLine
                  p={p}
                  text={diag.topRight.text}
                  theme={ctx.theme}
                  x={diag.topRight.x}
                  y={diag.topRight.y}
                  size={layout.size * 0.85}
                  fill={inkCol}
                  weight="bold"
                />
                <RichLine
                  p={p}
                  text={diag.bottomLeft.text}
                  theme={ctx.theme}
                  x={diag.bottomLeft.x}
                  y={diag.bottomLeft.y}
                  size={layout.size * 0.85}
                  fill={inkCol}
                  weight="bold"
                />
              </g>
            );
          }

          if (cell.tally) {
            return (
              <g
                key={`cell-${cell.rowNumber}-${cell.colNumber}`}
                opacity={cell.opacity}
              >
                {cell.tally.strokes.map((st) => {
                  if (!st.visible || st.progress <= 0) return null;
                  const x2 = st.x1 + st.progress * (st.x2 - st.x1);
                  const y2 = st.y1 + st.progress * (st.y2 - st.y1);
                  return (
                    <line
                      key={`tally-${st.globalIndex}`}
                      x1={st.x1}
                      y1={st.y1}
                      x2={x2}
                      y2={y2}
                      stroke={inkCol}
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  );
                })}
              </g>
            );
          }

          if (!cell.text) return null;

          const cx = cell.box.x + cell.box.w / 2;
          const cy = cell.box.y + cell.box.h / 2;
          const weight = cell.isHeader ? 'bold' : 'normal';

          return (
            <g
              key={`cell-${cell.rowNumber}-${cell.colNumber}`}
              opacity={cell.opacity}
            >
              <RichLine
                p={p}
                text={cell.text}
                theme={ctx.theme}
                x={cx}
                y={cy}
                size={layout.size}
                fill={inkCol}
                weight={weight}
              />
            </g>
          );
        })}
      </g>
    );
  },
};
