import { describe, expect, it } from 'vitest';
import {
  batteryPart,
  bulbPart,
  switchPart,
  wireBreaks,
  wireDots,
  wireDrawn,
  wirePart,
  wirePath,
  wireProject,
} from './circuit';

const loop = {
  points: [
    [200, 255],
    [200, 310],
    [600, 310],
    [600, 110],
    [200, 110],
    [200, 165],
  ],
  spacing: 40,
  speed: 100,
};

describe('电路零件', () => {
  it('导线：路程是各段长度之和，点投影到路径上得到离起点的路程', () => {
    const w = wirePath(loop);
    expect(w.total).toBe(55 + 400 + 200 + 400 + 55);
    expect(wireProject(w, [200, 310])).toBe(55);
    expect(wireProject(w, [400, 310])).toBe(255);
    expect(wireProject(w, [600, 200])).toBe(55 + 400 + 110);
  });

  it('breaks 里的路段不画，其余照画', () => {
    const w = wirePath(loop);
    const breaks = wireBreaks(
      {
        ...loop,
        breaks: [
          [
            [355, 310],
            [445, 310],
          ],
        ],
      },
      w,
    );
    expect(breaks).toEqual([[210, 300]]);
    expect(wireDrawn(w.total, breaks)).toEqual([
      [0, 210],
      [300, w.total],
    ]);
    expect(wireDrawn(w.total, [])).toEqual([[0, w.total]]);
  });

  it('电流的小圆点随 t 匀速前进，落在缺口里的不画', () => {
    const w = wirePath(loop);
    const breaks = wireBreaks(
      {
        ...loop,
        breaks: [
          [
            [355, 310],
            [445, 310],
          ],
        ],
      },
      w,
    );
    const a = wireDots({ ...loop, t: 0 }, w, breaks);
    const b = wireDots({ ...loop, t: 0.2 }, w, breaks);
    // 0.2 秒 × 100 像素/秒 = 20 像素，每个点往前走 20
    expect(b[1] - a[1]).toBeCloseTo(20, 6);
    expect(a.every((d) => !(d > 210 && d < 300))).toBe(true);
    // 走满一个间距（0.4 秒）又回到原来的位置
    expect(wireDots({ ...loop, t: 0.4 }, w, breaks)).toEqual(a);
  });

  it('零件的包围盒包住画出来的部分', () => {
    expect(batteryPart.bbox({ at: [100, 100] }).w).toBeGreaterThanOrEqual(90);
    expect(bulbPart.bbox({ at: [100, 100], radius: 26, lead: 18 }).w).toBeGreaterThanOrEqual(88);
    expect(switchPart.bbox({ at: [100, 100], width: 90 }).w).toBeGreaterThanOrEqual(90);
    const b = wirePart.bbox(loop);
    expect(b.x).toBeLessThan(200);
    expect(b.x + b.w).toBeGreaterThan(600);
  });
});
