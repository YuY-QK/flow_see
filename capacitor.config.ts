import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.flowsee.app',
  appName: '动画流',
  webDir: 'dist',
  android: {
    // 用 https 方案加载页面，IndexedDB 与剪贴板等能力与网页版一致
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
