// 循环 / 时间线的几何计算（纯函数）。

export type CycleLayout = 'cycle' | 'timeline';

export const NODE_R = 48;

export interface Point {
  x: number;
  y: number;
}

export interface CycleGeometry {
  width: number;
  height: number;
  points: Point[];
  /** 从第 i 个阶段到下一个阶段的路径与采样点 */
  link(i: number, j: number): { d: string; samples: Point[] } | null;
  /** 第 i 个阶段到第 i+1 个（循环时最后一个回到第一个）是否算“相邻” */
  isNeighbor(i: number, j: number): boolean;
}

export function cycleGeometry(n: number, layout: CycleLayout): CycleGeometry {
  return layout === 'timeline' ? timeline(n) : circle(n);
}

function circle(n: number): CycleGeometry {
  const R = n <= 3 ? 150 : n <= 6 ? 180 : 210;
  const width = R * 2 + NODE_R * 2 + 120;
  const height = width;
  const c = { x: width / 2, y: height / 2 };
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(n, 1);
  const points = Array.from({ length: n }, (_, i) => ({
    x: c.x + R * Math.cos(angle(i)),
    y: c.y + R * Math.sin(angle(i)),
  }));
  // 圆弧的起止要避开节点本身
  const gap = Math.asin(Math.min(1, (NODE_R + 10) / R));
  const isNeighbor = (i: number, j: number) => n > 1 && (i + 1) % n === j;

  return {
    width,
    height,
    points,
    isNeighbor,
    link(i, j) {
      if (i === j || !points[i] || !points[j]) return null;
      if (isNeighbor(i, j)) {
        const a0 = angle(i) + gap;
        const a1 = angle(i) + (2 * Math.PI) / n - gap;
        const at = (t: number) => {
          const a = a0 + (a1 - a0) * t;
          return { x: c.x + R * Math.cos(a), y: c.y + R * Math.sin(a) };
        };
        const p0 = at(0);
        const p1 = at(1);
        const large = a1 - a0 > Math.PI ? 1 : 0;
        return {
          d: `M${p0.x},${p0.y} A${R},${R} 0 ${large} 1 ${p1.x},${p1.y}`,
          samples: Array.from({ length: 9 }, (_, k) => at(k / 8)),
        };
      }
      return chord(points[i], points[j]);
    },
  };
}

function timeline(n: number): CycleGeometry {
  const step = 170;
  const width = Math.max(520, (n - 1) * step + NODE_R * 2 + 120);
  const height = 300;
  const x0 = (width - (n - 1) * step) / 2;
  const points = Array.from({ length: n }, (_, i) => ({ x: x0 + i * step, y: height / 2 }));
  const isNeighbor = (i: number, j: number) => j === i + 1;
  return {
    width,
    height,
    points,
    isNeighbor,
    link(i, j) {
      if (i === j || !points[i] || !points[j]) return null;
      if (isNeighbor(i, j)) return straight(points[i], points[j]);
      return chord(points[i], points[j], 90);
    },
  };
}

function trim(a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const k = (NODE_R + 8) / len;
  return { p0: { x: a.x + dx * k, y: a.y + dy * k }, p1: { x: b.x - dx * k, y: b.y - dy * k } };
}

function straight(a: Point, b: Point) {
  const { p0, p1 } = trim(a, b);
  return {
    d: `M${p0.x},${p0.y} L${p1.x},${p1.y}`,
    samples: Array.from({ length: 9 }, (_, k) => ({
      x: p0.x + ((p1.x - p0.x) * k) / 8,
      y: p0.y + ((p1.y - p0.y) * k) / 8,
    })),
  };
}

/** 不相邻的两个阶段之间：带弧度的“跳转”线 */
function chord(a: Point, b: Point, bend = 40) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const c = { x: mx + (-dy / len) * bend, y: my + (dx / len) * bend };
  const { p0 } = trim(a, c);
  const { p1 } = trim(c, b);
  const at = (t: number) => ({
    x: (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * c.x + t ** 2 * p1.x,
    y: (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * c.y + t ** 2 * p1.y,
  });
  return {
    d: `M${p0.x},${p0.y} Q${c.x},${c.y} ${p1.x},${p1.y}`,
    samples: Array.from({ length: 9 }, (_, k) => at(k / 8)),
  };
}

/** 把较长的名字拆成两行显示 */
export function splitName(name: string): string[] {
  const s = name.trim();
  if (s.length <= 4) return [s];
  const half = Math.ceil(s.length / 2);
  return [s.slice(0, half), s.slice(half)];
}
