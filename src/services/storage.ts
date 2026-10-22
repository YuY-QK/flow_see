// 作品存储。界面只依赖 AnimationRepository 接口；
// 以后接入账号时，可以换成“本地 + 云端同步”的实现。
import Dexie, { type Table } from 'dexie';
import { migrate, type Animation } from '@/engine';

export interface AnimationRepository {
  list(): Promise<Animation[]>;
  get(id: string): Promise<Animation | undefined>;
  save(animation: Animation): Promise<void>;
  remove(id: string): Promise<void>;
}

class FlowDB extends Dexie {
  animations!: Table<Animation, string>;
  constructor(name: string) {
    super(name);
    this.version(1).stores({ animations: 'id, updatedAt' });
  }
}

export function createLocalRepository(dbName = 'flow-see'): AnimationRepository {
  const db = new FlowDB(dbName);
  return {
    async list() {
      const rows = await db.animations.orderBy('updatedAt').reverse().toArray();
      return rows.map(migrate).filter((a): a is Animation => a !== null);
    },
    async get(id) {
      const row = await db.animations.get(id);
      return row ? (migrate(row) ?? undefined) : undefined;
    },
    async save(animation) {
      await db.animations.put(animation);
    },
    async remove(id) {
      await db.animations.delete(id);
    },
  };
}

export const repository: AnimationRepository = createLocalRepository();
