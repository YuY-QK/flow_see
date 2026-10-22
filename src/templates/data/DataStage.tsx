import { motion } from 'motion/react';
import type { StageProps } from '../types';
import type { DataFrame } from './algorithms';

const SLOT = 92;
const BAR_W = 70;
const TOP = 80;
const BAR_MAX = 250;
const BAR_MIN = 34;
const H = TOP + BAR_MAX + 56;

export function DataStage({ animation, index, theme }: StageProps) {
  const f = animation.steps[index]?.data as unknown as DataFrame | undefined;
  if (!f?.order) return null;

  const n = f.order.length;
  const W = Math.max(480, n * SLOT + 40);
  const left = (W - n * SLOT) / 2 + (SLOT - BAR_W) / 2;
  const maxV = Math.max(...f.values.map((v) => Math.abs(v)), 1);
  const posOf = new Map(f.order.map((id, pos) => [id, pos]));
  const sorted = new Set(f.sorted);
  const active = new Set(f.active);
  const [base, hot, done] = theme.palette;
  const markerText = animation.params?.order === 'desc' ? '目前最大' : '目前最小';

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`第 ${index + 1} 步：${f.order.map((id) => f.values[id]).join('、')}`}
      style={{ fontFamily: theme.font, display: 'block' }}
    >
      <text x={20} y={30} fontSize={15} fill={theme.ink} opacity={0.75}>
        比较 {f.compares} 次 · 交换 {f.swaps} 次
      </text>
      <g fontSize={13} fill={theme.ink}>
        {[
          [hot, '正在处理'],
          [done, '已排好'],
        ].map(([c, label], i) => (
          <g key={label} transform={`translate(${W - 200 + i * 100}, 20)`}>
            <rect width={14} height={14} rx={3} fill={c} />
            <text x={20} y={12}>
              {label}
            </text>
          </g>
        ))}
      </g>

      {/* 位置编号 */}
      {f.order.map((_, pos) => (
        <text
          key={pos}
          x={left + pos * SLOT + BAR_W / 2}
          y={H - 16}
          textAnchor="middle"
          fontSize={13}
          fill={theme.dim}
        >
          {pos + 1}
        </text>
      ))}

      {f.values.map((v, id) => {
        const pos = posOf.get(id) ?? 0;
        const h = BAR_MIN + (Math.abs(v) / maxV) * (BAR_MAX - BAR_MIN);
        const isActive = active.has(pos);
        const fill = isActive ? hot : sorted.has(pos) ? done : base;
        const isMarker = f.marker === pos;
        return (
          <motion.g
            key={id}
            initial={false}
            animate={{ x: left + pos * SLOT, y: isActive && f.swapped ? -12 : 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          >
            <motion.rect
              y={TOP + BAR_MAX - h}
              width={BAR_W}
              height={h}
              rx={Math.min(theme.radius, 14)}
              initial={false}
              animate={{ fill }}
              transition={{ duration: 0.25 }}
              stroke={isMarker ? theme.accent : 'transparent'}
              strokeWidth={4}
            />
            <text
              x={BAR_W / 2}
              y={TOP + BAR_MAX - h + 26}
              textAnchor="middle"
              fontSize={20}
              fontWeight={700}
              fill={theme.elementInk}
            >
              {v}
            </text>
            {isMarker ? (
              <text
                x={BAR_W / 2}
                y={TOP + BAR_MAX - h - 10}
                textAnchor="middle"
                fontSize={13}
                fontWeight={700}
                fill={theme.accent}
              >
                {markerText}
              </text>
            ) : null}
          </motion.g>
        );
      })}
    </svg>
  );
}
