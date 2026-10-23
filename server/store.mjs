// 分享内容的存储：每个分享一个 JSON 文件。数据量变大后可换成数据库，接口不变。
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ALPHABET = '23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
const ID_RE = /^[23456789a-km-zA-HJ-NP-Z]{8}$/;

/** 8 位短 id，去掉了容易看错的字符（0 O 1 l I） */
export function newId() {
  const bytes = randomBytes(8);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

export function isValidId(id) {
  return typeof id === 'string' && ID_RE.test(id);
}

function sameToken(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * @param {string} dir 存放分享文件的目录
 */
export function createFileStore(dir) {
  const file = (id) => join(dir, `${id}.json`);

  async function read(id) {
    try {
      return JSON.parse(await readFile(file(id), 'utf8'));
    } catch (e) {
      if (e.code === 'ENOENT') return null;
      throw e;
    }
  }

  async function write(id, record) {
    await mkdir(dir, { recursive: true });
    // 先写临时文件再改名，避免写到一半被读到
    const tmp = `${file(id)}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(record));
    await rename(tmp, file(id));
  }

  return {
    async create(animation) {
      let id = newId();
      while (await read(id)) id = newId();
      const token = randomBytes(24).toString('base64url');
      const now = Date.now();
      await write(id, { id, token, animation, createdAt: now, updatedAt: now });
      return { id, token };
    },

    async update(id, token, animation) {
      if (!isValidId(id)) return 'not_found';
      const old = await read(id);
      if (!old) return 'not_found';
      if (!sameToken(old.token, token)) return 'forbidden';
      await write(id, { ...old, animation, updatedAt: Date.now() });
      return 'ok';
    },

    async get(id) {
      if (!isValidId(id)) return null;
      const r = await read(id);
      return r ? { id: r.id, animation: r.animation, updatedAt: r.updatedAt } : null;
    },
  };
}
