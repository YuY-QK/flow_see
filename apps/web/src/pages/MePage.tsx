import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { findLesson } from '@flow-see/content';
import { storageAvailable } from '@flow-see/runtime/store/safeStorage.ts';
import ui from '@flow-see/runtime/ui/ui.module.css';
import { LessonCard } from '../learn/LessonCard';
import { content } from '../site';
import { starTotals, useLearning } from '../store/learning';
import { site } from '../site';
import { useProfile } from '../store/profile';
import { Avatar } from '../ui/Brand';
import { TopBar } from '../ui/TopBar';
import s from '../learn/Learn.module.css';
import p from './Pages.module.css';

import { t } from '@flow-see/core';
/** P5 个人中心 /me：本机资料、学习统计、学习记录 */
export function MePage() {
  const profile = useProfile();
  const { records, days } = useLearning();
  const location = useLocation();
  const list = Object.values(records).sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
  const completed = list.filter((r) => r.completed).length;
  const canSave = storageAvailable();
  // 星星：所有已发布的知识点，每个有 3 颗（没有动手做的只有 1 颗）
  const lessons = content.catalog.flatMap((e) =>
    e.units.flatMap((u) =>
      u.lessons.flatMap((l) =>
        l.available && l.meta ? [{ id: l.id, hands: l.meta.hands, subject: e.subject }] : [],
      ),
    ),
  );
  const starAll = starTotals(records, lessons);

  // 侧边栏“学习记录”进来时定位到记录区
  useEffect(() => {
    if (location.hash === '#records') document.getElementById('records')?.scrollIntoView();
  }, [location.hash]);

  return (
    <div className={p.page}>
      <TopBar title={t('mePage.ge_ren_zhong_xin')} />
      <main className={p.content}>
        <section className={s.profile} aria-label={t('mePage.zi_liao')}>
          <Avatar color={profile.avatar} size={72} />
          <div className={s.profileFields}>
            <div className={s.field}>
              <span>{t('mePage.tou_xiang')}</span>
              <div
                className={s.avatars}
                role="radiogroup"
                aria-label={t('mePage.tou_xiang_yan_se')}
              >
                {Array.from({ length: site.profile.avatarCount }, (_, i) => (
                  <button
                    key={i}
                    role="radio"
                    aria-checked={profile.avatar === i}
                    aria-label={t('mePage.avatar_aria', { n: i + 1 })}
                    className={s.avatarPick}
                    onClick={() => profile.set({ avatar: i })}
                  >
                    <Avatar color={i} size={36} />
                  </button>
                ))}
              </div>
            </div>
            <label className={s.field}>
              <span>{t('mePage.ni_cheng')}</span>
              <input
                className={ui.field}
                value={profile.nickname}
                maxLength={site.profile.nicknameMax}
                placeholder={t('mePage.nickname_hint', { n: site.profile.nicknameMax })}
                onChange={(e) =>
                  profile.set({ nickname: e.target.value.slice(0, site.profile.nicknameMax) })
                }
              />
            </label>
            <label className={s.field}>
              <span>{t('mePage.zai_du_nian_ji')}</span>
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
          {canSave ? t('mePage.zhe_xie_zi_liao') : t('mePage.dang_qian_liu_lan')}
        </p>

        <section className={s.stats} aria-label={t('mePage.xue_xi_tong_ji')}>
          <div>
            <strong>{t('stars.of', { n: `★ ${starAll.full}`, total: starAll.total })}</strong>
            {t('stars.total')}
          </div>
          <div>
            <strong>{completed}</strong>
            {t('common.yi_xue_wan')}
          </div>
          <div>
            <strong>{list.length}</strong>
            {t('mePage.xue_guo_de_zhi')}
          </div>
          <div>
            <strong>{days.length}</strong>
            {t('mePage.xue_xi_tian_shu')}
          </div>
        </section>

        <section className={s.starBox} aria-label={t('stars.total')}>
          <div className={s.starBar} role="presentation">
            <i style={{ width: `${starAll.total ? (starAll.sum / starAll.total) * 100 : 0}%` }} />
          </div>
          <div className={s.starSubjects}>
            {content.subjects.map((subj) => {
              const x = starTotals(
                records,
                lessons.filter((l) => l.subject === subj.id),
              );
              return x.total ? (
                <span key={subj.id}>
                  <b>{subj.name}</b>
                  {t('stars.of', { n: `★ ${x.full}`, total: x.total })}
                </span>
              ) : null;
            })}
          </div>
        </section>

        <section className={p.section} id="records">
          <div className={p.sectionHead}>
            <h2 className={p.h2}>{t('common.xue_xi_ji_lu')}</h2>
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
              <p>{t('mePage.hai_mei_you_xue')}</p>
              <Link to="/" className={`${ui.btn} ${ui.primary}`}>
                {t('mePage.qu_shou_ye')}
              </Link>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
