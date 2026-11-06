import { createAnimation, createElement, createStep, t } from '@flow-see/core';
import type { Template } from '@flow-see/runtime/template.ts';
import { MessageStage } from './MessageStage';

export interface MessageStepData {
  from?: string;
  to?: string;
  label?: string;
}

export const messageTemplate: Template = {
  id: 'message',
  name: t('common.xiao_xi_chuan_di'),
  tagline: t('common.ji_ge_jue_se'),
  elementNoun: t('message.jue_se'),
  minElements: 1,
  maxElements: 6,
  stepFields: [
    { key: 'from', label: t('message.shui_fa_chu'), kind: 'element', advanced: true },
    { key: 'to', label: t('message.fa_gei_shui'), kind: 'element', advanced: true },
    {
      key: 'label',
      label: t('message.jian_tou_shang_de'),
      kind: 'text',
      placeholder: t('message.liu_kong_ze_xian'),
      advanced: true,
    },
  ],

  createBlank() {
    const a = createElement(t('message.jue_se_2'));
    const b = createElement(t('message.jue_se_3'));
    return createAnimation({
      templateId: 'message',
      title: t('common.wei_ming_ming_dong'),
      elements: [a, b],
      steps: [createStep({ title: '', desc: '', data: { from: a.id, to: b.id, label: '' } })],
    });
  },

  createDefault() {
    const client = createElement(t('message.ke_hu_duan'));
    const server = createElement(t('message.fu_wu_qi'));
    return createAnimation({
      templateId: 'message',
      title: t('common.san_ci_wo_shou'),
      elements: [client, server],
      steps: [
        createStep({
          title: t('message.ke_hu_duan_fa'),
          desc: t('message.ni_hao_wo_xiang'),
          data: { from: client.id, to: server.id, label: 'SYN' },
        }),
        createStep({
          title: t('message.fu_wu_qi_hui'),
          desc: t('message.shou_dao_wo_ye'),
          data: { from: server.id, to: client.id, label: 'SYN + ACK' },
        }),
        createStep({
          title: t('message.ke_hu_duan_fa_2'),
          desc: t('message.neng_ting_dao_na'),
          data: { from: client.id, to: server.id, label: 'ACK' },
        }),
      ],
    });
  },

  newStep(animation, prev) {
    const [first, second] = animation.elements;
    const p = (prev?.data ?? {}) as MessageStepData;
    // 默认“回话”：上一步的接收方发回给发送方
    const from = p.to ?? first?.id;
    const to = p.from ?? second?.id ?? first?.id;
    return { title: t('common.xin_de_yi_bu'), desc: '', data: { from, to, label: '' } };
  },

  Stage: MessageStage,
};
