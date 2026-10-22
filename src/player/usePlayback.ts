import { useEffect, useReducer } from 'react';
import { initPlayback, narrationText, playbackReducer, stepDurationMs, type Step } from '@/engine';
import { speak } from '@/services/speech';

/**
 * 把纯状态机接上计时器和朗读：
 * 播放时先朗读当前步骤（或按时长等待），结束后自动推进到下一步。
 */
export function usePlayback(steps: Step[], narrate: boolean, startIndex = 0) {
  const [state, dispatch] = useReducer(playbackReducer, undefined, () =>
    initPlayback(steps.length, startIndex),
  );

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
      const handle = speak(text, { rate: state.speed });
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
  }, [state.playing, state.index, state.speed, narrate, text, waitMs]);

  return { state, dispatch, step };
}
