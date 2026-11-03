// Cloudflare 上的分享存储：Workers KV。键为 share:<id>，值为分享记录的 JSON。
import { createShareService } from './share-api.mjs';

/**
 * @param {{ get(key: string, type: 'json'): Promise<any>, put(key: string, value: string): Promise<void> }} kv
 *   Pages Functions 里绑定的 KV 命名空间（env.SHARES）
 */
export function createKvStore(kv) {
  const key = (id) => `share:${id}`;
  return createShareService({
    read: (id) => kv.get(key(id), 'json'),
    write: (id, record) => kv.put(key(id), JSON.stringify(record)),
  });
}
