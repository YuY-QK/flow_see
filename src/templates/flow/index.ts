import { createAnimation, createElement, createStep } from '@/engine';
import type { Template } from '../types';
import { FlowStage } from './FlowStage';

export const flowTemplate: Template = {
  id: 'flow',
  name: '流程图流转',
  tagline: '一步接一步、可以有分支',
  elementNoun: '节点',
  elementHint: '名字以“？”结尾的节点会画成菱形，表示需要判断。',
  minElements: 1,
  maxElements: 12,
  stepFields: [
    { key: 'node', label: '这一步走到哪个节点', kind: 'element' },
    {
      key: 'via',
      label: '从上一步过来的箭头上写什么',
      kind: 'text',
      placeholder: '例如：同意、不同意（可留空）',
      advanced: true,
    },
  ],

  createBlank() {
    const start = createElement('开始');
    const work = createElement('处理');
    const end = createElement('结束');
    return createAnimation({
      templateId: 'flow',
      title: '未命名动画',
      elements: [start, work, end],
      steps: [createStep({ title: '开始', desc: '', data: { node: start.id } })],
    });
  },

  createDefault() {
    const [submit, review, back, hr, done] = [
      '提交申请',
      '主管审批？',
      '退回修改',
      '人事备案',
      '完成',
    ].map(createElement);
    const step = (title: string, desc: string, node: string, via = '') =>
      createStep({ title, desc, data: { node, via } });
    return createAnimation({
      templateId: 'flow',
      title: '请假审批流程',
      elements: [submit, review, back, hr, done],
      steps: [
        step('提交请假申请', '员工填写请假单并提交。', submit.id),
        step('主管审批', '主管查看申请，决定是否同意。', review.id),
        step('不同意，退回修改', '理由不充分，申请被退回。', back.id, '不同意'),
        step('修改后重新提交', '员工补充说明后再次提交。', submit.id, '重新提交'),
        step('主管再次审批', '这次理由充分了。', review.id),
        step('同意，交人事备案', '主管同意，人事部门登记备案。', hr.id, '同意'),
        step('完成', '请假流程结束，可以安心休假了。', done.id),
      ],
    });
  },

  newStep(animation, prev) {
    const els = animation.elements;
    const i = els.findIndex((e) => e.id === prev?.data.node);
    const next = els[(i + 1) % Math.max(els.length, 1)];
    return { title: next?.name ?? '新的一步', desc: '', data: { node: next?.id, via: '' } };
  },

  Stage: FlowStage,
};
