import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildIndex, findLesson, highlightParts, searchLessons } from './catalog';
import { generateSchemas, CONTENT_ROOT } from './json-schema';
import { loadContent } from './load';

const roots: string[] = [];
afterEach(() => roots.splice(0).forEach((r) => rmSync(r, { recursive: true, force: true })));

/** 复制一份真实的内容目录，再按需改写文件 */
function sandbox(files: Record<string, string> = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'flow-see-content-'));
  roots.push(root);
  for (const d of [
    'site.yaml',
    'help.yaml',
    'texts.yaml',
    'style.yaml',
    'examples',
    'curriculum',
    'lessons',
    'assets',
  ])
    cpSync(join(CONTENT_ROOT, d), join(root, d), { recursive: true });
  for (const [f, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, f)), { recursive: true });
    writeFileSync(join(root, f), text);
  }
  return root;
}

const LESSON = `
id: fraction-intro
title: 认识分数
summary: 把一个整体平均分，取其中的几份
status: published
reviewedAt: 2026-11-10
tags: [分数, 平均分]
recommended: true
template: message
params: { parts: 4, take: 3 }
explore:
  - { param: parts, control: slider, label: 平均分成几份, min: 2, max: 12 }
  - { param: take, control: slider, label: 取其中几份, min: 1, max: "{parts}" }
steps:
  - say: 这是一个完整的饼。
  - say: 把它平均分成 {parts} 份。
keyPoints: [一定要平均分, 分母表示分成几份]
`;

const errors = (root: string, templateIds = ['message', 'scene', 'flow', 'cycle', 'data']) =>
  loadContent(root, { templateIds }).issues.filter((i) => i.level === 'error');

describe('内容配置校验', () => {
  it('仓库里的配置全部通过，且 JSON Schema 是最新的', () => {
    const { bundle, issues } = loadContent(CONTENT_ROOT);
    expect(issues.filter((i) => i.level === 'error')).toEqual([]);
    expect(bundle?.site.site.name).toBeTruthy();
    for (const [name, json] of Object.entries(generateSchemas()))
      expect(readFileSync(join(CONTENT_ROOT, 'schemas', `${name}.schema.json`), 'utf8')).toBe(json);
  });

  it('site.yaml 类型写错时报错并指出行号', () => {
    const site = readFileSync(join(CONTENT_ROOT, 'site.yaml'), 'utf8').replace(
      /grade: 1\b/,
      'grade: 七',
    );
    const line = site.split('\n').findIndex((l) => l.includes('grade: 七')) + 1;
    const errs = errors(sandbox({ 'site.yaml': site }));
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatchObject({ file: 'site.yaml', line });
    expect(errs[0].message).toContain('defaults.grade');
  });

  it('site.yaml 缺项时用默认值，未知字段报错；scene、player、explore 必须给全', () => {
    const real = readFileSync(join(CONTENT_ROOT, 'site.yaml'), 'utf8');
    // 去掉 contact 和 learning.continueCount：用默认值
    const trimmed = real
      .replace('name: 动画学堂', 'name: 测试学堂')
      .replace(/contact:[^\n]*\n( {2}[^\n]*\n)+/, '')
      .replace(/ {2}continueCount:[^\n]*\n/, '');
    const { bundle } = loadContent(sandbox({ 'site.yaml': trimmed }));
    expect(bundle?.site.site.name).toBe('测试学堂');
    expect(bundle?.site.contact.email).toBe('');
    expect(bundle?.site.learning.continueCount.desktop).toBe(3);
    expect(errors(sandbox({ 'site.yaml': real + 'colour: red\n' }))[0].message).toContain('colour');
    // 没有默认值的三节：缺了就报错
    expect(
      errors(sandbox({ 'site.yaml': 'site:\n  name: x\n' }))
        .map((e) => e.message)
        .join(),
    ).toMatch(/scene|player|explore/);
  });

  it('默认年级必须存在于 grades.yaml', () => {
    const site = readFileSync(join(CONTENT_ROOT, 'site.yaml'), 'utf8').replace(
      /grade: 1\b/,
      'grade: 9',
    );
    expect(errors(sandbox({ 'site.yaml': site }))[0].message).toContain('defaults.grade');
  });

  it('知识点：引用检查（模板、参数、目录位置）', () => {
    const ok = sandbox({ 'lessons/math/g3/fraction-intro.yaml': LESSON });
    expect(errors(ok)).toEqual([]);

    const bad = LESSON.replace('template: message', 'template: nope')
      .replace('max: "{parts}"', 'max: "{count}"')
      .replace('{parts} 份', '{n} 份');
    const msgs = errors(sandbox({ 'lessons/math/g3/fraction-intro.yaml': bad })).map(
      (e) => e.message,
    );
    expect(msgs.some((m) => m.includes('模板不存在'))).toBe(true);
    expect(msgs.some((m) => m.includes('不存在的参数：count'))).toBe(true);
    expect(msgs.some((m) => m.includes('{n}'))).toBe(true);

    // 放错年级目录：和课程目录不一致
    const moved = errors(sandbox({ 'lessons/math/g1/fraction-intro.yaml': LESSON }));
    expect(moved.some((e) => e.message.includes('不一致'))).toBe(true);
  });

  it('派生值、点选例子的检查', () => {
    const withDerived = LESSON.replace(
      'explore:',
      'derived:\n  rest: parts - take\n  bad: parts - nope\n  wrong: 1 +\npresets:\n  - { label: 太多, params: { parts: 99 } }\n  - { label: 没这个参数, params: { zzz: 1 } }\nexplore:',
    );
    const msgs = errors(sandbox({ 'lessons/math/g3/fraction-intro.yaml': withDerived })).map(
      (e) => e.message,
    );
    expect(msgs.some((m) => m.includes('用到了不存在的参数或派生值：nope'))).toBe(true);
    expect(msgs.some((m) => m.includes('算式写错了'))).toBe(true);
    expect(msgs.some((m) => m.includes('例子“太多”') && m.includes('超出了控件的范围'))).toBe(true);
    expect(msgs.some((m) => m.includes('参数 zzz'))).toBe(true);
  });

  it('创作示例：引用的元素名、分类、列表都要对得上', () => {
    const ex = (file: string, edit: (s: string) => string) =>
      sandbox({
        [`examples/${file}.yaml`]: edit(
          readFileSync(join(CONTENT_ROOT, `examples/${file}.yaml`), 'utf8'),
        ),
      });
    expect(errors(ex('tcp-handshake', (s) => s))).toEqual([]);
    const msgs = (root: string) => errors(root).map((e) => e.message);
    expect(
      msgs(ex('tcp-handshake', (s) => s.replace('to: 服务器', 'to: 路由器'))).join(),
    ).toContain('“路由器”不在 elements 里');
    expect(
      msgs(ex('tcp-handshake', (s) => s.replace('category: 网络协议', 'category: 其他'))).join(),
    ).toContain('不在 examples/index.yaml 的 categories 里');
    expect(msgs(ex('bubble-sort', (s) => s.replace(/values:.*/, 'values: []'))).join()).toContain(
      'params.values',
    );
  });

  it('已发布的知识点要有校对日期', () => {
    const root = sandbox({
      'lessons/math/g3/fraction-intro.yaml': LESSON.replace('reviewedAt: 2026-11-10\n', ''),
    });
    expect(errors(root)[0]).toMatchObject({ file: 'lessons/math/g3/fraction-intro.yaml' });
  });

  it('素材：文件要存在，开源素材要写许可证', () => {
    const missing = sandbox({
      'assets/manifest.yaml': '- { id: b, file: nope.svg, source: 自绘 }',
    });
    expect(errors(missing)[0].message).toContain('nope.svg');

    const root = sandbox({
      'assets/manifest.yaml': [
        '- { id: a, file: brand/logo.svg, source: 自绘 }',
        '- { id: c, file: brand/logo.svg, source: 某图标库 }',
        '- { id: d, file: brand/logo.svg, source: AI 生成 }',
      ].join('\n'),
    });
    const msgs = errors(root).map((e) => e.message);
    expect(msgs.some((m) => m.includes('license'))).toBe(true);
    expect(msgs.some((m) => m.includes('tool'))).toBe(true);
  });
});

describe('目录索引与搜索', () => {
  const root = () =>
    sandbox({
      'lessons/math/g3/fraction-intro.yaml': LESSON,
      'lessons/math/g1/make-ten.yaml': LESSON.replace('id: fraction-intro', 'id: make-ten')
        .replace('title: 认识分数', 'title: 凑十法')
        .replace('status: published', 'status: draft'),
    });

  it('线上只显示已发布的；目录里没有文件的显示即将上线', () => {
    const { bundle } = loadContent(root());
    const index = buildIndex(bundle!, false);
    const g1 = index.catalog.find((c) => c.grade === 1 && c.subject === 'math')!;
    // 草稿在线上隐藏；认识钟表没有文件 → 即将上线
    expect(g1.units.flatMap((u) => u.lessons.map((l) => [l.id, l.available]))).toEqual([
      ['clock-basics', false],
    ]);
    expect(findLesson(index, 'fraction-intro')?.entry.grade).toBe(3);

    const dev = buildIndex(bundle!, true);
    expect(findLesson(dev, 'make-ten')?.lesson.meta?.status).toBe('draft');
  });

  it('搜索：多词同时匹配，当前年级在前', () => {
    const { bundle } = loadContent(root());
    const index = buildIndex(bundle!, true);
    expect(searchLessons(index, '分数', 1, 50).map((h) => h.lesson.id)).toEqual([
      'make-ten',
      'fraction-intro',
    ]);
    expect(searchLessons(index, '分数', 3, 50)[0].lesson.id).toBe('fraction-intro');
    expect(searchLessons(index, '分数 钟表', 3, 50)).toEqual([]);
    expect(searchLessons(index, '  ', 3, 50)).toEqual([]);
  });
});

describe('搜索高亮', () => {
  it('命中的字单独成段，不区分大小写', () => {
    expect(highlightParts('认识分数', ['分数'])).toEqual([
      { text: '认识', hit: false },
      { text: '分数', hit: true },
    ]);
    expect(highlightParts('Fraction 分数', ['fra', '分'])).toEqual([
      { text: 'Fra', hit: true },
      { text: 'ction ', hit: false },
      { text: '分', hit: true },
      { text: '数', hit: false },
    ]);
  });

  it('多个词重叠时合并；没有命中或没有词时是一整段', () => {
    expect(highlightParts('平均分成', ['平均', '均分'])).toEqual([
      { text: '平均分', hit: true },
      { text: '成', hit: false },
    ]);
    expect(highlightParts('钟表', ['分数'])).toEqual([{ text: '钟表', hit: false }]);
    expect(highlightParts('钟表', [])).toEqual([{ text: '钟表', hit: false }]);
    expect(highlightParts('', ['分'])).toEqual([]);
  });
});
