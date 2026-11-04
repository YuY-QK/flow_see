// 场景求值：画面 = Stage(场景, 第几步, 步内进度 t)。
// 纯函数：从初始零件出发，把前面各步的动作做完，再把当前步的动作做到 t 对应的时刻。
import {
  counterColors,
  counterItems,
  counterSlot,
  getPart,
  isCounters,
  isPoint,
  mixColor,
  namedColors,
  sceneStyle,
  num,
  type Point,
  type Props,
} from '@flow-see/blocks';
import type { StageTry, TrySpec } from '@flow-see/runtime/template.ts';
import { parseAction, planStep, type SceneAction, type StepPlan } from './actions';

export interface SceneDef {
  stage: { width: number; height: number };
  objects: Props[];
  /** 每一步的动作列表（配置里的 do） */
  steps: (readonly unknown[] | undefined)[];
  /** 每一步的动手做（配置里的 try），没有的为 undefined */
  tries?: (TrySpec | undefined)[];
}

export interface SceneObject {
  id: string;
  type: string;
  /** 零件属性（已补上默认值），另有 opacity、highlight（0–1）、scale、rotate */
  props: Props;
}

export interface SceneFrame {
  objects: SceneObject[];
}

/** 先快后慢（进出都平滑） */
const smooth = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpPt = (a: Point, b: Point, t: number): Point => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

/** 零件的初始状态：默认属性 + 配置（经零件的 normalize 整理） */
export function initialObject(raw: Props): SceneObject | undefined {
  const id = typeof raw.id === 'string' ? raw.id : undefined;
  const type = typeof raw.type === 'string' ? raw.type : undefined;
  const part = type ? getPart(type) : undefined;
  if (!id || !type || !part) return undefined;
  const props: Props = { ...part.defaults, ...(part.normalize?.(raw) ?? raw) };
  props.opacity = raw.hidden === true ? 0 : num(raw.opacity, 1);
  props.highlight = 0;
  return { id, type: part.type, props };
}

type World = Map<string, SceneObject>;

/** 两个值之间插值：数字、坐标、颜色可以连续变化，其他值过半时切换 */
function blend(from: unknown, to: unknown, t: number, key: string): unknown {
  if (t >= 1) return to;
  if (typeof from === 'number' && typeof to === 'number') return lerp(from, to, t);
  if (isPoint(from) && isPoint(to)) return lerpPt(from, to, t);
  if (key === 'color' && typeof from === 'string' && typeof to === 'string') {
    const hex = (c: string) => namedColors()[c] ?? c;
    return mixColor(hex(from), hex(to), t);
  }
  return t < 0.5 ? from : to;
}

/** 目标位置：坐标，或另一个零件的位置 */
function resolvePoint(world: World, v: unknown): Point | undefined {
  if (isPoint(v)) return v;
  if (typeof v === 'string') {
    const at = world.get(v)?.props.at;
    return isPoint(at) ? at : undefined;
  }
  return undefined;
}

/** 整体平移一个零件（线段、箭头的两端，计数块的每一块也一起动） */
function translate(o: SceneObject, d: Point) {
  const add = (q: unknown) => (isPoint(q) ? ([q[0] + d[0], q[1] + d[1]] as Point) : q);
  o.props.at = add(o.props.at ?? [0, 0]);
  if (isPoint(o.props.from)) o.props.from = add(o.props.from);
  if (isPoint(o.props.to)) o.props.to = add(o.props.to);
  if (Array.isArray(o.props.items)) o.props.items = o.props.items.map(add);
}

/** 计数块飞进另一组计数块的空位；到达后合并（目标个数增加，来源消失） */
function flyInto(world: World, src: SceneObject, dest: SceneObject, e: number) {
  const from = counterItems(src.props);
  const base = Math.round(num(dest.props.count, 0));
  src.props.items = from.map((q, i) => lerpPt(q, counterSlot(dest.props, base + i), e));
  if (e >= 1) {
    dest.props.colors = [...counterColors(dest.props), ...counterColors(src.props)];
    dest.props.count = base + from.length;
    delete dest.props.items;
    world.delete(src.id);
  }
}

function apply(world: World, a: SceneAction, p: number, current: boolean) {
  const e = a.linear ? p : smooth(p);
  const objs = a.targets.map((id) => world.get(id)).filter((o): o is SceneObject => !!o);
  const one = objs[0];
  const args = a.args;
  switch (a.verb) {
    case 'show':
    case 'hide': {
      const to = a.verb === 'show' ? 1 : 0;
      for (const o of objs) o.props.opacity = lerp(num(o.props.opacity, 1), to, e);
      return;
    }
    case 'highlight':
      // 高亮只在这一步有效；keep: true 时一直保留
      if (!current && args.keep !== true) return;
      for (const o of objs) o.props.highlight = Math.max(num(o.props.highlight, 0), e);
      return;
    case 'unhighlight':
      for (const o of objs) o.props.highlight = num(o.props.highlight, 0) * (1 - e);
      return;
    case 'merge':
    case 'move': {
      if (!one) return;
      const destId = a.verb === 'merge' ? args.into : args.to;
      const dest = typeof destId === 'string' ? world.get(destId) : undefined;
      if (dest && isCounters(one.type) && isCounters(dest.type))
        return flyInto(world, one, dest, e);
      const at = (one.props.at ?? [0, 0]) as Point;
      const target = isPoint(args.by)
        ? ([at[0] + args.by[0], at[1] + args.by[1]] as Point)
        : resolvePoint(world, destId);
      if (!target) return;
      translate(one, [(target[0] - at[0]) * e, (target[1] - at[1]) * e]);
      return;
    }
    case 'split': {
      if (!one || !isCounters(one.type) || typeof args.as !== 'string') return;
      const items = counterItems(one.props);
      const take = Math.max(0, Math.min(items.length, Math.round(num(args.take, 1))));
      const size = num(one.props.size, 44);
      const off = isPoint(args.offset)
        ? args.offset
        : ([0, -size * sceneStyle().splitLift] as Point);
      const d: Point = [off[0] * e, off[1] * e];
      const moved = items
        .slice(items.length - take)
        .map((q) => [q[0] + d[0], q[1] + d[1]] as Point);
      // 从末尾拿走 take 个，剩下的留在原位
      const colors = counterColors(one.props);
      one.props.colors = colors.slice(0, items.length - take);
      one.props.count = items.length - take;
      if (Array.isArray(one.props.items)) one.props.items = items.slice(0, items.length - take);
      const first = moved[0] ?? [0, 0];
      world.set(args.as, {
        id: args.as,
        type: 'counters',
        props: {
          ...one.props,
          layout: 'row',
          count: take,
          capacity: 0,
          items: moved,
          colors: colors.slice(items.length - take),
          at: [first[0] - size / 2, first[1] - size / 2],
          highlight: 0,
        },
      });
      return;
    }
    case 'set':
      for (const o of objs) {
        const part = getPart(o.type);
        const patch: Props = {};
        for (const [k, v] of Object.entries(args))
          if (!['target', 'duration', 'delay', 'together', 'ease'].includes(k)) patch[k] = v;
        const next = part?.normalize?.(patch) ?? patch;
        for (const [k, v] of Object.entries(next)) o.props[k] = blend(o.props[k], v, e, k);
        if ('count' in next) delete o.props.items;
        if ('color' in next && e >= 1) delete o.props.colors;
      }
      return;
    case 'rotate':
    case 'scale': {
      const key = a.verb;
      const base = key === 'scale' ? 1 : 0;
      for (const o of objs) {
        const from = num(o.props[key], base);
        const to = typeof args.to === 'number' ? args.to : from + num(args.by, 0);
        o.props[key] = lerp(from, to, e);
      }
      return;
    }
    case 'color':
      for (const o of objs) {
        o.props.color = blend(o.props.color, args.to, e, 'color');
        if (e >= 1) delete o.props.colors;
      }
      return;
    case 'count': {
      if (!one || typeof args.to !== 'number') return;
      const from = typeof args.from === 'number' ? args.from : num(one.props.value, 0);
      one.props.value = lerp(from, args.to, e);
      return;
    }
    case 'hop': {
      if (!one || typeof args.from !== 'number' || typeof args.to !== 'number') return;
      const hops = Array.isArray(one.props.hops) ? one.props.hops : [];
      const label = typeof args.label === 'string' ? args.label : undefined;
      one.props.hops = [...hops, { from: args.from, to: args.to, label, p: e }];
      // 有指针时，指针跟着跳
      if (typeof one.props.pointer === 'number') one.props.pointer = lerp(args.from, args.to, e);
      return;
    }
    case 'wait':
      return;
  }
}

const planCache = new WeakMap<SceneDef, StepPlan[]>();
const solvedCache = new WeakMap<SceneDef, StepPlan[]>();

export function plans(def: SceneDef): StepPlan[] {
  let p = planCache.get(def);
  if (!p) {
    p = def.steps.map((list) => planStep(list));
    planCache.set(def, p);
  }
  return p;
}

/**
 * 动手做的拖动对应 do 里的哪些动作：从 from 拆出来（split）、把 from（或拆出来的那组）
 * 移动或合并到 to。孩子做对以后，这些动作已经由孩子做掉了。
 */
export function coveredActions(list: readonly unknown[] | undefined, spec?: TrySpec): Set<number> {
  const out = new Set<number>();
  const drag = spec?.drag;
  if (!drag) return out;
  const ids = new Set([drag.from]);
  (list ?? []).forEach((raw, i) => {
    const a = parseAction(raw);
    if (!a || !ids.has(a.targets[0] ?? '')) return;
    if (a.verb === 'split' && typeof a.args.as === 'string') {
      ids.add(a.args.as);
      out.add(i);
    } else if (
      (a.verb === 'move' && a.args.to === drag.to) ||
      (a.verb === 'merge' && a.args.into === drag.to)
    )
      out.add(i);
  });
  return out;
}

/** 孩子做对以后的各步计划：被孩子做掉的动作时长为 0（直接到位），其余照常 */
function solvedPlans(def: SceneDef): StepPlan[] {
  let p = solvedCache.get(def);
  if (!p) {
    p = def.steps.map((list, i) => {
      const covered = coveredActions(list, def.tries?.[i]);
      if (!covered.size) return plans(def)[i];
      return planStep(
        (list ?? []).map((raw, j) => {
          const a = covered.has(j) ? parseAction(raw) : undefined;
          return a ? { [a.verb]: { ...a.args, duration: 0, delay: 0 } } : raw;
        }),
      );
    });
    solvedCache.set(def, p);
  }
  return p;
}

/** 第 index 步动画段的时长（毫秒）；孩子做对以后（solved）去掉被孩子做掉的动作 */
export function stepMotionMs(def: SceneDef, index: number, phase?: StageTry['phase']): number {
  if (phase === 'doing') return 0;
  return (phase === 'solved' ? solvedPlans(def) : plans(def))[index]?.total ?? 0;
}

function buildWorld(
  def: SceneDef,
  index: number,
  progress: number,
  phase?: StageTry['phase'],
): World {
  const world: World = new Map();
  for (const raw of def.objects) {
    const o = initialObject(raw);
    if (o) world.set(o.id, o);
  }
  const all = phase === 'solved' ? solvedPlans(def) : plans(def);
  const last = Math.min(index, all.length - 1);
  // 等孩子动手时：画面停在这一步开头（前面各步做完，这一步的动作一个都还没做）
  const end = phase === 'doing' ? last - 1 : last;
  for (let s = 0; s <= end; s++) {
    const plan = all[s];
    const current = s === last;
    const t = current ? Math.max(0, Math.min(1, progress)) * plan.total : plan.total;
    for (const a of plan.actions) {
      let p = 1;
      if (current && plan.total > 0) p = a.dur > 0 ? (t - a.start) / a.dur : t >= a.start ? 1 : 0;
      apply(world, a, Math.max(0, Math.min(1, p)), current);
    }
  }
  return world;
}

/** 求第 index 步、步内进度 progress（0–1）时的画面；phase 见 StageTry */
export function sceneFrame(
  def: SceneDef,
  index: number,
  progress = 1,
  phase?: StageTry['phase'],
): SceneFrame {
  // Map 保持插入顺序：配置里靠后的、拆分出来的零件画在上面
  return { objects: [...buildWorld(def, index, progress, phase).values()] };
}

/** 动手做（拖动）时的画面：能拖的计数块和目标零件 */
export interface DragFrame extends SceneFrame {
  /** 还能拖的计数块：原来的序号、位置、颜色 */
  items: { index: number; at: Point; color: string }[];
  /** 被拖那一组原来每一块的颜色（按原来的序号） */
  colors: string[];
  /** 被拖的那一组（已去掉拖走的）、目标零件 */
  from?: SceneObject;
  to?: SceneObject;
}

/**
 * 拖动中的画面：这一步开头的画面，再把孩子已经拖对的计数块（moved，原来的序号）
 * 从 from 挪到 to 的空位；正在拖的那一个（lifted）先从 from 里拿掉，由舞台画在手指下。
 */
export function dragFrame(
  def: SceneDef,
  index: number,
  moved: readonly number[],
  lifted?: number,
): DragFrame {
  const world = buildWorld(def, index, 0, 'doing');
  const drag = def.tries?.[index]?.drag;
  const src = drag ? world.get(drag.from) : undefined;
  const dest = drag ? world.get(drag.to) : undefined;
  if (!drag || !src || !isCounters(src.type))
    return { objects: [...world.values()], items: [], colors: [] };
  const at = counterItems(src.props);
  const colors = counterColors(src.props);
  const gone = new Set(moved);
  const keep = at.map((_, i) => i).filter((i) => !gone.has(i));
  const items = keep
    .filter((i) => i !== lifted)
    .map((i) => ({ index: i, at: at[i], color: colors[i] }));
  // 已经拖对的放进目标的空位（目标也是计数块时）
  if (dest && isCounters(dest.type) && moved.length) {
    const base = Math.round(num(dest.props.count, 0));
    dest.props.colors = [...counterColors(dest.props), ...moved.map((i) => colors[i])];
    dest.props.count = base + moved.length;
    delete dest.props.items;
  }
  src.props.items = items.map((it) => it.at);
  src.props.colors = items.map((it) => it.color);
  src.props.count = items.length;
  return { objects: [...world.values()], items, colors, from: src, to: dest };
}
