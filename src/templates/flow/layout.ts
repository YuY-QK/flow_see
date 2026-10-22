// 流程图的布局与连线计算（纯函数，便于测试）。
import type { Animation } from '@/engine';

export const BOX_W = 150;
export const BOX_H = 64;
const GAP_X = 80;
const GAP_Y = 90;
const PAD = 50;

export interface NodeBox {
  id: string;
  name: string;
  cx: number;
  cy: number;
  col: number;
  row: number;
  decision: boolean;
}

export interface Edge {
  from: string;
  to: string;
  label: string;
  /** 第一次走过这条线的步骤序号 */
  firstStep: number;
}

export function isDecision(name: string) {
  return /[?？]\s*$/.test(name);
}

export function layoutNodes(a: Animation) {
  const n = a.elements.length;
  const cols = Math.max(1, Math.min(4, n <= 4 ? n : Math.ceil(n / Math.ceil(n / 4))));
  const rows = Math.max(1, Math.ceil(n / cols));
  const width = cols * BOX_W + (cols - 1) * GAP_X + PAD * 2;
  const height = rows * BOX_H + (rows - 1) * GAP_Y + PAD * 2;
  const nodes: NodeBox[] = a.elements.map((e, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      id: e.id,
      name: e.name,
      col,
      row,
      cx: PAD + col * (BOX_W + GAP_X) + BOX_W / 2,
      cy: PAD + row * (BOX_H + GAP_Y) + BOX_H / 2,
      decision: isDecision(e.name),
    };
  });
  return { nodes, width, height };
}

/** 相邻两步之间的连线（同一对节点只画一次） */
export function collectEdges(a: Animation): Edge[] {
  const edges = new Map<string, Edge>();
  for (let i = 1; i < a.steps.length; i++) {
    const from = a.steps[i - 1].data.node as string | undefined;
    const to = a.steps[i].data.node as string | undefined;
    if (!from || !to || from === to) continue;
    const key = `${from}>${to}`;
    const label = String(a.steps[i].data.via ?? '').trim();
    const old = edges.get(key);
    if (!old) edges.set(key, { from, to, label, firstStep: i });
    else if (!old.label && label) old.label = label;
  }
  return [...edges.values()];
}

/** 从中心 (cx, cy) 朝 (tx, ty) 方向，与节点边框的交点 */
export function borderPoint(node: NodeBox, tx: number, ty: number) {
  const dx = tx - node.cx;
  const dy = ty - node.cy;
  if (dx === 0 && dy === 0) return { x: node.cx, y: node.cy };
  const hw = BOX_W / 2 + 4;
  const hh = BOX_H / 2 + 4;
  // 菱形：|x|/hw + |y|/hh = 1；矩形：max(|x|/hw, |y|/hh) = 1
  const k = node.decision
    ? 1 / (Math.abs(dx) / hw + Math.abs(dy) / hh)
    : 1 / Math.max(Math.abs(dx) / hw, Math.abs(dy) / hh);
  return { x: node.cx + dx * k, y: node.cy + dy * k };
}

/** 两个节点之间的连线：相邻的走直线，否则（或有反向线时）走弧线避开其他节点 */
export function edgeGeometry(a: NodeBox, b: NodeBox, hasReverse: boolean) {
  const dc = Math.abs(a.col - b.col);
  const dr = Math.abs(a.row - b.row);
  // 左右/上下相邻，或斜对角相邻，中间都不会挡着别的节点，可以走直线
  const neighbors = dc + dr === 1 || (dc === 1 && dr === 1);
  const mx = (a.cx + b.cx) / 2;
  const my = (a.cy + b.cy) / 2;
  const dx = b.cx - a.cx;
  const dy = b.cy - a.cy;
  const len = Math.hypot(dx, dy) || 1;
  const bend = neighbors ? (hasReverse ? 26 : 0) : Math.min(90, 30 + len * 0.15);
  // 法向量：沿行进方向的左侧，正反两条线因此自然分开
  const cx = mx + (-dy / len) * bend;
  const cy = my + (dx / len) * bend;
  const p1 = borderPoint(a, cx, cy);
  const p2 = borderPoint(b, cx, cy);
  const at = (t: number) => ({
    x: (1 - t) ** 2 * p1.x + 2 * (1 - t) * t * cx + t ** 2 * p2.x,
    y: (1 - t) ** 2 * p1.y + 2 * (1 - t) * t * cy + t ** 2 * p2.y,
  });
  return {
    d: `M${p1.x},${p1.y} Q${cx},${cy} ${p2.x},${p2.y}`,
    mid: at(0.5),
    at,
  };
}
