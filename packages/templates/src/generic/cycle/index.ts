import { createAnimation, createElement, createStep, t } from '@flow-see/core';
import type { Template } from '@flow-see/runtime/template.ts';
import { CycleStage } from './CycleStage';

export const cycleTemplate: Template = {
  id: 'cycle',
  name: t('common.xun_huan_shi_jian'),
  tagline: t('common.an_shi_jian_huo'),
  elementNoun: t('cycle.jie_duan'),
  minElements: 1,
  maxElements: 10,
  stepFields: [{ key: 'stage', label: t('cycle.zhe_yi_bu_dao'), kind: 'element' }],
  paramTitle: t('cycle.bu_ju'),
  paramFields: [
    {
      key: 'layout',
      label: t('cycle.jie_duan_zen_me'),
      kind: 'select',
      options: [
        { value: 'cycle', label: t('cycle.rao_cheng_yi_quan') },
        { value: 'timeline', label: t('cycle.pai_cheng_yi_hang') },
      ],
    },
  ],

  createBlank() {
    const els = [t('cycle.jie_duan_2'), t('cycle.jie_duan_3'), t('cycle.jie_duan_4')].map(
      createElement,
    );
    return createAnimation({
      templateId: 'cycle',
      title: t('common.wei_ming_ming_dong'),
      params: { layout: 'cycle' },
      elements: els,
      steps: [createStep({ title: t('cycle.jie_duan_2'), desc: '', data: { stage: els[0].id } })],
    });
  },

  createDefault() {
    const [evap, cond, rain, flow] = [
      t('cycle.zheng_fa'),
      t('cycle.ning_jie'),
      t('cycle.jiang_shui'),
      t('cycle.hui_ji'),
    ].map(createElement);
    const step = (title: string, desc: string, stage: string) =>
      createStep({ title, desc, data: { stage } });
    return createAnimation({
      templateId: 'cycle',
      title: t('common.shui_de_xun_huan'),
      params: { layout: 'cycle' },
      elements: [evap, cond, rain, flow],
      steps: [
        step(t('cycle.zheng_fa'), t('cycle.tai_yang_jia_re'), evap.id),
        step(t('cycle.ning_jie'), t('cycle.shui_zheng_qi_yu'), cond.id),
        step(t('cycle.jiang_shui'), t('cycle.xiao_shui_di_yue'), rain.id),
        step(t('cycle.hui_ji'), t('cycle.yu_shui_liu_jin'), flow.id),
        step(t('cycle.zai_ci_zheng_fa'), t('cycle.shui_you_bei_tai'), evap.id),
      ],
    });
  },

  newStep(animation, prev) {
    const els = animation.elements;
    const i = els.findIndex((e) => e.id === prev?.data.stage);
    const next = els[(i + 1) % Math.max(els.length, 1)];
    return { title: next?.name ?? t('common.xin_de_yi_bu'), desc: '', data: { stage: next?.id } };
  },

  Stage: CycleStage,
};
