import { Link, useSearchParams } from 'react-router-dom';
import { searchLessons } from '@flow-see/content';
import { LessonCard } from '../learn/LessonCard';
import { content, site } from '../site';
import { useLearning } from '../store/learning';
import { useBrowse, useCurrentGrade } from '../store/profile';
import { TopBar } from '../ui/TopBar';
import s from '../learn/Learn.module.css';
import p from './Pages.module.css';

/** P4 搜索结果页 /search?q= */
export function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get('q')?.trim() ?? '';
  const grade = useCurrentGrade();
  const setGrade = useBrowse((st) => st.setGrade);
  const records = useLearning((st) => st.records);
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
        title="搜索"
        grade={grade}
        onPick={({ grade: g }) => setGrade(g)}
        query={q}
        searchPage
      />
      <main className={p.content}>
        {!q ? (
          <section className={p.section}>
            <h1 className={p.h2}>输入关键词找知识点</h1>
            {hints}
          </section>
        ) : results.length ? (
          <section className={p.section}>
            <h1 className={p.h2}>
              找到 {results.length} 个和“{q}”有关的知识点
            </h1>
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
                />
              ))}
            </div>
          </section>
        ) : (
          <section className={p.section}>
            <h1 className={p.h2}>没有找到和“{q}”有关的知识点。</h1>
            <p className={p.sub}>换个词试试，比如少写几个字，或者点下面的常用词：</p>
            {hints}
          </section>
        )}
      </main>
    </div>
  );
}
