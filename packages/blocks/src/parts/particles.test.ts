import { describe, expect, it } from 'vitest';
import { particleLayout, particlePosition, particlesPart } from './particles';

const base = { at: [300, 200], width: 300, height: 260, radius: 9, count: 36 };

/** 所有颗粒的横纵向跨度之和 */
const spread = (phase: number, t = 0) => {
  const L = particleLayout(base);
  const ds = Array.from({ length: L.n }, (_, i) => particlePosition(L, i, phase, t));
  const xs = ds.map((d) => d.x);
  const ys = ds.map((d) => d.y);
  return Math.max(...xs) - Math.min(...xs) + Math.max(...ys) - Math.min(...ys);
};

describe('粒子示意', () => {
  it('固态排得最紧，液态松一些，气态撒满整个盒子', () => {
    expect(spread(0)).toBeLessThan(spread(1));
    expect(spread(1)).toBeLessThan(spread(2));
  });

  it('固态是整齐的方阵：同一行 y 相同，相邻颗粒不重叠', () => {
    const L = particleLayout(base);
    expect(L.solid[0].y).toBe(L.solid[5].y);
    expect(L.solid[1].x - L.solid[0].x).toBeGreaterThan(2 * L.r);
  });

  it('颗粒都在盒子里', () => {
    const L = particleLayout(base);
    for (const phase of [0, 0.5, 1, 1.5, 2])
      for (const t of [0, 1.3, 7.7])
        for (let i = 0; i < L.n; i++) {
          const d = particlePosition(L, i, phase, t);
          expect(d.x).toBeGreaterThan(0);
          expect(d.x).toBeLessThan(L.width);
          expect(d.y).toBeGreaterThan(0);
          expect(d.y).toBeLessThan(L.height);
        }
  });

  it('位置只由 phase 和 t 决定（同一帧永远一样），t 变了颗粒会动', () => {
    const L = particleLayout(base);
    expect(particlePosition(L, 3, 1, 2)).toEqual(particlePosition(L, 3, 1, 2));
    expect(particlePosition(L, 3, 1, 2)).not.toEqual(particlePosition(L, 3, 1, 2.5));
  });

  it('phase 连续变化时颗粒的位置也连续变化', () => {
    const L = particleLayout(base);
    const a = particlePosition(L, 7, 0.99, 1);
    const b = particlePosition(L, 7, 1.01, 1);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(L.r);
  });

  it('包围盒就是盒子', () => {
    const b = particlesPart.bbox(base);
    expect(b.w).toBe(300);
    expect(b.h).toBe(260);
  });
});
