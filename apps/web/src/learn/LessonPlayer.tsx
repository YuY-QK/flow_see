// P3 知识点学习页的播放区：舞台、字幕、控制条（规格 P3）。
// 画面 = Stage(动画, 第几步, 步内进度)，时钟和朗读由 useTimeline 驱动。
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { getTheme, narrationText, stepDurationMs, type Animation, t } from '@flow-see/core';
import { useTimeline } from '@flow-see/runtime/player/useTimeline.ts';
import { isSpeechSupported, speak } from '@flow-see/runtime/services/speech.ts';
import { useSettings } from '@flow-see/runtime/store/settings.ts';
import type { StageTry, Template, TrySpec } from '@flow-see/runtime/template.ts';
import { Icon } from '@flow-see/runtime/ui/Icon.tsx';
import type { TimelineAction } from '@flow-see/core';
import { site } from '../site';
import { useDevice } from './device';
import ui from '@flow-see/runtime/ui/ui.module.css';
import s from './Lesson.module.css';

/** 学习方式：看一看（照常播放）/ 跟着做（关键步骤停下来让孩子做）/ 自己做（只给任务提示） */
export type HandsMode = 'watch' | 'guided' | 'self';

/** 动手做的步骤里，孩子做到哪了 */
interface TryProgress {
  /** 已经拖对的计数块（原来的序号） */
  moved: number[];
  misses: number;
  /** 字幕下方的反馈：提示、“看我做一遍”等 */
  note: string;
  /** 正在“看我做一遍”：演示动画的进度 0–1；null = 没在演示 */
  demo: number | null;
  /** 属于哪一步的等待；换了步骤就从头开始 */
  key: string;
}
const freshTry = (key: string): TryProgress => ({
  moved: [],
  misses: 0,
  note: '',
  demo: null,
  key,
});

interface Props {
  animation: Animation;
  /** 学习方式，默认看一看 */
  mode?: HandsMode;
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
  mode = 'watch',
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
  const hands = mode !== 'watch';
  const handsOn = site.player.handsOn;
  const tries = useMemo(
    () => steps.map((st) => (st.data.try ? (st.data.try as TrySpec) : undefined)),
    [steps],
  );
  // 动手做：有 try 的步骤要等孩子做完；做对以后这一步按 solved 放（被孩子做掉的动作直接到位）
  const gates = useMemo(() => (hands ? tries.map(Boolean) : undefined), [hands, tries]);
  const phaseOf = (i: number): StageTry['phase'] | undefined =>
    hands && tries[i] ? 'solved' : undefined;
  const narrationFor = (i: number, waiting: boolean): string => {
    const st = steps[i];
    const tr = tries[i];
    if (!st) return '';
    // 自己做：不讲道理，只读任务提示和“做对了”
    if (!hands || !tr) return mode === 'self' ? '' : narrationText(st);
    if (waiting) return mode === 'guided' ? `${t('handsOn.your_turn')} ${tr.task}` : tr.task;
    return mode === 'guided' ? `${t('handsOn.praise')} ${narrationText(st)}` : t('handsOn.praise');
  };

  const { state, dispatch } = useTimeline({
    total,
    gates,
    motionMs: (i) => template.motionMs?.(animation, i, phaseOf(i)) ?? 0,
    narration: narrationFor,
    // 不朗读时按字数估算停留时间（site.yaml 的 player.dwell）；自己做时不用动手的步骤快速带过
    dwellMs: (i, speed) =>
      mode === 'self' && !tries[i]
        ? handsOn.selfDwellMs / speed
        : steps[i]
          ? stepDurationMs(steps[i], speed, site.player.dwell)
          : 0,
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

  // ───── 动手做：拖对、做错后的逐级引导（提示 → 高亮目标 → 看我做一遍）─────
  const tryKey = `${state.index}:${state.waiting}`;
  const [saved, setTp] = useState<TryProgress>(() => freshTry(tryKey));
  const tp = saved.key === tryKey ? saved : freshTry(tryKey);
  const say = (text: string) => {
    if (narrate)
      speak(text, { rate: state.speed * settings.speechRate, voiceURI: settings.voiceURI });
  };
  const spec = hands ? tries[state.index] : undefined;
  const need = Math.max(1, Math.round(Number(spec?.drag?.count ?? 1)));
  const startDemo = (misses: number) => {
    setTp({ ...freshTry(tryKey), misses, note: t('handsOn.watch_me'), demo: 0 });
    say(`${t('handsOn.watch_me')} ${steps[state.index] ? narrationText(steps[state.index]) : ''}`);
  };
  const onDrop = (i: number, ok: boolean) => {
    if (!spec) return;
    setTouched(true);
    if (ok) {
      const moved = [...tp.moved, i];
      setTp({ ...tp, moved, note: '' });
      if (moved.length >= need) dispatch({ type: 'solve' });
      return;
    }
    const misses = tp.misses + 1;
    if (misses >= handsOn.demoAfterMisses) return startDemo(misses);
    const note =
      spec.hints?.[misses - 1] ??
      (misses >= handsOn.targetAfterMisses ? t('handsOn.target') : t('handsOn.miss'));
    setTp({ ...tp, misses, note });
    say(note);
  };
  // 看我做一遍：按标准做法（do）放一遍这一步，停一会儿再让孩子自己做
  const demoing = tp.demo !== null;
  useEffect(() => {
    if (!demoing) return;
    const ms = (template.motionMs?.(animation, state.index) ?? 0) / state.speed;
    const start = performance.now();
    let raf = 0;
    let timer = 0;
    const loop = (now: number) => {
      const p = ms > 0 ? Math.min(1, (now - start) / ms) : 1;
      setTp((x) => (x.demo === null ? x : { ...x, demo: p }));
      if (p < 1) raf = requestAnimationFrame(loop);
      else
        timer = window.setTimeout(() => {
          setTp({ ...freshTry(tryKey), note: t('handsOn.you_try') });
          const task = tries[state.index]?.task ?? '';
          if (narrate)
            speak(`${t('handsOn.you_try')} ${task}`, {
              rate: state.speed * settings.speechRate,
              voiceURI: settings.voiceURI,
            });
        }, handsOn.demoPauseMs);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
    // 只在开始演示时启动一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoing]);
  const tryIt: StageTry | undefined =
    !spec || demoing
      ? undefined
      : state.waiting
        ? {
            phase: 'doing',
            moved: tp.moved,
            showTarget: tp.misses >= handsOn.targetAfterMisses,
            onDrop,
          }
        : { phase: 'solved' };
  const doing = !!spec && state.waiting;
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
  const waitingRef = useRef(false);
  useEffect(() => {
    actRef.current = act;
    waitingRef.current = state.waiting;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || isTyping(e.target)) return;
      if (document.querySelector('[role="dialog"]')) return;
      if (e.key === ' ') {
        e.preventDefault();
        if (e.type === 'keydown' && !e.repeat) actRef.current({ type: 'toggle' });
      } else if (e.type === 'keydown' && e.key === 'ArrowRight') {
        if (!waitingRef.current) actRef.current({ type: 'next' });
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
        <Stage
          animation={animation}
          index={state.index}
          progress={demoing ? (tp.demo ?? 0) : state.progress}
          theme={theme}
          tryIt={tryIt}
        />
      </div>

      <div className={s.caption} data-large={largeCaption} aria-live="polite">
        <span className={s.captionIcon} data-on={narrate && state.playing} aria-hidden>
          <Icon name={narrate ? 'sound' : 'mute'} size={20} />
        </span>
        <div className={s.captionText}>
          <div className={s.counter}>
            {doing ? <span className={s.yourTurn}>{t('handsOn.your_turn')}</span> : null}
            {step?.title
              ? t('common.step_counter_title', { n: state.index + 1, total, title: step.title })
              : t('common.step_counter', { n: state.index + 1, total })}
          </div>
          <div className={s.say}>{doing || demoing ? spec?.task : step?.desc}</div>
          {doing || demoing ? (
            <div className={s.tryNote} data-miss={tp.misses > 0 && !demoing} key={tp.misses}>
              {tp.note ||
                (tp.moved.length
                  ? t('handsOn.moved', { n: tp.moved.length, left: need - tp.moved.length })
                  : '')}
            </div>
          ) : null}
        </div>
        {doing && !demoing ? (
          <button className={`${ui.btn} ${s.showMe}`} onClick={() => startDemo(tp.misses)}>
            {t('handsOn.show_me')}
          </button>
        ) : null}
      </div>

      <div className={s.controls}>
        <button
          className={s.ctrl}
          aria-label={t('common.shang_yi_bu')}
          onClick={() => act({ type: 'prev' })}
          disabled={state.index === 0}
        >
          <Icon name="prev" />
        </button>
        <button
          className={s.play}
          aria-label={state.playing ? t('common.zan_ting') : t('common.bo_fang')}
          onClick={() => act({ type: 'toggle' })}
        >
          <Icon name={state.playing ? 'pause' : 'play'} size={24} />
        </button>
        <button
          className={s.ctrl}
          aria-label={t('common.xia_yi_bu')}
          onClick={() => act({ type: 'next' })}
          disabled={state.index >= total - 1 || doing}
        >
          <Icon name="next" />
        </button>

        <div className={s.track}>
          {/* 动手做时不能拖进度跳过 */}
          <label className={s.seek} hidden={hands}>
            <span className="sr-only">{t('lessonPlayer.tuo_dong_jin_du')}</span>
            <input
              type="range"
              min={0}
              max={total}
              step={0.01}
              value={position}
              aria-valuetext={t('common.step_n', { n: state.index + 1 })}
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
                aria-label={
                  st.title
                    ? t('common.step_n_title', { n: i + 1, title: st.title })
                    : t('common.step_n', { n: i + 1 })
                }
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
            aria-label={t('common.speed_aria', { speed: state.speed })}
            onClick={() => act({ type: 'cycleSpeed' })}
          >
            {state.speed}×
          </button>
        ) : null}
        {speechOk ? (
          <button
            className={s.ctrl}
            data-active={narrate}
            aria-label={narrate ? t('common.guan_bi_lang_du') : t('common.da_kai_lang_du')}
            aria-pressed={narrate}
            onClick={() => settings.set({ autoNarrate: !narrate })}
          >
            <Icon name={narrate ? 'sound' : 'mute'} />
          </button>
        ) : null}
        {canFullscreen ? (
          <button
            className={s.ctrl}
            aria-label={isFull ? t('lessonPlayer.tui_chu_quan_ping') : t('common.quan_ping')}
            onClick={toggleFullscreen}
          >
            <Icon name="fullscreen" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
