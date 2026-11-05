// 读取并校验 packages/content 下的全部配置（只在 Node 里运行：构建、开发服务器、content:check）。
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { LineCounter, parseDocument, type Document } from 'yaml';
import {
  clampParams,
  exploreCombos,
  exprNames,
  resolveParams,
  type ExploreControl,
} from '@flow-see/core/params.ts';
import { chooseOptions, type ChooseSpec } from '@flow-see/core/choose.ts';
import { fillParams } from '@flow-see/core/fill.ts';
import type { z } from 'zod';
import {
  SCHEMAS,
  type AssetEntry,
  type CurriculumConfig,
  type ExampleConfig,
  type ExamplesConfig,
  type GradesConfig,
  type HelpConfig,
  type LessonConfig,
  type SchemaName,
  type SiteConfig,
  type StyleConfigData,
  type TextsConfig,
} from './schema';

export interface Issue {
  level: 'error' | 'warning';
  /** 相对 packages/content 的路径 */
  file: string;
  line?: number;
  message: string;
}

export interface LessonFile {
  file: string;
  /** 由文件位置决定：lessons/<学科>/g<年级>/<id>.yaml */
  subject: string;
  grade: number;
  lesson: LessonConfig;
}

export interface ContentBundle {
  root: string;
  site: SiteConfig;
  help: HelpConfig;
  texts: TextsConfig;
  style: StyleConfigData;
  examples: ExamplesConfig;
  grades: GradesConfig;
  curricula: { file: string; data: CurriculumConfig }[];
  lessons: LessonFile[];
  assets: AssetEntry[];
}

/** 点选（try.choose）：答案不能是空的，选项不能少于 2 个，答案要在选项里；每种参数组合都查 */
function checkChooseTries(
  lesson: { derived?: Record<string, number | string>; steps: { try?: unknown }[] },
  params: Record<string, unknown>,
): { path: (string | number)[]; message: string }[] {
  const out: { path: (string | number)[]; message: string }[] = [];
  const scope = resolveParams(params, lesson.derived);
  lesson.steps.forEach((st, i) => {
    const raw = (st.try as { choose?: ChooseSpec } | undefined)?.choose;
    if (!raw) return;
    const spec = fillParams(raw, scope);
    const path = ['steps', i, 'try', 'choose'];
    if (spec.answer === undefined || String(spec.answer) === '' || /\{/.test(String(spec.answer)))
      return void out.push({
        path: [...path, 'answer'],
        message: 'answer 算不出来（参数没写全？）',
      });
    const opts = chooseOptions(spec);
    if (opts.length < 2)
      out.push({
        path,
        message: `选项不够：只有 ${opts.length} 个（${opts.map(String).join('、')}）；数字答案自动生成选项时，检查 min / max；文字答案要写 options，且各项不能重复`,
      });
    if (spec.options && !spec.options.some((o) => String(o) === String(spec.answer)))
      out.push({
        path: [...path, 'options'],
        message: `选项里要包含正确答案 ${String(spec.answer)}`,
      });
  });
  return out;
}

export interface LoadOptions {
  /** 已注册的模板 id；提供时检查知识点引用的模板是否存在 */
  templateIds?: readonly string[];
  /** 讲解词超过这个字数时给出提醒（自校清单：一句不超过约 30 字） */
  sayWarnLength?: number;
  /** site.yaml 读完、开始检查知识点之前调用（用它把场景样式等配置注入 blocks） */
  onSite?(site: SiteConfig): void;
  /** 模板对知识点配置的检查（零件、动作等）；path 相对知识点文件根 */
  checkLesson?(lesson: LessonConfig): { path: (string | number)[]; message: string }[];
}

const rel = (root: string, file: string) => relative(root, file).split(sep).join('/');

function walk(dir: string, ext = '.yaml'): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .sort()
    .flatMap((name) => {
      const p = join(dir, name);
      return statSync(p).isDirectory() ? walk(p, ext) : name.endsWith(ext) ? [p] : [];
    });
}

/** 把 zod 报错的路径对应到 YAML 文件的行号 */
function lineOf(doc: Document, lc: LineCounter, path: PropertyKey[]): number | undefined {
  for (let n = path.length; n >= 0; n--) {
    const node = n === 0 ? doc.contents : doc.getIn(path.slice(0, n) as unknown[], true);
    const range = (node as { range?: [number, number] } | undefined)?.range;
    // 缺少字段时指向它所在的对象
    if (range) return lc.linePos(range[0]).line;
  }
  return undefined;
}

function formatPath(path: PropertyKey[]): string {
  return path
    .map((p) => (typeof p === 'number' ? `[${p}]` : `.${String(p)}`))
    .join('')
    .replace(/^\./, '');
}

export function readYaml<N extends SchemaName>(
  root: string,
  file: string,
  schema: N,
  issues: Issue[],
): z.output<(typeof SCHEMAS)[N]> | undefined {
  return readYamlWithLines(root, file, schema, issues)?.data;
}

/** 同 readYaml，另外返回“配置路径 → 行号”的查询，供后续检查报告行号 */
function readYamlWithLines<N extends SchemaName>(
  root: string,
  file: string,
  schema: N,
  issues: Issue[],
):
  | { data: z.output<(typeof SCHEMAS)[N]>; line(path: PropertyKey[]): number | undefined }
  | undefined {
  const name = rel(root, file);
  if (!existsSync(file)) {
    issues.push({ level: 'error', file: name, message: '文件不存在' });
    return undefined;
  }
  const lc = new LineCounter();
  const doc = parseDocument(readFileSync(file, 'utf8'), { lineCounter: lc, prettyErrors: false });
  if (doc.errors.length) {
    for (const e of doc.errors)
      issues.push({
        level: 'error',
        file: name,
        line: lc.linePos(e.pos[0]).line,
        message: `YAML 格式错误：${e.message}`,
      });
    return undefined;
  }
  const r = SCHEMAS[schema].safeParse(doc.toJS() ?? {});
  if (r.success)
    return {
      data: r.data as z.output<(typeof SCHEMAS)[N]>,
      line: (path) => lineOf(doc, lc, path),
    };
  for (const issue of r.error.issues) {
    const where = issue.path.length ? `${formatPath(issue.path)}：` : '';
    issues.push({
      level: 'error',
      file: name,
      line: lineOf(doc, lc, issue.path),
      message: where + issue.message,
    });
  }
  return undefined;
}

/** 讲解词里的 {参数名} */
const PLACEHOLDER = /\{([A-Za-z_]\w*)\}/g;

/**
 * 读取全部配置。返回的 bundle 只在没有 error 时可用（有 error 时为 undefined）。
 */
export function loadContent(
  root: string,
  opts: LoadOptions = {},
): { bundle?: ContentBundle; issues: Issue[] } {
  const issues: Issue[] = [];
  const err = (file: string, message: string, line?: number) =>
    issues.push({ level: 'error', file, line, message });
  const warn = (file: string, message: string, line?: number) =>
    issues.push({ level: 'warning', file, line, message });

  const site = readYaml(root, join(root, 'site.yaml'), 'site', issues);
  if (site) opts.onSite?.(site);
  const grades = readYaml(root, join(root, 'curriculum', 'grades.yaml'), 'grades', issues);
  const help = site ? readYaml(root, join(root, site.help.faq), 'help', issues) : undefined;
  const style = site ? readYaml(root, join(root, site.style), 'style', issues) : undefined;
  const texts = site ? readYaml(root, join(root, site.texts), 'texts', issues) : undefined;
  const assets = readYaml(root, join(root, 'assets', 'manifest.yaml'), 'manifest', issues) ?? [];

  const gradeIds = new Set(grades?.grades.map((g) => g.id));
  const subjectIds = new Set(grades?.subjects.map((s) => s.id));

  // 素材
  const assetIds = new Set<string>();
  for (const a of assets) {
    if (assetIds.has(a.id)) err('assets/manifest.yaml', `素材 id 重复：${a.id}`);
    assetIds.add(a.id);
    if (!existsSync(join(root, 'assets', a.file)))
      err('assets/manifest.yaml', `素材 ${a.id} 的文件不存在：assets/${a.file}`);
  }

  // 站点配置里的引用
  if (site && grades) {
    if (!gradeIds.has(site.defaults.grade))
      err('site.yaml', `defaults.grade 不在 grades.yaml 的年级里：${site.defaults.grade}`);
    if (!subjectIds.has(site.defaults.subject))
      err('site.yaml', `defaults.subject 不在 grades.yaml 的学科里：${site.defaults.subject}`);
  }
  if (site && !existsSync(join(root, site.site.logo)))
    err('site.yaml', `site.logo 文件不存在：${site.site.logo}`);

  // 知识点文件
  const lessons: LessonFile[] = [];
  const lessonById = new Map<string, LessonFile>();
  for (const file of walk(join(root, 'lessons'))) {
    const name = rel(root, file);
    const m = name.match(/^lessons\/([a-z0-9-]+)\/g(\d+)\/([^/]+)\.yaml$/);
    if (!m) {
      err(name, '知识点文件要放在 lessons/<学科>/g<年级>/<id>.yaml');
      continue;
    }
    const [, subject, g, fileId] = m;
    const grade = Number(g);
    const read = readYamlWithLines(root, file, 'lesson', issues);
    if (!read) continue;
    const lesson = read.data;
    if (grades && !subjectIds.has(subject)) err(name, `学科 ${subject} 不在 grades.yaml 里`);
    if (grades && !gradeIds.has(grade)) err(name, `年级 ${grade} 不在 grades.yaml 里`);
    if (lesson.id !== fileId) err(name, `id（${lesson.id}）要和文件名（${fileId}）一致`);
    const dup = lessonById.get(lesson.id);
    if (dup) err(name, `知识点 id 重复，已在 ${dup.file} 中使用：${lesson.id}`);

    if (opts.templateIds && !opts.templateIds.includes(lesson.template))
      err(name, `模板不存在：${lesson.template}（已有：${opts.templateIds.join('、')}）`);
    if (lesson.thumbnail && !assetIds.has(lesson.thumbnail))
      err(name, `缩略图素材不存在：${lesson.thumbnail}`);
    for (const o of lesson.objects ?? []) {
      const asset = (o as { asset?: unknown }).asset;
      if (typeof asset === 'string' && !assetIds.has(asset))
        err(name, `零件 ${o.id} 引用的素材不存在：${asset}`);
    }

    // 参数、派生值、动手试一试
    const known = new Set(Object.keys(lesson.params));
    const derived = lesson.derived ?? {};
    for (const [k, expr] of Object.entries(derived)) {
      const names = exprNames(String(expr));
      if (!names) err(name, `derived 里 ${k} 的算式写错了：${expr}`);
      else
        for (const n of names)
          if (!known.has(n)) err(name, `derived 里 ${k} 用到了不存在的参数或派生值：${n}`);
      if (known.has(k)) err(name, `derived 里的 ${k} 和 params 里的参数重名`);
      known.add(k);
    }
    const std = resolveParams(lesson.params, derived);
    for (const k of Object.keys(derived))
      if (std[k] === undefined) err(name, `derived 里 ${k} 用标准参数算不出结果（除以 0？）`);
    const explore = (lesson.explore ?? []) as ExploreControl[];
    for (const ex of explore) {
      if (!Object.hasOwn(lesson.params, ex.param))
        err(name, `explore 里的参数 ${ex.param} 没有在 params 中给出标准取值`);
      if (ex.control === 'slider' && (ex.min === undefined || ex.max === undefined))
        err(name, `滑块 ${ex.param} 要写 min 和 max`);
      if (ex.control === 'buttons' && !ex.options?.length)
        err(name, `按钮组 ${ex.param} 要写 options`);
      for (const v of [ex.min, ex.max]) {
        if (typeof v !== 'string') continue;
        const names = exprNames(v);
        if (!names) err(name, `explore ${ex.param} 的范围算式写错了：${v}`);
        else
          for (const n of names) if (!known.has(n)) err(name, `explore 引用了不存在的参数：${n}`);
      }
    }
    // 讲解、零件、动作里的 {参数名}
    const used = new Set<string>();
    JSON.stringify([lesson.objects, lesson.steps, lesson.keyPoints], (_k, v) => {
      if (typeof v === 'string') for (const [, n] of v.matchAll(PLACEHOLDER)) used.add(n);
      return v;
    });
    for (const n of used)
      if (!known.has(n)) err(name, `配置里的 {${n}} 不是 params 或 derived 中的参数`);
    lesson.steps.forEach((st, i) => {
      const lines: [string, string][] = [['讲解', st.say]];
      if (st.try) {
        lines.push(['任务提示', st.try.task]);
        st.try.hints?.forEach((h, k) => lines.push([`第 ${k + 1} 条提示`, h]));
      }
      for (const [what, line] of lines) {
        const len = line.replace(PLACEHOLDER, '00').length;
        if (opts.sayWarnLength && len > opts.sayWarnLength)
          warn(
            name,
            `第 ${i + 1} 步${what}有 ${len} 个字，自校清单建议一句不超过约 ${opts.sayWarnLength} 字`,
          );
      }
    });

    // 标准取值、点选的例子、滑块能取到的每一种组合，都要能正常画出来
    const variants: { label: string; params: Record<string, unknown> }[] = [
      { label: '', params: lesson.params },
    ];
    if (clampParams(explore, lesson.params, derived)[explore[0]?.param] !== undefined) {
      const clamped = clampParams(explore, lesson.params, derived);
      for (const ex of explore)
        if (clamped[ex.param] !== lesson.params[ex.param])
          err(name, `标准取值 ${ex.param} = ${String(lesson.params[ex.param])} 超出了控件的范围`);
    }
    for (const pr of lesson.presets ?? []) {
      const merged = { ...lesson.params, ...pr.params };
      for (const k of Object.keys(pr.params))
        if (!Object.hasOwn(lesson.params, k))
          err(name, `例子“${pr.label}”里的参数 ${k} 没有在 params 中给出标准取值`);
      const clamped = clampParams(explore, merged, derived);
      for (const ex of explore)
        if (clamped[ex.param] !== merged[ex.param])
          err(
            name,
            `例子“${pr.label}”的 ${ex.param} = ${String(merged[ex.param])} 超出了控件的范围`,
          );
      variants.push({ label: `例子“${pr.label}”`, params: merged });
    }
    if (explore.length)
      for (const p of exploreCombos(explore, lesson.params, derived))
        variants.push({
          label: '',
          params: p as Record<string, unknown>,
        });
    if (!opts.templateIds || opts.templateIds.includes(lesson.template)) {
      const seen = new Set<string>();
      for (const v of variants)
        for (const i of [
          ...(opts.checkLesson?.({ ...lesson, params: v.params }) ?? []),
          ...checkChooseTries(lesson, v.params),
        ]) {
          const key = formatPath(i.path) + i.message;
          if (seen.has(key)) continue;
          seen.add(key);
          // 只有换了参数才出的问题，写明是哪组参数
          const std0 = v.params === lesson.params;
          const when = std0
            ? ''
            : `（${
                v.label ||
                '当 ' +
                  Object.entries(v.params)
                    .filter(([k, x]) => x !== lesson.params[k])
                    .map(([k, x]) => `${k}=${String(x)}`)
                    .join('、') +
                  ' 时'
              }）`;
          err(
            name,
            (i.path.length ? `${formatPath(i.path)}：` : '') + i.message + when,
            read.line(i.path),
          );
        }
    }
    if (lesson.template !== 'scene' && lesson.steps.some((st) => st.try?.drag))
      err(
        name,
        '拖动（try.drag）目前只有场景模板（template: scene）支持；其他模板用点选（try.choose）',
      );

    if (lesson.cover?.step && lesson.cover.step > lesson.steps.length)
      err(name, `cover.step 超出了步骤数（共 ${lesson.steps.length} 步）`);
    for (const k of Object.keys(lesson.cover?.params ?? {}))
      if (!Object.hasOwn(lesson.params, k))
        err(name, `cover.params 里的参数 ${k} 没有在 params 中给出标准取值`);
    const lf = { file: name, subject, grade, lesson };
    lessons.push(lf);
    lessonById.set(lesson.id, lf);
  }

  // 创作示例：examples/index.yaml + examples/<id>.yaml
  const exIndex = readYaml(root, join(root, 'examples', 'index.yaml'), 'examples', issues);
  const exampleList: ExampleConfig[] = [];
  if (exIndex) {
    const seen = new Set<string>();
    for (const id of exIndex.items) {
      const name = `examples/${id}.yaml`;
      if (seen.has(id)) err('examples/index.yaml', `示例重复列出：${id}`);
      seen.add(id);
      const read = readYamlWithLines(root, join(root, name), 'example', issues);
      if (!read) continue;
      const ex = read.data;
      const bad = (path: (string | number)[], msg: string) => err(name, msg, read.line(path));
      if (ex.id !== id) bad(['id'], `id（${ex.id}）要和文件名（${id}）一致`);
      if (!exIndex.categories.includes(ex.category))
        bad(['category'], `分类 ${ex.category} 不在 examples/index.yaml 的 categories 里`);
      if (opts.templateIds && !opts.templateIds.includes(ex.template))
        bad(['template'], `模板不存在：${ex.template}`);
      const els = ex.elements ?? [];
      if (new Set(els).size !== els.length)
        bad(['elements'], '元素名字不能重复（步骤里靠名字找元素）');
      if (ex.template === 'data') {
        const values = ex.params?.values;
        if (!Array.isArray(values) || !values.length || !values.every((v) => typeof v === 'number'))
          bad(['params', 'values'], '数据变化示例要在 params.values 里写一组数字');
      } else {
        if (!els.length) bad(['elements'], '要写 elements（角色 / 节点 / 阶段的名字）');
        if (!ex.steps?.length) bad(['steps'], '要写 steps');
        const refKeys =
          { message: ['from', 'to'], flow: ['node'], cycle: ['stage'] }[ex.template] ?? [];
        (ex.steps ?? []).forEach((st, i) => {
          for (const k of refKeys) {
            const v = st[k as keyof typeof st] as string | undefined;
            if (v === undefined) bad(['steps', i], `这一步要写 ${k}`);
            else if (!els.includes(v)) bad(['steps', i, k], `${k} 里的“${v}”不在 elements 里`);
          }
        });
      }
      exampleList.push(ex);
    }
    for (const file of walk(join(root, 'examples')))
      if (
        file.endsWith('index.yaml')
          ? false
          : !exIndex.items.includes(
              file
                .split(/[\\/]/)
                .pop()!
                .replace(/\.yaml$/, ''),
            )
      )
        warn(rel(root, file), '没有列在 examples/index.yaml 的 items 里，页面上看不到它');
  }

  // 课程目录
  const curricula: ContentBundle['curricula'] = [];
  const listed = new Map<string, string>();
  for (const file of walk(join(root, 'curriculum'))) {
    const name = rel(root, file);
    if (name === 'curriculum/grades.yaml') continue;
    const m = name.match(/^curriculum\/([a-z0-9-]+)\/grade(\d+)\.yaml$/);
    if (!m) {
      err(name, '课程目录文件要放在 curriculum/<学科>/grade<年级>.yaml');
      continue;
    }
    const data = readYaml(root, file, 'curriculum', issues);
    if (!data) continue;
    if (data.subject !== m[1] || data.grade !== Number(m[2]))
      err(name, `文件里的 subject/grade（${data.subject}/${data.grade}）和文件位置不一致`);
    if (grades && !subjectIds.has(data.subject))
      err(name, `学科 ${data.subject} 不在 grades.yaml 里`);
    if (grades && !gradeIds.has(data.grade)) err(name, `年级 ${data.grade} 不在 grades.yaml 里`);
    const unitIds = new Set<string>();
    for (const unit of data.units) {
      if (unitIds.has(unit.id)) err(name, `单元 id 重复：${unit.id}`);
      unitIds.add(unit.id);
      for (const entry of unit.lessons) {
        const id = typeof entry === 'string' ? entry : entry.id;
        if (listed.has(id))
          err(name, `知识点 ${id} 在目录里出现了两次（另一处：${listed.get(id)}）`);
        listed.set(id, name);
        const lf = lessonById.get(id);
        if (!lf) {
          if (typeof entry === 'string')
            warn(
              name,
              `${id} 还没有知识点文件，会显示为“即将上线”；建议写成 { id, title } 给出名称`,
            );
        } else if (lf.subject !== data.subject || lf.grade !== data.grade) {
          err(name, `知识点 ${id} 的文件在 ${lf.file}，和本目录的学科/年级不一致`);
        }
      }
    }
    curricula.push({ file: name, data });
  }
  for (const lf of lessons)
    if (!listed.has(lf.lesson.id))
      warn(lf.file, `知识点 ${lf.lesson.id} 没有列在任何课程目录里，页面上看不到它`);

  const ok = !issues.some((i) => i.level === 'error');
  return {
    bundle:
      ok && site && grades && help && texts && style && exIndex
        ? {
            root,
            site,
            help,
            texts,
            style,
            examples: { ...exIndex, list: exampleList },
            grades,
            curricula,
            lessons,
            assets,
          }
        : undefined,
    issues,
  };
}

export function formatIssue(i: Issue): string {
  const where = i.line ? `${i.file}:${i.line}` : i.file;
  return `${i.level === 'error' ? '✗' : '!'} ${where}  ${i.message}`;
}
