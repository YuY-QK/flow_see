// 播放状态机：纯函数，不关心计时器和界面。
import type { Step } from './types';

export const SPEEDS = [0.5, 1, 1.5, 2] as const;
export type Speed = (typeof SPEEDS)[number];

export interface PlaybackState {
  index: number;
  total: number;
  playing: boolean;
  speed: Speed;
}

export type PlaybackAction =
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'toggle' }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'seek'; index: number }
  /** 自动播放推进一步；到最后一步时停止 */
  | { type: 'tick' }
  | { type: 'setTotal'; total: number }
  | { type: 'setSpeed'; speed: Speed }
  | { type: 'cycleSpeed' };

export function initPlayback(total: number, index = 0, speed: Speed = 1): PlaybackState {
  return { index: clamp(index, total), total, playing: false, speed };
}

function clamp(i: number, total: number): number {
  return Math.max(0, Math.min(Math.max(total - 1, 0), i));
}

export function playbackReducer(s: PlaybackState, action: PlaybackAction): PlaybackState {
  const last = Math.max(s.total - 1, 0);
  switch (action.type) {
    case 'play':
      if (s.total === 0) return s;
      // 已在最后一步时从头播放
      return { ...s, playing: true, index: s.index >= last ? 0 : s.index };
    case 'pause':
      return s.playing ? { ...s, playing: false } : s;
    case 'toggle':
      return playbackReducer(s, { type: s.playing ? 'pause' : 'play' });
    // 手动操作一律暂停（产品规则：任何手动操作都自动暂停）
    case 'next':
      return { ...s, playing: false, index: clamp(s.index + 1, s.total) };
    case 'prev':
      return { ...s, playing: false, index: clamp(s.index - 1, s.total) };
    case 'seek':
      return { ...s, playing: false, index: clamp(action.index, s.total) };
    case 'tick':
      if (!s.playing) return s;
      if (s.index >= last) return { ...s, playing: false };
      return { ...s, index: s.index + 1 };
    case 'setTotal':
      return {
        ...s,
        total: action.total,
        index: clamp(s.index, action.total),
        playing: action.total > 0 && s.playing,
      };
    case 'setSpeed':
      return { ...s, speed: action.speed };
    case 'cycleSpeed': {
      const i = SPEEDS.indexOf(s.speed);
      return { ...s, speed: SPEEDS[(i + 1) % SPEEDS.length] };
    }
  }
}

/** 这一步要朗读的文字 */
export function narrationText(step: Step): string {
  return (step.narration?.trim() || step.desc.trim() || step.title.trim()).trim();
}

/** 不朗读时，这一步停留多久（毫秒）。 */
export function stepDurationMs(step: Step, speed: number): number {
  const base =
    step.duration && step.duration > 0
      ? step.duration * 1000
      : Math.max(1800, narrationText(step).length * 220);
  return Math.round(base / speed);
}
