// 光与影：一根竖直的杆在阳光下的影子，随一天中的时间变化。
// 左边是俯视图（北在上，画出太阳在哪个方向、影子指向哪里、有多长），右边是侧视图（对着太阳的方向看：
// 太阳的高度、杆、影子、阳光），两张图由同一个时间算出来，所以长短和方向一致。
//
// time：一天中的时刻，和钟面一样写 "9:30" 或分钟数，可以连续变化（用 set 动作，ease: linear 匀速），
//       配合滑块调时间也行。按北半球中纬度、春秋分算（latitude、declination 在 site.yaml 的 scene.parts 里）：
//       太阳高度 sin h = sinφ·sinδ + cosφ·cosδ·cosH，方位角 tan A = sinH / (sinφ·cosH − cosφ·tanδ)（H 是时角，每小时 15°）。
//       影长 = 杆高 / tan(太阳高度)；影子的方向和太阳相反。
// 太阳高度很低时影子会无限长，所以高度最小取 minAltitude 度，画出来的影子也不超出画面。
import { useState } from 'react';
import { color, num, pt, str, type Box, type PartDef, type Props } from '../base';
import { clockPart, parseClockTime } from './math';

const rad = (d: number) => (d * Math.PI) / 180;

export interface SunShadowState {
  /** 太阳高度（度） */
  altitude: number;
  /** 太阳方位角（度，从正南起向西为正，所以上午为负、下午为正） */
  azimuth: number;
  /** 影长 / 杆高 */
  ratio: number;
  /** 俯视图上影子的方向（单位向量，屏幕坐标，北在上）和长度（像素） */
  top: { dir: [number, number]; len: number };
  /** 侧视图上影子的长度（像素，向右） */
  sideLen: number;
}

export interface SunShadowLayout {
  radius: number;
  /** 俯视图的圆心、侧视图的地面线左端、杆的位置、地面 y */
  topAt: [number, number];
  sideX0: number;
  sideWidth: number;
  poleX: number;
  groundY: number;
  pole: number;
  box: Box;
}

const MIN_ALTITUDE = 4;

export function sunShadowState(p: Props, layout = sunShadowLayout(p)): SunShadowState {
  const minutes = num(parseClockTime(p.time), 720);
  const phi = rad(num(p.latitude, 35));
  const delta = rad(num(p.declination, 0));
  const H = rad((minutes / 60 - 12) * 15);
  const sinAlt = Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(H);
  const altitude = Math.max(
    MIN_ALTITUDE,
    (Math.asin(Math.max(-1, Math.min(1, sinAlt))) * 180) / Math.PI,
  );
  const azimuth =
    (Math.atan2(Math.sin(H), Math.sin(phi) * Math.cos(H) - Math.cos(phi) * Math.tan(delta)) * 180) /
    Math.PI;
  const ratio = 1 / Math.tan(rad(altitude));
  const A = rad(azimuth);
  // 太阳在 (−sinA, cosA)（南在下、西在左），影子在相反的方向
  const dir: [number, number] = [Math.sin(A), -Math.cos(A)];
  const unit = num(p.unit, 26);
  return {
    altitude,
    azimuth,
    ratio,
    top: { dir, len: Math.min(layout.radius * 0.95, unit * ratio) },
    sideLen: Math.min(layout.sideWidth - (layout.poleX - layout.sideX0) - 8, layout.pole * ratio),
  };
}

export function sunShadowLayout(p: Props): SunShadowLayout {
  const [cx, cy] = pt(p.at);
  const radius = num(p.radius, 120);
  const pole = num(p.pole, 56);
  const sideWidth = num(p.sideWidth, 380);
  const gap = 40;
  const margin = 30; // 俯视图外面写方向字的地方
  const total = (radius + margin) * 2 + gap + sideWidth;
  const left = cx - total / 2;
  const height = (radius + margin) * 2;
  const topAt: [number, number] = [left + radius + margin, cy];
  const sideX0 = left + (radius + margin) * 2 + gap;
  const groundY = cy + height / 2 - 40;
  return {
    radius,
    topAt,
    sideX0,
    sideWidth,
    poleX: sideX0 + 160,
    groundY,
    pole,
    box: { x: left, y: cy - height / 2, w: total, h: height },
  };
}

export const sunShadowPart: PartDef = {
  type: 'sun-shadow',
  name: '光与影',
  anchor: 'center',
  props: [
    'time',
    'latitude',
    'declination',
    'radius',
    'pole',
    'unit',
    'sideWidth',
    'labels',
    'shadowColor',
    'sunAsset',
    'objectAsset',
  ],
  normalize: clockPart.normalize,
  bbox(p) {
    return sunShadowLayout(p).box;
  },
  Render({ p, ctx }) {
    const L = sunShadowLayout(p);
    const S = sunShadowState(p, L);
    const ink = color(p.color, ctx.theme);
    const shadow = color(p.shadowColor, ctx.theme, 'gray');
    const sunC = color('yellow', ctx.theme);
    // 太阳、物体的图片：site.yaml 的 scene.parts.sun-shadow 里配默认的，知识点里可以换
    const sunUrl = p.sunAsset ? ctx.assetUrl?.(str(p.sunAsset)) : undefined;
    const objUrl = p.objectAsset ? ctx.assetUrl?.(str(p.objectAsset)) : undefined;
    const labels = Array.isArray(p.labels) ? p.labels.map(String) : ['N', 'E', 'S', 'W'];
    const [tx, ty] = L.topAt;
    const R = L.radius;

    // 俯视：方向（北在上，东在右）
    const dirs: [string, number, number][] = [
      [labels[0] ?? '', 0, -1],
      [labels[1] ?? '', 1, 0],
      [labels[2] ?? '', 0, 1],
      [labels[3] ?? '', -1, 0],
    ];
    // 太阳在圆外：方向是影子的反方向
    const sx = tx - S.top.dir[0] * (R + 4);
    const sy = ty - S.top.dir[1] * (R + 4);
    const tipX = tx + S.top.dir[0] * S.top.len;
    const tipY = ty + S.top.dir[1] * S.top.len;
    // 影子画成一条由粗到细的尖：垂直于方向的两侧各偏一点
    const nx = -S.top.dir[1];
    const ny = S.top.dir[0];
    const w = 7;

    // 侧视：太阳在左边、杆、影子在右边
    const { poleX, groundY, pole } = L;
    const alt = rad(S.altitude);
    const D = 150; // 太阳画在离杆顶这么远的地方
    const topY = groundY - pole;
    const sunX = poleX - Math.cos(alt) * D;
    const sunY = topY - Math.sin(alt) * D;
    const shadowEnd = poleX + S.sideLen;

    return (
      <g>
        {/* 俯视图 */}
        <circle
          cx={tx}
          cy={ty}
          r={R}
          fill={ctx.theme.stageBg}
          stroke={ctx.theme.line}
          strokeWidth={3}
        />
        {dirs.map(([text, dx, dy], i) => (
          <text
            key={i}
            x={tx + dx * (R + 18)}
            y={ty + dy * (R + 18)}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={22}
            fontWeight="bold"
            fill={ctx.theme.dim}
          >
            {text}
          </text>
        ))}
        <path
          d={`M${tx + nx * w},${ty + ny * w} L${tipX},${tipY} L${tx - nx * w},${ty - ny * w} Z`}
          fill={shadow}
          opacity={0.75}
        />
        <circle cx={tx} cy={ty} r={6} fill={ink} />
        <line
          x1={sx}
          y1={sy}
          x2={tx}
          y2={ty}
          stroke={sunC}
          strokeWidth={3}
          strokeDasharray="8 6"
          opacity={0.9}
        />
        <Sun url={sunUrl} x={sx} y={sy} r={13} fill={sunC} stroke={ink} />

        {/* 侧视图 */}
        <line
          x1={L.sideX0}
          x2={L.sideX0 + L.sideWidth}
          y1={groundY}
          y2={groundY}
          stroke={ctx.theme.line}
          strokeWidth={4}
          strokeLinecap="round"
        />
        <line
          x1={sunX}
          y1={sunY}
          x2={shadowEnd}
          y2={groundY}
          stroke={sunC}
          strokeWidth={3}
          strokeDasharray="8 6"
        />
        {objUrl ? (
          // 物体换成图片（小树、小兔子……）：底边中点站在杆脚，高度就是杆高
          <image
            href={objUrl}
            x={poleX - pole * 0.4}
            y={topY}
            width={pole * 0.8}
            height={pole}
            preserveAspectRatio="xMidYMax meet"
          />
        ) : (
          <line
            x1={poleX}
            y1={groundY}
            x2={poleX}
            y2={topY}
            stroke={ink}
            strokeWidth={8}
            strokeLinecap="round"
          />
        )}
        <line
          x1={poleX}
          y1={groundY}
          x2={shadowEnd}
          y2={groundY}
          stroke={shadow}
          strokeWidth={10}
          strokeLinecap="round"
          opacity={0.75}
        />
        <Sun url={sunUrl} x={sunX} y={sunY} r={15} fill={sunC} stroke={ink} />
      </g>
    );
  },
};

/** 太阳：有素材（sunAsset）时画图片（比圆片大一些，带光芒），没有或加载不出来时画一个圆片 */
function Sun({
  url,
  x,
  y,
  r,
  fill,
  stroke,
}: {
  url?: string;
  x: number;
  y: number;
  r: number;
  fill: string;
  stroke: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!url || failed)
    return <circle cx={x} cy={y} r={r} fill={fill} stroke={stroke} strokeWidth={2} />;
  const size = r * 3.4;
  return (
    <image
      href={url}
      x={x - size / 2}
      y={y - size / 2}
      width={size}
      height={size}
      onError={() => setFailed(true)}
    />
  );
}
