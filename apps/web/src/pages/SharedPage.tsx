import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Animation } from '@flow-see/core';
import { Player } from '@flow-see/runtime/player/Player.tsx';
import { fetchShared } from '@flow-see/runtime/services/share.ts';
import { getTemplate } from '@flow-see/templates';
import { site } from '../site';
import { Brand } from '../ui/Brand';
import ui from '@flow-see/runtime/ui/ui.module.css';
import s from './Pages.module.css';

import { t } from '@flow-see/core';
type State =
  | { kind: 'loading' }
  | { kind: 'ready'; animation: Animation }
  | { kind: 'missing' }
  | { kind: 'error'; message: string };

/** 别人打开分享链接看到的页面：不显示站内导航，顶部提供“我也要做一个” */
export function SharedPage() {
  const { id = '' } = useParams();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    fetchShared(id)
      .then((a) => alive && setState(a ? { kind: 'ready', animation: a } : { kind: 'missing' }))
      .catch((e: Error) => alive && setState({ kind: 'error', message: e.message }));
    return () => {
      alive = false;
    };
  }, [id, attempt]);

  const template = state.kind === 'ready' ? getTemplate(state.animation.templateId) : undefined;

  return (
    <div className={`${s.page} ${s.playPage}`}>
      <div className={s.sharedBar}>
        <Brand />
        <p className={ui.hideNarrow}>{t('sharedPage.shared_with_you', { name: site.site.name })}</p>
        <span style={{ flexGrow: 1 }} />
        <Link to="/create" className={`${ui.btn} ${ui.primary}`}>
          {t('sharedPage.wo_ye_yao_zuo')}
        </Link>
      </div>

      {state.kind === 'loading' ? (
        <div className={s.center} aria-live="polite">
          {t('sharedPage.zheng_zai_da_kai')}
        </div>
      ) : state.kind === 'missing' ? (
        <div className={s.center}>
          <p>{t('sharedPage.zhe_ge_fen_xiang')}</p>
          <Link to="/" className={ui.btn}>
            {t('sharedPage.go_see', { name: site.site.name })}
          </Link>
        </div>
      ) : state.kind === 'error' ? (
        <div className={s.center} role="alert">
          <p>{state.message}</p>
          <button
            className={ui.btn}
            onClick={() => {
              setState({ kind: 'loading' });
              setAttempt((n) => n + 1);
            }}
          >
            {t('common.chong_shi')}
          </button>
        </div>
      ) : !template ? (
        <div className={s.center}>{t('sharedPage.zhe_ge_dong_hua')}</div>
      ) : (
        <main className={s.playMain}>
          <div className={s.playHead}>
            <div className={s.playTitleBox}>
              <h1 className={s.playTitle}>
                {state.animation.title || t('common.wei_ming_ming_dong')}
                <span
                  className={ui.badge}
                  style={{
                    background: `var(--tpl-${template.id}-bg)`,
                    color: `var(--tpl-${template.id}-ink)`,
                  }}
                >
                  {template.name}
                </span>
              </h1>
              {state.animation.author ? (
                <div className={s.crumb}>
                  {t('sharedPage.author', { author: state.animation.author })}
                </div>
              ) : null}
            </div>
          </div>
          <Player animation={state.animation} template={template} variant="full" autoPlay />
        </main>
      )}
    </div>
  );
}
