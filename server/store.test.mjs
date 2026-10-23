import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createFileStore } from './store.mjs';

describe('分享存储', () => {
  it('同一分享并发更新不会出错，保留其中一次的内容', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'flow-see-store-'));
    try {
      const store = createFileStore(dir);
      const { id, token } = await store.create({ title: '0' });
      const results = await Promise.all(
        Array.from({ length: 8 }, (_, i) => store.update(id, token, { title: String(i + 1) })),
      );
      expect(results.every((r) => r === 'ok')).toBe(true);
      expect(Number((await store.get(id)).animation.title)).toBeGreaterThan(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
