import type { StateStorage } from 'zustand/middleware';

/** 本地存储可能不可用（隐私模式、内嵌页面），读写失败时当作没有数据 */
export function safeStorage(kind: 'local' | 'session'): StateStorage {
  const get = () => (kind === 'local' ? localStorage : sessionStorage);
  return {
    getItem: (k) => {
      try {
        return get().getItem(k);
      } catch {
        return null;
      }
    },
    setItem: (k, v) => {
      try {
        get().setItem(k, v);
      } catch {
        /* 忽略 */
      }
    },
    removeItem: (k) => {
      try {
        get().removeItem(k);
      } catch {
        /* 忽略 */
      }
    },
  };
}

/** 本机存储是否可用（隐私模式下可能不可用，规格 2.4） */
export function storageAvailable(): boolean {
  try {
    const k = '__flow_see_probe__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}
