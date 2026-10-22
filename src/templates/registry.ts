import { messageTemplate } from './message';
import type { Template, TemplateCard } from './types';

const TEMPLATES: Template[] = [messageTemplate];

const byId = new Map(TEMPLATES.map((t) => [t.id, t]));

export function getTemplate(id: string): Template | undefined {
  return byId.get(id);
}

/** 选模板页的四张卡片；尚未实现的模板标记为“即将推出”。 */
export const TEMPLATE_CARDS: TemplateCard[] = [
  { id: 'flow', name: '流程图流转', tagline: '一步接一步、可以有分支', scenes: '工作流程、做饭步骤、审批', available: false },
  { id: 'message', name: '消息传递', tagline: '几个角色之间来回传话', scenes: '网络协议、对话、快递流转', available: true },
  { id: 'data', name: '数据变化', tagline: '一排数字或格子在变', scenes: '排序、查找等算法', available: false },
  { id: 'cycle', name: '循环 / 时间线', tagline: '按时间或绕圈推进', scenes: '水循环、生命周期、历史事件', available: false },
].map((c) => ({ ...c, available: byId.has(c.id) }));
