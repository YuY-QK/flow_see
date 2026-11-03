// Vite 插件：把 packages/content 下的 YAML 配置变成网站可以 import 的模块。
//   import { content } from 'virtual:content'          目录索引 + 站点配置（首屏）
//   loadLesson(id) → import('virtual:content/lesson/<id>')  知识点完整内容（按需）
// 开发时改了配置文件，浏览器自动刷新；配置有错时在页面上显示错误。
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin, ViteDevServer } from 'vite';
import { buildIndex } from './catalog';
import { formatIssue, loadContent, type ContentBundle } from './load';

export const CONTENT_ROOT = fileURLToPath(new URL('..', import.meta.url));

const INDEX_ID = 'virtual:content';
const LESSON_PREFIX = 'virtual:content/lesson/';

export function contentPlugin(opts: { root?: string } = {}): Plugin {
  const root = opts.root ?? CONTENT_ROOT;
  let dev = false;
  let cache: ContentBundle | undefined;

  function bundle(): ContentBundle {
    if (cache) return cache;
    const { bundle, issues } = loadContent(root);
    const errors = issues.filter((i) => i.level === 'error');
    if (!bundle || errors.length)
      throw new Error(
        `内容配置有错误（运行 pnpm content:check 查看全部）：\n${errors.map(formatIssue).join('\n')}`,
      );
    cache = bundle;
    return bundle;
  }

  return {
    name: 'flow-see-content',
    configResolved(config) {
      dev = config.command === 'serve';
    },
    // index.html 里的 %SITE_NAME% 换成 site.yaml 的网站名称
    transformIndexHtml(html) {
      return html.replaceAll('%SITE_NAME%', bundle().site.site.name);
    },
    resolveId(id) {
      if (id === INDEX_ID || id.startsWith(LESSON_PREFIX)) return '\0' + id;
    },
    load(id) {
      if (id === '\0' + INDEX_ID) {
        const b = bundle();
        const index = buildIndex(b, dev);
        const logo = JSON.stringify(join(root, b.site.site.logo) + '?url');
        const loaders = b.lessons
          .filter((l) => dev || l.lesson.status === 'published')
          .map(
            (l) =>
              `  ${JSON.stringify(l.lesson.id)}: () => import(${JSON.stringify(LESSON_PREFIX + l.lesson.id)}),`,
          )
          .join('\n');
        return [
          `import logoUrl from ${logo};`,
          `export const content = ${JSON.stringify(index)};`,
          `export const assets = { logo: logoUrl };`,
          `const loaders = {\n${loaders}\n};`,
          `export function loadLesson(id) {`,
          `  const load = loaders[id];`,
          `  return load ? load().then((m) => m.default) : Promise.resolve(undefined);`,
          `}`,
        ].join('\n');
      }
      if (id.startsWith('\0' + LESSON_PREFIX)) {
        const lessonId = id.slice(1 + LESSON_PREFIX.length);
        const lf = bundle().lessons.find((l) => l.lesson.id === lessonId);
        if (!lf) throw new Error(`没有这个知识点：${lessonId}`);
        return `export default ${JSON.stringify({ ...lf.lesson, subject: lf.subject, grade: lf.grade })};`;
      }
    },
    configureServer(server: ViteDevServer) {
      server.watcher.add(root);
      const onChange = (file: string) => {
        if (!file.startsWith(root) || !/\.(ya?ml|svg|png|jpe?g|webp)$/.test(file)) return;
        cache = undefined;
        for (const mod of server.moduleGraph.idToModuleMap.values())
          if (mod.id?.startsWith('\0virtual:content')) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('change', onChange);
      server.watcher.on('add', onChange);
      server.watcher.on('unlink', onChange);
    },
  };
}
