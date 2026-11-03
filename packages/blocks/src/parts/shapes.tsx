// 几何图形、线段与箭头、图片素材。
import { useState } from 'react';
import {
  boxAround,
  color,
  num,
  pt,
  str,
  type PartContext,
  type PartDef,
  type Props,
} from '../base';

export const SHAPE_KINDS = ['rect', 'circle', 'triangle', 'sector'] as const;

export const shapePart: PartDef = {
  type: 'shape',
  name: '几何图形',
  anchor: 'center',
  defaults: { shape: 'rect', width: 160, height: 100, radius: 70, angle: 90, color: 'blue' },
  props: ['shape', 'width', 'height', 'radius', 'angle', 'fill', 'stroke'],
  bbox(p) {
    const [x, y] = pt(p.at);
    const k = str(p.shape, 'rect');
    if (k === 'circle' || k === 'sector') {
      const r = num(p.radius, 70);
      return boxAround(x, y, r * 2 + 6, r * 2 + 6);
    }
    return boxAround(x, y, num(p.width, 160) + 6, num(p.height, 100) + 6);
  },
  Render({ p, ctx }) {
    const [x, y] = pt(p.at);
    const c = color(p.color, ctx.theme, 'blue');
    // fill: false 只画边框；fill 写颜色名时用它填充（半透明）
    const fill =
      p.fill === false ? 'none' : typeof p.fill === 'string' ? color(p.fill, ctx.theme) : c;
    const style = {
      fill,
      fillOpacity: p.fill === false ? 0 : 0.35,
      stroke: p.stroke === false ? 'none' : c,
      strokeWidth: 4,
      strokeLinejoin: 'round' as const,
    };
    const w = num(p.width, 160);
    const h = num(p.height, 100);
    const r = num(p.radius, 70);
    switch (str(p.shape, 'rect')) {
      case 'circle':
        return <circle cx={x} cy={y} r={r} {...style} />;
      case 'triangle':
        return (
          <path
            d={`M${x},${y - h / 2} L${x + w / 2},${y + h / 2} L${x - w / 2},${y + h / 2} Z`}
            {...style}
          />
        );
      case 'sector': {
        const a = (Math.max(1, Math.min(359.9, num(p.angle, 90))) * Math.PI) / 180;
        const x2 = x + Math.sin(a) * r;
        const y2 = y - Math.cos(a) * r;
        return (
          <path
            d={`M${x},${y} L${x},${y - r} A${r},${r} 0 ${a > Math.PI ? 1 : 0} 1 ${x2},${y2} Z`}
            {...style}
          />
        );
      }
      default:
        return <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={4} {...style} />;
    }
  },
};

function lineBox(p: Props) {
  const [x1, y1] = pt(p.from);
  const [x2, y2] = pt(p.to);
  const pad = 12;
  return {
    x: Math.min(x1, x2) - pad,
    y: Math.min(y1, y2) - pad,
    w: Math.abs(x2 - x1) + pad * 2,
    h: Math.abs(y2 - y1) + pad * 2,
  };
}

function renderLine(p: Props, ctx: PartContext, arrow: boolean) {
  const [x1, y1] = pt(p.from);
  const [x2, y2] = pt(p.to);
  const c = color(p.color, ctx.theme);
  const w = num(p.width, 4);
  // draw：画出来的程度 0–1（可用 set 动作逐渐画出）
  const draw = Math.max(0, Math.min(1, num(p.draw, 1)));
  const ex = x1 + (x2 - x1) * draw;
  const ey = y1 + (y2 - y1) * draw;
  const ang = Math.atan2(ey - y1, ex - x1);
  const head = w * 3.5;
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={arrow ? ex - Math.cos(ang) * head * 0.6 : ex}
        y2={arrow ? ey - Math.sin(ang) * head * 0.6 : ey}
        stroke={c}
        strokeWidth={w}
        strokeLinecap="round"
        strokeDasharray={p.dashed ? `${w * 2.5} ${w * 2}` : undefined}
      />
      {arrow && draw > 0 ? (
        <path
          d={`M${ex},${ey} L${ex - Math.cos(ang - 0.45) * head},${ey - Math.sin(ang - 0.45) * head} L${ex - Math.cos(ang + 0.45) * head},${ey - Math.sin(ang + 0.45) * head} Z`}
          fill={c}
        />
      ) : null}
    </g>
  );
}

export const linePart: PartDef = {
  type: 'line',
  name: '线段',
  anchor: 'center',
  defaults: { color: 'ink', width: 4, draw: 1 },
  required: ['from', 'to'],
  props: ['from', 'to', 'width', 'dashed', 'draw'],
  bbox: lineBox,
  Render: ({ p, ctx }) => renderLine(p, ctx, false),
};

export const arrowPart: PartDef = {
  ...linePart,
  type: 'arrow',
  name: '箭头',
  Render: ({ p, ctx }) => renderLine(p, ctx, true),
};

/** 图片素材：asset 写 assets/manifest.yaml 里的 id；加载失败时显示灰色占位，动画继续 */
export const imagePart: PartDef = {
  type: 'image',
  name: '图片',
  anchor: 'center',
  defaults: { width: 160, height: 160 },
  required: ['asset'],
  props: ['asset', 'width', 'height'],
  bbox(p) {
    const [x, y] = pt(p.at);
    return boxAround(x, y, num(p.width, 160), num(p.height, 160));
  },
  Render: function ImageRender({ p, ctx }) {
    const [failed, setFailed] = useState(false);
    const b = imagePart.bbox(p);
    const url = ctx.assetUrl?.(str(p.asset));
    if (!url || failed)
      return (
        <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={8} fill={ctx.theme.dim} opacity={0.35} />
      );
    return (
      <image
        href={url}
        x={b.x}
        y={b.y}
        width={b.w}
        height={b.h}
        preserveAspectRatio="xMidYMid meet"
        onError={() => setFailed(true)}
      />
    );
  },
};
