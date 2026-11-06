// 分享接口的核心逻辑：只用标准的 Request / Response / Web Crypto，
// Node 服务（server/app.mjs）和 Cloudflare Pages Functions（functions/api/[[path]].js）共用这一份。
//
//   POST /api/shares          body: { animation }          → 201 { id, token }
//   PUT  /api/shares/:id      Authorization: Bearer <token> → 200 { id }
//   GET  /api/shares/:id                                   → 200 { id, animation, updatedAt }
//
// 存储做成接口，两边各自实现：
//   create(record) / read(id) / write(id, record)
//   record = { id, token, animation, createdAt, updatedAt }

export const MAX_BODY = 1024 * 1024;

const ALPHABET = '23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
const ID_RE = /^[23456789a-km-zA-HJ-NP-Z]{8}$/;

function randomBytes(n) {
  return crypto.getRandomValues(new Uint8Array(n));
}

/** 8 位短 id，去掉了容易看错的字符（0 O 1 l I） */
export function newId() {
  return Array.from(randomBytes(8), (b) => ALPHABET[b % ALPHABET.length]).join('');
}

export function isValidId(id) {
  return typeof id === 'string' && ID_RE.test(id);
}

/** 修改凭证：24 字节随机数，base64url */
export function newToken() {
  let s = '';
  for (const b of randomBytes(24)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** 长度相同时逐字比较全部字符，不因提前结束泄露信息 */
export function sameToken(a, b) {
  const x = String(a);
  const y = String(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** 读取 JSON 请求体，超过 MAX_BODY 就停止读取 */
async function readJson(request) {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY) throw new HttpError(413, 'too large');
  const chunks = [];
  let size = 0;
  if (request.body) {
    const reader = request.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY) {
        await reader.cancel().catch(() => {});
        throw new HttpError(413, 'too large');
      }
      chunks.push(value);
    }
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes) || '{}');
  } catch {
    throw new HttpError(400, 'bad json');
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

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type, authorization',
  'access-control-allow-methods': 'GET, POST, PUT, OPTIONS',
};

/**
 * 分享业务：在存储接口之上实现创建、更新、读取。
 * @param {{ read(id: string): Promise<any>, write(id: string, record: any): Promise<void> }} storage
 */
export function createShareService(storage) {
  return {
    async create(animation) {
      let id = newId();
      while (await storage.read(id)) id = newId();
      const token = newToken();
      const now = Date.now();
      await storage.write(id, { id, token, animation, createdAt: now, updatedAt: now });
      return { id, token };
    },
    async update(id, token, animation) {
      if (!isValidId(id)) return 'not_found';
      const old = await storage.read(id);
      if (!old) return 'not_found';
      if (!sameToken(old.token, token)) return 'forbidden';
      await storage.write(id, { ...old, animation, updatedAt: Date.now() });
      return 'ok';
    },
    async get(id) {
      if (!isValidId(id)) return null;
      const r = await storage.read(id);
      return r ? { id: r.id, animation: r.animation, updatedAt: r.updatedAt } : null;
    },
  };
}

/**
 * 处理 /api/ 下的请求。不是 /api/ 开头的请求返回 null，交给调用方（提供网页等）。
 * @param {{ store: ReturnType<typeof createShareService>, cors?: boolean, onError?: (e: unknown) => void }} opts
 * @returns {(request: Request) => Promise<Response | null>}
 */
export function createApiHandler({ store, cors = true, onError = console.error }) {
  const send = (status, body) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        ...(cors ? CORS : {}),
      },
    });

  return async function handle(request) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return null;

    // App（Capacitor）从另一个来源访问接口，需要允许跨域
    if (request.method === 'OPTIONS')
      return new Response(null, { status: 204, headers: cors ? CORS : {} });

    try {
      const m = url.pathname.match(/^\/api\/shares(?:\/([^/]+))?\/?$/);
      if (!m) return send(404, { error: 'not_found' });
      const id = m[1];

      if (!id && request.method === 'POST') {
        const body = await readJson(request);
        if (!validAnimation(body.animation)) return send(400, { error: 'invalid_animation' });
        return send(201, await store.create(clean(body.animation)));
      }

      if (id && request.method === 'PUT') {
        const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
        const body = await readJson(request);
        if (!validAnimation(body.animation)) return send(400, { error: 'invalid_animation' });
        const r = await store.update(id, token, clean(body.animation));
        if (r === 'not_found') return send(404, { error: 'not_found' });
        if (r === 'forbidden') return send(403, { error: 'forbidden' });
        return send(200, { id });
      }

      if (id && request.method === 'GET') {
        const r = await store.get(id);
        return r ? send(200, r) : send(404, { error: 'not_found' });
      }

      return send(405, { error: 'method_not_allowed' });
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      if (status === 500) onError(e);
      return send(status, { error: status === 500 ? 'server_error' : e.message });
    }
  };
}
