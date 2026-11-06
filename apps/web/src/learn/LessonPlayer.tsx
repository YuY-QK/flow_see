// P3 知识点学习页的播放区：舞台、字幕、控制条（规格 P3）。
// 画面 = Stage(动画, 第几步, 步内进度)，时钟和朗读由 useTimeline 驱动。
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  chooseAnswers,
  chooseLabel,
  chooseOptions,
  isMultiChoose,
  getTheme,
  isAnswer,
  narrationText,
  shuffled,
  stepDurationMs,
  type Animation,
  type ChooseValue,
  t,
} from '@flow-see/core';
import { useTimeline } from '@flow-see/runtime/player/useTimeline.ts';
import { isSpeechSupported, speak } from '@flow-see/runtime/services/speech.ts';
import { useSettings } from '@flow-see/runtime/store/settings.ts';
import type { StageTry, Template, TrySpec } from '@flow-see/runtime/template.ts';
import { Icon } from '@flow-see/runtime/ui/Icon.tsx';
import type { TimelineAction } from '@flow-see/core';
import { site } from '../site';
import { StageControls, type ParamsPanelProps } from './StageControls';
import { StageToolbar, type ToolItem, type ToolText } from './StageToolbar';
import { useDevice } from './device';
import s from './Lesson.module.css';

/** 学习方式：看一看（照常播放）/ 跟着做（关键步骤停下来让孩子做）/ 自己做（只给任务提示） */
export type HandsMode = 'watch' | 'guided' | 'self';

/** 动手做的步骤里，孩子做到哪了 */
interface TryProgress {
  /** 已经拖对的计数块（原来的序号） */
  moved: number[];
  /** 拖到几个目标时：每一个放进了哪个目标（和 moved 一一对应） */
  placed: string[];
  /** 多选：已经选对的选项 */
  picked: string[];
  misses: number;
  /** 字幕下方的反馈：提示、“看我做一遍”等 */
  note: string;
  /** 正在“看我做一遍”：演示动画的进度 0–1；null = 没在演示 */
  demo: number | null;
  /** 属于哪一步的等待；换了步骤就从头开始 */
  key: string;
  /** 点选：看过演示后，标出正确选项 */
  reveal: boolean;
  /** 点选：刚选错的那一项（标红、晃一下） */
  wrong?: string;
}
const freshTry = (key: string): TryProgress => ({
  moved: [],
  placed: [],
  picked: [],
  misses: 0,
  note: '',
  demo: null,
  key,
  reveal: false,
});

interface Props {
  animation: Animation;
  /** 学习方式，默认看一看 */
  mode?: HandsMode;
  /** 舞台右上角“{时长} · {第几步}/{总步数} 步” */
  duration?: string;
  /**
   * 舞台右上角当前学习方式的完成状态：没做完是进度环，做完是绿色对勾。
   * saved = 已记下的完成度；onMark / onUndo 只有“看一看”才有（点一下标为学会 / 取消）。
   */
  badge?: { saved: number; onMark?(): void; onUndo?(): void };
  /** 当前学习方式的完成度有变化时调用（0–1，做完整个流程 = 1）；只在孩子操作过之后调用 */
  onProgress?(ratio: number): void;
  /** 舞台底部工具条右边的图标按钮（分享、下载……）；全屏由播放器自己加 */
  tools?: ToolItem[];
  /** 自己做：舞台上方的出题参数面板（右上角齿轮展开） */
  panel?: ParamsPanelProps;
  /** 自己做：工具条里的“演示”（用这道题的数字切到看一看） */
  onDemo?(): void;
  /** 自己做：工具条里的“换题”；没有可换的题就不传 */
  onNewProblem?(): void;
  /** 自己做：孩子开始动手（第一次拖或点）时调用一次；之后到做完前不能再调题目 */
  onStart?(): void;
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
  duration,
  badge,
  onProgress,
  tools = [],
  panel,
  onDemo,
  onNewProblem,
  onStart,
  template,
  startIndex,
  autoPlay,
  largeCaption,
  onVisit,
  onFinish,
}: Props) {
  const speechOk = isSpeechSupported();
  const settings = useSettings();
  // 出题参数面板：进入自己做时默认展开；孩子开始作答后自动收起（site.yaml 的 player.params）
  const [paramsOpen, setParamsOpen] = useState(site.player.params.openOnEnter);
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
  // 自己做：不播放讲解，只剩孩子要做的步骤和最后一步（结果）；从第一个要做的步骤开始，不自动播放
  const self = mode === 'self';
  const skips = useMemo(
    () => (self ? tries.map((tr, i) => !tr && i !== tries.length - 1) : undefined),
    [self, tries],
  );
  const firstStep = skips ? Math.max(0, skips.indexOf(false)) : startIndex;
  // 等孩子动手时（doing）只放提问之前的那一段；做对以后按 solved 放
  const phaseOf = (i: number, waiting: boolean): StageTry['phase'] | undefined =>
    hands && tries[i] ? (waiting ? 'doing' : 'solved') : undefined;
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
    skips,
    motionMs: (i, waiting) => template.motionMs?.(animation, i, phaseOf(i, waiting)) ?? 0,
    narration: narrationFor,
    // 不朗读时按字数估算停留时间（site.yaml 的 player.dwell）；自己做时不用动手的步骤快速带过
    dwellMs: (i, speed) =>
      mode === 'self' && !tries[i]
        ? handsOn.selfDwellMs / speed
        : steps[i]
          ? stepDurationMs(steps[i], speed, site.player.dwell)
          : 0,
    maxFrameMs: site.player.maxFrameMs,
    msPerChar: site.player.dwell.msPerChar,
    afterSpeech: site.player.afterSpeech,
    narrate,
    startIndex: self ? firstStep : startIndex,
    autoPlay: self ? false : autoPlay,
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
  const engaged = touched || state.index !== (self ? firstStep : startIndex) || state.finishes > 0;

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
  // 拖到几个目标（一个一个分）时，每个目标最多放几个
  const targets = spec?.drag ? (Array.isArray(spec.drag.to) ? spec.drag.to : [spec.drag.to]) : [];
  const each =
    targets.length > 1
      ? Number(spec?.drag?.each) > 0
        ? Math.round(Number(spec?.drag?.each))
        : Math.ceil(need / targets.length)
      : need;
  const startDemo = (misses: number) => {
    setTp({ ...freshTry(tryKey), misses, note: t('handsOn.watch_me'), demo: 0 });
    say(`${t('handsOn.watch_me')} ${steps[state.index] ? narrationText(steps[state.index]) : ''}`);
  };
  const started = useRef(false);
  const begin = () => {
    setTouched(true);
    if (!started.current) {
      started.current = true;
      onStart?.();
      if (site.player.params.closeOnStart) setParamsOpen(false);
    }
  };
  /** 做错一次：逐级引导（提示 → 高亮目标 → 看我做一遍）；full 是“这里已经放满了” */
  const miss = (extra: Partial<TryProgress>, note?: string) => {
    if (!spec) return;
    const misses = tp.misses + 1;
    if (misses >= handsOn.demoAfterMisses) return startDemo(misses);
    const choosing = !!spec.choose;
    const text =
      note ??
      spec.hints?.[misses - 1] ??
      (misses >= handsOn.targetAfterMisses
        ? choosing
          ? t('handsOn.choose_target')
          : t('handsOn.target')
        : choosing
          ? t('handsOn.choose_miss')
          : t('handsOn.miss'));
    setTp({ ...tp, ...extra, misses, note: text });
    say(text);
  };
  const onDrop = (i: number, target: string | undefined) => {
    if (!spec) return;
    begin();
    const room = target !== undefined && tp.placed.filter((x) => x === target).length < each;
    if (target !== undefined && room) {
      const moved = [...tp.moved, i];
      const placed = [...tp.placed, target];
      setTp({ ...tp, moved, placed, note: '' });
      if (moved.length >= need) dispatch({ type: 'solve' });
      return;
    }
    // 放到了已经放满的目标上：不算大错，只提醒放到别处
    if (target !== undefined) {
      setTp({ ...tp, note: t('handsOn.full') });
      say(t('handsOn.full'));
      return;
    }
    miss({});
  };
  // 点选：选项打乱顺序（每次进入这一步重新打乱）；选对 → 做对了，选错 → 逐级引导
  const choose = spec?.choose;
  const multi = !!choose && isMultiChoose(choose);
  const answerCount = choose ? chooseAnswers(choose).length : 0;
  const options = useMemo(
    () => (choose ? shuffled(chooseOptions(choose)) : []),
    // 每次进入这一步重新打乱：tryKey 变了就换
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tryKey, animation],
  );
  const onChoose = (v: ChooseValue) => {
    if (!spec || !choose) return;
    begin();
    if (isAnswer(choose, v)) {
      // 多选：选对的留着，全部选出来才算做对
      const picked = tp.picked.includes(String(v)) ? tp.picked : [...tp.picked, String(v)];
      if (!multi || picked.length >= answerCount) {
        setTp({ ...tp, picked, note: '' });
        dispatch({ type: 'solve' });
        return;
      }
      const note = t('handsOn.multi_got', { left: answerCount - picked.length });
      setTp({ ...tp, picked, note, wrong: undefined });
      return;
    }
    miss({ wrong: String(v) });
  };
  // 多选、一个一个分：孩子停下来太久还没做完，提示还差几个（每次操作后重新计时）
  const doingNow = !!spec && state.waiting && tp.demo === null;
  const left = multi
    ? answerCount - tp.picked.length
    : targets.length > 1
      ? need - tp.moved.length
      : 0;
  const remindKey = `${tryKey}:${tp.picked.length}:${tp.moved.length}:${tp.misses}`;
  useEffect(() => {
    if (!doingNow || left <= 0 || (!multi && targets.length < 2)) return;
    const timer = window.setTimeout(() => {
      const note = multi ? t('handsOn.multi_remind', { left }) : t('handsOn.deal_remind', { left });
      setTp((x) => (x.key === tryKey ? { ...x, note } : x));
      say(note);
    }, handsOn.remindMs);
    return () => window.clearTimeout(timer);
    // 只在做了一下（或进入这一步）后重新计时
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remindKey, doingNow]);
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
          setTp({
            ...freshTry(tryKey),
            note: t('handsOn.you_try'),
            reveal: !!tries[state.index]?.choose,
          });
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
            placed: tp.placed,
            progress: state.progress,
            showTarget: tp.misses >= handsOn.targetAfterMisses,
            onDrop,
          }
        : { phase: 'solved' };
  const doing = !!spec && state.waiting;
  // 字幕下方的一行反馈（提示、已放好几个）；没有就不占地方
  const noteText =
    doing || demoing
      ? tp.note ||
        (tp.moved.length && !choose
          ? t('handsOn.moved', { n: tp.moved.length, left: need - tp.moved.length })
          : '')
      : '';
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
  const selfRef = useRef(false);
  useEffect(() => {
    actRef.current = act;
    waitingRef.current = state.waiting;
    selfRef.current = self;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || isTyping(e.target)) return;
      if (document.querySelector('[role="dialog"]') || selfRef.current) return;
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
  // 手机上舞台贴合内容：画面范围收到所有步骤里零件的包围盒并集，舞台的宽高比跟着变（site.yaml 的 scene.fit）
  const phone = useDevice() === 'phone';
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageW, setStageW] = useState(0);
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setStageW(el.clientWidth));
    ro.observe(el);
    setStageW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const viewBox = useMemo(() => {
    const box = phone ? template.viewBox?.(animation) : undefined;
    if (!box || stageW <= 0) return box;
    // 顶部给左上角的信息留 fit.topPx 像素：按当前舞台宽度换算成舞台坐标，往上多留出这一条
    const extra = site.scene.fit.topPx / (stageW / box.w);
    return { ...box, y: box.y - extra, h: box.h + extra };
  }, [phone, template, animation, stageW]);
  const stageRatio = viewBox ? `${viewBox.w} / ${viewBox.h}` : `${stage.width} / ${stage.height}`;
  const position = state.index + state.progress;
  // 自己做：做完整道题（最后一步放完）
  const selfDone = self && state.finishes > 0;
  // 当前学习方式的完成度：学到第几步占总步数的比例（自己做只算要做的步骤）；做完整个流程才算 1
  const effective = steps.map((_, i) => !skips?.[i]);
  const effCount = Math.max(1, effective.filter(Boolean).length);
  const passed = effective.reduce((n, e, i) => (e && i < state.index ? n + 1 : n), 0);
  const here = effective[state.index] && !state.waiting ? 1 : 0;
  const ratio = state.finishes > 0 ? 1 : Math.min((passed + here) / effCount, 0.99);
  const shownRatio = Math.max(badge?.saved ?? 0, engaged ? ratio : 0);
  const progress = useRef(onProgress);
  useEffect(() => {
    progress.current = onProgress;
  });
  useEffect(() => {
    if (engaged) progress.current?.(ratio);
  }, [engaged, ratio]);

  return (
    <div ref={rootRef} className={s.player} data-full={isFull}>
      <div className={s.stageBox}>
        <div
          ref={stageRef}
          className={s.stage}
          style={
            {
              background: theme.stageBg,
              borderColor: theme.stageBorder,
              '--ratio': stageRatio,
            } as CSSProperties
          }
        >
          <div className={s.stageSvg}>
            <Stage
              animation={animation}
              index={state.index}
              progress={demoing ? (tp.demo ?? 0) : state.progress}
              theme={theme}
              tryIt={tryIt}
              viewBox={viewBox}
            />
          </div>
        </div>
        {/* 左上角：完成状态图标在前，时长和第几步在后 */}
        <div className={s.cornerTop}>
          {badge ? <LearnedBadge badge={badge} ratio={shownRatio} /> : null}
          <span className={s.stageMeta}>
            {[duration, t('common.step_progress', { n: state.index + 1, total })]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </div>
        {panel ? (
          <StageControls {...panel} open={paramsOpen} onToggle={() => setParamsOpen((v) => !v)} />
        ) : null}
        <StageToolbar
          texts={[
            ...(self && onDemo ? [{ id: 'demo', label: t('handsOn.demo'), onClick: onDemo }] : []),
            ...(doing && !demoing
              ? [{ id: 'teach', label: t('handsOn.show_me'), onClick: () => startDemo(tp.misses) }]
              : []),
            ...(self && onNewProblem
              ? ([
                  {
                    id: 'new',
                    label: t('handsOn.new_problem'),
                    onClick: onNewProblem,
                    primary: selfDone,
                  },
                ] satisfies ToolText[])
              : []),
          ]}
          icons={[
            ...tools,
            ...(canFullscreen
              ? [
                  {
                    id: 'fullscreen',
                    icon: 'fullscreen' as const,
                    label: isFull ? t('lessonPlayer.tui_chu_quan_ping') : t('common.quan_ping'),
                    onClick: toggleFullscreen,
                  },
                ]
              : []),
          ]}
        />
      </div>

      <div className={s.caption} data-large={largeCaption} aria-live="polite">
        {speechOk ? (
          <button
            className={s.captionIcon}
            data-on={narrate}
            aria-label={narrate ? t('common.guan_bi_lang_du') : t('common.da_kai_lang_du')}
            aria-pressed={narrate}
            onClick={() => settings.set({ autoNarrate: !narrate })}
          >
            <Icon name={narrate ? 'sound' : 'mute'} size={20} />
          </button>
        ) : (
          <span className={s.captionIcon} aria-hidden>
            <Icon name="mute" size={20} />
          </span>
        )}
        <div className={s.captionText}>
          {doing || step?.title ? (
            <div className={s.counterRow}>
              <div className={s.counter}>
                {step?.title}
                {doing ? <span className={s.yourTurn}>{t('handsOn.your_turn')}</span> : null}
              </div>
            </div>
          ) : null}
          <div className={s.sayRow}>
            <div className={s.say}>{doing || demoing ? spec?.task : step?.desc}</div>
          </div>
          {doing && choose && !demoing ? (
            <div className={s.options} role="group" aria-label={t('handsOn.choose_aria')}>
              {options.map((o, i) => (
                <button
                  // 选错时换 key，让“晃一下”的动画重新播放
                  key={`${String(o)}-${tp.wrong === String(o) ? tp.misses : 0}`}
                  className={s.option}
                  style={{ '--i': i } as CSSProperties}
                  data-reveal={tp.reveal && isAnswer(choose, o)}
                  data-wrong={tp.wrong === String(o)}
                  data-picked={tp.picked.includes(String(o))}
                  aria-pressed={multi ? tp.picked.includes(String(o)) : undefined}
                  onClick={() => onChoose(o)}
                >
                  {chooseLabel(o)}
                </button>
              ))}
            </div>
          ) : null}
          {doing && multi && !demoing && !noteText ? (
            <div className={s.tryNote}>{t('handsOn.multi_hint')}</div>
          ) : null}
          {selfDone ? <div className={s.tryNote}>{t('handsOn.self_done')}</div> : null}
          {noteText ? (
            <div className={s.tryNote} data-miss={tp.misses > 0 && !demoing} key={tp.misses}>
              {noteText}
            </div>
          ) : null}
        </div>
      </div>

      {!self ? (
        <div className={s.controls}>
          <div className={s.transport}>
            <button
              className={s.ctrl}
              aria-label={t('common.shang_yi_bu')}
              onClick={() => act({ type: 'prev' })}
              disabled={!steps.some((_, i) => i < state.index && !skips?.[i])}
            >
              <Icon name="prev" />
            </button>
            {/* 自己做：没有播放，每一步都由孩子自己点或拖 */}
            {!self ? (
              <button
                className={s.play}
                aria-label={state.playing ? t('common.zan_ting') : t('common.bo_fang')}
                onClick={() => act({ type: 'toggle' })}
              >
                <Icon name={state.playing ? 'pause' : 'play'} size={24} />
              </button>
            ) : null}
            <button
              className={s.ctrl}
              aria-label={t('common.xia_yi_bu')}
              onClick={() => act({ type: 'next' })}
              disabled={!steps.some((_, i) => i > state.index && !skips?.[i]) || doing}
            >
              <Icon name="next" />
            </button>
          </div>

          <div className={s.track}>
            {/* 进度点就在进度条上：点一个点回到那一步的开头；动手做时不能拖进度跳过 */}
            <label className={s.seekWrap}>
              <span className="sr-only">{t('lessonPlayer.tuo_dong_jin_du')}</span>
              <input
                className={s.seek}
                type="range"
                min={0}
                max={total}
                step={0.01}
                value={position}
                data-locked={hands}
                tabIndex={hands ? -1 : undefined}
                style={{ '--fill': `${(position / Math.max(total, 1)) * 100}%` } as CSSProperties}
                aria-valuetext={t('common.step_n', { n: state.index + 1 })}
                onChange={(e) => act({ type: 'scrub', position: Number(e.target.value) })}
              />
            </label>
            <div className={s.marks}>
              {steps.map((st, i) => (
                <button
                  key={st.id}
                  className={s.dot}
                  style={{ '--at': i / Math.max(total, 1) } as CSSProperties}
                  data-current={i === state.index && state.progress === 0}
                  data-done={i < state.index || (i === state.index && state.progress > 0)}
                  aria-label={
                    st.title
                      ? t('common.step_n_title', { n: i + 1, title: st.title })
                      : t('common.step_n', { n: i + 1 })
                  }
                  aria-current={i === state.index ? 'step' : undefined}
                  disabled={!!skips?.[i]}
                  data-skip={!!skips?.[i]}
                  onClick={() => act({ type: 'seek', index: i })}
                >
                  <span />
                </button>
              ))}
            </div>
          </div>

          <button
            className={`${s.ctrl} ${s.speed}`}
            aria-label={t('common.speed_aria', { speed: state.speed })}
            onClick={() => act({ type: 'cycleSpeed' })}
          >
            {state.speed}×
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** 当前学习方式的完成状态：做完 = 绿色圆形对勾；没做完 = 进度环；只有“看一看”可以点 */
function LearnedBadge({
  badge,
  ratio,
}: {
  badge: { saved: number; onMark?(): void; onUndo?(): void };
  ratio: number;
}) {
  const done = ratio >= 1;
  const r = 11;
  const c = 2 * Math.PI * r;
  const label = done ? t('common.yi_xue_wan') : t('lessonPage.wo_xue_hui_le');
  const click = done ? badge.onUndo : badge.onMark;
  return (
    <button
      className={s.badge}
      data-done={done}
      disabled={!click}
      aria-label={label}
      title={label}
      onClick={click}
    >
      {done ? (
        <Icon name="check" size={13} />
      ) : (
        <svg viewBox="0 0 28 28" width="20" height="20" aria-hidden>
          <circle cx="14" cy="14" r={r} className={s.ringTrack} />
          <circle
            cx="14"
            cy="14"
            r={r}
            className={s.ringFill}
            strokeDasharray={c}
            strokeDashoffset={c * (1 - Math.max(0, Math.min(1, ratio)))}
            transform="rotate(-90 14 14)"
          />
          <path d="M9.5 14.5l3 3 6-7" className={s.ringCheck} />
        </svg>
      )}
    </button>
  );
}
