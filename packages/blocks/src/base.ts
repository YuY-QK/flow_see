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

export interface Subitem {
  /** 子项名（不含零件 id），如 'bar.2'、'v1'、'd0' */
  name: string;
  /** 舞台坐标的包围盒（点中判定、高亮框都用它） */
  box: Box;
  /** 读屏名称的参数（如序号、数值），名称模板在 texts.yaml 的 a11y.subitem */
  label?: string;
  /** 数值（tap 按条件点时的 {n}；money 的面值；item-set 的 value） */
  value?: number;
  /** 类别（sort 用，来自 item-set 的 tags） */
  tags?: Record<string, string>;
}

export interface Handle {
  /** 改哪个属性（顶层属性名） */
  prop: string;
  /** 把手当前位置（舞台坐标） */
  at: Point;
  /** 拖动方式：rotate 绕 center 转；drag 跟手移动 */
  kind: 'rotate' | 'drag';
  center?: Point;
  /** 由指针位置算出属性的新值（不负责吸附，吸附由播放器按 step 做） */
  valueAt(pointer: Point): number;
  /** 属性的取值范围 */
  min: number;
  max: number;
  /** 改数组属性时的下标（polygon 顶点，见 B12） */
  index?: number;
  /** 由指针位置直接算出新的属性集合（polygon 顶点、protractor 整体拖动）；有它时不调用 valueAt，turn（T2）不使用这类把手 */
  apply?(p: Props, pointer: Point): Props;
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
  subitems?(p: Props): Subitem[];
  handles?(p: Props): Handle[];
  /** 顶点是否直接定位（如 polygon、path）：绕点旋转或翻折时直接变换 points 数组，不改 rotate */
  rotatesPoints?: boolean;
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
