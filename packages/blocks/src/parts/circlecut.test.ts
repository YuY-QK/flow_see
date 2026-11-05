import { describe, expect, it } from 'vitest';
import { circleCutLayout, circleCutPart } from './circlecut';

const base = { at: [400, 200], radius: 100, parts: 16, t: 0 };

describe('切圆拼图', () => {
  it('切得越多，拼出来的一排越接近“长 = 圆周长的一半，宽 = 半径”', () => {
    const half = Math.PI * 100; // 圆周长的一半
    const err = (n: number) => {
      const L = circleCutLayout({ ...base, parts: n });
      return Math.abs(L.stripW - half) / half + Math.abs(L.stripH - 100) / 100;
    };
    expect(err(16)).toBeLessThan(err(8));
    expect(err(32)).toBeLessThan(err(16));
    expect(err(64)).toBeLessThan(0.05);
  });

  it('扇形交错：顶点一上一下，朝向相反，圆里的朝向依次转过一个圆心角', () => {
    const L = circleCutLayout({ ...base, parts: 8 });
    expect(L.sectors).toHaveLength(8);
    expect(L.angle).toBe(45);
    expect(L.sectors[0].stripHeading).toBe(0);
    expect(L.sectors[1].stripHeading).toBe(180);
    expect(L.sectors[0].stripAt[1]).toBeGreaterThan(L.sectors[1].stripAt[1]);
    expect(L.sectors[3].circleHeading - L.sectors[2].circleHeading).toBe(45);
  });

  it('份数写成奇数时按大一个的偶数算，1 是整圆', () => {
    expect(circleCutLayout({ ...base, parts: 7 }).n).toBe(8);
    expect(circleCutLayout({ ...base, parts: 1 }).n).toBe(1);
  });

  it('包围盒随 t 从圆变成一排：变宽、变矮', () => {
    const a = circleCutPart.bbox({ ...base, t: 0 });
    const b = circleCutPart.bbox({ ...base, t: 1 });
    expect(b.w).toBeGreaterThan(a.w);
    expect(b.h).toBeLessThan(a.h);
  });
});
