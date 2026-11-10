import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { allParts, getPart } from '@flow-see/blocks';
import { DevPartsPage } from './DevPartsPage';

describe('DevPartsPage', () => {
  it('renders parts list with all registered parts', () => {
    const html = renderToStaticMarkup(createElement(DevPartsPage));
    const parts = allParts();

    // Check that all parts are listed in the HTML
    for (const p of parts) {
      expect(html).toContain(p.type);
      expect(html).toContain(p.name);
    }
  });

  it('renders 800x450 stage with theme options', () => {
    const html = renderToStaticMarkup(createElement(DevPartsPage));

    expect(html).toContain('viewBox="0 0 800 450"');
    expect(html).toContain('800 × 450');

    // Theme buttons
    expect(html).toContain('可爱');
    expect(html).toContain('扁平');
    expect(html).toContain('黑板');
    expect(html).toContain('专业');
  });

  it('renders bounding box and handles for clock part', () => {
    const html = renderToStaticMarkup(createElement(DevPartsPage));

    // By default clock is selected (or when clock is rendered)
    expect(html).toContain('data-bbox="true"');
    expect(html).toContain('data-handle-prop="time"');
  });

  it('clock part handles calculate angle and time value correctly', () => {
    const clock = getPart('clock');
    expect(clock).toBeDefined();
    expect(clock?.handles).toBeDefined();

    const handles = clock!.handles!({ at: [400, 225], radius: 130, time: 180 });
    expect(handles).toHaveLength(2);
    expect(handles[0].prop).toBe('time');
    expect(handles[0].min).toBe(0);
    expect(handles[0].max).toBe(720);

    // At 3:00 (180 mins), minute hand is at 12 o'clock: y is 225 - 130 * 0.78 = 123.6
    expect(handles[0].at[0]).toBeCloseTo(400);
    expect(handles[0].at[1]).toBeCloseTo(123.6);

    // Moving pointer to 3 o'clock (x=500, y=225) -> minute 15 -> 180 + 15 = 195
    const newVal = handles[0].valueAt([500, 225]);
    expect(newVal).toBe(195);
  });

  it('grid part subitems produce rows, cols, and cells', () => {
    const grid = getPart('grid');
    expect(grid).toBeDefined();
    expect(grid?.subitems).toBeDefined();

    const subitems = grid!.subitems!({ at: [100, 80], rows: 3, cols: 4, cell: 44 });
    const names = subitems.map((s) => s.name);

    expect(names).toContain('row.1');
    expect(names).toContain('row.3');
    expect(names).toContain('col.1');
    expect(names).toContain('col.4');
    expect(names).toContain('cell.1.1');
    expect(names).toContain('cell.3.4');
  });
});
