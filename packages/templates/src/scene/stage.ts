import { createElement } from 'react';
import type { Animation } from '@flow-see/core';
import type { StageProps } from '@flow-see/runtime/template.ts';
import type { SceneDef } from './evaluate';
import { sceneOf } from './scene';
import { SceneView } from './SceneView';

/**
 * 用“作品 → 场景”的函数做一个舞台组件。场景模板直接读配置里的零件和动作；
 * fraction、clock 等模板由参数生成场景，画面和时间轴都复用 SceneView。
 */
export function makeSceneStage(resolve: (animation: Animation) => SceneDef) {
  return function Stage(props: StageProps) {
    return createElement(SceneView, { ...props, def: resolve(props.animation) });
  };
}

/** 场景模板的舞台 */
export const SceneStage = makeSceneStage(sceneOf);
