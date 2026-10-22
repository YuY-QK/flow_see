import { useNavigate } from 'react-router-dom';
import type { Animation } from '@/engine';
import { repository } from '@/services/storage';
import { TEMPLATE_CARDS, getTemplate } from '@/templates/registry';
import { AppHeader } from '@/ui/AppHeader';
import ui from '@/ui/ui.module.css';
import { Link } from 'react-router-dom';
import s from './Pages.module.css';

const EXAMPLES = [{ templateId: 'message', title: 'TCP 三次握手' }];

export function CreatePage() {
  const navigate = useNavigate();

  const open = async (a: Animation) => {
    await repository.save(a);
    navigate(`/edit/${a.id}`, { replace: true });
  };

  return (
    <div className={s.page}>
      <AppHeader>
        <Link to="/" className={`${ui.btn} ${ui.ghost}`}>
          取消
        </Link>
      </AppHeader>
      <main className={s.content}>
        <div>
          <div className={s.note}>新建动画 · 第 1 步</div>
          <h1 className={s.h1}>你想讲清楚什么？</h1>
          <p className={s.sub}>选一个最像的样子。</p>
        </div>

        <div className={s.tplGrid}>
          {TEMPLATE_CARDS.map((c) => (
            <button
              key={c.id}
              className={s.tplCard}
              disabled={!c.available}
              onClick={() => {
                const t = getTemplate(c.id);
                if (t) open(t.createBlank());
              }}
            >
              <span
                className={s.tplArt}
                style={{ background: `var(--tpl-${c.id}-bg)`, color: `var(--tpl-${c.id}-ink)` }}
              >
                {c.tagline}
              </span>
              <span className={s.tplName}>
                {c.name}
                {!c.available ? <span className={s.soon}>即将推出</span> : null}
              </span>
              <span className={s.tplDesc}>适合：{c.scenes}</span>
            </button>
          ))}
        </div>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 className={s.h2}>不确定？从一个示例改起</h2>
          <div className={s.pills}>
            {EXAMPLES.map((e) => (
              <button
                key={e.title}
                className={s.pill}
                onClick={() => {
                  const t = getTemplate(e.templateId);
                  if (t) open(t.createDefault());
                }}
              >
                {e.title}
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
