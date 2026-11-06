// Node 上的分享存储：每个分享一个 JSON 文件。Cloudflare 上用 kv-store.mjs，接口相同。
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createShareService, isValidId, newId } from './share-api.mjs';

export { isValidId, newId };

/**
 * @param {string} dir 存放分享文件的目录
 */
export function createFileStore(dir) {
  const file = (id) => join(dir, `${id}.json`);

  return createShareService({
    async read(id) {
      try {
        return JSON.parse(await readFile(file(id), 'utf8'));
      } catch (e) {
        if (e.code === 'ENOENT') return null;
        throw e;
      }
    },
    async write(id, record) {
      await mkdir(dir, { recursive: true });
      // 先写临时文件再改名，避免写到一半被读到
      const tmp = `${file(id)}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
      await writeFile(tmp, JSON.stringify(record));
      await rename(tmp, file(id));
    },
  });
}
