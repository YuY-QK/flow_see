import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { findLesson } from '@flow-see/content';
import { content, findSubject, gradeName } from '../site';
import { useBrowse } from '../store/profile';
import { TopBar } from '../ui/TopBar';
import { NotFound } from './NotFound';
import p from './Pages.module.css';

/**
 * P3 知识点学习页 /learn/:grade/:subject/:lessonId
 * 阶段 0：只有网址规则和页面框架；播放、动手试一试、学习记录在阶段 1 完成。
 */
export function LessonPage() {
  const params = useParams();
  const navigate = useNavigate();
  const setGrade = useBrowse((st) => st.setGrade);
  const found = findLesson(content, params.lessonId ?? '');
  if (!found) return <NotFound />;

  const { lesson, entry, unit } = found;
  // 网址里的年级/学科与知识点实际所属不一致时，跳到正确网址（替换历史）
  if (params.grade !== String(entry.grade) || params.subject !== entry.subject)
    return <Navigate to={`/learn/${entry.grade}/${entry.subject}/${lesson.id}`} replace />;

  const subj = findSubject(entry.subject);
  const gName = gradeName(entry.grade);
  return (
    <div className={p.page}>
      <TopBar
        crumbs={[
          { label: '学习', to: '/' },
          { label: gName, to: '/', onClick: () => setGrade(entry.grade) },
          { label: subj?.name ?? entry.subject, to: `/learn/${entry.grade}/${entry.subject}` },
          { label: lesson.title },
        ]}
        grade={entry.grade}
        subject={entry.subject}
        onPick={(next) => {
          setGrade(next.grade);
          // 在学习页切换：新增历史记录，跳到对应的年级·学科页
          navigate(`/learn/${next.grade}/${next.subject}`);
        }}
      />
      <main className={p.content}>
        <div>
          <div className={p.note}>{unit.title}</div>
          <h1 className={p.h1}>{lesson.title}</h1>
          {lesson.meta?.summary ? <p className={p.sub}>{lesson.meta.summary}</p> : null}
        </div>
        <div className={p.empty}>知识点播放即将开放。</div>
      </main>
    </div>
  );
}
