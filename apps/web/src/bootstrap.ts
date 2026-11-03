// 启动：把站点配置注入运行时（分享接口、署名、设置的默认值）。必须在其他模块使用 runtime 之前执行。
import { configureRuntime } from '@flow-see/runtime/config.ts';
import { initSettings } from '@flow-see/runtime/store/settings.ts';
import { site } from './site';

/** site.yaml 里的语速档位 → 朗读接口的语速 */
const SPEECH_RATE = { slow: 0.8, normal: 1, fast: 1.2 } as const;

/** App 打包时用环境变量把相对地址换成公网服务器地址 */
function apiBase(): string {
  const base = site.share.apiBase;
  const origin = import.meta.env.VITE_API_BASE;
  return origin && base.startsWith('/') ? origin.replace(/\/$/, '') + base : base;
}

configureRuntime({
  siteName: site.site.name,
  shareApiBase: apiBase().replace(/\/$/, ''),
  shareOrigin:
    import.meta.env.VITE_SHARE_ORIGIN ?? (typeof location !== 'undefined' ? location.origin : ''),
});

const d = site.defaults;
initSettings({
  uiTheme: d.uiTheme,
  defaultTheme: d.animTheme,
  language: 'zh-CN',
  largeText: d.fontSize === 'large',
  autoNarrate: d.narrate,
  voiceURI: '',
  speechRate: SPEECH_RATE[d.speechRate],
  defaultSpeed: d.speed,
});

if (typeof document !== 'undefined') document.title = site.site.name;
