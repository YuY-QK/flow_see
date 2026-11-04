// 仓库约定检查：把 CLAUDE.md 里“配置优先”的规则变成会失败的检查（pnpm test、pnpm build 都会跑）。
// 每条规则返回问题列表；问题为空才算通过。新增规则时：在这里加函数，并加进 runAll()。
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { parse } from 'yaml';
import { ALLOW_CHINESE, type Allow } from './allow';

export const ROOT = join(import.meta.dirname, '..', '..');

export interface Problem {
  rule: string;
  file: string;
  line?: number;
  message: string;
}

const CJK = /[一-鿿]/;
const SOURCE = /^(apps\/web\/src|packages\/[a-z]+\/src)\/.*\.(ts|tsx)$/;
const IS_TEST = /\.test\.tsx?$|\.d\.ts$/;

export function trackedFiles(): string[] {
  return execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
}

/** 产品源码文件（不含测试和类型声明） */
export function sourceFiles(files = trackedFiles()): string[] {
  return files.filter((f) => SOURCE.test(f) && !IS_TEST.test(f));
}

const allowed = (file: string, list: Allow[]) => list.some((a) => a.path.test(file));

export function parseSource(file: string, text = readFileSync(join(ROOT, file), 'utf8')) {
  return ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

/** 一处 t('分组.键', {…}) 调用 */
export interface TextCall {
  file: string;
  line: number;
  /** 键；不是字符串字面量时为 undefined */
  key?: string;
  /** 第二个参数是对象字面量时，里面的变量名 */
  vars?: string[];
}

export function findTextCalls(sf: ts.SourceFile): TextCall[] {
  const out: TextCall[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 't') {
      const [a, b] = n.arguments;
      const line = sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;
      const key =
        a && (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a)) ? a.text : undefined;
      let vars: string[] | undefined;
      if (b && ts.isObjectLiteralExpression(b)) {
        vars = b.properties.flatMap((p) =>
          ts.isShorthandPropertyAssignment(p) || (ts.isPropertyAssignment(p) && p.name)
            ? [p.name.getText(sf)]
            : [],
        );
      }
      out.push({ file: sf.fileName, line, key, vars });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

/* ───────────── 规则 1：代码里不写中文字符串 ───────────── */

/** 源码里的字符串、模板、JSX 文字里写了中文的地方（注释不算） */
export function chineseIn(sf: ts.SourceFile): { line: number; text: string }[] {
  const out: { line: number; text: string }[] = [];
  const visit = (n: ts.Node) => {
    let text: string | undefined;
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) text = n.text;
    else if (ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) text = n.text;
    else if (ts.isJsxText(n)) text = n.text;
    if (text !== undefined && CJK.test(text))
      out.push({
        line: sf.getLineAndCharacterOfPosition(n.getStart()).line + 1,
        text: text.trim(),
      });
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

/** 代码里不能直接写中文文案：放到 packages/content/texts.yaml，用 t('分组.键') 读取 */
export function noChineseInCode(files = sourceFiles()): Problem[] {
  return files
    .filter((file) => !allowed(file, ALLOW_CHINESE))
    .flatMap((file) =>
      chineseIn(parseSource(file)).map(({ line, text }) => ({
        rule: 'no-chinese-in-code',
        file,
        line,
        message: `代码里不要直接写中文文案：${text.slice(0, 30)}。放到 packages/content/texts.yaml，用 t('分组.键') 读取`,
      })),
    );
}

/* ───────────── 规则 2：t() 的键和 texts.yaml 一一对应 ───────────── */

export function loadTexts(): Record<string, Record<string, string>> {
  return parse(readFileSync(join(ROOT, 'packages/content/texts.yaml'), 'utf8')) ?? {};
}

const PLACEHOLDER = /\{(\w+)\}/g;

export function textKeysMatch(files = sourceFiles()): Problem[] {
  const out: Problem[] = [];
  const texts = loadTexts();
  const used = new Set<string>();
  for (const file of files) {
    for (const c of findTextCalls(parseSource(file))) {
      if (c.key === undefined) {
        out.push({
          rule: 'text-keys',
          file,
          line: c.line,
          message: "t() 的第一个参数必须是写死的字符串，如 t('home.title')，否则无法检查键是否存在",
        });
        continue;
      }
      used.add(c.key);
      const dot = c.key.indexOf('.');
      const text = texts[c.key.slice(0, dot)]?.[c.key.slice(dot + 1)];
      if (text === undefined) {
        out.push({
          rule: 'text-keys',
          file,
          line: c.line,
          message: `texts.yaml 里没有这条文案：${c.key}`,
        });
        continue;
      }
      if (c.vars) {
        const need = new Set([...text.matchAll(PLACEHOLDER)].map((m) => m[1]));
        for (const v of need)
          if (!c.vars.includes(v))
            out.push({
              rule: 'text-keys',
              file,
              line: c.line,
              message: `${c.key} 的文案里有 {${v}}，调用时没有传`,
            });
        for (const v of c.vars)
          if (!need.has(v))
            out.push({
              rule: 'text-keys',
              file,
              line: c.line,
              message: `${c.key} 的文案里没有 {${v}}，多传了`,
            });
      } else if ([...text.matchAll(PLACEHOLDER)].length) {
        out.push({
          rule: 'text-keys',
          file,
          line: c.line,
          message: `${c.key} 的文案里有 {…} 需要代入，调用时要传第二个参数`,
        });
      }
    }
  }
  for (const [g, kv] of Object.entries(texts))
    for (const k of Object.keys(kv))
      if (!used.has(`${g}.${k}`))
        out.push({
          rule: 'text-keys',
          file: 'packages/content/texts.yaml',
          message: `文案 ${g}.${k} 没有被代码用到，删掉它，或者检查代码里是否漏用了`,
        });
  return out;
}

export function runAll(): Problem[] {
  const files = sourceFiles();
  return [...noChineseInCode(files), ...textKeysMatch(files)];
}

export function format(p: Problem): string {
  return `✗ [${p.rule}] ${p.file}${p.line ? ':' + p.line : ''}  ${p.message}`;
}
