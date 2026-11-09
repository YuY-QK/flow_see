import { sceneStyle } from '@flow-see/blocks';
// 场景模板的动作：解析配置里的 do 列表，排出每个动作在这一步里的起止时间。
//
// 写法（需求设计 5.5）：
//   - highlight: left                       简写：值是零件 id（或 id 列表）
//   - move: { target: one, to: left, duration: 1s }
// 公共选项：duration（时长，如 1s、500ms、0.8）、delay（先等一会儿）、
//           together: true（和上一个动作同时开始；默认依次进行）、ease: linear（匀速，默认先快后慢）。

export const VERBS = {
  show: { name: '出现' },
  hide: { name: '隐藏' },
  highlight: { name: '高亮' },
  unhighlight: { name: '取消高亮' },
  move: { name: '移动' },
  split: { name: '拆分' },
  merge: { name: '合并' },
  set: { name: '改文字或数值' },
  rotate: { name: '旋转' },
  scale: { name: '缩放' },
  color: { name: '颜色变化' },
  count: { name: '数字递增' },
  hop: { name: '数轴上跳一跳' },
  wait: { name: '停一会儿' },
  deal: { name: '一个一个分' },
  ask: { name: '在这里提问' },
} as const;

export type Verb = keyof typeof VERBS;

/** 动作没写 duration 时的默认时长（毫秒）：site.yaml 的 scene.actionSeconds */
export function defaultMs(verb: Verb, args: Record<string, unknown> = {}): number {
  const ms = (sceneStyle().actionSeconds[verb] ?? 0) * 1000;
  // 一个一个分：默认时长是每一个的时长 × 个数
  return verb === 'deal' ? ms * dealCount(args) : ms;
}

/** 一个一个分（deal）分几个：count，不写时每个目标分 1 个（分一轮） */
export function dealCount(args: Record<string, unknown>): number {
  const into = Array.isArray(args.into) ? args.into.length : 1;
  const n = typeof args.count === 'number' ? args.count : into;
  return Math.max(0, Math.round(n));
}

/** 每个动作都能写的选项 */
export const TIMING_KEYS = ['duration', 'delay', 'together', 'ease'] as const;

/** 各动作自己的参数（target 之外）；set 可以写零件的任意属性，单独检查 */
export const VERB_KEYS: Record<Verb, readonly string[]> = {
  show: ['target'],
  hide: ['target'],
  highlight: ['target', 'keep', 'color'],
  unhighlight: ['target'],
  move: ['target', 'to', 'by'],
  split: ['target', 'take', 'as', 'offset'],
  merge: ['target', 'into'],
  set: ['target'],
  rotate: ['target', 'to', 'by', 'around'],
  scale: ['target', 'to'],
  color: ['target', 'to'],
  count: ['target', 'from', 'to'],
  hop: ['target', 'from', 'to', 'label'],
  wait: [],
  deal: ['target', 'into', 'count'],
  ask: [],
};

/** 一个动作可以同时作用于多个零件（列表写法） */
export const MULTI_TARGET: ReadonlySet<Verb> = new Set([
  'show',
  'hide',
  'highlight',
  'unhighlight',
  'rotate',
  'scale',
  'color',
]);

export interface SceneAction {
  verb: Verb;
  targets: string[];
  args: Record<string, unknown>;
  /** 在这一步里的开始时间、时长（毫秒） */
  start: number;
  dur: number;
  linear: boolean;
}

export interface StepPlan {
  actions: SceneAction[];
  /** 动画段总时长（毫秒） */
  total: number;
  /**
   * 动手做时在哪里提问（do 里 ask 的位置）：它前面的动作先放，再等孩子做，做对后放后面的。
   * 是 actions 里的序号；没有 ask 时为 0（一开头就提问）。
   */
  askAt: number;
}

/** "1s" / "500ms" / "1.5秒" / 0.8（秒）→ 毫秒；写错时返回 undefined */
export function parseDuration(v: unknown): number | undefined {
  if (typeof v === 'number') return v >= 0 ? v * 1000 : undefined;
  if (typeof v !== 'string') return undefined;
  const m = v.trim().match(/^(\d+(?:\.\d+)?)\s*(ms|s|秒|毫秒)?$/);
  if (!m) return undefined;
  const n = Number(m[1]);
  return m[2] === 'ms' || m[2] === '毫秒' ? n : n * 1000;
}

export function isVerb(k: string): k is Verb {
  return Object.hasOwn(VERBS, k);
}

/** 解析目标引用：如果是 "id.subitem"，拆出零件 id 和子项名（或通配模式）；否则只有 id */
export function parseTargetRef(target: string): { id: string; sub?: string } {
  const dot = target.indexOf('.');
  if (dot === -1) return { id: target };
  return { id: target.slice(0, dot), sub: target.slice(dot + 1) };
}

/** 把一条配置解析成动作；格式不对时返回 undefined（由检查工具报错） */
export function parseAction(
  raw: unknown,
): { verb: Verb; args: Record<string, unknown>; targets: string[] } | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const keys = Object.keys(raw);
  if (keys.length !== 1 || !isVerb(keys[0])) return undefined;
  const verb = keys[0];
  const value = (raw as Record<string, unknown>)[verb];
  let args: Record<string, unknown>;
  if (typeof value === 'string' || Array.isArray(value)) {
    // wait: 1s 的简写是时长
    args = verb === 'wait' ? { duration: value } : verb === 'ask' ? {} : { target: value };
  } else if (value && typeof value === 'object') {
    args = value as Record<string, unknown>;
  } else if (value === null || value === undefined) {
    args = {};
  } else if (verb === 'wait') {
    args = { duration: value };
  } else if (verb === 'ask') {
    args = {};
  } else return undefined;
  const t = args.target;
  const targets =
    typeof t === 'string' ? [t] : Array.isArray(t) ? t.filter((x) => typeof x === 'string') : [];
  return { verb, args, targets };
}

/** 排出一步里各动作的起止时间：默认依次进行，together: true 时与上一个同时开始 */
export function planStep(list: readonly unknown[] | undefined): StepPlan {
  const actions: SceneAction[] = [];
  let cursor = 0;
  let prevStart = 0;
  let askAt = 0;
  for (const raw of list ?? []) {
    const a = parseAction(raw);
    if (!a) continue;
    if (a.verb === 'ask') {
      askAt = actions.length;
      continue;
    }
    const dur = parseDuration(a.args.duration) ?? defaultMs(a.verb, a.args);
    const delay = parseDuration(a.args.delay) ?? 0;
    const start = (a.args.together === true ? prevStart : cursor) + delay;
    actions.push({ ...a, start, dur, linear: a.args.ease === 'linear' });
    cursor = Math.max(cursor, start + dur);
    prevStart = start;
  }
  return { actions, total: cursor, askAt };
}
