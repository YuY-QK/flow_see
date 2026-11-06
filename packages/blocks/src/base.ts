// 零件的公共定义：属性读取、颜色、包围盒。
import type { ComponentType } from 'react';
import type { Theme } from '@flow-see/core';
import { sceneStyle } from './style';

export type Props = Record<string, unknown>;
export type Point = [number, number];

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PartContext {
  theme: Theme;
  /** 素材 id → 地址；找不到时返回 undefined（零件显示灰色占位） */
  assetUrl?(id: string): string | undefined;
}

/** 零件定义。默认属性不在这里写死：来自 site.yaml 的 scene.parts.<type>，由 getPart() 补上。 */
export interface PartDef {
  /** 配置里写的 type */
  type: string;
  /** 中文名（文档、报错用） */
  name: string;
  /** at 的含义：center = 零件中心；start = 左上角（数轴是最左端） */
  anchor: 'center' | 'start';
  /** 必填属性 */
  required?: string[];
  /** 这个零件认识的属性（除公共属性外），用于发现配置里的拼写错误 */
  props: string[];
  /** 把配置里方便手写的写法换成内部用的数值（如钟面的 "3:30" → 210 分钟） */
  normalize?(props: Props): Props;
  /** 包围盒（舞台坐标），高亮框和旋转/缩放中心用 */
  bbox(p: Props): Box;
  Render: ComponentType<{ p: Props; ctx: PartContext }>;
}

/** 所有零件都有的属性 */
export const COMMON_PROPS = [
  'id',
  'type',
  'at',
  'hidden',
  'opacity',
  'scale',
  'rotate',
  'color',
  'note',
] as const;

/* ───────────── 读取属性 ───────────── */

export function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

export function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : typeof v === 'number' ? String(v) : fallback;
}

export function isPoint(v: unknown): v is Point {
  return Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === 'number');
}

export function pt(v: unknown, fallback: Point = [0, 0]): Point {
  return isPoint(v) ? v : fallback;
}

export function numList(v: unknown): number[] {
  return Array.isArray(v) ? v.filter((n): n is number => typeof n === 'number') : [];
}

/* ───────────── 颜色 ───────────── */

/** 跟随动画主题的颜色名 */
export const THEME_COLORS = ['ink', 'dim', 'accent', 'line'] as const;

/** 配置里可以直接写的颜色名（site.yaml 的 scene.colors） */
export function namedColors(): Record<string, string> {
  return sceneStyle().colors;
}

export function isColor(v: unknown): boolean {
  if (typeof v !== 'string') return false;
  return (
    Object.hasOwn(namedColors(), v) ||
    (THEME_COLORS as readonly string[]).includes(v) ||
    /^#[0-9a-fA-F]{6}$/.test(v)
  );
}

export function color(v: unknown, theme: Theme, fallback = 'ink'): string {
  const name = typeof v === 'string' && v ? v : fallback;
  if (Object.hasOwn(namedColors(), name)) return namedColors()[name];
  if ((THEME_COLORS as readonly string[]).includes(name))
    return theme[name as (typeof THEME_COLORS)[number]];
  return /^#[0-9a-fA-F]{6}$/.test(name) ? name : theme.ink;
}

function hex(c: string): [number, number, number] | null {
  const m = c.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
}

/** 两个 #RRGGBB 之间插值；不是 #RRGGBB 时过半切换 */
export function mixColor(a: string, b: string, t: number): string {
  const x = hex(a);
  const y = hex(b);
  if (!x || !y) return t < 0.5 ? a : b;
  const c = x.map((v, i) => Math.round(v + (y[i] - v) * t));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

/* ───────────── 文字宽度估算（不依赖浏览器排版，导出和测试都能用） ───────────── */

/** 字符属于哪一类（宽度系数见 site.yaml 的 scene.textMetrics） */
function charKind(ch: string): 'digit' | 'latin' | 'space' | 'operator' | 'wide' {
  if (/[0-9]/.test(ch)) return 'digit';
  if (ch === ' ') return 'space';
  if (/[+\-−×÷=<>*/·%]/.test(ch)) return 'operator';
  return ch.charCodeAt(0) < 0x100 ? 'latin' : 'wide';
}

export function textWidth(text: string, size: number): number {
  const m = sceneStyle().textMetrics;
  let w = 0;
  for (const ch of text) w += m[charKind(ch)];
  return w * size;
}

export function boxAround(cx: number, cy: number, w: number, h: number): Box {
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

/** 取到手的零件：定义 + 配置里的默认属性 */
export type ResolvedPart = PartDef & { defaults: Props };
