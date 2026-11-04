import { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CATEGORIES, officialItems } from '@flow-see/content/examples/official.ts';
import { matches } from '@flow-see/content/examples/search.ts';
import { TEMPLATE_CARDS } from '@flow-see/templates';
import { TopBar } from '../ui/TopBar';
import { OfficialCard } from './OfficialCard';
import s from './Pages.module.css';

import { t } from '@flow-see/core';
export function GalleryPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const cat = params.get('cat') ?? '';
  const type = params.get('type') ?? '';
  const searchRef = useRef<HTMLInputElement>(null);

  // 从手机顶部的搜索图标进来时，把光标放进搜索框（等点击产生的焦点变化结束后再设置）
  useEffect(() => {
    if (!params.get('search')) return;
    const t = window.setTimeout(() => searchRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
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
      <TopBar title={t('common.chuang_zuo')} />
      <main className={s.content}>
        <div className={s.searchRow}>
          <div>
            <h1 className={s.h1}>{t('common.dong_hua_guang_chang')}</h1>
            <p className={s.sub}>{t('galleryPage.guan_fang_zhi_zuo')}</p>
          </div>
          <label className="sr-only" htmlFor="gallery-q">
            {t('galleryPage.sou_suo_dong_hua')}
          </label>
          <input
            id="gallery-q"
            ref={searchRef}
            className={s.searchInput}
            type="search"
            placeholder={t('galleryPage.sou_suo_dong_hua')}
            value={q}
            onChange={(e) => update({ q: e.target.value })}
          />
        </div>

        <div className={s.filterRow}>
          <div className={s.chips} role="group" aria-label={t('galleryPage.an_zhu_ti_shai')}>
            {['', ...CATEGORIES].map((c) => (
              <button
                key={c || 'all'}
                className={s.chip}
                aria-pressed={cat === c}
                onClick={() => update({ cat: c })}
              >
                {c || t('common.quan_bu')}
              </button>
            ))}
          </div>
          <label className={s.note}>
            {t('galleryPage.dong_hua_lei_xing')}
            <select
              className={s.select}
              value={type}
              onChange={(e) => update({ type: e.target.value })}
            >
              <option value="">{t('common.quan_bu')}</option>
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
          <div className={s.empty}>{t('galleryPage.mei_you_zhao_dao')}</div>
        )}
      </main>
    </div>
  );
}
