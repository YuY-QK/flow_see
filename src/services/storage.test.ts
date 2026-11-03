import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createAnimation } from '@/engine';
import { createLocalRepository } from './storage';

describe('本地作品存储', () => {
  it('保存、读取、按最近修改排序、删除', async () => {
    const repo = createLocalRepository('test-' + Math.random());
    const a = createAnimation({ templateId: 'message', title: 'A' }, 1000);
    const b = createAnimation({ templateId: 'message', title: 'B' }, 2000);
    await repo.save(a);
    await repo.save(b);

    expect((await repo.get(a.id))?.title).toBe('A');
    expect((await repo.list()).map((x) => x.title)).toEqual(['B', 'A']);

    await repo.save({ ...a, title: 'A2', updatedAt: 3000 });
    expect((await repo.list()).map((x) => x.title)).toEqual(['A2', 'B']);

    await repo.remove(b.id);
    expect(await repo.get(b.id)).toBeUndefined();
    expect(await repo.list()).toHaveLength(1);
  });
});
