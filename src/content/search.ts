import { getTemplate } from '@/templates/registry';
import type { OfficialItem } from './official';

/** 搜索：标题、分类、模板名、简介、步骤标题里任意包含关键词即可 */
export function matches(item: OfficialItem, q: string): boolean {
  if (!q) return true;
  const a = item.animation;
  const hay = [
    a.title,
    item.category,
    item.summary,
    getTemplate(a.templateId)?.name ?? '',
    ...a.steps.map((st) => st.title),
  ]
    .join(' ')
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}
