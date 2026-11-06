import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { contentPlugin } from '../../packages/content/src/vite-plugin';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

export default defineConfig({
  // 内容配置（packages/content）→ virtual:content；网页标题等也由它填入
  plugins: [react(), contentPlugin()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  // .env.app 等环境变量文件放在仓库根目录
  envDir: fileURLToPath(new URL('../..', import.meta.url)),
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // 开发时把分享接口转发到本地服务端（pnpm server）
    proxy: { '/api': 'http://localhost:8787' },
    fs: { allow: ['../..'] },
  },
});
