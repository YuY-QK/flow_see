// 同一组接口测试分别跑在 Cloudflare（KV）和 Node（文件）两种存储上，直接用标准 Request 调用。
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { onRequest } from '../functions/api/[[path]].js';
import { createKvStore } from './kv-store.mjs';
import { createApiHandler, newToken, sameToken } from './share-api.mjs';
import { createFileStore } from './store.mjs';

/** 模拟 Workers KV */
function fakeKv() {
  const map = new Map();
  return {
    map,
    async get(key, type) {
      const v = map.get(key);
      return v === undefined ? null : type === 'json' ? JSON.parse(v) : v;
    },
    async put(key, value) {
      map.set(key, value);
    },
  };
}

const dirs = [];
afterAll(() => Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true }))));

const stores = {
  'KV（Cloudflare）': async () => createKvStore(fakeKv()),
  '文件（Node）': async () => {
    const d = await mkdtemp(join(tmpdir(), 'flow-see-api-'));
    dirs.push(d);
    return createFileStore(d);
  },
};

const anim = (title) => ({ id: 'a_1', templateId: 'message', title, steps: [] });

for (const [name, make] of Object.entries(stores)) {
  describe(`分享接口 · ${name}`, () => {
    const call = async (method, path, { body, token } = {}) => {
      const handle = createApiHandler({ store: await make(), onError: () => {} });
      return handle(
        new Request(`https://example.com${path}`, {
          method,
          headers: {
            'content-type': 'application/json',
            ...(token ? { authorization: `Bearer ${token}` } : {}),
          },
          body:
            body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
        }),
      );
    };

    it('创建、读取、凭证正确才能更新', async () => {
      const handle = createApiHandler({ store: await make() });
      const req = (method, path, body, token) =>
        handle(
          new Request(`https://example.com${path}`, {
            method,
            headers: {
              'content-type': 'application/json',
              ...(token ? { authorization: `Bearer ${token}` } : {}),
            },
            body: body && JSON.stringify(body),
          }),
        );
      const created = await req('POST', '/api/shares', {
        animation: { ...anim('甲'), share: { token: 'x' } },
      });
      expect(created.status).toBe(201);
      const { id, token } = await created.json();

      const got = await (await req('GET', `/api/shares/${id}`)).json();
      expect(got.animation.title).toBe('甲');
      expect(got.animation.share).toBeUndefined();
      expect(JSON.stringify(got)).not.toContain(token);

      expect(
        (await req('PUT', `/api/shares/${id}`, { animation: anim('乙') }, 'wrong')).status,
      ).toBe(403);
      expect((await req('PUT', `/api/shares/${id}`, { animation: anim('乙') }, token)).status).toBe(
        200,
      );
      expect((await (await req('GET', `/api/shares/${id}`)).json()).animation.title).toBe('乙');
    });

    it('拒绝不合法的作品、坏 JSON 和过大的请求', async () => {
      expect(
        (await call('POST', '/api/shares', { body: { animation: { title: 'x' } } })).status,
      ).toBe(400);
      expect((await call('POST', '/api/shares', { body: '{oops' })).status).toBe(400);
      const big = { animation: { ...anim('大'), pad: 'x'.repeat(1.2e6) } };
      expect((await call('POST', '/api/shares', { body: big })).status).toBe(413);
    });

    it('不存在的 id、未知路径和方法', async () => {
      expect((await call('GET', '/api/shares/abcdefgh')).status).toBe(404);
      expect((await call('GET', '/api/nope')).status).toBe(404);
      expect((await call('DELETE', '/api/shares/abcdefgh')).status).toBe(405);
      expect(await call('GET', '/learn/1/math')).toBeNull();
    });

    it('允许跨域', async () => {
      const res = await call('OPTIONS', '/api/shares');
      expect(res.status).toBe(204);
      expect(res.headers.get('access-control-allow-origin')).toBe('*');
    });
  });
}

describe('Pages Functions 入口', () => {
  it('用绑定的 KV 存取分享', async () => {
    const env = { SHARES: fakeKv() };
    const post = await onRequest({
      env,
      request: new Request('https://x.pages.dev/api/shares', {
        method: 'POST',
        body: JSON.stringify({ animation: anim('丙') }),
      }),
    });
    expect(post.status).toBe(201);
    const { id } = await post.json();
    expect([...env.SHARES.map.keys()]).toEqual([`share:${id}`]);
    const get = await onRequest({
      env,
      request: new Request(`https://x.pages.dev/api/shares/${id}`),
    });
    expect((await get.json()).animation.title).toBe('丙');
  });

  it('没有绑定 KV 时返回明确的错误', async () => {
    const res = await onRequest({
      env: {},
      request: new Request('https://x.pages.dev/api/shares/abcdefgh'),
    });
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('kv_not_bound');
  });
});

describe('凭证', () => {
  it('随机且足够长，比较正确', () => {
    const a = newToken();
    expect(a.length).toBeGreaterThan(20);
    expect(a).not.toBe(newToken());
    expect(sameToken(a, a)).toBe(true);
    expect(sameToken(a, a + 'x')).toBe(false);
    expect(sameToken(a, newToken())).toBe(false);
  });
});
