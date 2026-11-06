import { describe, expect, it } from 'vitest';
import { thermometerFill, thermometerLayout, thermometerMix, thermometerPart } from './thermometer';

const base = {
  at: [100, 200],
  value: 20,
  min: -20,
  max: 110,
  height: 240,
  width: 22,
  coldAt: 0,
  hotAt: 100,
};

describe('温度计', () => {
  it('液柱高度跟着温度：最低为空，最高为满，连续变化', () => {
    expect(thermometerFill({ ...base, value: -20 })).toBe(0);
    expect(thermometerFill({ ...base, value: 110 })).toBe(1);
    expect(thermometerFill({ ...base, value: 200 })).toBe(1);
    const a = thermometerFill({ ...base, value: 30 });
    const b = thermometerFill({ ...base, value: 50 });
    expect(b).toBeGreaterThan(a);
  });

  it('颜色：0 ℃ 及以下全是冷色，100 ℃ 及以上全是热色，中间渐变', () => {
    expect(thermometerMix({ ...base, value: -10 })).toBe(0);
    expect(thermometerMix({ ...base, value: 0 })).toBe(0);
    expect(thermometerMix({ ...base, value: 50 })).toBeCloseTo(0.5, 6);
    expect(thermometerMix({ ...base, value: 100 })).toBe(1);
  });

  it('包围盒包住管子和球泡，at 是整支的中心', () => {
    const L = thermometerLayout(base);
    const b = thermometerPart.bbox(base);
    expect(b.y + b.h / 2).toBeCloseTo(200, 0);
    expect(L.top).toBeLessThan(L.bottom);
    expect(b.x).toBeLessThan(100);
  });

  it('写温度数字时包围盒更高', () => {
    expect(thermometerPart.bbox({ ...base, showValue: true }).h).toBeGreaterThan(
      thermometerPart.bbox(base).h,
    );
  });
});
