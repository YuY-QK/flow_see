// 场景求值：画面 = Stage(场景, 第几步, 步内进度 t)。
// 纯函数：从初始零件出发，把前面各步的动作做完，再把当前步的动作做到 t 对应的时刻。
import {
  counterColors,
  counterItems,
  counterSlot,
  getPart,
  isColor,
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
import { dealCount, parseAction, planStep, type SceneAction, type StepPlan } from './actions';

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

export interface SubHighlight {
  id: string;
  name: string;
  value?: number;
}

export interface SceneFrame {
  objects: SceneObject[];
  subHighlights: SubHighlight[];
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

/** 两个值之间插值：数字、坐标、颜色、数组可以连续变化，其他值过半时切换 */
export function blend(from: unknown, to: unknown, t: number, key = '', depth = 0): unknown {
  if (t >= 1) return to;
  if (
    typeof from === 'number' &&
    Number.isFinite(from) &&
    typeof to === 'number' &&
    Number.isFinite(to)
  )
    return lerp(from, to, t);
  if (isPoint(from) && isPoint(to)) return lerpPt(from, to, t);
  const isCol =
    (key === 'color' && typeof from === 'string' && typeof to === 'string') ||
    (isColor(from) && isColor(to));
  if (isCol && typeof from === 'string' && typeof to === 'string') {
    const hex = (c: string) => namedColors()[c] ?? c;
    return mixColor(hex(from), hex(to), t);
  }
  if (Array.isArray(from) && Array.isArray(to)) {
    if (depth < 3 && from.length === to.length) {
      return from.map((v, i) => blend(v, to[i], t, key, depth + 1));
    }
    return t < 0.5 ? from : to;
  }
  return t < 0.5 ? from : to;
}

/** 判定是否是对称轴（两点确定的直线，两点不能重合） */
export function isAxis(v: unknown): v is [Point, Point] {
  return (
    Array.isArray(v) &&
    v.length === 2 &&
    isPoint(v[0]) &&
    isPoint(v[1]) &&
    (v[0][0] !== v[1][0] || v[0][1] !== v[1][1])
  );
}

/**
 * 沿两点确定的对称轴变换点坐标
 * s = cos(πe)：
 * e = 0 时 s = 1（原样）；
 * e = 0.5 时 s = 0（垂直于轴的方向压扁到 0，投影在轴上）；
 * e = 1 时 s = -1（镜像）。
 */
export function transformPointByAxis(p: Point, axis: [Point, Point], s: number): Point {
  const [[x1, y1], [x2, y2]] = axis;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len === 0) return p;
  const C = dx / len;
  const S = dy / len;
  const m11 = C * C + s * S * S;
  const m12 = (1 - s) * C * S;
  const m21 = m12;
  const m22 = S * S + s * C * C;
  const px = p[0] - x1;
  const py = p[1] - y1;
  return [x1 + m11 * px + m12 * py, y1 + m21 * px + m22 * py];
}

/**
 * 沿两点确定的对称轴生成仿射变换矩阵参数 [a, b, c, d, e, f]
 * 满足 SVG matrix(a, b, c, d, e, f)
 */
export function axisTransformMatrix(
  axis: [Point, Point],
  s: number,
): [number, number, number, number, number, number] {
  const [[x1, y1], [x2, y2]] = axis;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len === 0) return [1, 0, 0, 1, 0, 0];
  const C = dx / len;
  const S = dy / len;
  const a = C * C + s * S * S;
  const b = (1 - s) * C * S;
  const c = b;
  const d = S * S + s * C * C;
  const e = x1 - a * x1 - c * y1;
  const f = y1 - b * x1 - d * y1;
  return [a, b, c, d, e, f];
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
      for (const o of objs) {
        o.props.highlight = Math.max(num(o.props.highlight, 0), e);
        // color：这一次高亮框的颜色（不写用动画主题的强调色）
        if (typeof args.color === 'string') o.props.hlColor = args.color;
        else delete o.props.hlColor;
      }
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
    case 'deal':
      return deal(world, a, p);
    case 'flip': {
      if (!isAxis(args.axis)) return;
      const axis = args.axis;
      const s = Math.cos(Math.PI * e);
      for (const o of objs) {
        const part = getPart(o.type);
        if (part?.rotatesPoints && Array.isArray(o.props.points)) {
          o.props.points = (o.props.points as Point[]).map((pt) =>
            transformPointByAxis(pt, axis, s),
          );
        } else {
          o.props.mirrorAxis = axis;
          if (e < 1) {
            o.props.flipScale = s;
          } else {
            delete o.props.flipScale;
          }
        }
      }
      return;
    }
    case 'wait':
    case 'ask':
      return;
  }
}

/**
 * 一个一个分：从 target（一组计数块）的末尾一次拿一个，依次放进 into 里的各组
 * （第 1 个放进第 1 组，第 2 个放进第 2 组……一轮放完再从第 1 组放起），每一个都飞一小段弧线。
 */
function deal(world: World, a: SceneAction, p: number) {
  const src = world.get(a.targets[0] ?? '');
  const into = (Array.isArray(a.args.into) ? a.args.into : [a.args.into])
    .map((id) => (typeof id === 'string' ? world.get(id) : undefined))
    .filter((o): o is SceneObject => !!o && isCounters(o.type));
  if (!src || !isCounters(src.type) || !into.length) return;
  const n = Math.min(dealCount(a.args), Math.round(num(src.props.count, 0)));
  if (n <= 0) return;
  const size = num(src.props.size, 44);
  // 每一个占 1/n 的时间；每一个自己先快后慢
  const pos = p * n;
  for (let k = 0; k < n; k++) {
    const q = Math.max(0, Math.min(1, pos - k));
    if (q <= 0) break;
    const items = counterItems(src.props);
    const colors = counterColors(src.props);
    const last = items.length - 1;
    if (last < 0) return;
    const dest = into[k % into.length];
    const from = items[last];
    const c = colors[last];
    const base = Math.round(num(dest.props.count, 0));
    // 拿走这一个
    src.props.count = last;
    src.props.colors = colors.slice(0, last);
    if (Array.isArray(src.props.items)) src.props.items = items.slice(0, last);
    if (q >= 1) {
      dest.props.colors = [...counterColors(dest.props), c];
      dest.props.count = base + 1;
      delete dest.props.items;
      continue;
    }
    // 正在飞的这一个：画在最上面
    const e = smooth(q);
    const to = counterSlot(dest.props, base);
    const at: Point = [
      lerp(from[0], to[0], e),
      lerp(from[1], to[1], e) - Math.sin(Math.PI * e) * size * 0.8,
    ];
    const id = `${src.id}~deal`;
    world.delete(id);
    world.set(id, {
      id,
      type: 'counters',
      props: {
        ...src.props,
        layout: 'row',
        count: 1,
        capacity: 0,
        items: [at],
        colors: [c],
        at: [at[0] - size / 2, at[1] - size / 2],
        highlight: 0,
      },
    });
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
  const targets = dragTargets(drag);
  const sameTargets = (v: unknown) => {
    const list = Array.isArray(v) ? v : [v];
    return list.length === targets.length && list.every((x, k) => x === targets[k]);
  };
  (list ?? []).forEach((raw, i) => {
    const a = parseAction(raw);
    if (!a || !ids.has(a.targets[0] ?? '')) return;
    if (a.verb === 'split' && typeof a.args.as === 'string') {
      ids.add(a.args.as);
      out.add(i);
    } else if (
      (a.verb === 'move' && sameTargets(a.args.to)) ||
      (a.verb === 'merge' && sameTargets(a.args.into)) ||
      (a.verb === 'deal' && sameTargets(a.args.into))
    )
      out.add(i);
  });
  return out;
}

/** 拖动的目标（一个或几个零件 id） */
export function dragTargets(drag: NonNullable<TrySpec['drag']>): string[] {
  return Array.isArray(drag.to) ? drag.to : [drag.to];
}

/** 拖到多个目标时，每个目标最多放几个（不写时平均分） */
export function dragEach(drag: NonNullable<TrySpec['drag']>): number {
  const n = dragTargets(drag).length;
  const each = Number(drag.each);
  if (Number.isFinite(each) && each > 0) return Math.round(each);
  return Math.max(1, Math.ceil(Number(drag.count) / n));
}

/** 孩子做对以后的各步计划：被孩子做掉的动作时长为 0（直接到位），其余照常 */
function solvedPlans(def: SceneDef): StepPlan[] {
  let p = solvedCache.get(def);
  if (!p) {
    p = def.steps.map((list, i) => {
      const covered = coveredActions(list, def.tries?.[i]);
      // 提问之前的动作在孩子做之前已经放过了
      const ask = (list ?? []).findIndex((raw) => parseAction(raw)?.verb === 'ask');
      if (def.tries?.[i]) for (let j = 0; j < ask; j++) covered.add(j);
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
  if (phase === 'doing') {
    const plan = plans(def)[index];
    return plan ? preludeMs(plan) : 0;
  }
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
  for (let s = 0; s <= last; s++) {
    const plan = all[s];
    const current = s === last;
    // 等孩子动手时：前面各步做完；这一步只放提问（ask）之前的动作，progress 是这一段的进度
    const doing = current && phase === 'doing';
    const actions = doing ? plan.actions.slice(0, plan.askAt) : plan.actions;
    const total = doing ? preludeMs(plan) : plan.total;
    const t = current ? Math.max(0, Math.min(1, progress)) * total : total;
    for (const a of actions) {
      let p = 1;
      if (current && total > 0) p = a.dur > 0 ? (t - a.start) / a.dur : t >= a.start ? 1 : 0;
      apply(world, a, Math.max(0, Math.min(1, p)), current);
    }
  }
  linkRefs(world);
  return world;
}

/** 提问（ask）之前那一段动作的时长 */
function preludeMs(plan: StepPlan): number {
  return plan.actions.slice(0, plan.askAt).reduce((m, a) => Math.max(m, a.start + a.dur), 0);
}

/**
 * 颜色对应（强对应）：属性里写 "@零件id" 的颜色跟着那个零件走；
 * 文字里 [4](@r1) 这样标出来的字，颜色是 r1 的颜色，r1 高亮时这几个字也一起亮起来。
 * 这里把用到的零件的颜色、高亮程度记进 props.refs，零件画的时候查它。
 */
function linkRefs(world: World) {
  const colorOf = (id: string, depth = 0): unknown => {
    const c = world.get(id)?.props.color;
    return typeof c === 'string' && c.startsWith('@') && depth < 4
      ? colorOf(c.slice(1), depth + 1)
      : c;
  };
  for (const o of world.values()) {
    const ids = new Set<string>();
    JSON.stringify(o.props, (k, v) => {
      if (k === 'refs') return undefined;
      if (typeof v === 'string') for (const m of v.matchAll(/@([A-Za-z_][\w-]*)/g)) ids.add(m[1]);
      return v;
    });
    if (!ids.size) continue;
    const refs: Record<string, { color: unknown; highlight: number }> = {};
    for (const id of ids)
      refs[id] = { color: colorOf(id), highlight: num(world.get(id)?.props.highlight, 0) };
    o.props = { ...o.props, refs };
    if (typeof o.props.color === 'string' && o.props.color.startsWith('@'))
      o.props.color = colorOf(o.props.color.slice(1));
  }
}

/** 求第 index 步、步内进度 progress（0–1）时的画面；phase 见 StageTry */
export function sceneFrame(
  def: SceneDef,
  index: number,
  progress = 1,
  phase?: StageTry['phase'],
): SceneFrame {
  // Map 保持插入顺序：配置里靠后的、拆分出来的零件画在上面
  return { objects: [...buildWorld(def, index, progress, phase).values()], subHighlights: [] };
}

/** 动手做（拖动）时的画面：能拖的计数块和目标零件 */
export interface DragFrame extends SceneFrame {
  /** 还能拖的计数块：原来的序号、位置、颜色 */
  items: { index: number; at: Point; color: string }[];
  /** 被拖那一组原来每一块的颜色（按原来的序号） */
  colors: string[];
  /** 被拖的那一组（已去掉拖走的）、目标零件（一个或几个） */
  from?: SceneObject;
  to: SceneObject[];
}

/**
 * 拖动中的画面：这一步提问时的画面，再把孩子已经拖对的计数块（moved，原来的序号；
 * placed 是各自放进的目标）从 from 挪到目标的空位；正在拖的那一个（lifted）先从 from 里拿掉，
 * 由舞台画在手指下。
 */
export function dragFrame(
  def: SceneDef,
  index: number,
  moved: readonly number[],
  lifted?: number,
  placed?: readonly string[],
): DragFrame {
  const world = buildWorld(def, index, 1, 'doing');
  const drag = def.tries?.[index]?.drag;
  const src = drag ? world.get(drag.from) : undefined;
  const ids = drag ? dragTargets(drag) : [];
  const dests = ids.map((id) => world.get(id)).filter((o): o is SceneObject => !!o);
  if (!drag || !src || !isCounters(src.type))
    return { objects: [...world.values()], subHighlights: [], items: [], colors: [], to: dests };
  const at = counterItems(src.props);
  const colors = counterColors(src.props);
  const gone = new Set(moved);
  const keep = at.map((_, i) => i).filter((i) => !gone.has(i));
  const items = keep
    .filter((i) => i !== lifted)
    .map((i) => ({ index: i, at: at[i], color: colors[i] }));
  // 已经拖对的放进目标的空位（目标也是计数块时）
  moved.forEach((i, k) => {
    const dest = world.get(placed?.[k] ?? ids[0]);
    if (!dest || !isCounters(dest.type)) return;
    dest.props.colors = [...counterColors(dest.props), colors[i]];
    dest.props.count = Math.round(num(dest.props.count, 0)) + 1;
    delete dest.props.items;
  });
  src.props.items = items.map((it) => it.at);
  src.props.colors = items.map((it) => it.color);
  src.props.count = items.length;
  return { objects: [...world.values()], subHighlights: [], items, colors, from: src, to: dests };
}
