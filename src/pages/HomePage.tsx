import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { officialItems } from '@/content/official';
import type { Animation } from '@/engine';
import { repository } from '@/services/storage';
import { TEMPLATE_CARDS, getTemplate } from '@/templates/registry';
import { AppHeader } from '@/ui/AppHeader';
import { Thumb } from '@/ui/Thumb';
import { timeAgo } from './format';
import { OfficialCard } from './OfficialCard';
import s from './Pages.module.css';

export function HomePage() {
  const [recent, setRecent] = useState<Animation[]>([]);
  useEffect(() => {
    repository.list().then((all) => setRecent(all.slice(0, 4)));
  }, []);
  const featured = officialItems().filter((i) => i.featured);

  return (
    <div className={s.page}>
      <AppHeader />
      <main className={s.content}>
        <section className={s.hero} aria-labelledby="home-title">
          <div>
            <div className={s.note}>把流程变成看得懂的动画</div>
            <h1 className={s.h1} id="home-title">
              今天想讲清楚什么？
            </h1>
          </div>
          <div className={s.quick}>
            {TEMPLATE_CARDS.map((c) => (
              <Link
                key={c.id}
                to={`/create?tpl=${c.id}`}
                className={s.quickItem}
                style={{ background: `var(--tpl-${c.id}-bg)` }}
              >
                <strong>{c.name}</strong>
                <span>{c.scenes}</span>
              </Link>
            ))}
          </div>
        </section>

        {recent.length ? (
          <section className={s.section}>
            <div className={s.sectionHead}>
              <h2 className={s.h2}>继续编辑</h2>
              <Link to="/mine" className={s.more}>
                全部作品 →
              </Link>
            </div>
            <div className={s.grid}>
              {recent.map((a) => (
                <article className={s.card} key={a.id}>
                  <Link
                    to={`/edit/${a.id}`}
                    className={s.cardLink}
                    aria-label={`编辑「${a.title}」`}
                  >
                    <Thumb animation={a} className={s.thumb} />
                  </Link>
                  <div className={s.cardBody}>
                    <div className={s.cardText}>
                      <Link to={`/edit/${a.id}`} className={s.cardTitle}>
                        {a.title || '未命名动画'}
                      </Link>
                      <div className={s.cardMeta}>
                        <span className={s.tag}>{getTemplate(a.templateId)?.name}</span>
                        <span>{timeAgo(a.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className={s.section}>
          <div className={s.sectionHead}>
            <h2 className={s.h2}>推荐动画</h2>
            <Link to="/gallery" className={s.more}>
              去动画广场找更多灵感 →
            </Link>
          </div>
          <div className={s.grid}>
            {featured.map((item) => (
              <OfficialCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
