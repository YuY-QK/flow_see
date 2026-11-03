import { Link } from 'react-router-dom';
import type { CatalogLesson } from '@flow-see/content';
import { findSubject, gradeName } from '../site';
import type { LessonRecord } from '../store/learning';
import { Highlight } from './Highlight';
import { lessonPath } from './paths';
import s from './Learn.module.css';

const DEV_MARK = { draft: '草稿', reviewed: '待发布', published: '' } as const;

interface Props {
  lesson: CatalogLesson;
  grade: number;
  subject: string;
  record?: LessonRecord;
  /** 显示“{年级} · {学科}”（首页推荐、继续学习、搜索） */
  showWhere?: boolean;
  unitTitle?: string;
  /** 搜索词：名称和简介里命中的字高亮 */
  highlight?: string[];
}

/** 知识点卡片：已学完 / 学习中 / 未学 / 即将上线 */
export function LessonCard({
  lesson,
  grade,
  subject,
  record,
  showWhere,
  unitTitle,
  highlight,
}: Props) {
  const subj = findSubject(subject);
  const meta = lesson.meta;
  const status = !lesson.available
    ? '即将上线'
    : record?.completed
      ? '已学完'
      : record
        ? `第 ${record.lastStep + 1} / ${meta?.steps ?? '?'} 步`
        : '未学';
  const body = (
    <>
      <div className={s.thumb} style={{ ['--subject' as string]: subj?.color }} aria-hidden>
        <span>{lesson.title.slice(0, 1)}</span>
      </div>
      <div className={s.cardBody}>
        <div className={s.cardTitle}>
          <span>
            <Highlight text={lesson.title} words={highlight} />
          </span>
          {meta && DEV_MARK[meta.status] ? (
            <span className={s.devMark}>{DEV_MARK[meta.status]}</span>
          ) : null}
        </div>
        {showWhere ? (
          <div className={s.cardWhere}>
            {gradeName(grade)} · {subj?.name ?? subject}
            {unitTitle ? ` · ${unitTitle}` : ''}
          </div>
        ) : null}
        {meta?.summary ? (
          <p className={s.cardSummary}>
            <Highlight text={meta.summary} words={highlight} />
          </p>
        ) : null}
        <div className={s.cardMeta}>
          {meta?.duration ? <span>{meta.duration}</span> : null}
          <span className={record?.completed ? s.done : undefined}>{status}</span>
        </div>
      </div>
    </>
  );
  if (!lesson.available)
    return (
      <div className={`${s.card} ${s.soon}`} title="即将上线" aria-disabled="true">
        {body}
      </div>
    );
  return (
    <Link className={s.card} to={lessonPath(grade, subject, lesson.id)}>
      {body}
    </Link>
  );
}
