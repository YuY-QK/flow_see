// 动画主题与导出画面的样式：全部来自 packages/content/style.yaml，代码里不写死。
// 启动时调用 configureStyle() 注入（网站见 texts-init.ts，测试见 vitest.setup.ts，content:check 见 cli/check.ts）。
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

interface TextStyle {
  weight: number;
  size: number;
}

/** 导出视频 / GIF 的画面样式（style.yaml 的 export） */
export interface ExportStyle {
  font: string;
  baseWidth: number;
  darkThemes: string[];
  hold: { minMs: number; maxMs: number };
  video: { width: number; height: number; fps: number; codec: string; bitrate: number };
  gif: { width: number; height: number; colors: number; fadeFrames: number };
  fadeMs: number;
  layout: {
    pad: number;
    titleH: number;
    captionH: number;
    captionRadius: number;
    captionInset: number;
  };
  title: TextStyle;
  signature: TextStyle;
  counter: TextStyle & { top: number };
  step: TextStyle & { top: number };
  desc: TextStyle & { top: number; lineHeight: number; maxLines: number };
  caption: {
    bg: string;
    border: string;
    darkBg: string;
    darkBorder: string;
    counter: string;
    step: string;
    desc: string;
  };
}

export interface StyleConfig {
  themes: Record<ThemeId, Omit<Theme, 'id'>>;
  export: ExportStyle;
  /** 由参数生成画面的模板的版式；具体结构由各模板自己定义（templates 包），格式由 content 的 schema 校验 */
  templates: Record<string, unknown>;
}

let current: StyleConfig | undefined;

export function configureStyle(style: StyleConfig): void {
  current = style;
}

export function styleConfig(): StyleConfig {
  if (!current) throw new Error('样式还没有设置：启动时要先用 style.yaml 调用 configureStyle()');
  return current;
}

export function exportStyle(): ExportStyle {
  return styleConfig().export;
}
