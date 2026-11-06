import { createAnimation, createElement, createStep, t } from '@flow-see/core';
import type { Template } from '@flow-see/runtime/template.ts';
import { FlowStage } from './FlowStage';

export const flowTemplate: Template = {
  id: 'flow',
  name: t('common.liu_cheng_tu_liu'),
  tagline: t('common.yi_bu_jie_yi'),
  elementNoun: t('flow.jie_dian'),
  elementHint: t('flow.ming_zi_yi_jie'),
  minElements: 1,
  maxElements: 12,
  stepFields: [
    { key: 'node', label: t('flow.zhe_yi_bu_zou'), kind: 'element' },
    {
      key: 'via',
      label: t('flow.cong_shang_yi_bu'),
      kind: 'text',
      placeholder: t('flow.li_ru_tong_yi'),
      advanced: true,
    },
  ],

  createBlank() {
    const start = createElement(t('common.kai_shi'));
    const work = createElement(t('flow.chu_li'));
    const end = createElement(t('flow.jie_shu'));
    return createAnimation({
      templateId: 'flow',
      title: t('common.wei_ming_ming_dong'),
      elements: [start, work, end],
      steps: [createStep({ title: t('common.kai_shi'), desc: '', data: { node: start.id } })],
    });
  },

  createDefault() {
    const [submit, review, back, hr, done] = [
      t('flow.ti_jiao_shen_qing'),
      t('flow.zhu_guan_shen_pi'),
      t('flow.tui_hui_xiu_gai'),
      t('flow.ren_shi_bei_an'),
      t('common.wan_cheng'),
    ].map(createElement);
    const step = (title: string, desc: string, node: string, via = '') =>
      createStep({ title, desc, data: { node, via } });
    return createAnimation({
      templateId: 'flow',
      title: t('common.qing_jia_shen_pi'),
      elements: [submit, review, back, hr, done],
      steps: [
        step(t('flow.ti_jiao_qing_jia'), t('flow.yuan_gong_tian_xie'), submit.id),
        step(t('flow.zhu_guan_shen_pi_2'), t('flow.zhu_guan_cha_kan'), review.id),
        step(t('flow.bu_tong_yi_tui'), t('flow.li_you_bu_chong'), back.id, t('flow.bu_tong_yi')),
        step(
          t('flow.xiu_gai_hou_chong'),
          t('flow.yuan_gong_bu_chong'),
          submit.id,
          t('flow.chong_xin_ti_jiao'),
        ),
        step(t('flow.zhu_guan_zai_ci'), t('flow.zhe_ci_li_you'), review.id),
        step(t('flow.tong_yi_jiao_ren'), t('flow.zhu_guan_tong_yi'), hr.id, t('flow.tong_yi')),
        step(t('common.wan_cheng'), t('flow.qing_jia_liu_cheng'), done.id),
      ],
    });
  },

  newStep(animation, prev) {
    const els = animation.elements;
    const i = els.findIndex((e) => e.id === prev?.data.node);
    const next = els[(i + 1) % Math.max(els.length, 1)];
    return {
      title: next?.name ?? t('common.xin_de_yi_bu'),
      desc: '',
      data: { node: next?.id, via: '' },
    };
  },

  Stage: FlowStage,
};
