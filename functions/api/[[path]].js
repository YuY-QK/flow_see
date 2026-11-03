// Cloudflare Pages Functions：/api/* 交给共用的分享接口，存储用 KV（绑定名 SHARES，见 wrangler.toml）。
// 其余路径由 Pages 提供静态网页（单页应用自动回退到 index.html）。
import { createApiHandler } from '../../server/share-api.mjs';
import { createKvStore } from '../../server/kv-store.mjs';

export async function onRequest({ request, env }) {
  if (!env.SHARES) {
    return new Response(JSON.stringify({ error: 'kv_not_bound' }), {
      status: 500,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }
  const handle = createApiHandler({ store: createKvStore(env.SHARES) });
  return (await handle(request)) ?? new Response('not found', { status: 404 });
}
