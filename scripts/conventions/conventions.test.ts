import { describe, expect, it } from 'vitest';
import {
  chineseIn,
  colorsIn,
  findTextCalls,
  format,
  parseSource,
  runAll,
  styleProblems,
} from './rules';

// 这些检查是 CLAUDE.md“配置优先”的自动执行：失败时按提示改，不要放宽检查。
// 确有必要的例外，加到 allow.ts 并写明原因。
describe('仓库约定', () => {
  it('整体通过', () => {
    expect(runAll().map(format)).toEqual([]);
  });
});

describe('检查本身是可靠的', () => {
  it('能发现代码里的中文（字符串、模板、JSX 文字），注释和 t() 调用不算', () => {
    const src = [
      '// 注释里的中文不算',
      "const a = '分享';",
      'const b = `第 ${n} 步`;',
      'const c = <p>你好</p>;',
      "const d = t('home.title');",
      "const e = 'abc';",
    ].join('\n');
    const found = chineseIn(parseSource('apps/web/src/x.tsx', src));
    expect(found.map((f) => [f.line, f.text])).toEqual([
      [2, '分享'],
      [3, '第'],
      [3, '步'],
      [4, '你好'],
    ]);
  });

  it('能找出 t() 调用的键和代入的变量；键不是字面量时没有 key', () => {
    const src = "t('a.b'); t('a.c', { n, total: 3 }); t(name); t(`x.${y}`);";
    const calls = findTextCalls(parseSource('apps/web/src/x.ts', src));
    expect(calls.map((c) => [c.key, c.vars])).toEqual([
      ['a.b', undefined],
      ['a.c', ['n', 'total']],
      [undefined, undefined],
      [undefined, undefined],
    ]);
  });

  it('能发现代码里的颜色值', () => {
    const src =
      "const a = '#fff'; const b = 'rgba(0,0,0,.4)'; const c = 'var(--ink)'; const d = '#RRGGBB';";
    expect(colorsIn(parseSource('apps/web/src/x.ts', src)).map((c) => c.text)).toEqual([
      '#fff',
      'rgba(0,0,0,.4)',
    ]);
  });

  it('样式文件：颜色只能写在 global.css 的变量块里，字号必须用 --fs-* 变量', () => {
    const css = [
      ':root { --ink: #111111; --fs-md: 14px; }',
      "html[data-theme='dark'] { --ink: #eeeeee; }",
      '.a { color: #fff; font-size: 14px; }',
      '.b { background: rgba(0,0,0,.4); font-size: var(--fs-md); }',
      '.c { font-size: clamp(1px, 2vw, 3px); }',
      '/* .d { color: #000; } */',
    ].join('\n');
    const got = styleProblems(css, true).map((p) => [p.line, p.kind]);
    expect(got).toEqual([
      [3, 'color'],
      [4, 'color'],
      [3, 'font-size'],
      [5, 'font-size'],
    ]);
    // 不是变量文件时，变量块里的颜色也不允许
    expect(styleProblems(':root { --a: #fff; }', false)).toHaveLength(1);
  });
});
