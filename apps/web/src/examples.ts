// 创作页的示例动画：数据来自 packages/content/examples/，构建时进入内容索引。
import { buildOfficialItems, type OfficialItem } from '@flow-see/content/examples/official.ts';
import { content } from './site';

export type { OfficialItem };

/** 分类（顺序同 examples/index.yaml） */
export const CATEGORIES = content.examples.categories;

let cache: OfficialItem[] | null = null;

export function officialItems(): OfficialItem[] {
  cache ??= buildOfficialItems(content.examples);
  return cache;
}

export function findOfficial(id: string): OfficialItem | undefined {
  return officialItems().find((i) => i.id === id);
}
