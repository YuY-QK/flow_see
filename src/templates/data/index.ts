import { createAnimation } from '@/engine';
import type { Template } from '../types';
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
  name: '数据变化',
  tagline: '一排数字在变，步骤由算法自动生成',
  elementNoun: '数据',
  minElements: 0,
  maxElements: 0,
  stepFields: [],
  paramTitle: '要排序的数据',
  paramFields: [
    {
      key: 'values',
      label: '数字',
      kind: 'numbers',
      hint: '用逗号隔开，2 到 10 个整数（-99 到 99）',
      min: -99,
      max: 99,
      minCount: 2,
      maxCount: 10,
    },
    {
      key: 'algorithm',
      label: '算法',
      kind: 'select',
      options: Object.entries(ALGORITHM_NAMES).map(([value, label]) => ({ value, label })),
    },
    {
      key: 'order',
      label: '排序方向',
      kind: 'select',
      options: [
        { value: 'asc', label: '从小到大' },
        { value: 'desc', label: '从大到小' },
      ],
    },
  ],
  generate: generateDataSteps,
  createBlank: () => create('未命名动画'),
  createDefault: () => create('冒泡排序'),
  newStep: () => ({}),
  Stage: DataStage,
};
