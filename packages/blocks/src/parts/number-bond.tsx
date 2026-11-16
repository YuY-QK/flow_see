// 分合图：数的组成（“7 可以分成 3 和 4”）、想加算减、一图四式。
import type { Theme } from '@flow-see/core';
import {
  color,
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
import { BlankBox } from './mark';

export interface NumberBondNode {
  name: 'whole' | 'p' | 'q';
  value: unknown;
  text: string;
  textW: number;
  at: Point;
  box: Box;
  opacity: number;
}

export interface NumberBondLayout {
  at: Point;
  dir: 'down' | 'up';
  size: number;
  show: number;
  lineProgress: number;
  partsOpacity: number;
  lineStart: Point;
  pEnd: Point;
  qEnd: Point;
  currentPEnd: Point;
  currentQEnd: Point;
  nodes: {
    whole: NumberBondNode;
    p: NumberBondNode;
    q: NumberBondNode;
  };
  box: Box;
}

function resolveColor(
  v: unknown,
  fallback: string,
  theme: Theme,
  refs: Record<string, { color?: unknown }>,
): string {
  if (typeof v === 'string' && v.startsWith('@')) {
    const r = refs[v.slice(1)];
    if (r?.color) return color(r.color, theme, fallback);
    return color(fallback, theme, fallback);
  }
  return color(v, theme, fallback);
}

/** 分合图的纯函数布局计算 */
export function numberBondLayout(p: Props): NumberBondLayout {
  const at = pt(p.at, [0, 0]);
  const size = Math.max(1, num(p.size, 44));
  const dir = str(p.dir, 'down') === 'up' ? 'up' : 'down';
  const isDown = dir === 'down';

  const show = typeof p.show === 'number' && Number.isFinite(p.show) ? p.show : 2;
  const lineProgress = Math.max(0, Math.min(1, show));
  const partsOpacity = show <= 1 ? 0 : Math.max(0, Math.min(1, show - 1));

  const rawWhole = p.whole !== undefined ? p.whole : '';
  const rawParts = Array.isArray(p.parts) ? p.parts : [];
  const rawP = rawParts[0] !== undefined ? rawParts[0] : '';
  const rawQ = rawParts[1] !== undefined ? rawParts[1] : '';

  const wholeText = str(rawWhole);
  const pText = str(rawP);
  const qText = str(rawQ);

  const wholeTextW = textWidth(wholeText, size);
  const pTextW = textWidth(pText, size);
  const qTextW = textWidth(qText, size);

  const wholeBoxW = Math.max(wholeTextW, size) + size * 0.5;
  const pBoxW = Math.max(pTextW, size) + size * 0.5;
  const qBoxW = Math.max(qTextW, size) + size * 0.5;
  const boxH = size * 1.4;

  const [cx, cy] = at;
  const pCenter: Point = [cx - size * 1.6, cy + (isDown ? 1 : -1) * size * 2.2];
  const qCenter: Point = [cx + size * 1.6, cy + (isDown ? 1 : -1) * size * 2.2];

  const wholeBox: Box = {
    x: cx - wholeBoxW / 2,
    y: cy - boxH / 2,
    w: wholeBoxW,
    h: boxH,
  };
  const pBox: Box = {
    x: pCenter[0] - pBoxW / 2,
    y: pCenter[1] - boxH / 2,
    w: pBoxW,
    h: boxH,
  };
  const qBox: Box = {
    x: qCenter[0] - qBoxW / 2,
    y: qCenter[1] - boxH / 2,
    w: qBoxW,
    h: boxH,
  };

  const lineStart: Point = isDown
    ? [cx, wholeBox.y + wholeBox.h]
    : [cx, wholeBox.y];
  const pEnd: Point = isDown
    ? [pCenter[0], pBox.y]
    : [pCenter[0], pBox.y + pBox.h];
  const qEnd: Point = isDown
    ? [qCenter[0], qBox.y]
    : [qCenter[0], qBox.y + qBox.h];

  const currentPEnd: Point = [
    lineStart[0] + (pEnd[0] - lineStart[0]) * lineProgress,
    lineStart[1] + (pEnd[1] - lineStart[1]) * lineProgress,
  ];
  const currentQEnd: Point = [
    lineStart[0] + (qEnd[0] - lineStart[0]) * lineProgress,
    lineStart[1] + (qEnd[1] - lineStart[1]) * lineProgress,
  ];

  let bbox: Box;
  if (show <= 0) {
    bbox = { ...wholeBox };
  } else if (show <= 1) {
    const xs = [wholeBox.x, wholeBox.x + wholeBox.w, currentPEnd[0], currentQEnd[0]];
    const ys = [wholeBox.y, wholeBox.y + wholeBox.h, currentPEnd[1], currentQEnd[1]];
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    bbox = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  } else {
    const boxes = [wholeBox, pBox, qBox];
    const minX = Math.min(...boxes.map((b) => b.x));
    const maxX = Math.max(...boxes.map((b) => b.x + b.w));
    const minY = Math.min(...boxes.map((b) => b.y));
    const maxY = Math.max(...boxes.map((b) => b.y + b.h));
    bbox = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  return {
    at,
    dir,
    size,
    show,
    lineProgress,
    partsOpacity,
    lineStart,
    pEnd,
    qEnd,
    currentPEnd,
    currentQEnd,
    nodes: {
      whole: {
        name: 'whole',
        value: rawWhole,
        text: wholeText,
        textW: wholeTextW,
        at,
        box: wholeBox,
        opacity: 1,
      },
      p: {
        name: 'p',
        value: rawP,
        text: pText,
        textW: pTextW,
        at: pCenter,
        box: pBox,
        opacity: partsOpacity,
      },
      q: {
        name: 'q',
        value: rawQ,
        text: qText,
        textW: qTextW,
        at: qCenter,
        box: qBox,
        opacity: partsOpacity,
      },
    },
    box: bbox,
  };
}

export const numberBondPart: PartDef = {
  type: 'number-bond',
  name: '分合图',
  anchor: 'center',
  required: ['whole', 'parts'],
  props: ['whole', 'parts', 'dir', 'show', 'size', 'blank', 'colors'],
  bbox(p) {
    return numberBondLayout(p).box;
  },
  subitems(p): Subitem[] {
    const layout = numberBondLayout(p);
    return [
      {
        name: 'whole',
        box: layout.nodes.whole.box,
        value: typeof layout.nodes.whole.value === 'number' ? layout.nodes.whole.value : undefined,
      },
      {
        name: 'p',
        box: layout.nodes.p.box,
        disabled: layout.show <= 1,
        value: typeof layout.nodes.p.value === 'number' ? layout.nodes.p.value : undefined,
      },
      {
        name: 'q',
        box: layout.nodes.q.box,
        disabled: layout.show <= 1,
        value: typeof layout.nodes.q.value === 'number' ? layout.nodes.q.value : undefined,
      },
    ];
  },
  Render({ p, ctx }) {
    const layout = numberBondLayout(p);
    const { size, lineStart, currentPEnd, currentQEnd, lineProgress, partsOpacity, nodes } = layout;
    const lineColor = color('line', ctx.theme, 'line');
    const refs = (p.refs ?? {}) as Record<string, { color?: unknown }>;
    const colorsObj = (p.colors && typeof p.colors === 'object' ? p.colors : {}) as Record<
      string,
      unknown
    >;

    const wholeColor = resolveColor(colorsObj.whole, 'ink', ctx.theme, refs);
    const pColor = resolveColor(colorsObj.p, 'blue', ctx.theme, refs);
    const qColor = resolveColor(colorsObj.q, 'orange', ctx.theme, refs);

    const blanks = new Set(Array.isArray(p.blank) ? p.blank.map(String) : []);

    const isWholeBlank = blanks.has('whole');
    const isPBlank = blanks.has('p');
    const isQBlank = blanks.has('q');

    return (
      <g>
        {/* 分叉线 */}
        {lineProgress > 0 && (
          <g stroke={lineColor} strokeWidth={3} strokeLinecap="round">
            <line x1={lineStart[0]} y1={lineStart[1]} x2={currentPEnd[0]} y2={currentPEnd[1]} />
            <line x1={lineStart[0]} y1={lineStart[1]} x2={currentQEnd[0]} y2={currentQEnd[1]} />
          </g>
        )}

        {/* 整体 */}
        <g key="whole">
          <rect
            x={nodes.whole.box.x}
            y={nodes.whole.box.y}
            width={nodes.whole.box.w}
            height={nodes.whole.box.h}
            rx={8}
            fill={ctx.theme.stageBg}
            stroke={lineColor}
            strokeWidth={2}
          />
          {isWholeBlank ? (
            <BlankBox
              cx={nodes.whole.at[0]}
              cy={nodes.whole.at[1]}
              textW={nodes.whole.textW}
              size={size}
              stroke={wholeColor}
            />
          ) : (
            <text
              x={nodes.whole.at[0]}
              y={nodes.whole.at[1]}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={size}
              fill={wholeColor}
              fontWeight="bold"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {nodes.whole.text}
            </text>
          )}
        </g>

        {/* 两个部分 */}
        {partsOpacity > 0 && (
          <>
            <g key="p" opacity={partsOpacity}>
              <rect
                x={nodes.p.box.x}
                y={nodes.p.box.y}
                width={nodes.p.box.w}
                height={nodes.p.box.h}
                rx={8}
                fill={ctx.theme.stageBg}
                stroke={lineColor}
                strokeWidth={2}
              />
              {isPBlank ? (
                <BlankBox
                  cx={nodes.p.at[0]}
                  cy={nodes.p.at[1]}
                  textW={nodes.p.textW}
                  size={size}
                  stroke={pColor}
                />
              ) : (
                <text
                  x={nodes.p.at[0]}
                  y={nodes.p.at[1]}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={size}
                  fill={pColor}
                  fontWeight="bold"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {nodes.p.text}
                </text>
              )}
            </g>
            <g key="q" opacity={partsOpacity}>
              <rect
                x={nodes.q.box.x}
                y={nodes.q.box.y}
                width={nodes.q.box.w}
                height={nodes.q.box.h}
                rx={8}
                fill={ctx.theme.stageBg}
                stroke={lineColor}
                strokeWidth={2}
              />
              {isQBlank ? (
                <BlankBox
                  cx={nodes.q.at[0]}
                  cy={nodes.q.at[1]}
                  textW={nodes.q.textW}
                  size={size}
                  stroke={qColor}
                />
              ) : (
                <text
                  x={nodes.q.at[0]}
                  y={nodes.q.at[1]}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={size}
                  fill={qColor}
                  fontWeight="bold"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {nodes.q.text}
                </text>
              )}
            </g>
          </>
        )}
      </g>
    );
  },
};
