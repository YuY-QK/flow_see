import { SCHEMA_VERSION, type Animation, type FlowElement, type Step } from './types';

export function createId(prefix = ''): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return prefix + rand;
}

export function createStep(partial: Partial<Step> = {}): Step {
  return { id: createId('s_'), title: '', desc: '', data: {}, ...partial };
}

export function createElement(name: string): FlowElement {
  return { id: createId('e_'), name };
}

export function createAnimation(
  init: Pick<Animation, 'templateId' | 'title'> & Partial<Animation>,
  now = Date.now(),
): Animation {
  return {
    id: createId('a_'),
    schemaVersion: SCHEMA_VERSION,
    themeId: 'flat',
    elements: [],
    steps: [],
    settings: { autoNarrate: true, allowParamEdit: true },
    createdAt: now,
    updatedAt: now,
    ...init,
  };
}

/** 复制一份作品（“复制并修改”）：新 id、新时间，步骤和元素 id 保持不变以免打断引用。 */
export function duplicateAnimation(src: Animation, now = Date.now()): Animation {
  return {
    ...structuredClone(src),
    id: createId('a_'),
    title: src.title + '（副本）',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 把从存储或链接读到的任意数据整理成当前版本的 Animation。
 * 不认识的数据返回 null。
 */
export function migrate(raw: unknown): Animation | null {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Partial<Animation>;
  if (typeof a.id !== 'string' || typeof a.templateId !== 'string') return null;
  if ((a.schemaVersion ?? 0) > SCHEMA_VERSION) return null;
  return {
    id: a.id,
    schemaVersion: SCHEMA_VERSION,
    title: typeof a.title === 'string' ? a.title : '未命名动画',
    author: a.author,
    ownerId: a.ownerId,
    templateId: a.templateId,
    themeId: a.themeId ?? 'flat',
    elements: Array.isArray(a.elements) ? a.elements : [],
    steps: Array.isArray(a.steps) ? a.steps.map((s) => ({ ...s, data: s.data ?? {} })) : [],
    params: a.params,
    settings: { autoNarrate: true, allowParamEdit: true, ...a.settings },
    createdAt: a.createdAt ?? Date.now(),
    updatedAt: a.updatedAt ?? Date.now(),
  };
}
