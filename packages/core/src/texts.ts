// 界面文案：全部写在 packages/content/texts.yaml，代码里用 t('分组.键') 读取，不写死。
// 文案里的 {名字} 用第二个参数代入：t('lesson.steps', { n: 6 })。
// 启动时调用 configureTexts() 注入（网站见 bootstrap.ts，测试见 vitest.setup.ts，content:check 见 cli/check.ts）。

export type Texts = Record<string, Record<string, string>>;

let current: Texts | undefined;
let strict = false;

/**
 * 注入文案。strict = true（测试、content:check）时，缺少的键直接抛错；
 * 网站运行时不能因为一个键缺失让整页崩掉，改为显示 ⟦键⟧ 并在控制台报错（仓库的约定检查会提前拦住缺键）。
 */
export function configureTexts(texts: Texts, opts: { strict?: boolean } = {}): void {
  current = texts;
  strict = !!opts.strict;
}

export type TextVars = Record<string, string | number | undefined>;

export function t(key: string, vars?: TextVars): string {
  const dot = key.indexOf('.');
  const text = current?.[key.slice(0, dot)]?.[key.slice(dot + 1)];
  if (text === undefined) {
    const msg = `缺少文案：${key}（请在 packages/content/texts.yaml 里添加）`;
    if (strict || !current) throw new Error(msg);
    console.error(msg);
    return `⟦${key}⟧`;
  }
  return vars
    ? text.replace(/\{(\w+)\}/g, (m, name: string) =>
        vars[name] === undefined ? m : String(vars[name]),
      )
    : text;
}
