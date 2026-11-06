import { styleConfig, type Theme } from './style';
import type { ThemeId } from './types';

/** 动画主题列表（顺序同 style.yaml） */
export function themeList(): Theme[] {
  return Object.entries(styleConfig().themes).map(([id, theme]) => ({
    id: id as ThemeId,
    ...theme,
  }));
}

/** 按 id 取主题；id 不认识时用 flat */
export function getTheme(id: string | undefined): Theme {
  const themes = styleConfig().themes;
  const key = (id && Object.hasOwn(themes, id) ? id : 'flat') as ThemeId;
  return { id: key, ...themes[key] };
}
