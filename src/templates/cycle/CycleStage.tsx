import { motion } from 'motion/react';
import type { StageProps } from '../types';
import { NODE_R, cycleGeometry, splitName, type CycleLayout } from './geometry';

export function CycleStage({ animation, index, theme, still }: StageProps) {
  const layout: CycleLayout = animation.params?.layout === 'timeline' ? 'timeline' : 'cycle';
  const { elements, steps } = animation;
  const n = elements.length;
  const g = cycleGeometry(n, layout);
  const idx = (id: unknown) => elements.findIndex((e) => e.id === id);

  const cur = idx(steps[index]?.data.stage);
  const prev = index > 0 ? idx(steps[index - 1]?.data.stage) : -1;
  const visited = new Set(steps.slice(0, index + 1).map((s) => idx(s.data.stage)));
  // 第几圈：回到第一个阶段的次数
  const laps =
    layout === 'cycle'
      ? steps.slice(1, index + 1).filter((s, i) => {
          const a = idx(steps[i].data.stage);
          const b = idx(s.data.stage);
          return b === 0 && a === n - 1;
        }).length + 1
      : 0;

  const baseLinks = Array.from({ length: layout === 'cycle' ? n : n - 1 }, (_, i) => ({
    i,
    j: (i + 1) % n,
  })).filter(({ i, j }) => n > 1 && i !== j);
  const jump = cur >= 0 && prev >= 0 && prev !== cur && !g.isNeighbor(prev, cur);
  const curLink = cur >= 0 && prev >= 0 ? g.link(prev, cur) : null;

  return (
    <svg
      viewBox={`0 0 ${g.width} ${g.height}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`${animation.title}：第 ${index + 1} 步`}
      style={{ fontFamily: theme.font, display: 'block' }}
    >
      <defs>
        {(['on', 'off'] as const).map((k) => (
          <marker
            key={k}
            id={`cycle-arrow-${k}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill={k === 'on' ? theme.accent : theme.dim} />
          </marker>
        ))}
      </defs>

      {layout === 'cycle' && laps > 1 ? (
        <text
          x={g.width / 2}
          y={g.height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={20}
          fontWeight={700}
          fill={theme.dim}
        >
          第 {laps} 圈
        </text>
      ) : null}

      {baseLinks.map(({ i, j }) => {
        const l = g.link(i, j);
        if (!l) return null;
        const on = prev === i && cur === j;
        return (
          <motion.path
            key={`${i}-${j}-${on ? 'on' : 'off'}`}
            d={l.d}
            fill="none"
            stroke={on ? theme.accent : theme.dim}
            strokeWidth={on ? 5 : 3}
            strokeLinecap="round"
            markerEnd={`url(#cycle-arrow-${on ? 'on' : 'off'})`}
            initial={{ pathLength: on && !still ? 0 : 1 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
          />
        );
      })}

      {jump && curLink ? (
        <motion.path
          key={`jump-${index}`}
          d={curLink.d}
          fill="none"
          stroke={theme.accent}
          strokeWidth={4}
          strokeDasharray="8 7"
          markerEnd="url(#cycle-arrow-on)"
          initial={{ pathLength: still ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
        />
      ) : null}

      {curLink && !still ? (
        <motion.circle
          key={`dot-${index}`}
          r={8}
          fill={theme.accent}
          initial={{ cx: curLink.samples[0].x, cy: curLink.samples[0].y, opacity: 1 }}
          animate={{
            cx: curLink.samples.map((p) => p.x),
            cy: curLink.samples.map((p) => p.y),
            opacity: [1, 1, 1, 1, 1, 1, 1, 1, 0],
          }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
        />
      ) : null}

      {elements.map((e, i) => {
        const p = g.points[i];
        const isCur = i === cur;
        const seen = visited.has(i);
        const lines = splitName(e.name || `阶段 ${i + 1}`);
        return (
          <motion.g
            key={e.id}
            style={{ transformOrigin: `${p.x}px ${p.y}px`, transformBox: 'view-box' }}
            initial={false}
            animate={{ scale: isCur ? 1.15 : 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          >
            <circle
              cx={p.x}
              cy={p.y}
              r={NODE_R}
              fill={seen ? theme.palette[i % theme.palette.length] : theme.stageBg}
              stroke={isCur ? theme.accent : theme.line}
              strokeWidth={isCur ? 5 : 2}
            />
            {lines.map((t, k) => (
              <text
                key={k}
                x={p.x}
                y={p.y + (k - (lines.length - 1) / 2) * 19}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={16}
                fontWeight={700}
                fill={seen ? theme.elementInk : theme.ink}
              >
                {t}
              </text>
            ))}
          </motion.g>
        );
      })}
    </svg>
  );
}
