// JSON Schema：给编辑器用（YAML 文件第一行的 yaml-language-server 注释指向它们）。
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { SCHEMAS } from './schema';

export const CONTENT_ROOT = fileURLToPath(new URL('..', import.meta.url));

const TITLES: Record<keyof typeof SCHEMAS, string> = {
  site: '站点公共配置 site.yaml',
  help: '常见问题 help.yaml',
  texts: '界面文案 texts.yaml',
  style: '动画主题与导出样式 style.yaml',
  examples: '创作示例目录 examples/index.yaml',
  example: '创作示例 examples/<id>.yaml',
  grades: '年级与学科 curriculum/grades.yaml',
  curriculum: '课程目录 curriculum/<学科>/grade<年级>.yaml',
  lesson: '知识点 lessons/<学科>/g<年级>/<id>.yaml',
  manifest: '素材清单 assets/manifest.yaml',
};

/** 文件名（不含 .schema.json）→ 文件内容 */
export function generateSchemas(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(SCHEMAS).map(([name, schema]) => {
      const json = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' });
      const out = { title: TITLES[name as keyof typeof SCHEMAS], ...json };
      return [name, JSON.stringify(out, null, 2) + '\n'];
    }),
  );
}
