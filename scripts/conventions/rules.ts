// 仓库约定检查：把 CLAUDE.md 里“配置优先”的规则变成会失败的检查（pnpm test、pnpm build 都会跑）。
// 每条规则返回问题列表；问题为空才算通过。新增规则时：在这里加函数，并加进 runAll()。
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { parse } from 'yaml';
import {
  ALLOW_CHINESE,
  ALLOW_COLOR_IN_CODE,
  ALLOW_CSS_LITERALS,
  ALLOW_TIMING,
  type Allow,
} from './allow';

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
  /** 有没有第二个参数（不是对象字面量时，没法检查变量名） */
  hasVarsArg: boolean;
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
      out.push({ file: sf.fileName, line, key, vars, hasVarsArg: !!b });
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
      } else if (!c.hasVarsArg && [...text.matchAll(PLACEHOLDER)].length) {
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

/* ───────────── 规则 3：代码里不写颜色值 ───────────── */

const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/;

/** 源码里字符串写了颜色值的地方：颜色放 CSS 变量（global.css）或 style.yaml / site.yaml */
export function colorsIn(sf: ts.SourceFile): { line: number; text: string }[] {
  const out: { line: number; text: string }[] = [];
  const visit = (n: ts.Node) => {
    if (
      (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) &&
      COLOR_LITERAL.test(n.text)
    )
      out.push({ line: sf.getLineAndCharacterOfPosition(n.getStart()).line + 1, text: n.text });
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

export function noColorInCode(files = sourceFiles()): Problem[] {
  return files
    .filter((file) => !allowed(file, ALLOW_COLOR_IN_CODE))
    .flatMap((file) =>
      colorsIn(parseSource(file)).map(({ line, text }) => ({
        rule: 'no-color-in-code',
        file,
        line,
        message: `代码里不要直接写颜色：${text.slice(0, 30)}。界面颜色用 CSS 变量（global.css），动画主题和导出的颜色放 style.yaml，零件颜色放 site.yaml 的 scene.colors`,
      })),
    );
}

/* ───────────── 规则 4：样式文件里的颜色和字号 ───────────── */

const STYLE_FILES = /^(apps\/web\/src|packages\/[a-z]+\/src)\/.*\.css$/;
const TOKEN_FILE = 'apps/web/src/styles/global.css';

/** 一条样式问题：行号 + 原文 */
export function styleProblems(
  css: string,
  isTokenFile: boolean,
): { line: number; kind: 'color' | 'font-size'; text: string }[] {
  const out: { line: number; kind: 'color' | 'font-size'; text: string }[] = [];
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  // 变量块：global.css 里选择器是 :root 或 html[data-theme…] 的块，颜色和字号变量在这里定义
  const tokenRanges: [number, number][] = [];
  if (isTokenFile)
    for (const m of noComments.matchAll(/(:root|html\[data-theme[^\]]*\])\s*\{[^{}]*\}/g))
      tokenRanges.push([m.index!, m.index! + m[0].length]);
  const inToken = (i: number) => tokenRanges.some(([a, b]) => i >= a && i < b);
  const lineAt = (i: number) => noComments.slice(0, i).split('\n').length;
  for (const m of noComments.matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/g))
    if (!inToken(m.index!)) out.push({ line: lineAt(m.index!), kind: 'color', text: m[0] });
  for (const m of noComments.matchAll(/font-size:\s*([^;}]+)/g)) {
    const v = m[1].trim();
    if (!/^(var\(--fs-[\w-]+\)|inherit|initial|unset)$/.test(v))
      out.push({ line: lineAt(m.index!), kind: 'font-size', text: `font-size: ${v}` });
  }
  return out;
}

export function styleRules(files = trackedFiles()): Problem[] {
  return files
    .filter((f) => STYLE_FILES.test(f) && !allowed(f, ALLOW_CSS_LITERALS))
    .flatMap((file) =>
      styleProblems(readFileSync(join(ROOT, file), 'utf8'), file === TOKEN_FILE).map((p) => ({
        rule: p.kind === 'color' ? 'css-color' : 'css-font-size',
        file,
        line: p.line,
        message:
          p.kind === 'color'
            ? `样式里不要直接写颜色：${p.text}。用 global.css 里的 CSS 变量；没有合适的变量就在 :root（和深色主题）里新增一个`
            : `字号要用 global.css 里的 --fs-* 变量，不要写 ${p.text}`,
      })),
    );
}

/* ───────────── 规则 5：不在代码里写死时长 ───────────── */

/** setTimeout / setInterval 的时长写了数字（0 除外）的地方：时长放 site.yaml，从配置读 */
export function timingsIn(sf: ts.SourceFile): { line: number; text: string }[] {
  const out: { line: number; text: string }[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isCallExpression(n)) {
      const name = ts.isPropertyAccessExpression(n.expression)
        ? n.expression.name.text
        : ts.isIdentifier(n.expression)
          ? n.expression.text
          : '';
      const delay = n.arguments[1];
      if ((name === 'setTimeout' || name === 'setInterval') && delay) {
        const literal = ts.isNumericLiteral(delay) ? delay : undefined;
        const arith = !literal && /^[\d_\s*/+.-]+$/.test(delay.getText(sf)) ? delay : undefined;
        if ((literal && Number(literal.text.replaceAll('_', '')) > 0) || arith)
          out.push({
            line: sf.getLineAndCharacterOfPosition(n.getStart()).line + 1,
            text: n.getText(sf).slice(0, 40),
          });
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

export function noMagicTiming(files = sourceFiles()): Problem[] {
  return files
    .filter((file) => !allowed(file, ALLOW_TIMING))
    .flatMap((file) =>
      timingsIn(parseSource(file)).map(({ line, text }) => ({
        rule: 'no-magic-timing',
        file,
        line,
        message: `不要在代码里写死时长：${text}。时长放到 packages/content/site.yaml（player / ui / editor 等），代码从配置读取`,
      })),
    );
}

/* ───────────── 规则 6：配置和样式里的同一个数要一致 ───────────── */

/** 头像颜色个数：site.yaml 的 profile.avatarCount 要和 global.css 里 --avatar-N 的个数一致 */
export function avatarCountMatches(): Problem[] {
  const site = parse(readFileSync(join(ROOT, 'packages/content/site.yaml'), 'utf8')) as {
    profile?: { avatarCount?: number };
  };
  const css = readFileSync(join(ROOT, TOKEN_FILE), 'utf8');
  const root = /:root\s*\{[^{}]*\}/.exec(css)?.[0] ?? '';
  const count = new Set([...root.matchAll(/--avatar-(\d+)\s*:/g)].map((m) => m[1])).size;
  return site.profile?.avatarCount === count
    ? []
    : [
        {
          rule: 'avatar-count',
          file: 'packages/content/site.yaml',
          message: `profile.avatarCount（${site.profile?.avatarCount}）要和 global.css 里 --avatar-N 的个数（${count}）一致`,
        },
      ];
}

export function runAll(): Problem[] {
  const files = sourceFiles();
  return [
    ...noChineseInCode(files),
    ...textKeysMatch(files),
    ...noColorInCode(files),
    ...styleRules(),
  ];
}

export function format(p: Problem): string {
  return `✗ [${p.rule}] ${p.file}${p.line ? ':' + p.line : ''}  ${p.message}`;
}
