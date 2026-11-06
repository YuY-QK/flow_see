// 文字类零件：文字（数字、算式）、分数、标注框。
//
// 颜色标记（强对应）：文字里写 [4](blue) 这几个字就是蓝色；写 [4](@r1) 颜色跟着零件 r1，
// 而且 r1 高亮时这几个字也一起亮起来（底下衬一块同色的底）；两样都要时写 [3](red @rows)。
import type { Theme } from '@flow-see/core';
import { boxAround, color, num, pt, str, textWidth, type PartDef, type Props } from '../base';
import { BlankBox } from './mark';
import { markRect } from './markRect';

const RICH = /\[([^\]]*)\]\(([^)]*)\)/g;

/** 去掉颜色标记后的文字 */
export const plainText = (t: string): string => t.replace(RICH, '$1');

/** 文字里的 {value} 换成 value（“数字递增”动作改的就是 value）；颜色标记去掉 */
export function displayText(p: Props): string {
  return plainText(rawText(p));
}

function rawText(p: Props): string {
  const v = typeof p.value === 'number' ? String(Math.round(p.value)) : undefined;
  const t = str(p.text);
  if (v === undefined) return t;
  return t ? t.replaceAll('{value}', v) : v;
}

interface Span {
  text: string;
  /** 写死的颜色 */
  color?: string;
  /** 跟着哪个零件（颜色、高亮） */
  link?: string;
  /** 要孩子答的数：不写字，画成同宽的虚线空框（颜色标记写 blank） */
  blank?: boolean;
}

/** 把文字按颜色标记切成几段 */
export function richSpans(text: string): Span[] {
  const out: Span[] = [];
  let last = 0;
  for (const m of text.matchAll(RICH)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    const words = m[2].trim().split(/\s+/);
    const link = words.find((w) => w.startsWith('@'))?.slice(1);
    const blank = words.includes('blank');
    const c = words.find((w) => !w.startsWith('@') && w !== 'blank');
    out.push({ text: m[1], color: c, link, blank });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

/** 场景求值时记下的被引用零件的颜色、高亮程度（见 templates/scene/evaluate 的 linkRefs） */
type Refs = Record<string, { color?: unknown; highlight?: number }>;

/**
 * 带颜色标记的一行文字（以 (x, y) 为中心）。被引用的零件高亮时，对应的字底下衬一块同色的底。
 * 每段的宽度按 textWidth 估算（和包围盒一致）；每一段单独居中画在自己估算出的中心，
 * 所以底块一定和字对齐，不受真实字体宽度和估算有出入的影响。
 */
function RichLine({
  p,
  theme,
  x,
  y,
  size,
  fill,
  weight,
}: {
  p: Props;
  theme: Theme;
  x: number;
  y: number;
  size: number;
  fill: string;
  weight: string;
}) {
  const spans = richSpans(rawText(p));
  const refs = (p.refs ?? {}) as Refs;
  const widths = spans.map((sp) => textWidth(sp.text, size));
  const total = widths.reduce((w, v) => w + v, 0);
  // 每段的起点：前面各段宽度之和（纯计算，不在渲染里改变量）
  const starts = widths.map((_, i) => widths.slice(0, i).reduce((w, v) => w + v, x - total / 2));
  const parts = spans.map((sp, i) => {
    const ref = sp.link ? refs[sp.link] : undefined;
    const c = sp.color ? color(sp.color, theme) : ref?.color ? color(ref.color, theme) : fill;
    // 段首段尾的空格：SVG 会把它们吃掉，所以按去掉空格的字来定中心
    const body = sp.text.trim();
    const lead = textWidth(sp.text.slice(0, sp.text.length - sp.text.trimStart().length), size);
    const bw = textWidth(body, size);
    return {
      body,
      c,
      cx: starts[i] + lead + bw / 2,
      bw,
      hl: Math.max(0, Math.min(1, ref?.highlight ?? 0)),
      blank: !!sp.blank,
    };
  });
  const hlWidth = Math.max(2, size / 16);
  return (
    <g>
      {parts.map((sp, i) =>
        sp.blank ? (
          <BlankBox key={i} cx={sp.cx} cy={y} textW={sp.bw} size={size} stroke={sp.c} />
        ) : sp.hl > 0 && sp.body ? (
          <rect
            key={i}
            {...markRect(sp.cx, y, sp.bw, size)}
            fill={sp.c}
            fillOpacity={0.16 * sp.hl}
            stroke={sp.c}
            strokeOpacity={sp.hl}
            strokeWidth={hlWidth}
          />
        ) : null,
      )}
      {parts.map((sp, i) =>
        sp.body && !sp.blank ? (
          <text
            key={i}
            x={sp.cx}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={size}
            fontWeight={weight}
            fill={sp.c}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {sp.body}
          </text>
        ) : null,
      )}
    </g>
  );
}

export const textPart: PartDef = {
  type: 'text',
  name: '文字',
  anchor: 'center',
  props: ['text', 'value', 'size', 'weight'],
  bbox(p) {
    const [x, y] = pt(p.at);
    const size = num(p.size, 0);
    return boxAround(x, y, Math.max(textWidth(displayText(p), size), size * 0.6), size * 1.25);
  },
  Render({ p, ctx }) {
    const [x, y] = pt(p.at);
    return (
      <RichLine
        p={p}
        theme={ctx.theme}
        x={x}
        y={y}
        size={num(p.size, 0)}
        fill={color(p.color, ctx.theme)}
        weight={str(p.weight, 'bold')}
      />
    );
  },
};

/** 分数：上分子、下分母、中间分数线 */
export const fractionPart: PartDef = {
  type: 'fraction',
  name: '分数',
  anchor: 'center',
  required: ['num', 'den'],
  props: ['num', 'den', 'size'],
  bbox(p) {
    const [x, y] = pt(p.at);
    const size = num(p.size, 0);
    const w = Math.max(textWidth(str(p.num), size), textWidth(str(p.den), size)) + size * 0.4;
    return boxAround(x, y, w, size * 2.4);
  },
  Render({ p, ctx }) {
    const [x, y] = pt(p.at);
    const size = num(p.size, 0);
    const c = color(p.color, ctx.theme);
    const w = Math.max(textWidth(str(p.num), size), textWidth(str(p.den), size)) + size * 0.4;
    return (
      <g fill={c} fontSize={size} fontWeight="bold" textAnchor="middle">
        <text x={x} y={y - size * 0.15}>
          {str(p.num)}
        </text>
        <line
          x1={x - w / 2}
          x2={x + w / 2}
          y1={y}
          y2={y}
          stroke={c}
          strokeWidth={Math.max(2, size / 14)}
          strokeLinecap="round"
        />
        <text x={x} y={y + size * 0.15} dominantBaseline="hanging">
          {str(p.den)}
        </text>
      </g>
    );
  },
};

/** 标注框：圆角框 + 文字 */
export const labelPart: PartDef = {
  type: 'label',
  name: '标注框',
  anchor: 'center',
  required: ['text'],
  props: ['text', 'value', 'size'],
  bbox(p) {
    const [x, y] = pt(p.at);
    const size = num(p.size, 0);
    return boxAround(x, y, textWidth(displayText(p), size) + size * 1.2, size * 1.9);
  },
  Render({ p, ctx }) {
    const b = labelPart.bbox(p);
    const [x, y] = pt(p.at);
    const size = num(p.size, 0);
    const c = color(p.color, ctx.theme, 'accent');
    return (
      <g>
        <rect
          x={b.x}
          y={b.y}
          width={b.w}
          height={b.h}
          rx={Math.min(ctx.theme.radius, b.h / 2)}
          fill={ctx.theme.stageBg}
          stroke={c}
          strokeWidth={3}
        />
        <RichLine p={p} theme={ctx.theme} x={x} y={y} size={size} fill={c} weight="bold" />
      </g>
    );
  },
};
