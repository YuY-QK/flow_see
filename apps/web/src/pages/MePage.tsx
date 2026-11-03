import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { findLesson } from '@flow-see/content';
import { storageAvailable } from '@flow-see/runtime/store/safeStorage.ts';
import ui from '@flow-see/runtime/ui/ui.module.css';
import { LessonCard } from '../learn/LessonCard';
import { content } from '../site';
import { useLearning } from '../store/learning';
import { AVATAR_COUNT, NICKNAME_MAX, useProfile } from '../store/profile';
import { Avatar } from '../ui/Brand';
import { TopBar } from '../ui/TopBar';
import s from '../learn/Learn.module.css';
import p from './Pages.module.css';

/** P5 个人中心 /me：本机资料、学习统计、学习记录 */
export function MePage() {
  const profile = useProfile();
  const { records, days } = useLearning();
  const location = useLocation();
  const list = Object.values(records).sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
  const completed = list.filter((r) => r.completed).length;
  const canSave = storageAvailable();

  // 侧边栏“学习记录”进来时定位到记录区
  useEffect(() => {
    if (location.hash === '#records') document.getElementById('records')?.scrollIntoView();
  }, [location.hash]);

  return (
    <div className={p.page}>
      <TopBar title="个人中心" />
      <main className={p.content}>
        <section className={s.profile} aria-label="资料">
          <Avatar color={profile.avatar} size={72} />
          <div className={s.profileFields}>
            <div className={s.field}>
              <span>头像</span>
              <div className={s.avatars} role="radiogroup" aria-label="头像颜色">
                {Array.from({ length: AVATAR_COUNT }, (_, i) => (
                  <button
                    key={i}
                    role="radio"
                    aria-checked={profile.avatar === i}
                    aria-label={`头像 ${i + 1}`}
                    className={s.avatarPick}
                    onClick={() => profile.set({ avatar: i })}
                  >
                    <Avatar color={i} size={36} />
                  </button>
                ))}
              </div>
            </div>
            <label className={s.field}>
              <span>昵称</span>
              <input
                className={ui.field}
                value={profile.nickname}
                maxLength={NICKNAME_MAX}
                placeholder={`最多 ${NICKNAME_MAX} 个字`}
                onChange={(e) => profile.set({ nickname: e.target.value.slice(0, NICKNAME_MAX) })}
              />
            </label>
            <label className={s.field}>
              <span>在读年级</span>
              <select
                className={ui.field}
                value={profile.readingGrade}
                onChange={(e) => profile.setReadingGrade(Number(e.target.value))}
              >
                {content.grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
        <p className={p.note}>
          {canSave
            ? '这些资料和学习记录只保存在这台设备上，不会上传。'
            : '当前浏览模式下无法保存学习记录和资料。'}
        </p>

        <section className={s.stats} aria-label="学习统计">
          <div>
            <strong>{completed}</strong>已学完
          </div>
          <div>
            <strong>{list.length}</strong>学过的知识点
          </div>
          <div>
            <strong>{days.length}</strong>学习天数
          </div>
        </section>

        <section className={p.section} id="records">
          <div className={p.sectionHead}>
            <h2 className={p.h2}>学习记录</h2>
          </div>
          {list.length ? (
            <div className={s.lessonGrid}>
              {list.map((r) => {
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
          ) : (
            <div className={p.empty}>
              <p>还没有学习记录，去首页看看吧</p>
              <Link to="/" className={`${ui.btn} ${ui.primary}`}>
                去首页
              </Link>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
