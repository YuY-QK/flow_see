// pnpm content:check：检查全部内容配置。有错误时退出码为 1（构建和自动部署会因此中止）。
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { configureScene } from '@flow-see/blocks';
import { TEMPLATE_IDS, getTemplate } from '@flow-see/templates';
import { CONTENT_ROOT, generateSchemas } from '../json-schema';
import { formatIssue, loadContent, type Issue } from '../load';

const root = process.argv[2] ?? CONTENT_ROOT;
const { bundle, issues } = loadContent(root, {
  templateIds: TEMPLATE_IDS,
  sayWarnLength: 30,
  onSite: (site) => configureScene(site.scene),
  checkLesson: (lesson) => getTemplate(lesson.template)?.checkConfig?.(lesson) ?? [],
});

// 编辑器用的 JSON Schema 要和格式定义保持一致
const stale: Issue[] = Object.entries(generateSchemas())
  .filter(([name, json]) => {
    const file = join(CONTENT_ROOT, 'schemas', `${name}.schema.json`);
    return !existsSync(file) || readFileSync(file, 'utf8') !== json;
  })
  .map(([name]) => ({
    level: 'error',
    file: `schemas/${name}.schema.json`,
    message: '和 src/schema.ts 不一致，请运行 pnpm content:schema',
  }));

const all = [...issues, ...stale];
for (const i of all) console.log(formatIssue(i));

const errors = all.filter((i) => i.level === 'error').length;
const warnings = all.length - errors;
if (bundle) {
  const published = bundle.lessons.filter((l) => l.lesson.status === 'published').length;
  console.log(
    `\n内容：${bundle.curricula.length} 个课程目录，${bundle.lessons.length} 个知识点（已发布 ${published}），${bundle.assets.length} 个素材`,
  );
}
console.log(
  errors
    ? `\n✗ ${errors} 个错误，${warnings} 个提醒`
    : `\n✓ 检查通过${warnings ? `（${warnings} 个提醒）` : ''}`,
);
process.exit(errors ? 1 : 0);
