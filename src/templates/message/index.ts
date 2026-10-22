import { createAnimation, createElement, createStep } from '@/engine';
import type { Template } from '../types';
import { MessageStage } from './MessageStage';

export interface MessageStepData {
  from?: string;
  to?: string;
  label?: string;
}

export const messageTemplate: Template = {
  id: 'message',
  name: '消息传递',
  tagline: '几个角色之间来回传话',
  elementNoun: '角色',
  minElements: 1,
  maxElements: 6,
  stepFields: [
    { key: 'from', label: '谁发出', kind: 'element', advanced: true },
    { key: 'to', label: '发给谁', kind: 'element', advanced: true },
    {
      key: 'label',
      label: '箭头上的标签',
      kind: 'text',
      placeholder: '留空则显示步骤标题',
      advanced: true,
    },
  ],

  createBlank() {
    const a = createElement('角色 1');
    const b = createElement('角色 2');
    return createAnimation({
      templateId: 'message',
      title: '未命名动画',
      elements: [a, b],
      steps: [createStep({ title: '', desc: '', data: { from: a.id, to: b.id, label: '' } })],
    });
  },

  createDefault() {
    const client = createElement('客户端');
    const server = createElement('服务器');
    return createAnimation({
      templateId: 'message',
      title: 'TCP 三次握手',
      elements: [client, server],
      steps: [
        createStep({
          title: '客户端发送 SYN',
          desc: '“你好，我想和你建立连接。”',
          data: { from: client.id, to: server.id, label: 'SYN' },
        }),
        createStep({
          title: '服务器回复 SYN + ACK',
          desc: '“收到！我也准备好了，你能听到我吗？”',
          data: { from: server.id, to: client.id, label: 'SYN + ACK' },
        }),
        createStep({
          title: '客户端发送 ACK',
          desc: '“能听到！那我们开始吧。”连接建立。',
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
    return { title: '新的一步', desc: '', data: { from, to, label: '' } };
  },

  Stage: MessageStage,
};
