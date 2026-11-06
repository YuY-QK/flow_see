// 温度计：一根竖直的玻璃管，下面是球泡，管里的液柱高度跟着 value（温度，℃）连续变化。
// value 用 count 动作（from/to）或 set 改；液柱颜色：不高于 coldAt 用 cold，不低于 hotAt 用 hot，之间渐变。
// 刻度从 min 画到 max，每隔 step 一条短线，每隔 labelEvery 写一个数字。
// 绘制比例（管宽的 1.6 倍是球泡直径、数字在管左边）是画法，不是内容参数；默认值在 site.yaml 的 scene.parts.thermometer。
import { color, mixColor, num, pt, textWidth, type Box, type PartDef, type Props } from '../base';

export interface ThermometerLayout {
  /** 管子中心 x、顶端 y、底端（球泡顶）y */
  x: number;
  top: number;
  bottom: number;
  tubeW: number;
  bulbR: number;
  box: Box;
}

export function thermometerLayout(p: Props): ThermometerLayout {
  const [cx, cy] = pt(p.at);
  const h = num(p.height, 240);
  const tubeW = num(p.width, 22);
  const bulbR = tubeW * 0.8;
  // at 是整支温度计（管 + 球泡）的中心
  const total = h + bulbR * 2;
  const top = cy - total / 2;
  const bottom = top + h;
  const labelW = textWidth('-20', tubeW * 0.9) + 14;
  return {
    x: cx,
    top,
    bottom,
    tubeW,
    bulbR,
    box: {
      x: cx - Math.max(bulbR, tubeW / 2) - labelW,
      y: top - 4,
      w: Math.max(bulbR, tubeW / 2) * 2 + labelW + 8,
      h: total + 8,
    },
  };
}

/** 温度对应的液柱高度比例（0–1） */
export function thermometerFill(p: Props): number {
  const min = num(p.min, -20);
  const max = num(p.max, 110);
  const v = num(p.value, min);
  return max > min ? Math.max(0, Math.min(1, (v - min) / (max - min))) : 0;
}

/** 液柱颜色：低温用 cold，高温用 hot，中间渐变；颜色名由调用方解析成 #RRGGBB */
export function thermometerMix(p: Props): number {
  const v = num(p.value, 0);
  const lo = num(p.coldAt, 0);
  const hi = num(p.hotAt, 100);
  return hi > lo ? Math.max(0, Math.min(1, (v - lo) / (hi - lo))) : v >= hi ? 1 : 0;
}

export const thermometerPart: PartDef = {
  type: 'thermometer',
  name: '温度计',
  anchor: 'center',
  props: [
    'value',
    'min',
    'max',
    'height',
    'width',
    'step',
    'labelEvery',
    'cold',
    'hot',
    'coldAt',
    'hotAt',
    'showValue',
  ],
  bbox(p) {
    const b = thermometerLayout(p).box;
    // 写温度数字时，下面多留一行
    return p.showValue ? { ...b, h: b.h + num(p.width, 22) * 1.4 } : b;
  },
  Render({ p, ctx }) {
    const L = thermometerLayout(p);
    const ink = color(p.color, ctx.theme);
    const min = num(p.min, -20);
    const max = num(p.max, 110);
    const step = Math.max(1, num(p.step, 10));
    const every = Math.max(step, num(p.labelEvery, 20));
    const fill = thermometerFill(p);
    const liquid = mixColor(
      color(p.cold, ctx.theme, 'blue'),
      color(p.hot, ctx.theme, 'red'),
      thermometerMix(p),
    );
    const span = L.bottom - L.top;
    const yOf = (v: number) => L.bottom - ((v - min) / (max - min)) * span;
    const ticks: number[] = [];
    for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) ticks.push(v);
    const half = L.tubeW / 2;
    const fs = L.tubeW * 0.9;
    const bulbY = L.bottom + L.bulbR * 0.8;
    const liquidTop = L.bottom - fill * span;
    const glass = ctx.theme.stageBg.startsWith('#') ? ctx.theme.stageBg : color('white', ctx.theme);
    return (
      <g>
        {/* 玻璃管 + 球泡：先画外框，再在里面画液柱 */}
        <rect
          x={L.x - half}
          y={L.top}
          width={L.tubeW}
          height={span + L.bulbR}
          rx={half}
          fill={glass}
          stroke={ink}
          strokeWidth={4}
        />
        <circle cx={L.x} cy={bulbY} r={L.bulbR} fill={glass} stroke={ink} strokeWidth={4} />
        <rect
          x={L.x - half * 0.45}
          y={liquidTop}
          width={half * 0.9}
          height={bulbY - liquidTop}
          fill={liquid}
        />
        <circle cx={L.x} cy={bulbY} r={L.bulbR - 5} fill={liquid} />
        {/* 刻度：整十的长一点，写数字的更长 */}
        {ticks.map((v) => {
          const labelled = Math.abs(v / every - Math.round(v / every)) < 1e-9;
          return (
            <g key={v}>
              <line
                x1={L.x - half - (labelled ? 12 : 7)}
                x2={L.x - half - 2}
                y1={yOf(v)}
                y2={yOf(v)}
                stroke={ink}
                strokeWidth={labelled ? 3 : 2}
              />
              {labelled ? (
                <text
                  x={L.x - half - 16}
                  y={yOf(v)}
                  textAnchor="end"
                  dominantBaseline="central"
                  fontSize={fs}
                  fontWeight="bold"
                  fill={ctx.theme.dim}
                >
                  {v}
                </text>
              ) : null}
            </g>
          );
        })}
        {p.showValue ? (
          <text
            x={L.x}
            y={bulbY + L.bulbR + fs * 1.1}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={fs * 1.3}
            fontWeight="bold"
            fill={liquid}
          >
            {`${Math.round(num(p.value, min))} ℃`}
          </text>
        ) : null}
      </g>
    );
  },
};
