import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { findEntry } from '@flow-see/content';
import { LessonCard } from '../learn/LessonCard';
import { findSubject, gradeName, parseGrade, content, site } from '../site';
import { useLearning } from '../store/learning';
import { useBrowse } from '../store/profile';
import { TopBar } from '../ui/TopBar';
import { NotFound } from './NotFound';
import s from '../learn/Learn.module.css';
import p from './Pages.module.css';

import { t } from '@flow-see/core';

/**
 * 默认册计算（开发手册任务卡 D2）：
 * 当前月份在 [firstFromMonth, 12] ∪ [1, secondFromMonth - 1] 时为上册（1），否则为下册（2）。
 * month 为 1–12 的月份数字（1 = 一月，12 = 十二月）。
 */
export function defaultTerm(
  month: number,
  termRule: { firstFromMonth: number; secondFromMonth: number } = site.learning.term,
): 1 | 2 {
  const { firstFromMonth, secondFromMonth } = termRule;
  if (firstFromMonth > secondFromMonth) {
    if (month >= firstFromMonth || month < secondFromMonth) {
      return 1;
    }
    return 2;
  }
  if (month >= firstFromMonth && month < secondFromMonth) {
    return 1;
  }
  return 2;
}

/** P2 年级·学科页 /learn/:grade/:subject */
export function SubjectPage() {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const setGrade = useBrowse((st) => st.setGrade);
  const records = useLearning((st) => st.records);
  const grade = parseGrade(params.grade);
  const subj = findSubject(params.subject ?? '');
  if (grade === undefined || !subj) return <NotFound />;

  const gName = gradeName(grade);
  const entry = findEntry(content, grade, subj.id);
  const lessons = entry?.units.flatMap((u) => u.lessons) ?? [];
  const done = lessons.filter((l) => l.available && records[l.id]?.completed).length;

  const allHaveTerm =
    entry !== undefined &&
    entry.units.length > 0 &&
    entry.units.every((u) => u.term !== undefined);
  const hasTerm1 = entry?.units.some((u) => u.term === 1) ?? false;
  const hasTerm2 = entry?.units.some((u) => u.term === 2) ?? false;
  const showTermTabs = allHaveTerm && hasTerm1 && hasTerm2;

  const rawTerm = searchParams.get('term');
  const termFromUrl = rawTerm === '1' ? 1 : rawTerm === '2' ? 2 : undefined;
  const currentMonth = new Date().getMonth() + 1;
  const activeTerm = termFromUrl ?? defaultTerm(currentMonth, site.learning.term);

  const visibleUnits = entry
    ? showTermTabs
      ? entry.units.filter((u) => u.term === activeTerm)
      : entry.units
    : [];

  const onPickTerm = (nextTerm: 1 | 2) => {
    if (nextTerm === activeTerm) return;
    const nextSearch = new URLSearchParams(location.search);
    nextSearch.set('term', String(nextTerm));
    navigate({ search: `?${nextSearch.toString()}` }, { replace: true });
  };

  return (
    <div
      className={p.page}
      style={{
        ['--subject' as string]: subj.color,
        ['--subject-color' as string]: subj.color,
      }}
    >
      <TopBar
        crumbs={[
          { label: t('common.xue_xi'), to: '/' },
          { label: gName, to: '/', onClick: () => setGrade(grade) },
          { label: subj.name },
        ]}
        grade={grade}
        subject={subj.id}
        onPick={(next) => {
          setGrade(next.grade);
          // 在学科页切换：替换当前历史记录，页面回到顶部（规格 2.2）
          navigate(`/learn/${next.grade}/${next.subject}`, { replace: true });
          window.scrollTo(0, 0);
        }}
      />
      <main className={p.content}>
        <section className={s.banner} style={{ ['--subject' as string]: subj.color }}>
          <span className={s.subjectIcon} aria-hidden>
            {subj.name.slice(0, 1)}
          </span>
          <div>
            <h1 className={p.h1}>
              {gName} · {subj.name}
            </h1>
            {entry ? (
              <p className={p.sub}>
                {t('subjectPage.summary', {
                  units: entry.units.length,
                  lessons: lessons.length,
                  done,
                })}
              </p>
            ) : null}
          </div>
        </section>

        {showTermTabs ? (
          <div className={p.termSwitcher} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTerm === 1}
              className={p.termTab}
              onClick={() => onPickTerm(1)}
            >
              {t('lesson.term_1')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTerm === 2}
              className={p.termTab}
              onClick={() => onPickTerm(2)}
            >
              {t('lesson.term_2')}
            </button>
          </div>
        ) : null}

        {entry ? (
          visibleUnits.map((unit, i) => {
            const domainName = unit.domain
              ? subj.domains?.find((d) => d.id === unit.domain)?.name
              : undefined;
            return (
              <section key={unit.id} className={p.section}>
                <div className={p.sectionHead}>
                  <h2 className={p.h2}>
                    <span className={s.unitNo}>{t('subjectPage.unit_no', { n: i + 1 })}</span>
                    <span>{unit.title}</span>
                    {domainName ? <span className={p.domainTag}>{domainName}</span> : null}
                  </h2>
                  <span className={p.note}>
                    {t('subjectPage.unit_done', {
                      done: unit.lessons.filter((l) => l.available && records[l.id]?.completed)
                        .length,
                      total: unit.lessons.length,
                    })}
                  </span>
                </div>
                <div className={s.lessonGrid}>
                  {unit.lessons.map((l) => (
                    <LessonCard
                      key={l.id}
                      lesson={l}
                      grade={grade}
                      subject={subj.id}
                      record={records[l.id]}
                    />
                  ))}
                </div>
              </section>
            );
          })
        ) : (
          <div className={p.empty}>
            <p>
              {gName}
              {t('common.coming_soon', { name: subj.name })}
            </p>
            <Link to="/">{t('common.hui_dao_shou_ye')}</Link>
          </div>
        )}
      </main>
    </div>
  );
}
