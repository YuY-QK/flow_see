import { describe, expect, it } from 'vitest';
import { cycleTemplate } from './index';
import { cycleGeometry, splitName } from './geometry';

describe('循环 / 时间线模板', () => {
  it('示例：每一步都指向存在的阶段，最后回到起点', () => {
    const a = cycleTemplate.createDefault();
    const ids = a.elements.map((e) => e.id);
    for (const s of a.steps) expect(ids).toContain(s.data.stage);
    expect(a.steps[a.steps.length - 1].data.stage).toBe(ids[0]);
  });

  it('循环布局：最后一个阶段与第一个相邻', () => {
    const g = cycleGeometry(4, 'cycle');
    expect(g.isNeighbor(0, 1)).toBe(true);
    expect(g.isNeighbor(3, 0)).toBe(true);
    expect(g.isNeighbor(0, 2)).toBe(false);
    expect(g.link(3, 0)?.d).toMatch(/^M.* A/);
  });

  it('时间线布局：只有向后一个阶段算相邻，节点从左到右排列', () => {
    const g = cycleGeometry(4, 'timeline');
    expect(g.isNeighbor(3, 0)).toBe(false);
    expect(g.isNeighbor(1, 2)).toBe(true);
    const xs = g.points.map((p) => p.x);
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
  });

  it('同一个阶段之间没有连线', () => {
    expect(cycleGeometry(3, 'cycle').link(1, 1)).toBeNull();
  });

  it('所有节点都在画布内', () => {
    for (const layout of ['cycle', 'timeline'] as const) {
      for (const n of [1, 3, 6, 10]) {
        const g = cycleGeometry(n, layout);
        for (const p of g.points) {
          expect(p.x).toBeGreaterThan(40);
          expect(p.x).toBeLessThan(g.width - 40);
          expect(p.y).toBeGreaterThan(40);
          expect(p.y).toBeLessThan(g.height - 40);
        }
      }
    }
  });

  it('长名字拆成两行', () => {
    expect(splitName('蒸发')).toEqual(['蒸发']);
    expect(splitName('毛毛虫破茧')).toEqual(['毛毛虫', '破茧']);
  });
});
