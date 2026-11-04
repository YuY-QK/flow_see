import { Link, useNavigate, useParams } from 'react-router-dom';
import { findEntry } from '@flow-see/content';
import { LessonCard } from '../learn/LessonCard';
import { findSubject, gradeName, parseGrade, content } from '../site';
import { useLearning } from '../store/learning';
import { useBrowse } from '../store/profile';
import { TopBar } from '../ui/TopBar';
import { NotFound } from './NotFound';
import s from '../learn/Learn.module.css';
import p from './Pages.module.css';

import { t } from '@flow-see/core';
/** P2 年级·学科页 /learn/:grade/:subject */
export function SubjectPage() {
  const params = useParams();
  const navigate = useNavigate();
  const setGrade = useBrowse((st) => st.setGrade);
  const records = useLearning((st) => st.records);
  const grade = parseGrade(params.grade);
  const subj = findSubject(params.subject ?? '');
  if (grade === undefined || !subj) return <NotFound />;

  const gName = gradeName(grade);
  const entry = findEntry(content, grade, subj.id);
  const lessons = entry?.units.flatMap((u) => u.lessons) ?? [];
  const done = lessons.filter((l) => l.available && records[l.id]?.completed).length;

  return (
    <div className={p.page}>
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

        {entry ? (
          entry.units.map((unit, i) => (
            <section key={unit.id} className={p.section}>
              <div className={p.sectionHead}>
                <h2 className={p.h2}>
                  <span className={s.unitNo}>{t('subjectPage.unit_no', { n: i + 1 })}</span>
                  {unit.title}
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
          ))
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
