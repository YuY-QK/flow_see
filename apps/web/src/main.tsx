// 先注入站点配置（必须最先执行）
import './bootstrap';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { setupNative } from '@flow-see/runtime/services/native.ts';
import { App } from './App';
import './styles/global.css';

void setupNative();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
