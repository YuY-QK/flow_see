import { motion } from 'motion/react';
import type { StageProps } from '../types';
import { BOX_H, BOX_W, collectEdges, edgeGeometry, layoutNodes } from './layout';

export function FlowStage({ animation, index, theme, still }: StageProps) {
  const { nodes, width, height } = layoutNodes(animation);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edges = collectEdges(animation);
  const keys = new Set(edges.map((e) => `${e.from}>${e.to}`));
  const steps = animation.steps;
  const currentNode = steps[index]?.data.node as string | undefined;
  const prevNode = index > 0 ? (steps[index - 1]?.data.node as string | undefined) : undefined;
  const currentKey = prevNode && currentNode ? `${prevNode}>${currentNode}` : '';

  // 到目前为止走过的节点和连线
  const visited = new Set<string>();
  const walked = new Set<string>();
  steps.slice(0, index + 1).forEach((s, i) => {
    const node = s.data.node as string | undefined;
    if (node) visited.add(node);
    const prev = i > 0 ? (steps[i - 1].data.node as string | undefined) : undefined;
    if (prev && node) walked.add(`${prev}>${node}`);
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
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
            id={`flow-arrow-${k}`}
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

      {edges.map((e) => {
        const a = byId.get(e.from);
        const b = byId.get(e.to);
        if (!a || !b) return null;
        const key = `${e.from}>${e.to}`;
        const g = edgeGeometry(a, b, keys.has(`${e.to}>${e.from}`));
        const isCurrent = key === currentKey;
        const isWalked = walked.has(key);
        const color = isCurrent ? theme.accent : isWalked ? theme.ink : theme.dim;
        const samples = Array.from({ length: 9 }, (_, i) => g.at(i / 8));
        return (
          <g key={key} opacity={isWalked || isCurrent ? 1 : 0.45}>
            <motion.path
              key={isCurrent ? 'on' : 'off'}
              d={g.d}
              fill="none"
              stroke={color}
              strokeWidth={isCurrent ? 4 : 2.5}
              strokeDasharray={isWalked || isCurrent ? undefined : '6 6'}
              markerEnd={`url(#flow-arrow-${isCurrent ? 'on' : 'off'})`}
              initial={{ pathLength: isCurrent && !still ? 0 : 1 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
            />
            {isCurrent && !still ? (
              <motion.circle
                r={7}
                fill={theme.accent}
                initial={{ cx: samples[0].x, cy: samples[0].y, opacity: 1 }}
                animate={{
                  cx: samples.map((p) => p.x),
                  cy: samples.map((p) => p.y),
                  opacity: [1, 1, 1, 1, 1, 1, 1, 1, 0],
                }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
              />
            ) : null}
            {e.label ? (
              <text
                x={g.mid.x}
                y={g.mid.y - 6}
                textAnchor="middle"
                fontSize={14}
                fontWeight={isCurrent ? 700 : 500}
                fill={isCurrent ? theme.accent : theme.ink}
                stroke={theme.stageBg}
                strokeWidth={5}
                paintOrder="stroke"
              >
                {e.label}
              </text>
            ) : null}
          </g>
        );
      })}

      {nodes.map((n, i) => {
        const isCurrent = n.id === currentNode;
        const isVisited = visited.has(n.id);
        const fill = isVisited ? theme.palette[0] : theme.stageBg;
        const ink = isVisited ? theme.elementInk : theme.ink;
        const x = n.cx - BOX_W / 2;
        const y = n.cy - BOX_H / 2;
        // 走过的节点颜色淡一些，当前节点实色并加一圈外框，两者一眼能分清
        const outline = (grow: number, props: Record<string, unknown>) =>
          n.decision ? (
            <polygon
              points={`${n.cx},${y - 6 - grow} ${x + BOX_W + 6 + grow},${n.cy} ${n.cx},${y + BOX_H + 6 + grow} ${x - 6 - grow},${n.cy}`}
              {...props}
            />
          ) : (
            <rect
              x={x - grow}
              y={y - grow}
              width={BOX_W + grow * 2}
              height={BOX_H + grow * 2}
              rx={Math.min(theme.radius, BOX_H / 2) + grow}
              {...props}
            />
          );
        const shape = (
          <>
            {isCurrent ? outline(9, { fill: 'none', stroke: theme.accent, strokeWidth: 4 }) : null}
            {outline(0, {
              fill,
              fillOpacity: isVisited && !isCurrent ? 0.55 : 1,
              stroke: isVisited ? 'none' : theme.line,
              strokeWidth: 2,
            })}
          </>
        );
        return (
          <motion.g
            key={n.id}
            style={{ transformOrigin: `${n.cx}px ${n.cy}px`, transformBox: 'view-box' }}
            initial={false}
            animate={{ scale: isCurrent && !still ? [1, 1.08, 1] : 1 }}
            transition={{ duration: 0.5 }}
          >
            {shape}
            <text
              x={n.cx}
              y={n.cy}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={n.name.length > 7 ? 14 : 17}
              fontWeight={700}
              fill={ink}
            >
              {n.name || `节点 ${i + 1}`}
            </text>
          </motion.g>
        );
      })}
    </svg>
  );
}
