// 文字类零件：文字（数字、算式）、分数、标注框。
import { boxAround, color, num, pt, str, textWidth, type PartDef, type Props } from '../base';

/** 文字里的 {value} 换成 value（“数字递增”动作改的就是 value） */
export function displayText(p: Props): string {
  const v = typeof p.value === 'number' ? String(Math.round(p.value)) : undefined;
  const t = str(p.text);
  if (v === undefined) return t;
  return t ? t.replaceAll('{value}', v) : v;
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
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={num(p.size, 0)}
        fontWeight={str(p.weight, 'bold')}
        fill={color(p.color, ctx.theme)}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {displayText(p)}
      </text>
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
        <text
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size}
          fontWeight="bold"
          fill={c}
        >
          {displayText(p)}
        </text>
      </g>
    );
  },
};
