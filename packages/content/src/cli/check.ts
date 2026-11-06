// pnpm content:check：检查全部内容配置。有错误时退出码为 1（构建和自动部署会因此中止）。
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { configureScene } from '@flow-see/blocks';
import { configureStyle } from '@flow-see/core/style.ts';
import { configureTexts } from '@flow-see/core/texts.ts';
import { CONTENT_ROOT, generateSchemas } from '../json-schema';
import { formatIssue, loadContent, readYaml, type Issue } from '../load';

const root = process.argv[2] ?? CONTENT_ROOT;

// 模板模块加载时就会读文案，所以先注入文案，再加载模板（读不出来的错误由下面的 loadContent 统一报告）
const early = readYaml(root, join(root, 'site.yaml'), 'site', []);
const texts = early && readYaml(root, join(root, early.texts), 'texts', []);
if (texts) configureTexts(texts, { strict: true });
const style = early && readYaml(root, join(root, early.style), 'style', []);
if (style) configureStyle(style);
const { TEMPLATE_IDS, getTemplate } = await import('@flow-see/templates');
const { buildOfficialItems } = await import('../examples/official');

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

// 创作示例要能真正生成作品（数据变化示例会在这里跑一遍算法）
const exampleIssues: Issue[] = [];
if (bundle) {
  try {
    const items = buildOfficialItems(bundle.examples);
    for (const it of items)
      if (!getTemplate(it.animation.templateId)?.Stage)
        exampleIssues.push({ level: 'error', file: 'examples', message: `${it.id} 的模板不可用` });
  } catch (e) {
    exampleIssues.push({ level: 'error', file: 'examples', message: (e as Error).message });
  }
}

const all = [...issues, ...exampleIssues, ...stale];
for (const i of all) console.log(formatIssue(i));

const errors = all.filter((i) => i.level === 'error').length;
const warnings = all.length - errors;
if (bundle) {
  const published = bundle.lessons.filter((l) => l.lesson.status === 'published').length;
  console.log(
    `\n内容：${bundle.curricula.length} 个课程目录，${bundle.lessons.length} 个知识点（已发布 ${published}），${bundle.assets.length} 个素材，${bundle.examples.list.length} 个创作示例`,
  );
}
console.log(
  errors
    ? `\n✗ ${errors} 个错误，${warnings} 个提醒`
    : `\n✓ 检查通过${warnings ? `（${warnings} 个提醒）` : ''}`,
);
process.exit(errors ? 1 : 0);
