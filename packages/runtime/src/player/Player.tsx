import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { getTheme, type Animation, t } from '@flow-see/core';
import { ParamsForm } from '../editor/ParamsForm';
import { isSpeechSupported } from '../services/speech';
import { useSettings } from '../store/settings';
import type { Template } from '../template';
import { Icon } from '../ui/Icon';
import ui from '../ui/ui.module.css';
import { usePlayback } from './usePlayback';
import s from './Player.module.css';

interface Props {
  animation: Animation;
  template: Template;
  /** 外部要求跳到某一步（编辑器里选中步骤时） */
  focusIndex?: number;
  /** full：播放页，带步骤目录；embed：编辑器里的预览 */
  variant?: 'full' | 'embed';
  /** 打开后自动开始播放 */
  autoPlay?: boolean;
}

/** 给 numbers 字段随机出一组数 */
function randomParams(template: Template, params: Record<string, unknown>) {
  const next = { ...params };
  for (const f of template.paramFields ?? []) {
    if (f.kind !== 'numbers') continue;
    const lo = Math.max(f.min ?? 1, 1);
    const hi = Math.min(f.max ?? 30, 30);
    const count = Math.min(
      f.maxCount ?? 8,
      Math.max(f.minCount ?? 2, 5 + Math.floor(Math.random() * 3)),
    );
    next[f.key] = Array.from(
      { length: count },
      () => lo + Math.floor(Math.random() * (hi - lo + 1)),
    );
  }
  return next;
}

export function Player({
  animation: original,
  template,
  focusIndex,
  variant = 'full',
  autoPlay = false,
}: Props) {
  const speechOk = isSpeechSupported();
  const settings = useSettings();
  const [narrate, setNarrate] = useState(
    speechOk && settings.autoNarrate && original.settings.autoNarrate,
  );
  const [tab, setTab] = useState<'steps' | 'params'>('steps');
  // 观众“试试改参数”时的临时参数，不会保存到作品里
  const [trial, setTrial] = useState<Record<string, unknown> | null>(null);
  const canTry =
    variant === 'full' &&
    !!template.generate &&
    !!template.paramFields?.length &&
    original.settings.allowParamEdit;
  const animation = useMemo(
    () =>
      trial && template.generate
        ? { ...original, params: trial, steps: template.generate(trial) }
        : original,
    [original, trial, template],
  );
  const { state, dispatch, step } = usePlayback(animation.steps, {
    narrate,
    startIndex: focusIndex ?? 0,
    speed: settings.defaultSpeed,
    autoPlay,
    voiceURI: settings.voiceURI,
    speechRate: settings.speechRate,
  });
  const applyTrial = (p: Record<string, unknown> | null) => {
    setTrial(p);
    dispatch({ type: 'seek', index: 0 });
  };
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
            <div className={s.empty}>{t('player.hai_mei_you_bu')}</div>
          )}
        </div>

        <div className={s.caption} aria-live="polite">
          <span className={s.captionIcon} data-on={narrate && state.playing}>
            <Icon name="sound" size={20} />
          </span>
          <div className={s.captionText}>
            <div className={s.counter}>
              {t('common.step_counter', { n: total ? state.index + 1 : 0, total })}
              {narrate && state.playing ? t('player.lang_du_zhong') : ''}
            </div>
            <div className={s.stepTitle}>{step?.title || t('player.wei_tian_xie_zhe')}</div>
            {step?.desc ? <div className={s.stepDesc}>{step.desc}</div> : null}
          </div>
        </div>

        <div className={s.controls}>
          <button
            className={`${ui.btn} ${ui.icon}`}
            aria-label={t('common.shang_yi_bu')}
            onClick={() => dispatch({ type: 'prev' })}
            disabled={state.index === 0}
          >
            <Icon name="prev" />
          </button>
          <button
            className={s.playBtn}
            aria-label={state.playing ? t('common.zan_ting') : t('common.bo_fang')}
            onClick={() => dispatch({ type: 'toggle' })}
            disabled={total === 0}
          >
            <Icon name={state.playing ? 'pause' : 'play'} size={22} />
          </button>
          <button
            className={`${ui.btn} ${ui.icon}`}
            aria-label={t('common.xia_yi_bu')}
            onClick={() => dispatch({ type: 'next' })}
            disabled={state.index >= total - 1}
          >
            <Icon name="next" />
          </button>
          <label className={s.seek}>
            <span className="sr-only">{t('player.jin_du')}</span>
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
            aria-label={t('common.speed_aria', { speed: state.speed })}
            onClick={() => dispatch({ type: 'cycleSpeed' })}
          >
            {state.speed}×
          </button>
          {speechOk ? (
            <button
              className={`${ui.btn} ${ui.icon} ${narrate ? ui.active : ''}`}
              aria-label={narrate ? t('common.guan_bi_lang_du') : t('common.da_kai_lang_du')}
              aria-pressed={narrate}
              onClick={() => setNarrate((v) => !v)}
            >
              <Icon name={narrate ? 'sound' : 'mute'} />
            </button>
          ) : null}
          <button
            className={`${ui.btn} ${ui.icon}`}
            aria-label={t('common.quan_ping')}
            onClick={fullscreen}
          >
            <Icon name="fullscreen" />
          </button>
        </div>
      </div>

      {variant === 'full' ? (
        <aside className={s.side}>
          {canTry ? (
            <div className={s.tabs} role="tablist">
              <button role="tab" aria-selected={tab === 'steps'} onClick={() => setTab('steps')}>
                {t('player.bu_zhou_mu_lu')}
              </button>
              <button role="tab" aria-selected={tab === 'params'} onClick={() => setTab('params')}>
                {t('player.shi_shi_gai_can')}
              </button>
            </div>
          ) : (
            <div className={s.sideTitle}>{t('player.bu_zhou_mu_lu')}</div>
          )}
          {tab === 'params' && canTry ? (
            <div className={s.trial}>
              <ParamsForm
                template={template}
                params={animation.params ?? {}}
                elements={animation.elements}
                idPrefix="trial"
                onChange={applyTrial}
              />
              <div className={s.trialActions}>
                <button
                  className={ui.btn}
                  onClick={() => applyTrial(randomParams(template, animation.params ?? {}))}
                >
                  {t('player.sui_ji_yi_zu')}
                </button>
                <button
                  className={`${ui.btn} ${ui.primary}`}
                  onClick={() => {
                    dispatch({ type: 'seek', index: 0 });
                    dispatch({ type: 'play' });
                  }}
                >
                  {t('player.cong_tou_bo_fang')}
                </button>
              </div>
              {trial ? (
                <button className={s.reset} onClick={() => applyTrial(null)}>
                  {t('player.hui_fu_zuo_zhe')}
                </button>
              ) : null}
              <p className={s.trialNote}>{t('player.zhe_li_de_xiu')}</p>
            </div>
          ) : (
            <ol className={s.stepList}>
              {animation.steps.map((st, i) => (
                <li key={st.id}>
                  <button
                    className={s.stepItem}
                    data-current={i === state.index}
                    onClick={() => dispatch({ type: 'seek', index: i })}
                  >
                    <span className={s.stepNum}>{i + 1}</span>
                    <span>{st.title || t('common.wei_tian_xie')}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </aside>
      ) : null}
    </div>
  );
}
