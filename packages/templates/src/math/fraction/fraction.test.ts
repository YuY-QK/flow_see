import { describe, expect, it } from 'vitest';
import { createAnimation, createStep } from '@flow-see/core';
import { sceneFrame } from '../../scene/evaluate';
import { checkFraction } from './check';
import { fractionParams, fractionScene, fractionTemplate } from './index';

const anim = (params: Record<string, unknown>, shows: string[]) =>
  createAnimation({
    templateId: 'fraction',
    title: 'x',
    params,
    steps: shows.map((show) => createStep({ title: '', desc: '', data: { show } })),
  });

const frame = (a: ReturnType<typeof anim>, i: number, t = 1) =>
  Object.fromEntries(sceneFrame(fractionScene(a), i, t).objects.map((o) => [o.id, o.props]));

describe('fraction 模板', () => {
  const a = anim({ shape: 'circle', parts: 4, take: 3 }, [
    'whole',
    'split',
    'take-one',
    'take-many',
  ]);

  it('whole：一个整体，不显示说明和分数', () => {
    const f = frame(a, 0);
    expect(f.shape).toMatchObject({ parts: 1, take: 1 });
    expect(f.caption.opacity).toBe(0);
    expect(f.fraction.opacity).toBe(0);
  });

  it('split：平均分成 parts 份，说明里代入份数', () => {
    const f = frame(a, 1);
    expect(f.shape).toMatchObject({ parts: 4, take: 0 });
    expect(f.caption).toMatchObject({ text: '平均分成 4 份', opacity: 1 });
  });

  it('take-one / take-many：涂色份数和分数跟着参数变；涂色是连续变化的', () => {
    expect(frame(a, 2).fraction).toMatchObject({ num: 1, den: 4, opacity: 1 });
    expect(frame(a, 3).shape.take).toBe(3);
    expect(frame(a, 3).fraction).toMatchObject({ num: 3, den: 4 });
    const mid = frame(a, 3, 0.3).shape.take as number;
    expect(mid).toBeGreaterThan(1);
    expect(mid).toBeLessThan(3);
  });

  it('长条：换成分数条零件', () => {
    const f = fractionScene(anim({ shape: 'bar', parts: 6, take: 2 }, ['split']));
    expect(f.objects[0].type).toBe('fraction-bar');
  });

  it('参数整理：份数至少 1，取的份数不超过份数', () => {
    expect(fractionParams({ parts: 0, take: 9 })).toEqual({ shape: 'circle', parts: 1, take: 1 });
  });

  it('每一步都有动画段；示例作品能直接播放', () => {
    for (let i = 0; i < 4; i++) expect(fractionTemplate.motionMs!(a, i)).toBeGreaterThan(0);
    expect(fractionTemplate.createDefault().steps).toHaveLength(4);
  });

  it('配置检查：show 和参数写错时报错', () => {
    const issues = checkFraction({
      params: { shape: 'star', parts: 2.5, take: 9 },
      steps: [{ say: 'x', show: 'half' }],
    });
    expect(issues.map((i) => i.path.join('.'))).toEqual([
      'params.shape',
      'params.parts',
      'params.take',
      'steps.0.show',
    ]);
  });
});
