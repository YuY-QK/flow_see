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
  /**
   * 动手做（跟着做 / 自己做）：哪些步骤要等孩子做完才放。
   * 进入这样的步骤时停在开头（waiting；progress 是提问前那一段动作的进度），
   * 孩子做对后（solve）再放这一步并接着往下。
   */
  gates: boolean[];
  /** 正在等孩子动手：动画不走，讲解读完也不进入下一步 */
  waiting: boolean;
  /**
   * 自己做：要跳过的步骤（不用孩子动手的讲解步骤）。上一步、下一步、自动进入下一步都绕过它们，
   * 只剩孩子要做的步骤和最后一步（结果）。
   */
  skips: boolean[];
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
  | { type: 'cycleSpeed' }
  /** 孩子做对了：放这一步（动画 + 讲解），之后接着自动播放 */
  | { type: 'solve' };

export interface TimelineInit {
  index?: number;
  speed?: Speed;
  /** 打开即播放 */
  autoPlay?: boolean;
  /** 要等孩子动手的步骤（动手做模式） */
  gates?: boolean[];
  /** 要跳过的步骤（自己做模式） */
  skips?: boolean[];
}

const clampIndex = (i: number, total: number) =>
  Math.max(0, Math.min(Math.max(total - 1, 0), Math.floor(i)));
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function initTimeline(total: number, init: TimelineInit = {}): TimelineState {
  const playing = !!init.autoPlay && total > 0;
  const index = clampIndex(init.index ?? 0, total);
  const gates = init.gates ?? [];
  const waiting = !!gates[index];
  return {
    index,
    total,
    // 自动播放从这一步的开头放起；否则直接显示这一步的完整画面（要动手的步骤停在开头）
    progress: playing || waiting ? 0 : 1,
    playing,
    // 要动手的步骤：提问前的那一段动作（场景模板 do 里 ask 之前的）照样放出来
    running: playing || waiting,
    spoken: false,
    speed: init.speed ?? 1,
    epoch: 0,
    finishes: 0,
    gates,
    waiting,
    skips: init.skips ?? [],
  };
}

/** 往后（dir = 1）或往前（dir = -1）找第一个没有被跳过的步骤；没有时返回 undefined */
function stepFrom(s: TimelineState, from: number, dir: 1 | -1): number | undefined {
  for (let i = from + dir; i >= 0 && i < s.total; i += dir) if (!s.skips[i]) return i;
  return undefined;
}

/** 进入某一步：动画段从头开始走 */
function enter(s: TimelineState, index: number, playing: boolean): TimelineState {
  const i = clampIndex(index, s.total);
  const waiting = !!s.gates[i];
  return {
    ...s,
    index: i,
    progress: 0,
    // 要动手的步骤也走时钟：先放提问前的那一段，放完停在那里等孩子
    running: true,
    waiting,
    spoken: false,
    playing,
    epoch: s.epoch + 1,
  };
}

/** 播放中且动画段、讲解都结束 → 下一步；最后一步结束 → 停止并记一次“播完” */
function maybeAdvance(s: TimelineState): TimelineState {
  if (!s.playing || !s.spoken || s.progress < 1 || s.waiting) return s;
  const next = stepFrom(s, s.index, 1);
  if (next !== undefined) return enter(s, next, true);
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
      return {
        ...s,
        playing: true,
        running: s.progress < 1,
        spoken: false,
        epoch: s.epoch + 1,
      };
    case 'pause':
      return s.playing || s.running ? { ...s, playing: false, running: false } : s;
    case 'toggle':
      return timelineReducer(s, { type: s.playing ? 'pause' : 'play' });
    // 手动操作一律暂停（规格 P3：单步、点步骤点、拖进度都会暂停播放）
    case 'next': {
      const to = stepFrom(s, s.index, 1);
      return to === undefined ? { ...s, playing: false } : enter(s, to, false);
    }
    case 'prev': {
      const to = stepFrom(s, s.index, -1);
      return to === undefined ? { ...s, playing: false } : enter(s, to, false);
    }
    case 'seek':
      return enter(s, a.index, false);
    case 'scrub': {
      if (s.total === 0) return s;
      const pos = Math.max(0, Math.min(s.total, a.position));
      const index = clampIndex(pos, s.total);
      const waiting = !!s.gates[index];
      return {
        ...s,
        index,
        waiting,
        progress: waiting ? 0 : clamp01(pos - index),
        playing: false,
        running: waiting,
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
    case 'solve': {
      if (!s.waiting) return s;
      const gates = s.gates.slice();
      gates[s.index] = false;
      return {
        ...s,
        gates,
        waiting: false,
        progress: 0,
        running: true,
        playing: true,
        spoken: false,
        epoch: s.epoch + 1,
      };
    }
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

/* 参数代入（fillText、fillParams）在 fill.ts：内容检查工具在 Node 里直接引用，不能依赖本文件 */
export { fillParams, fillText } from './fill';
