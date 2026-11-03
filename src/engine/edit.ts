// 对作品的纯函数修改：都返回新对象，便于撤销、测试和状态管理。
import { createElement, createStep } from './animation';
import type { Animation, FlowElement, Step } from './types';

function touch(a: Animation, patch: Partial<Animation>): Animation {
  return { ...a, ...patch, updatedAt: Date.now() };
}

export function updateAnimation(a: Animation, patch: Partial<Animation>): Animation {
  return touch(a, patch);
}

export function addStep(a: Animation, partial: Partial<Step> = {}, afterId?: string): Animation {
  const step = createStep(partial);
  const steps = [...a.steps];
  const at = afterId ? steps.findIndex((s) => s.id === afterId) + 1 : steps.length;
  steps.splice(at > 0 ? at : steps.length, 0, step);
  return touch(a, { steps });
}

export function updateStep(a: Animation, id: string, patch: Partial<Step>): Animation {
  return touch(a, {
    steps: a.steps.map((s) =>
      s.id === id
        ? { ...s, ...patch, data: patch.data ? { ...s.data, ...patch.data } : s.data }
        : s,
    ),
  });
}

export function removeStep(a: Animation, id: string): Animation {
  return touch(a, { steps: a.steps.filter((s) => s.id !== id) });
}

export function moveStep(a: Animation, from: number, to: number): Animation {
  if (from === to || from < 0 || to < 0 || from >= a.steps.length || to >= a.steps.length) {
    return a;
  }
  const steps = [...a.steps];
  const [moved] = steps.splice(from, 1);
  steps.splice(to, 0, moved);
  return touch(a, { steps });
}

export function addElement(a: Animation, name: string): Animation {
  return touch(a, { elements: [...a.elements, createElement(name)] });
}

export function renameElement(a: Animation, id: string, name: string): Animation {
  return touch(a, { elements: a.elements.map((e) => (e.id === id ? { ...e, name } : e)) });
}

/** 删除元素，并把步骤里指向它的字段清空（交给模板决定如何显示“未指定”）。 */
export function removeElement(a: Animation, id: string): Animation {
  const elements: FlowElement[] = a.elements.filter((e) => e.id !== id);
  const steps = a.steps.map((s) => {
    const data = Object.fromEntries(
      Object.entries(s.data).map(([k, v]) => [k, v === id ? undefined : v]),
    );
    return { ...s, data };
  });
  return touch(a, { elements, steps });
}
