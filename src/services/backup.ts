// 作品备份：导出成一个 JSON 文件，在别的设备上导入。
import { migrate, type Animation } from '@/engine';
import type { AnimationRepository } from './storage';

export const BACKUP_KIND = 'flow-see-backup';

export interface Backup {
  kind: typeof BACKUP_KIND;
  version: 1;
  exportedAt: number;
  animations: Animation[];
}

export function makeBackup(animations: Animation[], now = Date.now()): Backup {
  return { kind: BACKUP_KIND, version: 1, exportedAt: now, animations };
}

export interface ImportResult {
  added: number;
  updated: number;
  skipped: number;
}

/** 导入备份：新作品直接加入；同一作品只有备份里的版本更新时才覆盖 */
export async function importBackup(text: string, repo: AnimationRepository): Promise<ImportResult> {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('这不是动画流的备份文件。');
  }
  const b = data as Partial<Backup>;
  if (b?.kind !== BACKUP_KIND || !Array.isArray(b.animations)) {
    throw new Error('这不是动画流的备份文件。');
  }
  const result: ImportResult = { added: 0, updated: 0, skipped: 0 };
  for (const raw of b.animations) {
    const a = migrate(raw);
    if (!a) {
      result.skipped++;
      continue;
    }
    const old = await repo.get(a.id);
    if (!old) {
      await repo.save(a);
      result.added++;
    } else if (a.updatedAt > old.updatedAt) {
      await repo.save(a);
      result.updated++;
    } else result.skipped++;
  }
  return result;
}
