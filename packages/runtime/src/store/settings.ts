import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Speed, ThemeId } from '@flow-see/core';
import { safeStorage } from './safeStorage';

export type Language = 'zh-CN' | 'en-US';
export type UiTheme = 'light' | 'dark' | 'auto';

export interface Settings {
  /** 界面主题 */
  uiTheme: UiTheme;
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

/**
 * 默认值不写在这里：应用启动时由 initSettings() 传入（来自 site.yaml 的 defaults）。
 * 在那之前读取到的是空对象。
 */
const UNSET = {} as Settings;
let defaults: Settings = UNSET;

interface SettingsState extends Settings {
  set(patch: Partial<Settings>): void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...UNSET,
      set: (patch) => set(patch),
    }),
    {
      name: 'flow-see-settings',
      storage: createJSONStorage(() => safeStorage('local')),
      partialize: ({ set: _set, ...rest }) => rest,
      // 等默认值注入后再读取本机设置，本机设置优先
      skipHydration: true,
      merge: (persisted, current) => ({
        ...current,
        ...defaults,
        ...(persisted as Partial<Settings>),
      }),
    },
  ),
);

/** 应用启动时调用一次：先放入默认值，再用本机保存的设置覆盖 */
export function initSettings(values: Settings): void {
  // 不能直接 setState(defaults)：那样会先把默认值写进本机存储，覆盖用户的设置
  defaults = values;
  void useSettings.persist.rehydrate();
}
