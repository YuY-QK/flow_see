import { describe, expect, it } from 'vitest';
import { allParts, registerPart, unregisterPart, type PartDef } from './index';

describe('allParts()', () => {
  it('returns all registered parts with default properties', () => {
    const list = allParts();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(25);

    const types = list.map((p) => p.type);
    expect(types).toContain('clock');
    expect(types).toContain('grid');
    expect(types).toContain('text');
    expect(types).toContain('counters');

    const clock = list.find((p) => p.type === 'clock');
    expect(clock).toBeDefined();
    expect(clock?.name).toBe('钟面');
    expect(clock?.anchor).toBe('center');
    expect(clock?.props).toContain('time');
    expect(clock?.defaults).toBeDefined();
    expect(typeof clock?.defaults.radius).toBe('number');

    const grid = list.find((p) => p.type === 'grid');
    expect(grid).toBeDefined();
    expect(grid?.anchor).toBe('start');
    expect(grid?.subitems).toBeDefined();
  });

  it('updates dynamically when parts are registered and unregistered', () => {
    const customPart: PartDef = {
      type: 'test-custom-part',
      name: '测试零件',
      anchor: 'center',
      props: ['foo'],
      bbox: () => ({ x: 0, y: 0, w: 10, h: 10 }),
      Render: () => null,
    };

    registerPart(customPart);
    expect(allParts().some((p) => p.type === 'test-custom-part')).toBe(true);

    unregisterPart('test-custom-part');
    expect(allParts().some((p) => p.type === 'test-custom-part')).toBe(false);
  });
});
