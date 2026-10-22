import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { getTheme, type Animation } from '@/engine';
import { isSpeechSupported } from '@/services/speech';
import type { Template } from '@/templates/types';
import { Icon } from '@/ui/Icon';
import ui from '@/ui/ui.module.css';
import { usePlayback } from './usePlayback';
import s from './Player.module.css';

interface Props {
  animation: Animation;
  template: Template;
  /** 外部要求跳到某一步（编辑器里选中步骤时） */
  focusIndex?: number;
  /** full：播放页，带步骤目录；embed：编辑器里的预览 */
  variant?: 'full' | 'embed';
}

export function Player({ animation, template, focusIndex, variant = 'full' }: Props) {
  const speechOk = isSpeechSupported();
  const [narrate, setNarrate] = useState(speechOk && animation.settings.autoNarrate);
  const { state, dispatch, step } = usePlayback(animation.steps, narrate, focusIndex ?? 0);
  const rootRef = useRef<HTMLDivElement>(null);
  const theme = getTheme(animation.themeId);
  const Stage = template.Stage;
  const total = animation.steps.length;

  useEffect(() => {
    if (focusIndex !== undefined) dispatch({ type: 'seek', index: focusIndex });
  }, [focusIndex, dispatch]);

  // 只在播放器获得焦点时响应键盘，避免影响页面上的输入框
  const onKeyDown = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (e.key === ' ') {
      e.preventDefault();
      dispatch({ type: 'toggle' });
    } else if (e.key === 'ArrowRight') dispatch({ type: 'next' });
    else if (e.key === 'ArrowLeft') dispatch({ type: 'prev' });
  };

  const fullscreen = () => {
    // 部分环境（手机、内嵌页面）不支持全屏，失败时忽略
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else rootRef.current?.requestFullscreen?.().catch(() => {});
  };

  return (
    <div
      ref={rootRef}
      className={`${s.root} ${variant === 'full' ? s.full : s.embed}`}
      onKeyDown={onKeyDown}
    >
      <div className={s.main}>
        <div
          className={s.stage}
          style={{ background: theme.stageBg, borderColor: theme.stageBorder }}
        >
          {total > 0 ? (
            <Stage animation={animation} index={state.index} theme={theme} />
          ) : (
            <div className={s.empty}>还没有步骤，先在左边添加一步吧</div>
          )}
        </div>

        <div className={s.caption} aria-live="polite">
          <span className={s.captionIcon} data-on={narrate && state.playing}>
            <Icon name="sound" size={20} />
          </span>
          <div className={s.captionText}>
            <div className={s.counter}>
              第 {total ? state.index + 1 : 0} 步 / 共 {total} 步
              {narrate && state.playing ? ' · 朗读中' : ''}
            </div>
            <div className={s.stepTitle}>{step?.title || '（未填写这一步发生了什么）'}</div>
            {step?.desc ? <div className={s.stepDesc}>{step.desc}</div> : null}
          </div>
        </div>

        <div className={s.controls}>
          <button
            className={`${ui.btn} ${ui.icon}`}
            aria-label="上一步"
            onClick={() => dispatch({ type: 'prev' })}
            disabled={state.index === 0}
          >
            <Icon name="prev" />
          </button>
          <button
            className={s.playBtn}
            aria-label={state.playing ? '暂停' : '播放'}
            onClick={() => dispatch({ type: 'toggle' })}
            disabled={total === 0}
          >
            <Icon name={state.playing ? 'pause' : 'play'} size={22} />
          </button>
          <button
            className={`${ui.btn} ${ui.icon}`}
            aria-label="下一步"
            onClick={() => dispatch({ type: 'next' })}
            disabled={state.index >= total - 1}
          >
            <Icon name="next" />
          </button>
          <label className={s.seek}>
            <span className="sr-only">进度</span>
            <input
              type="range"
              min={0}
              max={Math.max(total - 1, 0)}
              value={state.index}
              onChange={(e) => dispatch({ type: 'seek', index: Number(e.target.value) })}
              disabled={total < 2}
            />
          </label>
          <button
            className={`${ui.btn} ${s.speed}`}
            aria-label={`播放速度 ${state.speed} 倍，点击切换`}
            onClick={() => dispatch({ type: 'cycleSpeed' })}
          >
            {state.speed}×
          </button>
          {speechOk ? (
            <button
              className={`${ui.btn} ${ui.icon} ${narrate ? ui.active : ''}`}
              aria-label={narrate ? '关闭朗读' : '打开朗读'}
              aria-pressed={narrate}
              onClick={() => setNarrate((v) => !v)}
            >
              <Icon name={narrate ? 'sound' : 'mute'} />
            </button>
          ) : null}
          <button className={`${ui.btn} ${ui.icon}`} aria-label="全屏" onClick={fullscreen}>
            <Icon name="fullscreen" />
          </button>
        </div>
      </div>

      {variant === 'full' ? (
        <aside className={s.side}>
          <div className={s.sideTitle}>步骤目录</div>
          <ol className={s.stepList}>
            {animation.steps.map((st, i) => (
              <li key={st.id}>
                <button
                  className={s.stepItem}
                  data-current={i === state.index}
                  onClick={() => dispatch({ type: 'seek', index: i })}
                >
                  <span className={s.stepNum}>{i + 1}</span>
                  <span>{st.title || '（未填写）'}</span>
                </button>
              </li>
            ))}
          </ol>
        </aside>
      ) : null}
    </div>
  );
}
