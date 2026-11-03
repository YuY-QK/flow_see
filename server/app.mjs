// 分享接口：
//   POST /api/shares          body: { animation }          → 201 { id, token }
//   PUT  /api/shares/:id      Authorization: Bearer <token> → 200 { id }
//   GET  /api/shares/:id                                   → 200 { id, animation, updatedAt }
// 其余路径交给 fallback（生产环境用来提供前端页面）。

export const MAX_BODY = 1024 * 1024;

function send(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error('too large'), { status: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw Object.assign(new Error('bad json'), { status: 400 });
  }
}

/** 只做最基本的形状检查；作品结构的兼容由前端的 migrate() 处理 */
function validAnimation(a) {
  return (
    a &&
    typeof a === 'object' &&
    typeof a.id === 'string' &&
    typeof a.templateId === 'string' &&
    Array.isArray(a.steps) &&
    a.steps.length <= 500
  );
}

/** 去掉只应保存在作者本地的字段 */
function clean(animation) {
  const { share: _share, ...rest } = animation;
  return rest;
}

/**
 * @param {{ store: ReturnType<import('./store.mjs').createFileStore>, fallback?: Function, cors?: boolean }} opts
 */
export function createApp({ store, fallback, cors = true }) {
  return async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/')) {
      if (fallback) return fallback(req, res, url);
      return send(res, 404, { error: 'not_found' });
    }

    // App（Capacitor）从另一个来源访问接口，需要允许跨域
    if (cors) {
      res.setHeader('access-control-allow-origin', '*');
      res.setHeader('access-control-allow-headers', 'content-type, authorization');
      res.setHeader('access-control-allow-methods', 'GET, POST, PUT, OPTIONS');
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    try {
      const m = url.pathname.match(/^\/api\/shares(?:\/([^/]+))?\/?$/);
      if (!m) return send(res, 404, { error: 'not_found' });
      const id = m[1];

      if (!id && req.method === 'POST') {
        const body = await readJson(req);
        if (!validAnimation(body.animation)) return send(res, 400, { error: 'invalid_animation' });
        const created = await store.create(clean(body.animation));
        return send(res, 201, created);
      }

      if (id && req.method === 'PUT') {
        const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
        const body = await readJson(req);
        if (!validAnimation(body.animation)) return send(res, 400, { error: 'invalid_animation' });
        const r = await store.update(id, token, clean(body.animation));
        if (r === 'not_found') return send(res, 404, { error: 'not_found' });
        if (r === 'forbidden') return send(res, 403, { error: 'forbidden' });
        return send(res, 200, { id });
      }

      if (id && req.method === 'GET') {
        const r = await store.get(id);
        return r ? send(res, 200, r) : send(res, 404, { error: 'not_found' });
      }

      return send(res, 405, { error: 'method_not_allowed' });
    } catch (e) {
      const status = e.status ?? 500;
      if (status === 500) console.error(e);
      // 请求体没有读完就返回，关闭连接，避免同一连接上的后续请求卡住
      if (status === 413) res.setHeader('connection', 'close');
      return send(res, status, { error: status === 500 ? 'server_error' : e.message });
    }
  };
}
