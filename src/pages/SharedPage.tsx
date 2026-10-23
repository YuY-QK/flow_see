import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Animation } from '@/engine';
import { Player } from '@/player/Player';
import { fetchShared } from '@/services/share';
import { getTemplate } from '@/templates/registry';
import { Logo } from '@/ui/AppHeader';
import ui from '@/ui/ui.module.css';
import s from './Pages.module.css';

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
        <Logo to="/" />
        <p className={ui.hideNarrow}>有人用动画流做了这个动画，分享给你</p>
        <span style={{ flexGrow: 1 }} />
        <Link to="/create" className={`${ui.btn} ${ui.primary}`}>
          我也要做一个
        </Link>
      </div>

      {state.kind === 'loading' ? (
        <div className={s.center} aria-live="polite">
          正在打开…
        </div>
      ) : state.kind === 'missing' ? (
        <div className={s.center}>
          <p>这个分享链接不存在，或者已经失效了。</p>
          <Link to="/gallery" className={ui.btn}>
            去动画广场看看
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
            重试
          </button>
        </div>
      ) : !template ? (
        <div className={s.center}>这个动画使用的模板在当前版本里还不支持。</div>
      ) : (
        <main className={s.playMain}>
          <div className={s.playHead}>
            <div className={s.playTitleBox}>
              <h1 className={s.playTitle}>
                {state.animation.title || '未命名动画'}
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
                <div className={s.crumb}>作者：{state.animation.author}</div>
              ) : null}
            </div>
          </div>
          <Player animation={state.animation} template={template} variant="full" autoPlay />
        </main>
      )}
    </div>
  );
}
