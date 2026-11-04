// 积木层：可复用的画面零件（计数块、数轴、钟面、分数圆……）。
// 依赖方向：templates → blocks → runtime → core。
// 每个零件是一个 PartDef：默认属性 + 包围盒 + 渲染。零件都是纯函数：同样的属性画出同样的画面。
import type { PartDef, ResolvedPart } from './base';
import { sceneStyle } from './style';
import { countersPart, tenframePart } from './parts/counters';
import {
  clockPart,
  digitalClockPart,
  fractionBarPart,
  fractionCirclePart,
  gridPart,
  numberlinePart,
} from './parts/math';
import { arrowPart, imagePart, linePart, shapePart } from './parts/shapes';
import { fractionPart, labelPart, textPart } from './parts/text';

export * from './base';
export { configureScene, sceneStyle, type SceneStyle } from './style';
export { AssetUrlContext } from './context';
export {
  COUNTER_LAYOUTS,
  COUNTER_SHAPES,
  counterColors,
  counterItems,
  counterSlot,
  frameCount,
} from './parts/counters';
export {
  clockAngles,
  formatClockTime,
  hopsOf,
  numberlineX,
  parseClockTime,
  type Hop,
} from './parts/math';
export { SHAPE_KINDS } from './parts/shapes';
export { displayText } from './parts/text';

/** 第一批零件（需求设计 5.5） */
export const PARTS: readonly PartDef[] = [
  textPart,
  fractionPart,
  labelPart,
  countersPart,
  tenframePart,
  numberlinePart,
  clockPart,
  digitalClockPart,
  fractionCirclePart,
  fractionBarPart,
  gridPart,
  shapePart,
  linePart,
  arrowPart,
  imagePart,
];

/** 配置里也可以用的别名：数字、算式都是文字零件 */
const ALIASES: Record<string, string> = { number: 'text', formula: 'text' };

const byType = new Map(PARTS.map((p) => [p.type, p]));

export function getPart(type: string): ResolvedPart | undefined {
  const part = byType.get(ALIASES[type] ?? type);
  return part && { ...part, defaults: sceneStyle().parts[part.type] ?? {} };
}

export const PART_TYPES: readonly string[] = [...PARTS.map((p) => p.type), ...Object.keys(ALIASES)];

/** 计数块一类的零件（可以拆分、合并） */
export function isCounters(type: string): boolean {
  return type === 'counters' || type === 'tenframe';
}
