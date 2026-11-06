import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app.mjs';
import { createFileStore, isValidId, newId } from './store.mjs';

let dir;
let server;
let base;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'flow-see-'));
  server = createServer(createApp({ store: createFileStore(dir) }));
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  server.close();
  await rm(dir, { recursive: true, force: true });
});

const anim = (title) => ({ id: 'a_1', templateId: 'message', title, steps: [] });
const post = (body) =>
  fetch(`${base}/api/shares`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('分享接口', () => {
  it('创建后可以读取，不返回修改凭证，也不保存作者本地的分享信息', async () => {
    const res = await post({ animation: { ...anim('甲'), share: { token: 'secret' } } });
    expect(res.status).toBe(201);
    const { id, token } = await res.json();
    expect(isValidId(id)).toBe(true);
    expect(token.length).toBeGreaterThan(20);

    const got = await fetch(`${base}/api/shares/${id}`).then((r) => r.json());
    expect(got.animation.title).toBe('甲');
    expect(got.animation.share).toBeUndefined();
    expect(JSON.stringify(got)).not.toContain(token);
  });

  it('凭证正确才能更新', async () => {
    const { id, token } = await post({ animation: anim('乙') }).then((r) => r.json());
    const put = (t) =>
      fetch(`${base}/api/shares/${id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${t}` },
        body: JSON.stringify({ animation: anim('乙 2') }),
      });
    expect((await put('wrong')).status).toBe(403);
    expect((await put(token)).status).toBe(200);
    const got = await fetch(`${base}/api/shares/${id}`).then((r) => r.json());
    expect(got.animation.title).toBe('乙 2');
  });

  it('拒绝不合法的作品和过大的请求', async () => {
    expect((await post({ animation: { title: 'x' } })).status).toBe(400);
    expect((await post({ animation: { ...anim('大'), pad: 'x'.repeat(1.2e6) } })).status).toBe(413);
    const bad = await fetch(`${base}/api/shares`, { method: 'POST', body: '{oops' });
    expect(bad.status).toBe(400);
  });

  it('不存在或格式不对的 id 返回 404', async () => {
    expect((await fetch(`${base}/api/shares/abcdefgh`)).status).toBe(404);
    expect((await fetch(`${base}/api/shares/..%2F..%2Fetc`)).status).toBe(404);
    expect((await fetch(`${base}/api/nope`)).status).toBe(404);
  });

  it('允许跨域（App 访问）', async () => {
    const res = await fetch(`${base}/api/shares`, { method: 'OPTIONS' });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('短 id 不含易混字符', () => {
    for (let i = 0; i < 200; i++) expect(newId()).toMatch(/^[^0O1lI]{8}$/);
  });
});
