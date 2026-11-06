import { describe, expect, it } from 'vitest';
import { sceneStyle } from '@flow-see/blocks';
import { contentBox, fitBox, objectBox } from './box';
import type { SceneDef } from './evaluate';

const def: SceneDef = {
  stage: { width: 800, height: 450 },
  objects: [
    { id: 'a', type: 'counters', count: 3, at: [100, 100], size: 40 },
    { id: 'b', type: 'text', text: '9', at: [600, 300], size: 40, hidden: true },
  ],
  // 第 2 步才让 b 出现；第 3 步把 a 移走
  steps: [[{ highlight: 'a' }], [{ show: 'b' }], [{ move: { target: 'a', to: [200, 120] } }]],
};

describe('contentBox：所有步骤里所有零件包围盒的并集', () => {
  it('后来才出现的零件、移动前后的位置都在并集里', () => {
    const c = contentBox(def)!;
    // a 一开始在 (100,100)，高亮时外扩 padX / padY
    const { padX, padY } = sceneStyle().highlight;
    expect(c.x).toBeLessThanOrEqual(100 - padX);
    expect(c.y).toBeLessThanOrEqual(100 - padY);
    // b 在第 2 步出现，在 (600, 300) 附近
    expect(c.x + c.w).toBeGreaterThan(600);
    expect(c.y + c.h).toBeGreaterThan(300);
  });
  it('结果缓存：同一个场景只算一次', () => {
    expect(contentBox(def)).toBe(contentBox(def));
  });
  it('没有可见零件时返回 undefined', () => {
    expect(contentBox({ stage: def.stage, objects: [], steps: [[]] })).toBeUndefined();
  });
  it('旋转后取外接矩形', () => {
    const props = { shape: 'rect', width: 100, height: 20, at: [0, 0], opacity: 1 };
    const flat = objectBox({ id: 'x', type: 'shape', props })!;
    const turned = objectBox({ id: 'x', type: 'shape', props: { ...props, rotate: 90 } })!;
    expect(turned.w).toBeCloseTo(flat.h);
    expect(turned.h).toBeCloseTo(flat.w);
  });
});

describe('fitBox：手机上的画面范围', () => {
  it('在内容外加边距；宽高比不低于 minRatio；关掉 fit.phone 时不贴合', () => {
    const { margin, minRatio } = sceneStyle().fit;
    const c = contentBox(def)!;
    const f = fitBox(def)!;
    expect(f.w / f.h).toBeGreaterThanOrEqual(minRatio - 1e-9);
    expect(f.x).toBeLessThanOrEqual(c.x - margin + 1e-9);
    expect(f.y).toBeCloseTo(c.y - margin);
    const style = sceneStyle();
    const saved = style.fit.phone;
    style.fit.phone = false;
    try {
      expect(fitBox({ ...def, steps: [...def.steps] })).toBeUndefined();
    } finally {
      style.fit.phone = saved;
    }
  });
  it('内容又高又窄时左右补空，宽高比补到 minRatio', () => {
    const tall: SceneDef = {
      stage: { width: 800, height: 450 },
      objects: [{ id: 'l', type: 'line', from: [400, 0], to: [400, 440], width: 4 }],
      steps: [[]],
    };
    const f = fitBox(tall)!;
    expect(f.w / f.h).toBeCloseTo(sceneStyle().fit.minRatio);
  });
});
