import { Link } from 'react-router-dom';
import { availableLessons, findEntry, findLesson } from '@flow-see/content';
import { LessonCard } from '../learn/LessonCard';
import { useDevice } from '../learn/device';
import { content, gradeName, site } from '../site';
import { continueList, useLearning } from '../store/learning';
import { useBrowse, useCurrentGrade, useProfile } from '../store/profile';
import { TopBar } from '../ui/TopBar';
import s from '../learn/Learn.module.css';
import p from './Pages.module.css';

/** P1 学习中心（首页） */
export function HomePage() {
  const grade = useCurrentGrade();
  const setGrade = useBrowse((st) => st.setGrade);
  const nickname = useProfile((st) => st.nickname);
  const records = useLearning((st) => st.records);
  const device = useDevice();
  const gName = gradeName(grade);

  const perSubject = content.subjects.map((subj) => {
    const lessons = availableLessons(findEntry(content, grade, subj.id));
    const done = lessons.filter((l) => records[l.id]?.completed).length;
    return { subj, lessons, done };
  });
  const all = perSubject.flatMap(({ subj, lessons }) =>
    lessons.map((l) => ({ ...l, subject: subj.id })),
  );
  const recommended = all.filter((l) => l.meta?.recommended);
  // 没有标推荐时，显示该年级最先排序的几个
  const shown = (recommended.length ? recommended : all).slice(0, site.learning.recommendedLimit);
  const recent = continueList(records, site.learning.continueCount[device]);

  return (
    <div className={p.page}>
      {/* 首页切换年级：就地刷新，网址不变 */}
      <TopBar title="学习" grade={grade} onPick={({ grade: g }) => setGrade(g)} />
      <main className={p.content}>
        <section>
          <h1 className={p.h1}>
            {nickname ? `${nickname}，你好！今天学点什么？` : '你好！今天学点什么？'}
          </h1>
          <p className={p.sub}>正在看{gName}的内容，可以在右上角换年级</p>
        </section>

        <section className={s.subjects} aria-label="学科">
          {perSubject.map(({ subj, lessons, done }) => (
            <Link
              key={subj.id}
              to={`/learn/${grade}/${subj.id}`}
              className={s.subjectCard}
              style={{ ['--subject' as string]: subj.color }}
            >
              <span className={s.subjectIcon} aria-hidden>
                {subj.name.slice(0, 1)}
              </span>
              <span className={s.subjectText}>
                <strong>{subj.name}</strong>
                <small>
                  {lessons.length ? `${gName} · ${lessons.length} 个知识点` : `${gName} · 即将上线`}
                </small>
                {lessons.length ? (
                  <span className={s.progress} aria-label={`已学完 ${done} / ${lessons.length}`}>
                    <span style={{ width: `${(done / lessons.length) * 100}%` }} />
                  </span>
                ) : null}
                {lessons.length ? <small>已学完 {done} 个</small> : null}
              </span>
            </Link>
          ))}
        </section>

        {recent.length ? (
          <section className={p.section}>
            <div className={p.sectionHead}>
              <h2 className={p.h2}>继续学习</h2>
            </div>
            <div className={s.lessonGrid}>
              {recent.map((r) => {
                const found = findLesson(content, r.lessonId);
                return found ? (
                  <LessonCard
                    key={r.lessonId}
                    lesson={found.lesson}
                    grade={found.entry.grade}
                    subject={found.entry.subject}
                    record={r}
                    showWhere
                  />
                ) : null;
              })}
            </div>
          </section>
        ) : null}

        <section className={p.section}>
          <div className={p.sectionHead}>
            <h2 className={p.h2}>{gName}推荐</h2>
            {shown.length ? (
              <Link to={`/learn/${grade}/${site.defaults.subject}`} className={p.more}>
                查看全部 →
              </Link>
            ) : null}
          </div>
          {shown.length ? (
            <div className={s.lessonGrid}>
              {shown.map((l) => (
                <LessonCard
                  key={l.id}
                  lesson={l}
                  grade={grade}
                  subject={l.subject}
                  record={records[l.id]}
                  showWhere
                />
              ))}
            </div>
          ) : (
            <div className={p.empty}>{gName}的动画正在制作中，敬请期待。</div>
          )}
        </section>
      </main>
    </div>
  );
}
