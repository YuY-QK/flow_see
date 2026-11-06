import type { CapacitorConfig } from '@capacitor/cli';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

// App 名称取自站点公共配置（packages/content/site.yaml）
const site = parse(readFileSync(new URL('./packages/content/site.yaml', import.meta.url), 'utf8'));

const config: CapacitorConfig = {
  appId: 'com.flowsee.app',
  appName: site?.site?.name ?? 'App',
  webDir: 'apps/web/dist',
  android: {
    // 用 https 方案加载页面，IndexedDB 与剪贴板等能力与网页版一致
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
