import { Link } from 'react-router-dom';
import type { OfficialItem } from '../examples';
import { getTemplate } from '@flow-see/templates';
import { Thumb } from '../ui/Thumb';
import s from './Pages.module.css';

import { t } from '@flow-see/core';
/** 动画广场里的一张作品卡片 */
export function OfficialCard({ item }: { item: OfficialItem }) {
  const a = item.animation;
  const to = `/gallery/${item.id}`;
  return (
    <article className={s.card}>
      <Link
        to={to}
        className={s.cardLink}
        aria-label={t('officialCard.watch_aria', { title: a.title })}
      >
        <Thumb animation={a} className={s.thumb} />
      </Link>
      {item.featured ? <span className={s.featured}>{t('officialCard.jing_xuan')}</span> : null}
      <div className={s.cardBody}>
        <div className={s.cardText}>
          <Link to={to} className={s.cardTitle}>
            {a.title}
          </Link>
          <div className={s.cardMeta}>
            <span className={s.tag}>{item.category}</span>
            <span className={s.tag}>{getTemplate(a.templateId)?.name}</span>
            <span>{item.source}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
