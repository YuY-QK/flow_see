// 场景模板 scene：在配置里摆好零件，再写每一步对零件做什么（需求设计 5.5）。不写代码。
import { createAnimation, createStep } from '@flow-see/core';
import type { Template } from '@flow-see/runtime/template.ts';
import { checkScene } from './check';
import { stepMotionMs } from './evaluate';
import { sceneOf } from './scene';
import { SceneStage } from './SceneStage';

export { VERBS, parseDuration, planStep } from './actions';
export { checkScene } from './check';
export { sceneFrame, stepMotionMs, type SceneDef } from './evaluate';
export { sceneOf } from './scene';

export const sceneTemplate: Template = {
  id: 'scene',
  name: '场景',
  tagline: '摆好零件，写每一步的动作',
  elementNoun: '零件',
  minElements: 0,
  maxElements: 0,
  stepFields: [],

  createBlank() {
    return createAnimation({
      templateId: 'scene',
      title: '未命名场景',
      config: { stage: { width: 800, height: 450 }, objects: [] },
      steps: [createStep({ title: '', desc: '', data: { do: [] } })],
    });
  },

  createDefault() {
    return createAnimation({
      templateId: 'scene',
      title: '数一数',
      config: {
        stage: { width: 800, height: 450 },
        objects: [
          { id: 'dots', type: 'counters', count: 3, at: [334, 180], hidden: true },
          { id: 'label', type: 'text', text: '3', at: [400, 330], size: 48, hidden: true },
        ],
      },
      steps: [
        createStep({ title: '', desc: '这里有几个圆片？', data: { do: [{ show: 'dots' }] } }),
        createStep({ title: '', desc: '一共 3 个。', data: { do: [{ show: 'label' }] } }),
      ],
    });
  },

  newStep() {
    return { title: '', desc: '', data: { do: [] } };
  },

  Stage: SceneStage,

  motionMs(animation, index) {
    return stepMotionMs(sceneOf(animation), index);
  },

  checkConfig: checkScene,
};
