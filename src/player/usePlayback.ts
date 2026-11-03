import { useEffect, useReducer } from 'react';
import {
  initPlayback,
  narrationText,
  playbackReducer,
  stepDurationMs,
  type Speed,
  type Step,
} from '@/engine';
import { speak } from '@/services/speech';

export interface PlaybackOptions {
  narrate: boolean;
  startIndex?: number;
  speed?: Speed;
  /** 打开即自动播放（产品规则：默认带讲解自动播放） */
  autoPlay?: boolean;
  voiceURI?: string;
  /** 朗读语速，会再乘上播放速度 */
  speechRate?: number;
}

/**
 * 把纯状态机接上计时器和朗读：
 * 播放时先朗读当前步骤（或按时长等待），结束后自动推进到下一步。
 */
export function usePlayback(steps: Step[], opts: PlaybackOptions) {
  const { narrate, voiceURI, speechRate = 1 } = opts;
  const [state, dispatch] = useReducer(playbackReducer, undefined, () => {
    const s = initPlayback(steps.length, opts.startIndex ?? 0, opts.speed ?? 1);
    return opts.autoPlay && steps.length > 0 ? { ...s, playing: true } : s;
  });

  useEffect(() => {
    dispatch({ type: 'setTotal', total: steps.length });
  }, [steps.length]);

  const step = steps[state.index];
  const text = step ? narrationText(step) : '';
  const waitMs = step ? stepDurationMs(step, state.speed) : 0;

  useEffect(() => {
    if (!state.playing || !step) return;
    let cancelled = false;
    let timer: number | undefined;
    const advance = (ms: number) => {
      timer = window.setTimeout(() => !cancelled && dispatch({ type: 'tick' }), ms);
    };

    if (narrate && text) {
      const started = Date.now();
      const handle = speak(text, { rate: state.speed * speechRate, voiceURI });
      // 读完后稍作停顿；太短的句子也至少留够看清动画的时间
      handle.done.then(() => {
        if (cancelled) return;
        advance(Math.max(500, 1200 / state.speed - (Date.now() - started)));
      });
      return () => {
        cancelled = true;
        window.clearTimeout(timer);
        handle.cancel();
      };
    }

    advance(waitMs);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // step 对象在编辑时会变；只在会影响播放的内容变化时重新计时
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.playing, state.index, state.speed, narrate, text, waitMs, voiceURI, speechRate]);

  return { state, dispatch, step };
}
