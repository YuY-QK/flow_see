import { createAnimation, createElement, createStep } from '@/engine';
import type { Template } from '../types';
import { CycleStage } from './CycleStage';

export const cycleTemplate: Template = {
  id: 'cycle',
  name: '循环 / 时间线',
  tagline: '按时间或绕圈推进',
  elementNoun: '阶段',
  minElements: 1,
  maxElements: 10,
  stepFields: [{ key: 'stage', label: '这一步到了哪个阶段', kind: 'element' }],
  paramTitle: '布局',
  paramFields: [
    {
      key: 'layout',
      label: '阶段怎么排',
      kind: 'select',
      options: [
        { value: 'cycle', label: '绕成一圈（循环）' },
        { value: 'timeline', label: '排成一行（时间线）' },
      ],
    },
  ],

  createBlank() {
    const els = ['阶段 1', '阶段 2', '阶段 3'].map(createElement);
    return createAnimation({
      templateId: 'cycle',
      title: '未命名动画',
      params: { layout: 'cycle' },
      elements: els,
      steps: [createStep({ title: '阶段 1', desc: '', data: { stage: els[0].id } })],
    });
  },

  createDefault() {
    const [evap, cond, rain, flow] = ['蒸发', '凝结', '降水', '汇集'].map(createElement);
    const step = (title: string, desc: string, stage: string) =>
      createStep({ title, desc, data: { stage } });
    return createAnimation({
      templateId: 'cycle',
      title: '水的循环',
      params: { layout: 'cycle' },
      elements: [evap, cond, rain, flow],
      steps: [
        step('蒸发', '太阳加热，海洋和湖泊里的水变成水蒸气升上天空。', evap.id),
        step('凝结', '水蒸气遇冷，凝结成小水滴，聚在一起形成云。', cond.id),
        step('降水', '小水滴越聚越大，落下来变成雨或雪。', rain.id),
        step('汇集', '雨水流进江河湖海，或者渗入地下。', flow.id),
        step('再次蒸发', '水又被太阳加热，开始新的一轮循环。', evap.id),
      ],
    });
  },

  newStep(animation, prev) {
    const els = animation.elements;
    const i = els.findIndex((e) => e.id === prev?.data.stage);
    const next = els[(i + 1) % Math.max(els.length, 1)];
    return { title: next?.name ?? '新的一步', desc: '', data: { stage: next?.id } };
  },

  Stage: CycleStage,
};
