// 连续时间模型（教学平台方案 4.1）：舞台画面 = Stage(动画, 第几步, 步内进度 t∈[0,1])。
// 这里是纯状态机，不关心计时器、朗读和界面；时钟（requestAnimationFrame）和朗读由
// runtime 的 useTimeline 接上。旧的 playbackReducer 保持不变，现有四个模板不受影响。
//
// 一步由两部分组成：
//   - 动画段：这一步里零件的动作，时长由模板给出（可以为 0），进度 progress 从 0 走到 1；
//   - 讲解段：朗读（或按字数估算的停留时间）。
// 播放时两者同时开始，都结束后才进入下一步。
import { SPEEDS, type Speed } from './playback';

export interface TimelineState {
  index: number;
  total: number;
  /** 当前步动画段的进度，0–1 */
  progress: number;
  /** 自动播放中（会朗读并自动进入下一步） */
  playing: boolean;
  /** 动画段的时钟在走（暂停播放时，单步/点步骤点也会把这一步的动画放一遍） */
  running: boolean;
  /** 当前这次进入步骤的讲解是否已经结束 */
  spoken: boolean;
  speed: Speed;
  /** 每次（重新）进入一步、或开始播放时加 1；朗读按它区分新旧 */
  epoch: number;
  /** 在播放状态下自然播完最后一步的次数（规格 3.2：用于“已学完”的判定） */
  finishes: number;
}

export type TimelineAction =
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'toggle' }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'seek'; index: number }
  /** 拖进度条：position = 第几步 + 步内进度，例如 2.5 = 第 3 步的一半 */
  | { type: 'scrub'; position: number }
  /** 时钟推进动画段：delta 是进度增量（Infinity = 直接走完） */
  | { type: 'frame'; delta: number }
  /** 讲解结束（epoch 不是当前的视为过期，忽略） */
  | { type: 'spoken'; epoch: number }
  | { type: 'setTotal'; total: number }
  | { type: 'setSpeed'; speed: Speed }
  | { type: 'cycleSpeed' };

export interface TimelineInit {
  index?: number;
  speed?: Speed;
  /** 打开即播放 */
  autoPlay?: boolean;
}

const clampIndex = (i: number, total: number) =>
  Math.max(0, Math.min(Math.max(total - 1, 0), Math.floor(i)));
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function initTimeline(total: number, init: TimelineInit = {}): TimelineState {
  const playing = !!init.autoPlay && total > 0;
  return {
    index: clampIndex(init.index ?? 0, total),
    total,
    // 自动播放从这一步的开头放起；否则直接显示这一步的完整画面
    progress: playing ? 0 : 1,
    playing,
    running: playing,
    spoken: false,
    speed: init.speed ?? 1,
    epoch: 0,
    finishes: 0,
  };
}

/** 进入某一步：动画段从头开始走 */
function enter(s: TimelineState, index: number, playing: boolean): TimelineState {
  return {
    ...s,
    index: clampIndex(index, s.total),
    progress: 0,
    running: true,
    spoken: false,
    playing,
    epoch: s.epoch + 1,
  };
}

/** 播放中且动画段、讲解都结束 → 下一步；最后一步结束 → 停止并记一次“播完” */
function maybeAdvance(s: TimelineState): TimelineState {
  if (!s.playing || !s.spoken || s.progress < 1) return s;
  if (s.index < s.total - 1) return enter(s, s.index + 1, true);
  return { ...s, playing: false, running: false, finishes: s.finishes + 1 };
}

export function timelineReducer(s: TimelineState, a: TimelineAction): TimelineState {
  const last = Math.max(s.total - 1, 0);
  switch (a.type) {
    case 'play':
      if (s.total === 0 || s.playing) return s;
      // 已在最后一步且已放完时从头播放
      if (s.index >= last && s.progress >= 1) return enter(s, 0, true);
      // 从暂停处继续：动画接着走，这一步的讲解重新读
      return { ...s, playing: true, running: s.progress < 1, spoken: false, epoch: s.epoch + 1 };
    case 'pause':
      return s.playing || s.running ? { ...s, playing: false, running: false } : s;
    case 'toggle':
      return timelineReducer(s, { type: s.playing ? 'pause' : 'play' });
    // 手动操作一律暂停（规格 P3：单步、点步骤点、拖进度都会暂停播放）
    case 'next':
      return s.index >= last ? { ...s, playing: false } : enter(s, s.index + 1, false);
    case 'prev':
      return s.index <= 0 ? { ...s, playing: false } : enter(s, s.index - 1, false);
    case 'seek':
      return enter(s, a.index, false);
    case 'scrub': {
      if (s.total === 0) return s;
      const pos = Math.max(0, Math.min(s.total, a.position));
      const index = clampIndex(pos, s.total);
      return {
        ...s,
        index,
        progress: clamp01(pos - index),
        playing: false,
        running: false,
        spoken: false,
        epoch: s.epoch + 1,
      };
    }
    case 'frame': {
      if (!s.running) return s;
      const progress = clamp01(s.progress + (Number.isNaN(a.delta) ? 1 : a.delta));
      return maybeAdvance({ ...s, progress, running: progress < 1 });
    }
    case 'spoken':
      if (a.epoch !== s.epoch || s.spoken) return s;
      return maybeAdvance({ ...s, spoken: true });
    case 'setTotal': {
      const index = clampIndex(s.index, a.total);
      return {
        ...s,
        total: a.total,
        index,
        playing: a.total > 0 && s.playing,
        epoch: index === s.index ? s.epoch : s.epoch + 1,
      };
    }
    case 'setSpeed':
      return { ...s, speed: a.speed };
    case 'cycleSpeed': {
      const i = SPEEDS.indexOf(s.speed);
      return { ...s, speed: SPEEDS[(i + 1) % SPEEDS.length] };
    }
  }
}

/** 进度条上的位置：第几步 + 步内进度 */
export function timelinePosition(s: Pick<TimelineState, 'index' | 'progress'>): number {
  return s.index + s.progress;
}

/* ───────────── 参数代入 ───────────── */

const PLACEHOLDER = /\{([A-Za-z_]\w*)\}/g;

/** 把文字里的 {参数名} 换成参数值；没有的参数保持原样 */
export function fillText(text: string, params: Record<string, unknown>): string {
  return text.replace(PLACEHOLDER, (m, k: string) =>
    params[k] === undefined || params[k] === null ? m : String(params[k]),
  );
}

/**
 * 深度代入：配置里所有字符串中的 {参数名} 都换成参数值。
 * 整个字符串只是一个 "{参数名}" 时，保留参数原来的类型（数字仍是数字）。
 */
export function fillParams<T>(value: T, params: Record<string, unknown>): T {
  if (typeof value === 'string') {
    const whole = value.match(/^\{([A-Za-z_]\w*)\}$/);
    if (whole && params[whole[1]] !== undefined) return params[whole[1]] as T;
    return fillText(value, params) as T;
  }
  if (Array.isArray(value)) return value.map((v) => fillParams(v, params)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, fillParams(v, params)]),
    ) as T;
  }
  return value;
}
