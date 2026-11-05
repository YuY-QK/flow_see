import type { Animation } from '@flow-see/core';
import type { TrySpec } from '@flow-see/runtime/template.ts';
import { sceneStyle } from '@flow-see/blocks';
import type { SceneDef } from './evaluate';
import { expandActions, expandObjects } from './repeat';

/** 每一步的动手做（step.data.try）；没有的为 undefined。由参数生成场景的模板（分数、钟表）也用它 */
export function triesOf(animation: Animation): (TrySpec | undefined)[] {
  return animation.steps.map((s) =>
    s.data.try && typeof s.data.try === 'object' ? (s.data.try as TrySpec) : undefined,
  );
}

const cache = new WeakMap<Animation, SceneDef>();

/** 从作品里取出场景定义：舞台和零件在 animation.config，每步的动作在 step.data.do */
export function sceneOf(animation: Animation): SceneDef {
  let def = cache.get(animation);
  if (def) return def;
  const scope = animation.params ?? {};
  const cfg = (animation.config ?? {}) as { stage?: SceneDef['stage']; objects?: unknown };
  def = {
    stage: cfg.stage ?? sceneStyle().stage,
    objects: expandObjects(Array.isArray(cfg.objects) ? cfg.objects : [], scope),
    steps: animation.steps.map((s) => expandActions(Array.isArray(s.data.do) ? s.data.do : [], scope)),
    tries: triesOf(animation),
  };
  cache.set(animation, def);
  return def;
}
