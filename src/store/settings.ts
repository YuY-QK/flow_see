import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { Speed, ThemeId } from '@/engine';

export type Language = 'zh-CN' | 'en-US';

export interface Settings {
  /** 新建动画时默认使用的动画主题 */
  defaultTheme: ThemeId;
  /** 界面语言，同时决定朗读语言 */
  language: Language;
  /** 大字号：按钮和文字整体放大 */
  largeText: boolean;
  /** 播放时自动朗读 */
  autoNarrate: boolean;
  /** 朗读声音（speechSynthesis 的 voiceURI），空 = 系统默认 */
  voiceURI: string;
  /** 朗读语速 */
  speechRate: number;
  /** 默认播放速度 */
  defaultSpeed: Speed;
}

export const DEFAULT_SETTINGS: Settings = {
  defaultTheme: 'flat',
  language: 'zh-CN',
  largeText: false,
  autoNarrate: true,
  voiceURI: '',
  speechRate: 1,
  defaultSpeed: 1,
};

/** 本地存储可能不可用（隐私模式、内嵌页面），读写失败时退回默认值 */
const safeStorage: StateStorage = {
  getItem: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* 忽略 */
    }
  },
  removeItem: (k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* 忽略 */
    }
  },
};

interface SettingsState extends Settings {
  set(patch: Partial<Settings>): void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      set: (patch) => set(patch),
    }),
    {
      name: 'flow-see-settings',
      storage: createJSONStorage(() => safeStorage),
      partialize: ({ set: _set, ...rest }) => rest,
    },
  ),
);
