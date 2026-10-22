import { motion } from 'motion/react';
import type { StageProps } from '../types';
import type { MessageStepData } from './index';

const MARGIN = 90;
const GAP = 240;
const BOX_W = 132;
const BOX_H = 52;
const TOP = 20;
const ROW0 = 130;
const ROW_GAP = 76;

export function MessageStage({ animation, index, theme }: StageProps) {
  const { elements, steps } = animation;
  const n = elements.length;
  // 画布宽度随角色数量变化，角色少时字号相对更大，手机上也看得清
  const W = Math.max(560, (n - 1) * GAP + 2 * MARGIN);
  const xOf = (id?: string) => {
    const i = elements.findIndex((e) => e.id === id);
    if (i < 0) return null;
    return n === 1 ? W / 2 : MARGIN + (i * (W - 2 * MARGIN)) / (n - 1);
  };
  const H = Math.max(360, ROW0 + steps.length * ROW_GAP);
  const current = steps[index]?.data as MessageStepData | undefined;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`${animation.title}：第 ${index + 1} 步`}
      style={{ fontFamily: theme.font, display: 'block' }}
    >
      <defs>
        {(['active', 'dim'] as const).map((k) => (
          <marker
            key={k}
            id={`arrow-${k}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill={k === 'active' ? theme.accent : theme.dim} />
          </marker>
        ))}
      </defs>

      {elements.map((e, i) => {
        const x = xOf(e.id)!;
        const involved = current && (current.from === e.id || current.to === e.id);
        return (
          <g key={e.id}>
            <line x1={x} y1={TOP + BOX_H} x2={x} y2={H - 12} stroke={theme.line} strokeWidth={2} />
            <rect
              x={x - BOX_W / 2}
              y={TOP}
              width={BOX_W}
              height={BOX_H}
              rx={Math.min(theme.radius, BOX_H / 2)}
              fill={theme.palette[i % theme.palette.length]}
              stroke={involved ? theme.accent : 'transparent'}
              strokeWidth={4}
            />
            <text
              x={x}
              y={TOP + BOX_H / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={18}
              fontWeight={700}
              fill={theme.elementInk}
            >
              {e.name || `${i + 1}`}
            </text>
          </g>
        );
      })}

      {steps.map((s, i) => {
        const d = s.data as MessageStepData;
        const y = ROW0 + i * ROW_GAP;
        const x1 = xOf(d.from);
        const x2 = xOf(d.to);
        const shown = i <= index;
        const active = i === index;
        const color = active ? theme.accent : theme.dim;
        const label = d.label?.trim() || s.title || `第 ${i + 1} 步`;
        const labelX = x1 !== null && x2 !== null ? (x1 + x2) / 2 : W / 2;

        let path: string | null = null;
        if (x1 !== null && x2 !== null) {
          path =
            x1 === x2
              ? `M${x1},${y - 10} C${x1 + 90},${y - 30} ${x1 + 90},${y + 30} ${x1 + 6},${y + 12}`
              : `M${x1 + (x2 > x1 ? 6 : -6)},${y} L${x2 + (x2 > x1 ? -6 : 6)},${y}`;
        }

        return (
          <motion.g
            key={s.id}
            initial={false}
            animate={{ opacity: shown ? 1 : 0.12 }}
            transition={{ duration: 0.3 }}
          >
            {path ? (
              <motion.path
                key={active ? 'on' : 'off'}
                d={path}
                fill="none"
                stroke={color}
                strokeWidth={active ? 4 : 3}
                strokeLinecap="round"
                markerEnd={`url(#arrow-${active ? 'active' : 'dim'})`}
                initial={{ pathLength: active ? 0 : 1 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
              />
            ) : null}
            {active && x1 !== null && x2 !== null && x1 !== x2 ? (
              <motion.circle
                key={`dot-${s.id}`}
                r={8}
                cy={y}
                fill={theme.accent}
                initial={{ cx: x1, opacity: 1 }}
                animate={{ cx: x2, opacity: 0 }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
              />
            ) : null}
            <text
              x={labelX}
              y={y - 14}
              textAnchor="middle"
              fontSize={16}
              fontWeight={active ? 700 : 500}
              fill={theme.ink}
            >
              {path ? label : `${label}（未指定发送方或接收方）`}
            </text>
          </motion.g>
        );
      })}
    </svg>
  );
}
