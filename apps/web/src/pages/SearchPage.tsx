import { Link, useSearchParams } from 'react-router-dom';
import { searchLessons, splitQuery } from '@flow-see/content';
import { LessonCard } from '../learn/LessonCard';
import { content, site } from '../site';
import { useLearning } from '../store/learning';
import { useBrowse, useCurrentGrade } from '../store/profile';
import { TopBar } from '../ui/TopBar';
import s from '../learn/Learn.module.css';
import p from './Pages.module.css';

import { t } from '@flow-see/core';
/** P4 搜索结果页 /search?q= */
export function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get('q')?.trim() ?? '';
  const grade = useCurrentGrade();
  const setGrade = useBrowse((st) => st.setGrade);
  const records = useLearning((st) => st.records);
  const words = splitQuery(q);
  const results = searchLessons(content, q, grade, site.search.maxResults);

  const hints = (
    <div className={s.hints}>
      {site.search.hints.map((h) => (
        <Link key={h} to={`/search?q=${encodeURIComponent(h)}`} replace className={s.hint}>
          {h}
        </Link>
      ))}
    </div>
  );

  return (
    <div className={p.page}>
      {/* 切换年级只改变排序，不过滤 */}
      <TopBar
        title={t('common.sou_suo')}
        grade={grade}
        onPick={({ grade: g }) => setGrade(g)}
        query={q}
        searchPage
      />
      <main className={p.content}>
        {!q ? (
          <section className={p.section}>
            <h1 className={p.h2}>{t('searchPage.shu_ru_guan_jian')}</h1>
            {hints}
          </section>
        ) : results.length ? (
          <section className={p.section}>
            <h1 className={p.h2}>{t('searchPage.found', { n: results.length, q })}</h1>
            <div className={s.lessonGrid}>
              {results.map(({ lesson, entry, unit }) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  grade={entry.grade}
                  subject={entry.subject}
                  record={records[lesson.id]}
                  showWhere
                  unitTitle={unit.title}
                  highlight={words}
                />
              ))}
            </div>
          </section>
        ) : (
          <section className={p.section}>
            <h1 className={p.h2}>{t('searchPage.none', { q })}</h1>
            <p className={p.sub}>{t('searchPage.huan_ge_ci_shi')}</p>
            {hints}
          </section>
        )}
      </main>
    </div>
  );
}
