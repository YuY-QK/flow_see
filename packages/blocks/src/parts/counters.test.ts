import { describe, expect, it } from 'vitest';
import { countersPart, plateBox } from './counters';

const plate = { at: [100, 100], layout: 'grid', cols: 3, size: 44, capacity: 6, count: 0 };

describe('点阵盘子', () => {
  it('点阵写了 capacity 才画盘子，大小按容量和每行个数算', () => {
    const b = plateBox(plate)!;
    expect(b.w).toBeGreaterThan(3 * 44);
    expect(b.h).toBeGreaterThan(2 * 44);
    expect(b.h).toBeLessThan(3 * 44);
    expect(plateBox({ ...plate, capacity: 0 })).toBeUndefined();
    expect(plateBox({ ...plate, layout: 'row' })).toBeUndefined();
  });

  it('一个都没放时，包围盒也是整个盘子（拖动时放到盘子上就算）', () => {
    const b = countersPart.bbox(plate);
    expect(b).toEqual(plateBox(plate));
  });

  it('容量不足一行时，盘子只有这么宽', () => {
    expect(plateBox({ ...plate, capacity: 2 })!.w).toBeLessThan(plateBox(plate)!.w);
  });
});
