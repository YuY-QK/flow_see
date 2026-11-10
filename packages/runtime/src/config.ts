// 运行时配置：由应用（apps/web）启动时根据 site.yaml 注入。
// runtime 处在内容层之下，不能直接读取内容配置，所以通过这里传进来。
import { t, type AfterSpeechConfig, type DwellConfig } from '@flow-see/core';
import type { ReadAsRule } from './services/readAs';

export interface RuntimeConfig {
  /** 网站名称：导出视频的署名、备份文件提示等 */
  siteName: string;
  /** 分享接口地址，如 /api 或 https://example.com/api */
  shareApiBase: string;
  /** 分享链接使用的网址（不含路径），如 https://example.com */
  shareOrigin: string;
  /** 播放节奏（site.yaml 的 player） */
  player: { dwell: DwellConfig; afterSpeech: AfterSpeechConfig; maxFrameMs: number };
  /** 创作编辑器（site.yaml 的 editor） */
  editor: { autosaveMs: number; stepDurations: number[] };
  /** 导出文件下载后，多久释放临时地址（site.yaml 的 ui.saveRevokeMs） */
  saveRevokeMs: number;
  /** 朗读规整规则（site.yaml 的 speech.readAs） */
  speech?: { readAs?: ReadAsRule[] };
}

let current: RuntimeConfig | undefined;

export function configureRuntime(config: RuntimeConfig): void {
  current = config;
}

export function runtimeConfig(): RuntimeConfig {
  if (!current) throw new Error(t('runtimeConfig.hai_mei_you_pei'));
  return current;
}
