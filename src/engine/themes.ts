import type { ThemeId } from './types';

/** 动画主题：只影响动画画面，不影响界面本身。 */
export interface Theme {
  id: ThemeId;
  name: string;
  stageBg: string;
  stageBorder: string;
  ink: string;
  dim: string;
  accent: string;
  line: string;
  labelBg: string;
  /** 元素依次使用的颜色 */
  palette: string[];
  elementInk: string;
  radius: number;
  font: string;
}

export const THEMES: Record<ThemeId, Theme> = {
  pro: {
    id: 'pro',
    name: '专业风',
    stageBg: '#FFFFFF',
    stageBorder: '#E6E8EF',
    ink: '#1F2433',
    dim: '#9AA3B5',
    accent: '#1F2A44',
    line: '#C9CEDA',
    labelBg: '#EEF1F7',
    palette: ['#1F2A44', '#3A4A6B', '#56657F', '#2B5D7C'],
    elementInk: '#FFFFFF',
    radius: 6,
    font: 'inherit',
  },
  flat: {
    id: 'flat',
    name: '简洁扁平',
    stageBg: '#F4F7FF',
    stageBorder: '#DCE5FF',
    ink: '#1F2433',
    dim: '#A9B6DA',
    accent: '#2F5FE0',
    line: '#BFCBEF',
    labelBg: '#DCE5FF',
    palette: ['#2F5FE0', '#C25A00', '#1E7F4F', '#6B4FD8'],
    elementInk: '#FFFFFF',
    radius: 14,
    font: 'inherit',
  },
  cute: {
    id: 'cute',
    name: '卡通可爱',
    stageBg: '#FFF6EC',
    stageBorder: '#FFE0C2',
    ink: '#5A3A22',
    dim: '#E9B999',
    accent: '#E8603C',
    line: '#F5C9A6',
    labelBg: '#FFE3CC',
    palette: ['#FF8A65', '#7C83FD', '#4DB6AC', '#F6B93B'],
    elementInk: '#FFFFFF',
    radius: 28,
    font: '"Comic Sans MS", "PingFang SC", sans-serif',
  },
  chalk: {
    id: 'chalk',
    name: '手绘黑板',
    stageBg: '#24443A',
    stageBorder: '#24443A',
    ink: '#F2F0E6',
    dim: '#7F9A8F',
    accent: '#F6D776',
    line: '#6E8C80',
    labelBg: 'transparent',
    palette: ['#F2F0E6', '#F6D776', '#A8E0C8', '#F4B6B6'],
    elementInk: '#24443A',
    radius: 4,
    font: '"Kaiti SC", STKaiti, KaiTi, serif',
  },
};

export const THEME_LIST = Object.values(THEMES);

export function getTheme(id: string | undefined): Theme {
  return THEMES[id as ThemeId] ?? THEMES.flat;
}
