// fraction 分数模板：把一个整体平均分，取其中几份（需求设计 5.4、第 6 节）。
// 由参数（shape、parts、take）和每一步的 show 生成一个场景，画面、时间轴、导出都复用场景模板。
import { createAnimation, createStep, styleConfig, t, type Animation } from '@flow-see/core';
import type { Template } from '@flow-see/runtime/template.ts';
import { checkFraction } from './check';
import type { SceneDef } from '../../scene/evaluate';
import { stepMotionMs } from '../../scene/evaluate';
import { triesOf } from '../../scene/scene';
import { makeSceneStage } from '../../scene/stage';

import { FRACTION_SHAPES, type FractionShow } from './shows';

export { FRACTION_SHAPES, FRACTION_SHOWS, type FractionShow } from './shows';

type Point = [number, number];
/** style.yaml 的 templates.fraction */
export interface FractionLayout {
  stage: { width: number; height: number };
  shapeAt: Point;
  radius: number;
  bar: { width: number; height: number };
  color: string;
  caption: { at: Point; size: number };
  fraction: { at: Point; size: number };
}

export function fractionLayout(): FractionLayout {
  return styleConfig().templates.fraction as FractionLayout;
}

export interface FractionParams {
  shape: (typeof FRACTION_SHAPES)[number];
  parts: number;
  take: number;
}

/** 参数整理：份数至少 1，取的份数在 0 到份数之间 */
export function fractionParams(raw: Record<string, unknown> | undefined): FractionParams {
  const shape = raw?.shape === 'bar' ? 'bar' : 'circle';
  const parts = Math.max(1, Math.round(Number(raw?.parts) || 1));
  const take = Math.max(0, Math.min(parts, Math.round(Number(raw?.take) || 0)));
  return { shape, parts, take };
}

/** 一种画面状态对应的动作（每个状态都把所有零件设到位，所以步骤顺序可以随意） */
function actionsFor(show: string | undefined, p: FractionParams): Record<string, unknown>[] {
  const caption = (text: string) => [
    { set: { target: 'caption', text, together: true } },
    { show: { target: 'caption', together: true } },
  ];
  switch (show as FractionShow | undefined) {
    case 'whole':
      return [
        { set: { target: 'shape', parts: 1, duration: 0 } },
        { set: { target: 'shape', take: 1 } },
        { hide: { target: ['caption', 'fraction'], together: true } },
      ];
    case 'split':
      return [
        { set: { target: 'shape', take: 0 } },
        { set: { target: 'shape', parts: p.parts, duration: 0 } },
        ...caption(t('fractionTemplate.split', { parts: p.parts })),
        { hide: { target: 'fraction', together: true } },
        { highlight: 'shape' },
      ];
    case 'take-one':
    case 'take-many': {
      const n = show === 'take-one' ? 1 : p.take;
      return [
        { set: { target: 'shape', parts: p.parts, duration: 0 } },
        { set: { target: 'shape', take: n } },
        ...caption(t('fractionTemplate.take', { take: n })),
        { set: { target: 'fraction', num: n, den: p.parts, duration: 0 } },
        { show: 'fraction' },
        { highlight: 'fraction' },
      ];
    }
    default:
      return [];
  }
}

/** 由参数和每一步的 show 生成场景 */
export function fractionScene(animation: Animation): SceneDef {
  const L = fractionLayout();
  const p = fractionParams(animation.params);
  const cfg = animation.config as { stage?: SceneDef['stage'] } | undefined;
  const shape =
    p.shape === 'bar'
      ? { type: 'fraction-bar', width: L.bar.width, height: L.bar.height }
      : { type: 'fraction-circle', radius: L.radius };
  return {
    stage: cfg?.stage ?? L.stage,
    objects: [
      { id: 'shape', ...shape, at: L.shapeAt, parts: 1, take: 0, color: L.color },
      {
        id: 'caption',
        type: 'text',
        text: '',
        at: L.caption.at,
        size: L.caption.size,
        hidden: true,
      },
      {
        id: 'fraction',
        type: 'fraction',
        num: 1,
        den: p.parts,
        at: L.fraction.at,
        size: L.fraction.size,
        hidden: true,
      },
    ],
    steps: animation.steps.map((s) => actionsFor(s.data.show as string | undefined, p)),
    tries: triesOf(animation),
  };
}

const cache = new WeakMap<Animation, SceneDef>();
const sceneOf = (a: Animation) => {
  let d = cache.get(a);
  if (!d) cache.set(a, (d = fractionScene(a)));
  return d;
};

export const fractionTemplate: Template = {
  id: 'fraction',
  name: t('fractionTemplate.name'),
  tagline: t('fractionTemplate.tagline'),
  elementNoun: '',
  minElements: 0,
  maxElements: 0,
  stepFields: [],
  // 知识点用的模板，不在创作的选模板页出现；从网址打开时给一个能播放的示例
  createBlank() {
    return fractionTemplate.createDefault();
  },
  createDefault() {
    const step = (show: FractionShow, desc: string) =>
      createStep({ title: '', desc, data: { show } });
    return createAnimation({
      templateId: 'fraction',
      title: t('fractionTemplate.sample_title'),
      params: { shape: 'circle', parts: 4, take: 3 },
      steps: [
        step('whole', t('fractionTemplate.sample_whole')),
        step('split', t('fractionTemplate.sample_split')),
        step('take-one', t('fractionTemplate.sample_take_one')),
        step('take-many', t('fractionTemplate.sample_take_many')),
      ],
    });
  },
  newStep: () => ({ data: { show: 'take-many' } }),
  Stage: makeSceneStage(sceneOf),
  motionMs: (animation, index, phase) => stepMotionMs(sceneOf(animation), index, phase),
  checkConfig: checkFraction,
};
