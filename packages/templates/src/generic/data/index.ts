import { createAnimation, t } from '@flow-see/core';
import type { Template } from '@flow-see/runtime/template.ts';
import { ALGORITHM_NAMES, DEFAULT_PARAMS, generateDataSteps } from './algorithms';
import { DataStage } from './DataStage';

function create(title: string, params = DEFAULT_PARAMS) {
  return createAnimation({
    templateId: 'data',
    title,
    params: { ...params },
    steps: generateDataSteps({ ...params }),
  });
}

export const dataTemplate: Template = {
  id: 'data',
  name: t('common.shu_ju_bian_hua'),
  tagline: t('data.yi_pai_shu_zi'),
  elementNoun: t('data.shu_ju'),
  minElements: 0,
  maxElements: 0,
  stepFields: [],
  paramTitle: t('data.yao_pai_xu_de'),
  paramFields: [
    {
      key: 'values',
      label: t('data.shu_zi'),
      kind: 'numbers',
      hint: t('data.yong_dou_hao_ge'),
      min: -99,
      max: 99,
      minCount: 2,
      maxCount: 10,
    },
    {
      key: 'algorithm',
      label: t('data.suan_fa'),
      kind: 'select',
      options: Object.entries(ALGORITHM_NAMES).map(([value, label]) => ({ value, label })),
    },
    {
      key: 'order',
      label: t('data.pai_xu_fang_xiang'),
      kind: 'select',
      options: [
        { value: 'asc', label: t('data.cong_xiao_dao_da') },
        { value: 'desc', label: t('data.cong_da_dao_xiao') },
      ],
    },
  ],
  generate: generateDataSteps,
  createBlank: () => create(t('common.wei_ming_ming_dong')),
  createDefault: () => create(t('common.mao_pao_pai_xu')),
  newStep: () => ({}),
  Stage: DataStage,
};
