// 浏览器可用的部分：类型和目录查询。读取文件、校验的代码在 load.ts（只在 Node 里用）。
export * from './catalog';
export type {
  AssetEntry,
  CurriculumConfig,
  ExampleConfig,
  ExamplesConfig,
  GradesConfig,
  HelpConfig,
  LessonConfig,
  LessonStatus,
  SiteConfig,
  TextsConfig,
} from './schema';
import type { LessonConfig } from './schema';

/** loadLesson 返回的知识点：配置内容 + 由文件位置决定的学科、年级 */
export type LessonContent = LessonConfig & { subject: string; grade: number };
export { lessonToAnimation, type LessonAnimationOptions } from './animation';
