import { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CATEGORIES, officialItems } from '@/content/official';
import { matches } from '@/content/search';
import { TEMPLATE_CARDS } from '@/templates/registry';
import { AppHeader } from '@/ui/AppHeader';
import { OfficialCard } from './OfficialCard';
import s from './Pages.module.css';

export function GalleryPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const cat = params.get('cat') ?? '';
  const type = params.get('type') ?? '';
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (params.get('search')) searchRef.current?.focus();
  }, [params]);

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    next.delete('search');
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace: true });
  };

  const items = useMemo(
    () =>
      officialItems()
        .filter((i) => !cat || i.category === cat)
        .filter((i) => !type || i.animation.templateId === type)
        .filter((i) => matches(i, q))
        // 精选排在前面
        .sort((a, b) => Number(b.featured) - Number(a.featured)),
    [q, cat, type],
  );

  return (
    <div className={s.page}>
      <AppHeader />
      <main className={s.content}>
        <div className={s.searchRow}>
          <div>
            <h1 className={s.h1}>动画广场</h1>
            <p className={s.sub}>官方制作和精选作品。看到喜欢的，可以一键复制再改成自己的。</p>
          </div>
          <label className="sr-only" htmlFor="gallery-q">
            搜索动画
          </label>
          <input
            id="gallery-q"
            ref={searchRef}
            className={s.searchInput}
            type="search"
            placeholder="搜索动画"
            value={q}
            onChange={(e) => update({ q: e.target.value })}
          />
        </div>

        <div className={s.filterRow}>
          <div className={s.chips} role="group" aria-label="按主题筛选">
            {['', ...CATEGORIES].map((c) => (
              <button
                key={c || 'all'}
                className={s.chip}
                aria-pressed={cat === c}
                onClick={() => update({ cat: c })}
              >
                {c || '全部'}
              </button>
            ))}
          </div>
          <label className={s.note}>
            动画类型：
            <select
              className={s.select}
              value={type}
              onChange={(e) => update({ type: e.target.value })}
            >
              <option value="">全部</option>
              {TEMPLATE_CARDS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {items.length ? (
          <div className={s.grid}>
            {items.map((item) => (
              <OfficialCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className={s.empty}>没有找到相关的动画。换个关键词，或者自己做一个吧。</div>
        )}
      </main>
    </div>
  );
}
