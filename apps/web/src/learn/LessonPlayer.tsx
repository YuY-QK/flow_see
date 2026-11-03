// P3 知识点学习页的播放区：舞台、字幕、控制条（规格 P3）。
// 画面 = Stage(动画, 第几步, 步内进度)，时钟和朗读由 useTimeline 驱动。
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { getTheme, narrationText, type Animation } from '@flow-see/core';
import { useTimeline } from '@flow-see/runtime/player/useTimeline.ts';
import { isSpeechSupported } from '@flow-see/runtime/services/speech.ts';
import { useSettings } from '@flow-see/runtime/store/settings.ts';
import type { Template } from '@flow-see/runtime/template.ts';
import { Icon } from '@flow-see/runtime/ui/Icon.tsx';
import type { TimelineAction } from '@flow-see/core';
import { site } from '../site';
import { useDevice } from './device';
import s from './Lesson.module.css';

interface Props {
  animation: Animation;
  template: Template;
  startIndex: number;
  autoPlay: boolean;
  /** 低年级字幕字号更大 */
  largeCaption: boolean;
  /** 产生或更新学习记录：至少播放或切换过一步之后，每到一步调用一次（规格 3.1） */
  onVisit(index: number): void;
  /** 在播放状态下自然播完最后一步（规格 3.2） */
  onFinish(): void;
}

function isTyping(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return (
    el.isContentEditable ||
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT'
  );
}

export function LessonPlayer({
  animation,
  template,
  startIndex,
  autoPlay,
  largeCaption,
  onVisit,
  onFinish,
}: Props) {
  const device = useDevice();
  const speechOk = isSpeechSupported();
  const settings = useSettings();
  const narrate = speechOk && settings.autoNarrate;
  const steps = animation.steps;
  const total = steps.length;

  const { state, dispatch } = useTimeline({
    total,
    motionMs: (i) => template.motionMs?.(animation, i) ?? 0,
    narration: (i) => (steps[i] ? narrationText(steps[i]) : ''),
    // 不朗读时按字数估算停留时间（site.yaml 的 player.dwell）
    dwellMs: (i, speed) => {
      const { msPerChar, minMs } = site.player.dwell;
      return steps[i]
        ? Math.round(Math.max(minMs, narrationText(steps[i]).length * msPerChar) / speed)
        : 0;
    },
    maxFrameMs: site.player.maxFrameMs,
    afterSpeech: site.player.afterSpeech,
    narrate,
    startIndex,
    autoPlay,
    speed: settings.defaultSpeed,
    voiceURI: settings.voiceURI,
    speechRate: settings.speechRate,
  });

  // 只打开不操作，不产生记录；播放或切换过一步之后才记录
  const [touched, setTouched] = useState(false);
  const act = (a: TimelineAction) => {
    setTouched(true);
    dispatch(a);
  };
  const engaged = touched || state.index !== startIndex || state.finishes > 0;
  const visit = useRef(onVisit);
  const finish = useRef(onFinish);
  useEffect(() => {
    visit.current = onVisit;
    finish.current = onFinish;
  });
  useEffect(() => {
    if (engaged) visit.current(state.index);
  }, [engaged, state.index]);
  useEffect(() => {
    if (state.finishes > 0) finish.current();
  }, [state.finishes]);

  // 键盘：空格播放/暂停，左右方向键上一步/下一步（输入框获得焦点时不响应）
  const actRef = useRef(act);
  useEffect(() => {
    actRef.current = act;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || isTyping(e.target)) return;
      if (document.querySelector('[role="dialog"]')) return;
      if (e.key === ' ') {
        e.preventDefault();
        if (e.type === 'keydown' && !e.repeat) actRef.current({ type: 'toggle' });
      } else if (e.type === 'keydown' && e.key === 'ArrowRight') {
        actRef.current({ type: 'next' });
      } else if (e.type === 'keydown' && e.key === 'ArrowLeft') {
        actRef.current({ type: 'prev' });
      }
    };
    // keyup 也要拦下空格，否则获得焦点的按钮会再被“点”一次
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }, []);

  // 全屏：舞台、字幕、控制条一起进入；不支持时隐藏按钮
  const rootRef = useRef<HTMLDivElement>(null);
  const canFullscreen = typeof document !== 'undefined' && !!document.fullscreenEnabled;
  const [isFull, setIsFull] = useState(false);
  useEffect(() => {
    const on = () => setIsFull(document.fullscreenElement === rootRef.current);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else rootRef.current?.requestFullscreen?.().catch(() => {});
  };

  const theme = getTheme(animation.themeId);
  const Stage = template.Stage;
  const step = steps[state.index];
  const stage = (animation.config?.stage as { width: number; height: number } | undefined) ?? {
    width: 800,
    height: 450,
  };
  const position = state.index + state.progress;

  return (
    <div ref={rootRef} className={s.player} data-full={isFull}>
      <div
        className={s.stage}
        style={
          {
            background: theme.stageBg,
            borderColor: theme.stageBorder,
            '--ratio': `${stage.width} / ${stage.height}`,
          } as CSSProperties
        }
      >
        <Stage animation={animation} index={state.index} progress={state.progress} theme={theme} />
      </div>

      <div className={s.caption} data-large={largeCaption} aria-live="polite">
        <span className={s.captionIcon} data-on={narrate && state.playing} aria-hidden>
          <Icon name={narrate ? 'sound' : 'mute'} size={20} />
        </span>
        <div className={s.captionText}>
          <div className={s.counter}>
            第 {state.index + 1} 步 / 共 {total} 步{step?.title ? ` · ${step.title}` : ''}
          </div>
          <div className={s.say}>{step?.desc}</div>
        </div>
      </div>

      <div className={s.controls}>
        <button
          className={s.ctrl}
          aria-label="上一步"
          onClick={() => act({ type: 'prev' })}
          disabled={state.index === 0}
        >
          <Icon name="prev" />
        </button>
        <button
          className={s.play}
          aria-label={state.playing ? '暂停' : '播放'}
          onClick={() => act({ type: 'toggle' })}
        >
          <Icon name={state.playing ? 'pause' : 'play'} size={24} />
        </button>
        <button
          className={s.ctrl}
          aria-label="下一步"
          onClick={() => act({ type: 'next' })}
          disabled={state.index >= total - 1}
        >
          <Icon name="next" />
        </button>

        <div className={s.track}>
          <label className={s.seek}>
            <span className="sr-only">拖动进度</span>
            <input
              type="range"
              min={0}
              max={total}
              step={0.01}
              value={position}
              aria-valuetext={`第 ${state.index + 1} 步`}
              onChange={(e) => act({ type: 'scrub', position: Number(e.target.value) })}
            />
          </label>
          <div className={s.dots}>
            {steps.map((st, i) => (
              <button
                key={st.id}
                className={s.dot}
                data-current={i === state.index}
                data-done={i < state.index}
                aria-label={`第 ${i + 1} 步${st.title ? `：${st.title}` : ''}`}
                aria-current={i === state.index ? 'step' : undefined}
                onClick={() => act({ type: 'seek', index: i })}
              >
                <span />
              </button>
            ))}
          </div>
        </div>

        {device !== 'phone' ? (
          <button
            className={`${s.ctrl} ${s.speed}`}
            aria-label={`播放速度 ${state.speed} 倍，点击切换`}
            onClick={() => act({ type: 'cycleSpeed' })}
          >
            {state.speed}×
          </button>
        ) : null}
        {speechOk ? (
          <button
            className={s.ctrl}
            data-active={narrate}
            aria-label={narrate ? '关闭朗读' : '打开朗读'}
            aria-pressed={narrate}
            onClick={() => settings.set({ autoNarrate: !narrate })}
          >
            <Icon name={narrate ? 'sound' : 'mute'} />
          </button>
        ) : null}
        {canFullscreen ? (
          <button
            className={s.ctrl}
            aria-label={isFull ? '退出全屏' : '全屏'}
            onClick={toggleFullscreen}
          >
            <Icon name="fullscreen" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
