// Node 适配层：把 node:http 的请求转成标准 Request，交给 share-api.mjs 处理。
import { createApiHandler } from './share-api.mjs';

export { MAX_BODY } from './share-api.mjs';

/** 请求体转成 Web 流；提前停止读取时丢弃剩余数据，不断开连接（还要发回响应） */
function bodyStream(req) {
  return new ReadableStream({
    start(controller) {
      req.on('data', (chunk) => {
        controller.enqueue(new Uint8Array(chunk));
        if (controller.desiredSize <= 0) req.pause();
      });
      req.on('end', () => controller.close());
      req.on('error', (e) => controller.error(e));
    },
    pull() {
      req.resume();
    },
    cancel() {
      req.removeAllListeners('data');
      req.resume();
    },
  });
}

function toRequest(req) {
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) v.forEach((x) => headers.append(k, x));
    else if (v !== undefined) headers.set(k, v);
  }
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  return new Request(url, {
    method: req.method,
    headers,
    body: hasBody ? bodyStream(req) : undefined,
    duplex: hasBody ? 'half' : undefined,
  });
}

/**
 * @param {{ store: ReturnType<import('./store.mjs').createFileStore>, fallback?: Function, cors?: boolean }} opts
 */
export function createApp({ store, fallback, cors = true }) {
  const api = createApiHandler({ store, cors });
  return async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const response = await api(toRequest(req));
    if (!response) {
      if (fallback) return fallback(req, res, url);
      res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: 'not_found' }));
    }
    const headers = Object.fromEntries(response.headers);
    // 请求体没有读完就返回时关闭连接，避免同一连接上的后续请求卡住
    if (!req.complete) headers.connection = 'close';
    res.writeHead(response.status, headers);
    res.end(Buffer.from(await response.arrayBuffer()));
  };
}
