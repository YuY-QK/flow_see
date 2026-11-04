// 启动：把站点配置注入运行时（分享接口、署名、设置的默认值）。必须在其他模块使用 runtime 之前执行。
import { configureScene } from '@flow-see/blocks';
import { configureRuntime } from '@flow-see/runtime/config.ts';
import { initSettings } from '@flow-see/runtime/store/settings.ts';
import { site } from './site';

/** App 打包时用环境变量把相对地址换成公网服务器地址 */
function apiBase(): string {
  const base = site.share.apiBase;
  const origin = import.meta.env.VITE_API_BASE;
  return origin && base.startsWith('/') ? origin.replace(/\/$/, '') + base : base;
}

configureRuntime({
  siteName: site.site.name,
  shareApiBase: apiBase().replace(/\/$/, ''),
  player: site.player,
  editor: site.editor,
  saveRevokeMs: site.ui.saveRevokeMs,
  shareOrigin:
    import.meta.env.VITE_SHARE_ORIGIN ?? (typeof location !== 'undefined' ? location.origin : ''),
});

// 场景零件的外观和默认值来自 site.yaml 的 scene
configureScene(site.scene);

const d = site.defaults;
initSettings({
  uiTheme: d.uiTheme,
  defaultTheme: d.animTheme,
  language: 'zh-CN',
  largeText: d.fontSize === 'large',
  autoNarrate: d.narrate,
  voiceURI: '',
  speechRate: site.speech.rates[d.speechRate],
  defaultSpeed: d.speed,
});

if (typeof document !== 'undefined') document.title = site.site.name;
