// 场景模板 scene：在配置里摆好零件，再写每一步对零件做什么（需求设计 5.5）。不写代码。
import { sceneStyle } from '@flow-see/blocks';
import { createAnimation, createStep, t } from '@flow-see/core';
import type { Template } from '@flow-see/runtime/template.ts';
import { checkScene } from './check';
import { sceneViewBox } from './box';
import { stepMotionMs } from './evaluate';
import { sceneOf } from './scene';
import { SceneStage } from './stage';

export { VERBS, parseDuration, planStep } from './actions';
export { checkScene } from './check';
export { contentBox, fitBox, objectBox, sceneViewBox } from './box';
export {
  coveredActions,
  dragFrame,
  initialObject,
  sortFrame,
  sceneFrame,
  stepMotionMs,
  type DragFrame,
  type SceneDef,
  type SceneObject,
  type SortFrame,
  type SortItemInfo,
} from './evaluate';
export { sceneOf, triesOf } from './scene';
export { makeSceneStage } from './stage';

export const sceneTemplate: Template = {
  id: 'scene',
  name: t('scene.chang_jing'),
  tagline: t('scene.bai_hao_ling_jian'),
  elementNoun: t('scene.ling_jian'),
  minElements: 0,
  maxElements: 0,
  stepFields: [],

  createBlank() {
    return createAnimation({
      templateId: 'scene',
      title: t('scene.wei_ming_ming_chang'),
      config: { stage: sceneStyle().stage, objects: [] },
      steps: [createStep({ title: '', desc: '', data: { do: [] } })],
    });
  },

  createDefault() {
    return createAnimation({
      templateId: 'scene',
      title: t('scene.shu_yi_shu'),
      config: {
        stage: sceneStyle().stage,
        objects: [
          { id: 'dots', type: 'counters', count: 3, at: [334, 180], hidden: true },
          { id: 'label', type: 'text', text: '3', at: [400, 330], size: 48, hidden: true },
        ],
      },
      steps: [
        createStep({ title: '', desc: t('scene.zhe_li_you_ji'), data: { do: [{ show: 'dots' }] } }),
        createStep({ title: '', desc: t('scene.yi_gong_ge'), data: { do: [{ show: 'label' }] } }),
      ],
    });
  },

  newStep() {
    return { title: '', desc: '', data: { do: [] } };
  },

  Stage: SceneStage,

  viewBox: sceneViewBox,

  motionMs(animation, index, phase) {
    return stepMotionMs(sceneOf(animation), index, phase);
  },

  checkConfig: checkScene,
};
