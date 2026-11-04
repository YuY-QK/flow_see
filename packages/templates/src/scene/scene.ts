import type { Animation } from '@flow-see/core';
import type { TrySpec } from '@flow-see/runtime/template.ts';
import { sceneStyle } from '@flow-see/blocks';
import type { SceneDef } from './evaluate';

const cache = new WeakMap<Animation, SceneDef>();

/** 从作品里取出场景定义：舞台和零件在 animation.config，每步的动作在 step.data.do */
export function sceneOf(animation: Animation): SceneDef {
  let def = cache.get(animation);
  if (def) return def;
  const cfg = (animation.config ?? {}) as { stage?: SceneDef['stage']; objects?: unknown };
  def = {
    stage: cfg.stage ?? sceneStyle().stage,
    objects: Array.isArray(cfg.objects) ? cfg.objects : [],
    steps: animation.steps.map((s) => (Array.isArray(s.data.do) ? s.data.do : [])),
    tries: animation.steps.map((s) =>
      s.data.try && typeof s.data.try === 'object' ? (s.data.try as TrySpec) : undefined,
    ),
  };
  cache.set(animation, def);
  return def;
}
