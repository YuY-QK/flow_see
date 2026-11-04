// 创作示例（原“动画广场”的官方内容，现在作为创作页的示例）。
// 数据在 packages/content/examples/*.yaml；这里只负责把配置变成可播放的作品。
import {
  createAnimation,
  createElement,
  createStep,
  type Animation,
  type FlowElement,
} from '@flow-see/core';
import { generateDataSteps, type DataParams } from '@flow-see/templates/generic/data/algorithms.ts';
import type { ExampleConfig, ExamplesConfig } from '../schema';

export interface OfficialItem {
  id: string;
  category: string;
  /** 精选 */
  featured: boolean;
  /** 来源：第一版只有官方；以后社区投稿入选精选后显示作者名 */
  source: string;
  summary: string;
  animation: Animation;
}

/** 一个示例配置 → 作品。元素用名字写，这里换成 id；引用不到的名字会抛错（content:check 会先报出来）。 */
export function exampleToAnimation(ex: ExampleConfig, author: string): Animation {
  const base = createAnimation(
    { templateId: ex.template, title: ex.title, themeId: ex.theme, author },
    0,
  );
  const animation: Animation = { ...base, id: `official-${ex.id}` };
  if (ex.template === 'data') {
    const params = { ...ex.params } as unknown as DataParams;
    return { ...animation, params: { ...params }, steps: generateDataSteps({ ...params }) };
  }
  const elements: FlowElement[] = (ex.elements ?? []).map(createElement);
  const idOf = (name: string | undefined) => {
    const e = elements.find((x) => x.name === name);
    if (!e) throw new Error(`示例 ${ex.id}：找不到元素“${name}”`);
    return e.id;
  };
  const steps = (ex.steps ?? []).map((st) => {
    const data: Record<string, unknown> =
      ex.template === 'message'
        ? { from: idOf(st.from), to: idOf(st.to), label: st.label ?? '' }
        : ex.template === 'flow'
          ? { node: idOf(st.node), via: st.via ?? '' }
          : { stage: idOf(st.stage) };
    return createStep({ title: st.title, desc: st.desc, data });
  });
  return {
    ...animation,
    elements,
    steps,
    ...(ex.template === 'cycle' ? { params: { ...ex.params } } : {}),
  };
}

export function buildOfficialItems(examples: ExamplesConfig): OfficialItem[] {
  return examples.list.map((ex) => ({
    id: `official-${ex.id}`,
    category: ex.category,
    featured: ex.featured,
    source: examples.source,
    summary: ex.summary,
    animation: exampleToAnimation(ex, examples.author),
  }));
}
