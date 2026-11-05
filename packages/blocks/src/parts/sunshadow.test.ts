import { describe, expect, it } from 'vitest';
import { sunShadowLayout, sunShadowPart, sunShadowState } from './sunshadow';

const base = {
  at: [400, 200],
  latitude: 35,
  declination: 0,
  radius: 120,
  pole: 56,
  unit: 26,
  sideWidth: 380,
};
const at = (time: string) => sunShadowState({ ...base, time });

describe('光与影', () => {
  it('中午太阳最高、影子最短，影子指向北（俯视图的上方）', () => {
    const noon = at('12:00');
    expect(noon.altitude).toBeGreaterThan(at('10:00').altitude);
    expect(noon.altitude).toBeGreaterThan(at('15:00').altitude);
    expect(noon.top.len).toBeLessThan(at('10:00').top.len);
    expect(noon.top.len).toBeLessThan(at('15:00').top.len);
    expect(Math.abs(noon.top.dir[0])).toBeLessThan(1e-9);
    expect(noon.top.dir[1]).toBeLessThan(0);
  });

  it('上午太阳在东边，影子向西（俯视图的左边）；下午相反', () => {
    expect(at('8:00').azimuth).toBeLessThan(0);
    expect(at('8:00').top.dir[0]).toBeLessThan(0);
    expect(at('16:00').azimuth).toBeGreaterThan(0);
    expect(at('16:00').top.dir[0]).toBeGreaterThan(0);
  });

  it('春秋分，上下午对称的两个时刻，太阳高度和影长一样', () => {
    const a = at('9:00');
    const b = at('15:00');
    expect(a.altitude).toBeCloseTo(b.altitude, 6);
    expect(a.ratio).toBeCloseTo(b.ratio, 6);
  });

  it('早晚影子很长，但不会超出画面', () => {
    const L = sunShadowLayout(base);
    const early = at('7:00');
    expect(early.ratio).toBeGreaterThan(3);
    expect(early.top.len).toBeLessThanOrEqual(L.radius);
    expect(L.poleX + early.sideLen).toBeLessThanOrEqual(L.sideX0 + L.sideWidth);
    // 太阳落山时高度也不会变成 0（影子不会无限长）
    expect(Number.isFinite(at('18:00').ratio)).toBe(true);
  });

  it('侧视图的影长 = 杆高 × 影长比，时间用分钟数也行', () => {
    const s = sunShadowState({ ...base, time: 12 * 60 });
    expect(s.sideLen).toBeCloseTo(56 * s.ratio, 6);
  });

  it('包围盒在 at 的中心', () => {
    const b = sunShadowPart.bbox(base);
    expect(b.x + b.w / 2).toBeCloseTo(400, 6);
    expect(b.y + b.h / 2).toBeCloseTo(200, 6);
  });
});
