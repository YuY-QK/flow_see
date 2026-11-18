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
import { numberBondPart } from './parts/number-bond';
import { polygonPart } from './parts/polygon';
import { pathPart } from './parts/path';
import { moneyPart } from './parts/money';
import { cubeStackPart } from './parts/cube-stack';
import { solidPart } from './parts/solid';
import { placeValuePart } from './parts/place-value';
import { baseTenPart } from './parts/base-ten';
import { numberChartPart } from './parts/number-chart';
import { exprStepsPart } from './parts/expr-steps';
import { rulerPart } from './parts/ruler';
import { balancePart } from './parts/balance';
import { tablePart } from './parts/table';
import { calendarPart } from './parts/calendar';
import { anglePart } from './parts/angle';
import { coordinateGridPart } from './parts/coordinate-grid';
import { directionPart } from './parts/direction';
import { circleDrawPart } from './parts/circle-draw';
import { chancePart } from './parts/chance';
import { chartPart } from './parts/chart';
import { protractorPart } from './parts/protractor';
import { fractionAreaPart } from './parts/fraction-area';
import { trackPart } from './parts/track';
import { tapeDiagramPart } from './parts/tape-diagram';

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
  formatTickValue,
  fractionBarPart,
  fractionCirclePart,
  gridPart,
  hopsOf,
  numberlinePart,
  numberlineX,
  parseClockTime,
  tickLabel,
  type Hop,
  type NumberlineLayer,
  type TickValue,
} from './parts/math';
export { arcLayout, arcPoint } from './parts/arc';
export {
  SHAPE_KINDS,
  arrowPart,
  distanceToStageBoundary,
  imagePart,
  lineLayout,
  linePart,
  shapePart,
  type LineLayout,
} from './parts/shapes';
export { displayText, richSpans, textPart, RichLine } from './parts/text';
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
export {
  COLUMN_CALC_OPS,
  columnCalcPlan,
  divisionSteps,
  subtractionSteps,
  type ColumnCalcPlan,
  type DivisionStep,
  type DivStepType,
  type SubtractionStep,
} from './parts/columncalc';
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
export {
  numberBondLayout,
  numberBondPart,
  type NumberBondLayout,
  type NumberBondNode,
} from './parts/number-bond';
export { polygonLayout, polygonPart, type PolygonLayoutResult } from './parts/polygon';
export {
  pathLayout,
  pathPart,
  type PathLayoutResult,
  type PathMarkerLayout,
  type PathSegment,
} from './parts/path';
export {
  DEFAULT_MONEY_COLORS,
  MONEY_LAYOUTS,
  isDarkBackground,
  moneyLayout,
  moneyPart,
  parseDenomination,
  type MoneyDenomination,
  type MoneyLabels,
  type MoneyLayout,
  type MoneyLayoutKind,
  type MoneySlot,
} from './parts/money';
export {
  CUBE_NETS,
  solidLayout,
  solidPart,
  type CubeNet,
  type FaceName,
  type SolidEdgeDef,
  type SolidFaceDef,
  type SolidKind,
  type SolidLayoutResult,
} from './parts/solid';

export {
  cameraForView,
  cubeFallOffset,
  cubeStackLayout,
  cubeStackPart,
  cubeStackProjections,
  cullOccludedCubes,
  fillCubes,
  parseView,
  sortCubesPainter,
  type CubeCoord,
  type CubeStackCamera,
  type CubeStackLabels,
  type CubeStackLayoutResult,
  type PlacedCube,
} from './parts/cube-stack';

export {
  PLACE_VALUE_STYLES,
  placeValueLayout,
  placeValuePart,
  type BeadInfo,
  type GroupHeader,
  type PlaceColumn,
  type PlaceValueLabels,
  type PlaceValueLayout,
  type PlaceValueStyleKind,
} from './parts/place-value';

export {
  BASE_TEN_STYLES,
  baseTenLayout,
  baseTenPart,
  cubeMetrics,
  type BaseTenBlockItem,
  type BaseTenBundleItem,
  type BaseTenColumn,
  type BaseTenLayout,
  type BaseTenStickItem,
  type BaseTenStyle,
  type BaseTenTransition,
} from './parts/base-ten';
export {
  exprStepsLayout,
  exprStepsPart,
  type ExprStepsLayoutResult,
  type ExprStepsLine,
  type ExprStepsOpSubitem,
} from './parts/expr-steps';

export {
  NUMBER_CHART_MARK_STYLES,
  numberChartLayout,
  numberChartPart,
  type NumberChartCell,
  type NumberChartCellMark,
  type NumberChartCol,
  type NumberChartLayout,
  type NumberChartMarkDef,
  type NumberChartMarkStyle,
  type NumberChartRow,
} from './parts/number-chart';

export {
  RULER_UNITS,
  rulerLayout,
  rulerPart,
  rulerX,
  type RulerLayout,
  type RulerMagnifierLayout,
  type RulerObjectLayout,
  type RulerTick,
  type RulerUnit,
} from './parts/ruler';

export {
  BALANCE_KINDS,
  balanceDialAngle,
  balanceLayout,
  balancePart,
  balanceTilt,
  type BalanceDialTick,
  type BalanceItemSlot,
  type BalanceKind,
  type BalanceLabels,
  type BalanceLayout,
} from './parts/balance';

export {
  parseTallyValue,
  tableLayout,
  tablePart,
  type TableCell,
  type TableCellDiagonal,
  type TableCellTally,
  type TableCol,
  type TableGridLine,
  type TableLayout,
  type TableRow,
  type TallyStroke,
} from './parts/table';
export {
  calendarLayout,
  calendarPart,
  daysInMonth,
  getDayOfWeek,
  isLeapYear,
  FALLBACK_CALENDAR_LABELS,
  type CalendarDayItem,
  type CalendarLabels,
  type CalendarLayout,
  type CalendarMonthBarItem,
  type CalendarWeekdayHeader,
} from './parts/calendar';

export {
  defaultAngleLabels,
  angleLayout,
  anglePart,
  anglePoint,
  getAngleKind,
  type AngleKind,
  type AngleLabels,
  type AngleLayout,
  type AngleRayLayout,
} from './parts/angle';

export {
  COORDINATE_GRID_ORIGINS,
  coordinateGridLayout,
  coordinateGridPart,
  gridPoint,
  type CoordinateGridLabelItem,
  type CoordinateGridLayout,
  type CoordinateGridOrigin,
  type CoordinateGridPointDef,
  type CoordinateGridPointLayout,
} from './parts/coordinate-grid';

export {
  COMPASS_DIRS,
  COMPASS_LABEL_GAP,
  COMPASS_LABEL_SIZE,
  CLOCK_NUM_SIZE,
  TARGET_ICON_SIZE,
  directionLayout,
  directionPart,
  directionPoint,
  labelsOf as directionLabelsOf,
  type ClockNumberLayout,
  type ClockTickLayout,
  type CompassArrowLayout,
  type CompassDirLabelLayout,
  type DirectionLabels,
  type DirectionLayoutResult,
  type DirectionMode,
  type DirectionScaleBar,
  type DirectionTarget,
  type ScaleBarLayout,
  type TargetLayout,
} from './parts/direction';

export {
  CIRCLE_DRAW_LABEL_SIZE,
  CIRCLE_DRAW_STROKE_WIDTH,
  circleDrawLayout,
  circleDrawPart,
  defaultCircleDrawLabels,
  type CircleDrawCompassLayout,
  type CircleDrawLabels,
  type CircleDrawLayout,
  type CircleDrawRollLayout,
} from './parts/circle-draw';

export {
  BAG_BALL_RADIUS,
  CHANCE_KINDS,
  COIN_FACES,
  COIN_RADIUS,
  MAX_BAG_BALLS_PER_ROW,
  SPINNER_RADIUS,
  chanceLabelsOf,
  chanceLayout,
  chancePart,
  chancePolarPoint,
  generateChanceResults,
  mulberry32,
  type ChanceActiveBallLayout,
  type ChanceBagLayout,
  type ChanceCoinLayout,
  type ChanceDrawnBallLayout,
  type ChanceHandLayout,
  type ChanceItem,
  type ChanceKind,
  type ChanceLabels,
  type ChanceLayoutResult,
  type ChanceSectorLayout,
  type ChanceSpinnerLayout,
  type ChanceTallyLayout,
  type ChanceTallyRowLayout,
  type CoinFace,
  type GenerateChanceOptions,
} from './parts/chance';

export {
  CHART_KINDS,
  chartLabelsOf,
  chartLayout,
  chartPart,
  piePoint,
  type ChartAverageLine,
  type ChartAxisNameLabel,
  type ChartAxisTick,
  type ChartBarItem,
  type ChartCategoryLabel,
  type ChartColumnItem,
  type ChartKind,
  type ChartLabels,
  type ChartLayout,
  type ChartLegendItem,
  type ChartLineSeries,
  type ChartPictoColumn,
  type ChartPictoIcon,
  type ChartPieLayout,
  type ChartPieSlice,
  type ChartPointItem,
  type ChartValueLabel,
  type ChartXYLayout,
} from './parts/chart';

export {
  INNER_FONT_SIZE,
  INNER_LABEL_INSET,
  MAJOR_TICK_LEN,
  MID_TICK_LEN,
  MINOR_TICK_LEN,
  OUTER_FONT_SIZE,
  OUTER_LABEL_INSET,
  PROTRACTOR_SCALES,
  ROTATE_HANDLE_OFFSET,
  protractorLayout,
  protractorPart,
  protractorPoint,
  type ProtractorHighlight,
  type ProtractorHighlightLine,
  type ProtractorLayout,
  type ProtractorScale,
  type ProtractorScaleLabel,
  type ProtractorTick,
} from './parts/protractor';

export {
  FRACTION_AREA_BORDER_WIDTH,
  FRACTION_AREA_COL_OPACITY,
  FRACTION_AREA_GRID_WIDTH,
  FRACTION_AREA_OVERLAP_OPACITY,
  FRACTION_AREA_ROW_OPACITY,
  fractionAreaLayout,
  fractionAreaPart,
  type FractionAreaCell,
  type FractionAreaGridLine,
  type FractionAreaLayout,
} from './parts/fraction-area';

export {
  TRACK_END_FONT_SIZE,
  TRACK_END_GAP,
  TRACK_END_POST_HALF,
  TRACK_GAP_FONT_SIZE,
  TRACK_ICON_SIZE,
  TRACK_LINE_WIDTH,
  TRACK_MARK_FONT_SIZE,
  TRACK_MOVER_LABEL_SIZE,
  TRACK_TRAVELED_FONT_SIZE,
  TRACK_TRAVELED_WIDTH,
  trackLabelsOf,
  trackLayout,
  trackPart,
  type TrackEndLayout,
  type TrackGapLayout,
  type TrackLabels,
  type TrackLane,
  type TrackLayoutResult,
  type TrackMarkItem,
  type TrackMoverFrom,
  type TrackMoverInput,
  type TrackMoverLayout,
  type TrackTraveledLineLayout,
} from './parts/track';

export {
  DEFAULT_SEG_COLORS,
  TAPE_BRACE_GAP,
  TAPE_BRACE_HEIGHT,
  TAPE_BRACE_LABEL_OFFSET,
  TAPE_BRACE_SIDES,
  TAPE_END_TICK_HEIGHT,
  TAPE_FILL_HEIGHT,
  TAPE_FONT_SIZE,
  TAPE_LABEL_POSITIONS,
  TAPE_ROW_LABEL_GAP,
  TAPE_SEG_LABEL_OFFSET,
  TAPE_STROKE_WIDTH,
  TAPE_SUB_TICK_HEIGHT,
  buildCurlyBracePath,
  normalizeTapeDiagramProps,
  tapeDiagramLayout,
  tapeDiagramPart,
  type TapeBraceLayout,
  type TapeBraceSide,
  type TapeBraceSpec,
  type TapeDiagramLayout,
  type TapeFillBarLayout,
  type TapeLabelPos,
  type TapeRowLayout,
  type TapeSegmentLayout,
  type TapeTickLayout,
} from './parts/tape-diagram';

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
  numberBondPart,
  polygonPart,
  pathPart,
  moneyPart,
  cubeStackPart,
  solidPart,
  placeValuePart,
  baseTenPart,
  numberChartPart,
  exprStepsPart,
  rulerPart,
  balancePart,
  tablePart,
  calendarPart,
  anglePart,
  coordinateGridPart,
  directionPart,
  circleDrawPart,
  chancePart,
  chartPart,
  protractorPart,
  fractionAreaPart,
  trackPart,
  tapeDiagramPart,
];

/** 配置里也可以用的别名：数字、算式都是文字零件 */
const ALIASES: Record<string, string> = { number: 'text', formula: 'text' };

const byType = new Map(PARTS.map((p) => [p.type, p]));

export function getPart(type: string): ResolvedPart | undefined {
  const part = byType.get(ALIASES[type] ?? type);
  return part && { ...part, defaults: sceneStyle().parts[part.type] ?? {} };
}

/** 已注册零件列表（带默认属性） */
export function allParts(): ResolvedPart[] {
  let defaultsMap: Record<string, Props> = {};
  try {
    defaultsMap = sceneStyle().parts;
  } catch {
    // sceneStyle() 未注入时的保底
  }
  return Array.from(byType.values()).map((part) => ({
    ...part,
    defaults: defaultsMap[part.type] ?? {},
  }));
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
