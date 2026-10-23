// 动画流服务端：分享接口 + 提供打包后的前端页面。
//   开发：pnpm server（配合 pnpm dev，Vite 会把 /api 转发到这里）
//   生产：pnpm build && pnpm start
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.mjs';
import { createFileStore } from './store.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = Number(process.env.PORT ?? 8787);
const DATA_DIR = process.env.DATA_DIR ?? join(root, 'server', 'data', 'shares');
const DIST = join(root, 'dist');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
};

async function serveStatic(_req, res, url) {
  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
  let file = join(DIST, rel);
  if (!file.startsWith(DIST)) {
    res.writeHead(403);
    return res.end();
  }
  try {
    if (!(await stat(file)).isFile()) throw new Error('dir');
  } catch {
    // 前端路由（/play/xx、/s/xx 等）都返回 index.html
    file = join(DIST, 'index.html');
  }
  try {
    await stat(file);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    return res.end('还没有打包前端，请先运行 pnpm build');
  }
  const type = TYPES[extname(file)] ?? 'application/octet-stream';
  const cache = file.includes(`${join(DIST, 'assets')}`)
    ? 'public, max-age=31536000, immutable'
    : 'no-cache';
  res.writeHead(200, { 'content-type': type, 'cache-control': cache });
  createReadStream(file).pipe(res);
}

const app = createApp({ store: createFileStore(DATA_DIR), fallback: serveStatic });
createServer(app).listen(PORT, () => {
  console.log(`动画流服务已启动：http://localhost:${PORT}`);
});
