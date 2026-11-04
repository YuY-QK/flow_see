import { CONTENT_ROOT } from '../json-schema';
import { loadContent } from '../load';
import { buildOfficialItems, type OfficialItem } from './official';

/** 真实的示例配置（packages/content/examples），测试用 */
export function realOfficialItems(): { items: OfficialItem[]; categories: string[] } {
  const { bundle } = loadContent(CONTENT_ROOT);
  const examples = bundle!.examples;
  return { items: buildOfficialItems(examples), categories: examples.categories };
}
