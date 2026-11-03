import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createAnimation } from '@/engine';
import { importBackup, makeBackup } from './backup';
import { createLocalRepository } from './storage';

describe('备份与导入', () => {
  it('新作品加入，较新的覆盖，较旧的和无法识别的跳过', async () => {
    const repo = createLocalRepository('backup-' + Math.random());
    const kept = createAnimation({ templateId: 'message', title: '本机较新' }, 5000);
    const old = createAnimation({ templateId: 'message', title: '本机较旧' }, 1000);
    await repo.save(kept);
    await repo.save(old);

    const fresh = createAnimation({ templateId: 'flow', title: '新的' }, 2000);
    const backup = makeBackup([
      fresh,
      { ...kept, title: '备份里更旧', updatedAt: 100 },
      { ...old, title: '备份里更新', updatedAt: 9000 },
      { nope: true } as never,
    ]);

    const r = await importBackup(JSON.stringify(backup), repo);
    expect(r).toEqual({ added: 1, updated: 1, skipped: 2 });
    expect((await repo.get(kept.id))?.title).toBe('本机较新');
    expect((await repo.get(old.id))?.title).toBe('备份里更新');
    expect((await repo.get(fresh.id))?.title).toBe('新的');
  });

  it('拒绝不是备份的文件', async () => {
    const repo = createLocalRepository('backup-' + Math.random());
    await expect(importBackup('not json', repo)).rejects.toThrow('备份文件');
    await expect(importBackup('{"kind":"x"}', repo)).rejects.toThrow('备份文件');
  });
});
