// 由 contentPlugin（src/vite-plugin.ts）生成的模块
declare module 'virtual:content' {
  import type { ContentIndex, LessonContent } from '@flow-see/content';
  export const content: ContentIndex;
  export const assets: { logo: string };
  /** 素材 id → 地址（assets/manifest.yaml） */
  export const assetUrls: Record<string, string>;
  export function loadLesson(id: string): Promise<LessonContent | undefined>;
}
