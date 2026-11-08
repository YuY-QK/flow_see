import { describe, expect, it } from 'vitest';
import { arcLayout, arcPart, arcPoint } from './arc';

const base = { at: [400, 260], radius: 100, start: 0, end: 90, width: 4, draw: 1 };

describe('圆弧', () => {
  it('角度从正上方起顺时针：0 度在上，90 度在右，180 度在下', () => {
    const [x0, y0] = arcPoint(0, 0, 10, 0);
    const [x1, y1] = arcPoint(0, 0, 10, 90);
    const [x2, y2] = arcPoint(0, 0, 10, 180);
    expect([x0, y0]).toEqual([0, -10]);
    expect(x1).toBeCloseTo(10, 6);
    expect(y1).toBeCloseTo(0, 6);
    expect(x2).toBeCloseTo(0, 6);
    expect(y2).toBeCloseTo(10, 6);
  });

  it('draw 控制画出多少：0 不画箭头，0.5 画到一半，1 画满', () => {
    expect(arcLayout({ ...base, draw: 0 }).hasHead).toBe(false);
    expect(arcLayout({ ...base, draw: 0.5 }).tip).toBeCloseTo(45, 6);
    expect(arcLayout(base).tip).toBeCloseTo(90, 6);
  });

  it('弧线在箭头处收短，箭头尖落在终点；arrow: false 不画箭头', () => {
    const L = arcLayout(base);
    expect(L.lineEnd).toBeLessThan(L.tip);
    expect(arcLayout({ ...base, arrow: false }).hasHead).toBe(false);
  });

  it('跨度超过半圈时用大弧标记', () => {
    expect(arcLayout({ ...base, end: 270 }).large).toBe(1);
    expect(arcLayout(base).large).toBe(0);
  });

  it('包围盒包住整段弧（含经过的上下左右极点）', () => {
    const b = arcPart.bbox({ ...base, start: -30, end: 120 });
    expect(b.y).toBeLessThanOrEqual(260 - 100);
    expect(b.x + b.w).toBeGreaterThanOrEqual(400 + 100);
  });
});
