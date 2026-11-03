import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Settings } from './settings';

const DEFAULTS: Settings = {
  uiTheme: 'light',
  defaultTheme: 'cute',
  language: 'zh-CN',
  largeText: false,
  autoNarrate: true,
  voiceURI: '',
  speechRate: 1,
  defaultSpeed: 1,
};

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

describe('设置', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('没有本机设置时用注入的默认值', async () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const { initSettings, useSettings } = await import('./settings');
    initSettings(DEFAULTS);
    expect(useSettings.getState().defaultTheme).toBe('cute');
    expect(useSettings.getState().uiTheme).toBe('light');
  });

  it('本机设置优先，注入默认值不会覆盖它', async () => {
    const storage = memoryStorage();
    vi.stubGlobal('localStorage', storage);
    let m = await import('./settings');
    m.initSettings(DEFAULTS);
    m.useSettings.getState().set({ uiTheme: 'dark' });

    // 模拟刷新页面
    vi.resetModules();
    m = await import('./settings');
    m.initSettings(DEFAULTS);
    expect(m.useSettings.getState().uiTheme).toBe('dark');
    expect(m.useSettings.getState().defaultTheme).toBe('cute');
  });
});
