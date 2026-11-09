import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildIndex, findEntry, findLesson, highlightParts, searchLessons } from './catalog';
import { generateSchemas, CONTENT_ROOT } from './json-schema';
import { loadContent } from './load';
import { TEMPLATE_IDS } from '@flow-see/templates';

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

const errors = (root: string, templateIds: readonly string[] = TEMPLATE_IDS) =>
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
    const movedRoot = sandbox({ 'lessons/math/g1/fraction-intro.yaml': LESSON });
    rmSync(join(movedRoot, 'lessons/math/g3/fraction-intro.yaml'));
    const moved = errors(movedRoot);
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

  it('E1/E2: 步骤重复与条件检查（展开后步数上限、0 步、算式报错）', () => {
    // 展开后超过 20 步报错
    const over20 = LESSON.replace(
      'steps:\n  - say: 这是一个完整的饼。\n  - say: 把它平均分成 {parts} 份。',
      'steps:\n  - repeat: 25\n    say: 步骤 {i}',
    );
    const msgsOver = errors(sandbox({ 'lessons/math/g3/fraction-intro.yaml': over20 })).map(
      (e) => e.message,
    );
    expect(msgsOver.some((m) => m.includes('超过了上限 20 步'))).toBe(true);

    // 展开后步数为 0 报错
    const zeroSteps = LESSON.replace(
      'steps:\n  - say: 这是一个完整的饼。\n  - say: 把它平均分成 {parts} 份。',
      'steps:\n  - repeat: 0\n    say: 步骤消失',
    );
    const msgsZero = errors(sandbox({ 'lessons/math/g3/fraction-intro.yaml': zeroSteps })).map(
      (e) => e.message,
    );
    expect(msgsZero.some((m) => m.includes('展开后步数为 0'))).toBe(true);

    // repeat 算式写错
    const badRepeat = LESSON.replace(
      'steps:\n  - say: 这是一个完整的饼。\n  - say: 把它平均分成 {parts} 份。',
      'steps:\n  - repeat: "1 >+"\n    say: 步骤',
    );
    const msgsBadRepeat = errors(sandbox({ 'lessons/math/g3/fraction-intro.yaml': badRepeat })).map(
      (e) => e.message,
    );
    expect(msgsBadRepeat.some((m) => m.includes('repeat 算式写错了'))).toBe(true);

    // when 算式写错
    const badWhen = LESSON.replace(
      'steps:\n  - say: 这是一个完整的饼。\n  - say: 把它平均分成 {parts} 份。',
      'steps:\n  - when: "1 >+"\n    say: 步骤',
    );
    const msgsBadWhen = errors(sandbox({ 'lessons/math/g3/fraction-intro.yaml': badWhen })).map(
      (e) => e.message,
    );
    expect(msgsBadWhen.some((m) => m.includes('when 算式写错了'))).toBe(true);

    // repeat / when 引用不存在的参数
    const badVar = LESSON.replace(
      'steps:\n  - say: 这是一个完整的饼。\n  - say: 把它平均分成 {parts} 份。',
      'steps:\n  - repeat: "{unknown_var}"\n    say: 步骤',
    );
    const msgsBadVar = errors(sandbox({ 'lessons/math/g3/fraction-intro.yaml': badVar })).map(
      (e) => e.message,
    );
    expect(msgsBadVar.some((m) => m.includes('不存在的参数：unknown_var'))).toBe(true);

    // F2: 文字函数不在最外层（{cn(a) + 1}）时 content:check 报错
    const badTextFunc = LESSON.replace(
      'steps:\n  - say: 这是一个完整的饼。\n  - say: 把它平均分成 {parts} 份。',
      'steps:\n  - say: "{cn(parts) + 1}"',
    );
    const msgsBadFunc = errors(sandbox({ 'lessons/math/g3/fraction-intro.yaml': badTextFunc })).map(
      (e) => e.message,
    );
    expect(msgsBadFunc.some((m) => m.includes('文字函数只能单独写在 {} 里'))).toBe(true);
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
    const r = root();
    // 去掉认识钟表的文件：目录里列了、文件不存在 → 即将上线
    rmSync(join(r, 'lessons/math/g1/clock-basics.yaml'));
    const { bundle } = loadContent(r);
    const index = buildIndex(bundle!, false);
    const g1 = index.catalog.find((c) => c.grade === 1 && c.subject === 'math')!;
    // 草稿在线上隐藏；目录里列了但没有文件的（认识钟表）→ 即将上线。只看这两件事，不依赖真实目录里还有哪些知识点
    const all = g1.units.flatMap((u) => u.lessons);
    expect(all.some((l) => l.id === 'make-ten')).toBe(false);
    expect(all.find((l) => l.id === 'clock-basics')?.available).toBe(false);
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

describe('3.0 新字段校验与索引（D1）', () => {
  it('目录里一个单元写 term、另一个没写 → 报错，指出文件和单元', () => {
    const raw = readFileSync(join(CONTENT_ROOT, 'curriculum/math/grade1.yaml'), 'utf8');
    // 在第一个单元加 term: 1，第二个单元不加
    const bad = raw.replace('id: add-within-20', 'id: add-within-20\n    term: 1');
    const errs = errors(sandbox({ 'curriculum/math/grade1.yaml': bad }));
    expect(
      errs.some(
        (e) =>
          e.file === 'curriculum/math/grade1.yaml' &&
          e.message.includes('单元 clock 缺少 term') &&
          e.message.includes('全写 term，要么全不写'),
      ),
    ).toBe(true);
  });

  it('domain: algebra（不在 domains 里）→ 报错', () => {
    const raw = readFileSync(join(CONTENT_ROOT, 'curriculum/math/grade1.yaml'), 'utf8');
    // 给所有单元都加上 domain，但其中一个写 algebra
    const bad = raw
      .replace('id: add-within-20', 'id: add-within-20\n    domain: algebra')
      .replace('id: clock', 'id: clock\n    domain: number');
    const errs = errors(sandbox({ 'curriculum/math/grade1.yaml': bad }));
    expect(
      errs.some(
        (e) =>
          e.file === 'curriculum/math/grade1.yaml' &&
          e.message.includes('algebra') &&
          e.message.includes('不在学科 math 的 domains 里'),
      ),
    ).toBe(true);
  });

  it('科学目录写 domain → 报错（科学没有 domains）', () => {
    const raw = readFileSync(join(CONTENT_ROOT, 'curriculum/science/grade3.yaml'), 'utf8');
    const bad = raw.replace('id: plant', 'id: plant\n    domain: biology');
    const errs = errors(sandbox({ 'curriculum/science/grade3.yaml': bad }));
    expect(
      errs.some(
        (e) =>
          e.file === 'curriculum/science/grade3.yaml' &&
          e.message.includes('学科 science 没有定义 domains') &&
          e.message.includes('plant'),
      ),
    ).toBe(true);
  });

  it('related: [make-ten, make-ten] 报重复；[自己] 报错；[not-exist] 报不存在；引用目录中 { id, title } 形式的 id 通过', () => {
    // 1. 重复
    const dup = LESSON.replace(
      'tags: [分数, 平均分]',
      'tags: [分数, 平均分]\nrelated: [make-ten, make-ten]',
    );
    const dupErrs = errors(sandbox({ 'lessons/math/g3/fraction-intro.yaml': dup }));
    expect(dupErrs.some((e) => e.message.includes('related 里的知识点 id 重复：make-ten'))).toBe(true);

    // 2. 包含自己
    const self = LESSON.replace(
      'tags: [分数, 平均分]',
      'tags: [分数, 平均分]\nrelated: [fraction-intro]',
    );
    const selfErrs = errors(sandbox({ 'lessons/math/g3/fraction-intro.yaml': self }));
    expect(selfErrs.some((e) => e.message.includes('related 不能包含自己：fraction-intro'))).toBe(true);

    // 3. 不存在
    const notExist = LESSON.replace(
      'tags: [分数, 平均分]',
      'tags: [分数, 平均分]\nrelated: [not-exist]',
    );
    const notExistErrs = errors(sandbox({ 'lessons/math/g3/fraction-intro.yaml': notExist }));
    expect(notExistErrs.some((e) => e.message.includes('related 引用的知识点不存在：not-exist'))).toBe(
      true,
    );

    // 4. 引用目录中 { id, title } 形式的 id：通过
    const mathG1 = readFileSync(join(CONTENT_ROOT, 'curriculum/math/grade1.yaml'), 'utf8').replace(
      '- make-ten',
      '- make-ten\n      - { id: placeholder-id, title: 预留知识点 }',
    );
    const validRelated = LESSON.replace(
      'tags: [分数, 平均分]',
      'tags: [分数, 平均分]\nrelated: [make-ten, placeholder-id]',
    );
    const ok = errors(
      sandbox({
        'curriculum/math/grade1.yaml': mathG1,
        'lessons/math/g3/fraction-intro.yaml': validRelated,
      }),
    );
    expect(ok.filter((e) => e.message.includes('related'))).toEqual([]);
  });

  it('索引里能读到 term、domain、related、domains', () => {
    const mathG1 = readFileSync(join(CONTENT_ROOT, 'curriculum/math/grade1.yaml'), 'utf8')
      .replace('id: add-within-20', 'id: add-within-20\n    term: 1\n    domain: number')
      .replace('id: subtract-within-20', 'id: subtract-within-20\n    term: 2\n    domain: number')
      .replace('id: clock', 'id: clock\n    term: 1\n    domain: number');
    const withRelated = LESSON.replace(
      'tags: [分数, 平均分]',
      'tags: [分数, 平均分]\nrelated: [make-ten]',
    );
    const r = sandbox({
      'curriculum/math/grade1.yaml': mathG1,
      'lessons/math/g3/fraction-intro.yaml': withRelated,
    });
    const { bundle, issues } = loadContent(r);
    expect(issues.filter((i) => i.level === 'error')).toEqual([]);
    const index = buildIndex(bundle!, true);

    // term, domain
    const g1 = findEntry(index, 1, 'math');
    expect(g1?.units[0].term).toBe(1);
    expect(g1?.units[0].domain).toBe('number');

    // related
    const lesson = findLesson(index, 'fraction-intro');
    expect(lesson?.lesson.meta?.related).toEqual(['make-ten']);

    // domains
    const math = index.subjects.find((s) => s.id === 'math');
    expect(math?.domains).toEqual([
      { id: 'number', name: '数与代数' },
      { id: 'geometry', name: '图形与几何' },
      { id: 'stats', name: '统计与概率' },
    ]);
  });
});
