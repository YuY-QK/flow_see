// 站点配置与内容目录（来自 packages/content，构建时由 contentPlugin 生成）。
// 页面里用到的名称、默认值、条数上限等都从这里读，不在代码里写死（规格 2.7）。
import { assets, content, loadLesson } from 'virtual:content';

export { assets, content, loadLesson };
export const site = content.site;

export type Grade = (typeof content.grades)[number];
export type Subject = (typeof content.subjects)[number];

export function findGrade(id: number): Grade | undefined {
  return content.grades.find((g) => g.id === id);
}
export function findSubject(id: string): Subject | undefined {
  return content.subjects.find((s) => s.id === id);
}
export function gradeName(id: number): string {
  return findGrade(id)?.name ?? String(id);
}
/** 网址里的年级：只认 grades.yaml 里有的 */
export function parseGrade(raw: string | undefined): number | undefined {
  if (!raw || !/^\d+$/.test(raw)) return undefined;
  return findGrade(Number(raw))?.id;
}
