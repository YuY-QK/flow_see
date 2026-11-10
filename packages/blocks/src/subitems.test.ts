import { describe, expect, it } from 'vitest';
import { clockPart, findSubitem, gridPart, textPart } from './index';

describe('Part subitems and handles', () => {
  it('grid subitems: finds specific cell and matches wildcard rows', () => {
    const props = { at: [100, 100], rows: 4, cols: 5, cell: 30 };
    // findSubitem(grid, props, 'cell.2.3')
    const cell = findSubitem(gridPart, props, 'cell.2.3');
    expect(cell).toBeDefined();
    expect(Array.isArray(cell)).toBe(false);
    expect(cell).toEqual({
      name: 'cell.2.3',
      box: { x: 160, y: 130, w: 30, h: 30 },
    });

    const rows = findSubitem(gridPart, props, 'row.*');
    expect(Array.isArray(rows)).toBe(true);
    expect(rows).toHaveLength(4);
    expect(rows?.map((r) => r.name)).toEqual(['row.1', 'row.2', 'row.3', 'row.4']);
    expect(rows?.[0].box).toEqual({ x: 100, y: 100, w: 150, h: 30 });
    expect(rows?.[1].box).toEqual({ x: 100, y: 130, w: 150, h: 30 });

    const cols = findSubitem(gridPart, props, 'col.*');
    expect(Array.isArray(cols)).toBe(true);
    expect(cols).toHaveLength(5);
    expect(cols?.[0].box).toEqual({ x: 100, y: 100, w: 30, h: 120 });
  });

  it('clock handles: handle position at 3:00 and valueAt 3 o clock direction gives 3:15 (195 min)', () => {
    // clock.handles() at 3:00 minute hand end at 12 o'clock; pointer at 3 o'clock => 3:15 (195 min)
    const props = { at: [200, 200], radius: 100, time: '3:00' };
    const handles = clockPart.handles?.(props);
    expect(handles).toBeDefined();
    expect(handles).toHaveLength(2);
    const h = handles![0];
    expect(h.prop).toBe('time');
    expect(h.kind).toBe('rotate');
    expect(h.center).toEqual([200, 200]);

    // Minute hand end at 12 o'clock: x = 200, y = 200 - 100 * 0.78 = 122
    expect(h.at[0]).toBeCloseTo(200);
    expect(h.at[1]).toBeCloseTo(122);

    // Pointer placed at 3 o'clock direction (e.g. dx = 100, dy = 0)
    const val = h.valueAt([300, 200]);
    expect(val).toBe(195);
  });

  it('returns undefined without error for parts without subitems', () => {
    // parts that do not implement subitems
    const sub = findSubitem(textPart, { at: [0, 0], text: 'hello' }, 'cell.2.3');
    expect(sub).toBeUndefined();

    const wildcard = findSubitem(textPart, { at: [0, 0], text: 'hello' }, 'row.*');
    expect(wildcard).toBeUndefined();
  });
});
