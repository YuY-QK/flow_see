// 积木层：可复用的画面零件（计数块、数轴、钟面、分数圆……）。
// 依赖方向：templates → blocks → runtime → core。
// 每个零件是一个 PartDef：默认属性 + 包围盒 + 渲染。零件都是纯函数：同样的属性画出同样的画面。
import type { PartDef, Props, ResolvedPart, Subitem } from './base';
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
import { arcPart } from './parts/arc';
import { circleCutPart } from './parts/circlecut';
import { columnCalcPart } from './parts/columncalc';
import { batteryPart, bulbPart, switchPart, wirePart } from './parts/circuit';
import { sunShadowPart } from './parts/sunshadow';
import { particlesPart } from './parts/particles';
import { thermometerPart } from './parts/thermometer';
import { splitCalcPart } from './parts/splitcalc';
import { fractionPart, labelPart, textPart } from './parts/text';
import { itemSetPart } from './parts/item-set';
import { polygonPart } from './parts/polygon';

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
  clockPart,
  formatClockTime,
  gridPart,
  hopsOf,
  numberlineX,
  parseClockTime,
  type Hop,
} from './parts/math';
export { arcLayout, arcPoint } from './parts/arc';
export { SHAPE_KINDS } from './parts/shapes';
export { displayText, richSpans, textPart } from './parts/text';
export { blankRect, markRect } from './parts/markRect';
export { circleCutLayout, type CircleCutLayout } from './parts/circlecut';
export {
  wireBreaks,
  wireDots,
  wireDrawn,
  wirePath,
  wirePointAt,
  wireProject,
} from './parts/circuit';
export { sunShadowLayout, sunShadowState, type SunShadowState } from './parts/sunshadow';
export { particleLayout, particlePosition, type ParticleLayout } from './parts/particles';
export { COLUMN_CALC_OPS, columnCalcPlan, type ColumnCalcPlan } from './parts/columncalc';
export { splitCalcLayout } from './parts/splitcalc';
export { thermometerFill, thermometerLayout, thermometerMix } from './parts/thermometer';
export {
  ITEM_SET_LAYOUTS,
  ITEM_SET_SHAPES,
  itemSetLayout,
  itemSetPart,
  type ItemSetItem,
  type ItemSetLayout,
  type ItemSetLayoutKind,
  type ItemSetShapeKind,
  type ItemSlot,
} from './parts/item-set';
export { polygonLayout, polygonPart, type PolygonLayoutResult } from './parts/polygon';

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
  arcPart,
  imagePart,
  splitCalcPart,
  columnCalcPart,
  circleCutPart,
  particlesPart,
  sunShadowPart,
  batteryPart,
  bulbPart,
  switchPart,
  wirePart,
  thermometerPart,
  itemSetPart,
  polygonPart,
];

/** 配置里也可以用的别名：数字、算式都是文字零件 */
const ALIASES: Record<string, string> = { number: 'text', formula: 'text' };

const byType = new Map(PARTS.map((p) => [p.type, p]));

export function getPart(type: string): ResolvedPart | undefined {
  const part = byType.get(ALIASES[type] ?? type);
  return part && { ...part, defaults: sceneStyle().parts[part.type] ?? {} };
}

/** 动态注册零件（测试或后续扩展零件用） */
export function registerPart(part: PartDef): void {
  byType.set(part.type, part);
}

/** 注销动态注册的零件（测试清理用） */
export function unregisterPart(type: string): void {
  byType.delete(type);
}
export const PART_TYPES: readonly string[] = [...PARTS.map((p) => p.type), ...Object.keys(ALIASES)];

/** 计数块一类的零件（可以拆分、合并） */
export function isCounters(type: string): boolean {
  return type === 'counters' || type === 'tenframe';
}

/** 查找子项；支持 '*' 通配（如 'bar.*'、'row.*'），匹配到 '*' 时返回数组；无 subitems 时返回 undefined */
export function findSubitem(
  def: PartDef,
  props: Props,
  name: `${string}*${string}`,
): Subitem[] | undefined;
export function findSubitem(def: PartDef, props: Props, name: string): Subitem | Subitem[] | undefined;
export function findSubitem(
  def: PartDef,
  props: Props,
  name: string,
): Subitem | Subitem[] | undefined {
  if (!def.subitems) return undefined;
  const items = def.subitems(props);
  if (name.includes('*')) {
    const pattern =
      '^' +
      name
        .split('*')
        .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*') +
      '$';
    const re = new RegExp(pattern);
    return items.filter((it) => re.test(it.name));
  }
  return items.find((it) => it.name === name);
}
