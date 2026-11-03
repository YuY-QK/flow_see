import { defineConfig } from 'vitest/config';
import { contentPlugin } from './packages/content/src/vite-plugin';

// 单元测试统一在根目录运行：各个包、网站和服务端的测试一起跑。
export default defineConfig({
  plugins: [contentPlugin()],
  resolve: {
    alias: { '@/': new URL('./apps/web/src/', import.meta.url).pathname },
  },
  test: {
    environment: 'node',
    include: [
      'packages/*/src/**/*.test.ts',
      'apps/*/src/**/*.test.ts',
      'server/**/*.test.mjs',
      'functions/**/*.test.mjs',
    ],
  },
});
