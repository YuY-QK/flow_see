import { useEffect, useReducer, useRef } from 'react';
import {
  initTimeline,
  timelineReducer,
  type Speed,
  type TimelineAction,
  type TimelineState,
} from '@flow-see/core';
import { speak } from '../services/speech';

export interface TimelineOptions {
  /** 步骤数 */
  total: number;
  /** 第 i 步动画段的时长（毫秒，1 倍速）；0 = 没有动画段 */
  motionMs(index: number): number;
  /** 第 i 步要朗读的文字；waiting = 正在等孩子动手（这时读任务提示） */
  narration(index: number, waiting: boolean): string;
  /** 不朗读时第 i 步的停留时间（毫秒，已按速度换算） */
  dwellMs(index: number, speed: number): number;
  narrate: boolean;
  startIndex?: number;
  speed?: Speed;
  autoPlay?: boolean;
  /** 动手做：要等孩子做完的步骤（只在开始时读一次） */
  gates?: boolean[];
  voiceURI?: string;
  /** 朗读语速，会再乘上播放速度 */
  speechRate?: number;
  /** 时钟单帧最多推进多久（毫秒）：切到后台再回来时不要一下跳过去 */
  maxFrameMs: number;
  /** 读完后的停顿（毫秒，来自 site.yaml 的 player.afterSpeech） */
  afterSpeech: { pauseMs: number; minMs: number; blockedRatio: number };
}

/**
 * 把连续时间状态机接上时钟和朗读：
 * - 动画段：requestAnimationFrame 推进步内进度 t；
 * - 讲解段：播放时朗读这一步（关掉朗读时按字数估算停留时间）；
 * 两者都结束后由状态机进入下一步。
 */
export function useTimeline(opts: TimelineOptions): {
  state: TimelineState;
  dispatch: (a: TimelineAction) => void;
} {
  const { total, narrate, voiceURI, speechRate = 1 } = opts;
  const [state, dispatch] = useReducer(timelineReducer, undefined, () =>
    initTimeline(total, {
      index: opts.startIndex,
      speed: opts.speed,
      autoPlay: opts.autoPlay,
      gates: opts.gates,
    }),
  );
  // 回调每次渲染都可能是新函数，用 ref 读取最新的，避免重启计时
  const fns = useRef(opts);
  useEffect(() => {
    fns.current = opts;
  });

  useEffect(() => {
    dispatch({ type: 'setTotal', total });
  }, [total]);

  // 动画段时钟
  const { running, index, speed, playing, epoch, waiting } = state;
  useEffect(() => {
    if (!running) return;
    const ms = fns.current.motionMs(index);
    if (!(ms > 0)) {
      dispatch({ type: 'frame', delta: Infinity });
      return;
    }
    let raf = 0;
    let prev = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(now - prev, fns.current.maxFrameMs);
      prev = now;
      dispatch({ type: 'frame', delta: (dt * speed) / ms });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, index, speed]);

  // 讲解段：只在播放时朗读；等孩子动手时也读一遍任务提示
  useEffect(() => {
    if (!playing && !waiting) return;
    const text = fns.current.narration(index, waiting);
    let cancelled = false;
    let timer: number | undefined;
    const done = (ms: number) => {
      timer = window.setTimeout(() => !cancelled && dispatch({ type: 'spoken', epoch }), ms);
    };
    if (narrate && text) {
      const started = Date.now();
      const handle = speak(text, { rate: speed * speechRate, voiceURI });
      handle.done.then(() => {
        if (cancelled) return;
        const spent = Date.now() - started;
        // 读完后稍作停顿；太短的句子也至少留够看清动画的时间。
        // 朗读被浏览器拦下（没有点击过页面时常见）会立刻“读完”：这时按字数估算的时间停留。
        const dwell = fns.current.dwellMs(index, speed);
        const { pauseMs, minMs, blockedRatio } = fns.current.afterSpeech;
        done(Math.max(minMs, pauseMs / speed - spent, dwell * blockedRatio - spent));
      });
      return () => {
        cancelled = true;
        window.clearTimeout(timer);
        handle.cancel();
      };
    }
    done(fns.current.dwellMs(index, speed));
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [playing, waiting, epoch, index, speed, narrate, voiceURI, speechRate]);

  return { state, dispatch };
}
