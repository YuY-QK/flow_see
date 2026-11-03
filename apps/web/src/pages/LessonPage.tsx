import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AssetUrlContext } from '@flow-see/blocks';
import {
  findLesson,
  lessonNeighbors,
  lessonToAnimation,
  type LessonContent,
  type LessonPlace,
} from '@flow-see/content';
import { useSettings } from '@flow-see/runtime/store/settings.ts';
import { Icon } from '@flow-see/runtime/ui/Icon.tsx';
import ui from '@flow-see/runtime/ui/ui.module.css';
import { getTemplate } from '@flow-see/templates';
import { useDevice } from '../learn/device';
import { LessonPlayer } from '../learn/LessonPlayer';
import { lessonPath } from '../learn/paths';
import { assetUrl, content, findSubject, gradeName, loadLesson, site } from '../site';
import { useLearning, type LessonKey } from '../store/learning';
import { useBrowse } from '../store/profile';
import { Dialog } from '../ui/Dialog';
import { ExportDialog } from '../ui/ExportDialog';
import { TopBar } from '../ui/TopBar';
import { NotFound } from './NotFound';
import s from '../learn/Lesson.module.css';
import p from './Pages.module.css';

/** P3 知识点学习页 /learn/:grade/:subject/:lessonId */
export function LessonPage() {
  const params = useParams();
  const navigate = useNavigate();
  const setGrade = useBrowse((st) => st.setGrade);
  const found = findLesson(content, params.lessonId ?? '');
  if (!found) return <NotFound />;

  const { lesson, entry, unit } = found;
  // 网址里的年级/学科与知识点实际所属不一致时，跳到正确网址（替换历史）
  if (params.grade !== String(entry.grade) || params.subject !== entry.subject)
    return <Navigate to={lessonPath(entry.grade, entry.subject, lesson.id)} replace />;

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
      {/* 换知识点（上一个/下一个）时整个重新开始 */}
      <LessonBody
        key={lesson.id}
        lessonId={lesson.id}
        unitTitle={unit.title}
        lessonKey={{ lessonId: lesson.id, grade: entry.grade, subject: entry.subject }}
      />
    </div>
  );
}

type Load = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; lesson: LessonContent };

function useLessonContent(id: string) {
  const [state, setState] = useState<Load>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  // 加载不超过 300 毫秒不显示骨架，避免闪一下（规格 2.4）
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    let alive = true;
    const timer = window.setTimeout(() => alive && setSlow(true), 300);
    loadLesson(id)
      .then((lesson) => alive && setState(lesson ? { kind: 'ready', lesson } : { kind: 'error' }))
      .catch(() => alive && setState({ kind: 'error' }));
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [id, attempt]);
  const retry = useCallback(() => {
    setState({ kind: 'loading' });
    setAttempt((n) => n + 1);
  }, []);
  return { state, slow, retry };
}

function LessonBody({
  lessonId,
  unitTitle,
  lessonKey,
}: {
  lessonId: string;
  unitTitle: string;
  lessonKey: LessonKey;
}) {
  const { state, slow, retry } = useLessonContent(lessonId);
  const meta = findLesson(content, lessonId)?.lesson.meta;
  const subj = findSubject(lessonKey.subject);

  const header = (
    <div className={s.headText}>
      <div className={p.note}>{unitTitle}</div>
      <h1 className={p.h1}>{meta?.title ?? lessonId}</h1>
      <div className={s.meta} style={{ ['--subject' as string]: subj?.color } as CSSProperties}>
        <span className={s.tag}>{subj?.name ?? lessonKey.subject}</span>
        {meta?.duration ? <span>{meta.duration}</span> : null}
        {meta?.steps ? <span>共 {meta.steps} 步</span> : null}
      </div>
    </div>
  );

  if (state.kind !== 'ready')
    return (
      <main className={p.content}>
        <div className={s.head}>{header}</div>
        {state.kind === 'error' ? (
          <div className={s.problem}>
            <div>内容没加载出来</div>
            <button className={`${ui.btn} ${ui.primary}`} onClick={retry}>
              重试
            </button>
          </div>
        ) : slow ? (
          <div className={s.skeleton} aria-label="加载中" />
        ) : null}
      </main>
    );

  return <LessonReady lesson={state.lesson} header={header} lessonKey={lessonKey} />;
}

function LessonReady({
  lesson,
  header,
  lessonKey,
}: {
  lesson: LessonContent;
  header: React.ReactNode;
  lessonKey: LessonKey;
}) {
  const device = useDevice();
  const defaultTheme = useSettings((st) => st.defaultTheme);
  const template = getTemplate(lesson.template);
  const animation = useMemo(
    () => lessonToAnimation(lesson, { themeId: defaultTheme }),
    [lesson, defaultTheme],
  );
  const record = useLearning((st) => st.records[lesson.id]);
  const visit = useLearning((st) => st.visit);
  const setCompleted = useLearning((st) => st.setCompleted);

  // 打开时：首次学习从第 1 步开始并自动播放；有记录则停在上次那一步、暂停；
  // 已学完的从第 1 步开始（规格 P3、3.3）。只在打开时决定一次。
  const [start] = useState(() => {
    const r = useLearning.getState().records[lesson.id];
    if (!r) return { index: 0, autoPlay: site.defaults.autoplayOnFirstOpen };
    return { index: r.completed ? 0 : r.lastStep, autoPlay: false };
  });

  const [toast, setToast] = useState('');
  const [dialog, setDialog] = useState<'none' | 'undo' | 'export' | 'link'>('none');
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 2000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const url =
    (typeof location !== 'undefined' ? location.origin : '') +
    lessonPath(lessonKey.grade, lessonKey.subject, lesson.id);
  const share = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setToast('链接已复制，打开后从第 1 步开始');
    } catch {
      setDialog('link');
    }
  };

  const markDone = useCallback(() => setCompleted(lessonKey, true), [setCompleted, lessonKey]);

  if (!template)
    return (
      <main className={p.content}>
        <div className={s.head}>{header}</div>
        <div className={s.problem}>
          <div>这个动画需要更新网站才能播放</div>
          <button className={`${ui.btn} ${ui.primary}`} onClick={() => location.reload()}>
            刷新
          </button>
        </div>
      </main>
    );

  const { prev, next } = lessonNeighbors(content, lesson.id, {
    crossGrade: site.learning.prevNextCrossGrade,
    crossSubject: site.learning.prevNextCrossSubject,
  });
  const where = `${gradeName(lessonKey.grade)}${findSubject(lessonKey.subject)?.name ?? ''}`;
  const subjectPath = `/learn/${lessonKey.grade}/${lessonKey.subject}`;
  const navTo = (pl: LessonPlace) => lessonPath(pl.entry.grade, pl.entry.subject, pl.lesson.id);

  return (
    <AssetUrlContext.Provider value={assetUrl}>
      <main className={p.content}>
        <div className={s.head}>
          {header}
          <div className={s.headActions}>
            <button className={ui.btn} onClick={share}>
              <Icon name="share" size={18} /> 分享
            </button>
            {device !== 'phone' ? (
              <button className={ui.btn} onClick={() => setDialog('export')}>
                <Icon name="download" size={18} /> 导出
              </button>
            ) : null}
          </div>
        </div>

        <LessonPlayer
          animation={animation}
          template={template}
          startIndex={start.index}
          autoPlay={start.autoPlay}
          largeCaption={lessonKey.grade <= 2}
          onVisit={(i) => visit(lessonKey, i)}
          onFinish={markDone}
        />

        <div className={s.below}>
          <section className={s.points}>
            <h2 className={p.h2}>要点</h2>
            <ul>
              {lesson.keyPoints.map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ul>
          </section>
          {record?.completed ? (
            <button
              className={`${ui.btn} ${s.learned} ${s.learnedDone}`}
              onClick={() => setDialog('undo')}
            >
              <Icon name="check" size={20} /> 已学完
            </button>
          ) : (
            <button className={`${ui.btn} ${ui.primary} ${s.learned}`} onClick={markDone}>
              我学会了
            </button>
          )}
        </div>

        <nav className={s.nav} aria-label="上一个和下一个知识点">
          {prev ? (
            <Link className={s.navLink} to={navTo(prev)}>
              <small>上一个</small>
              <strong>{prev.lesson.title}</strong>
            </Link>
          ) : (
            <Link className={s.navLink} to={subjectPath}>
              <small>上一个</small>
              <strong>回到{where}</strong>
            </Link>
          )}
          {next ? (
            <Link className={`${s.navLink} ${s.navNext}`} to={navTo(next)}>
              <small>下一个</small>
              <strong>{next.lesson.title}</strong>
            </Link>
          ) : (
            <Link className={`${s.navLink} ${s.navNext}`} to={subjectPath}>
              <small>下一个</small>
              <strong>{where}都学完了，回到目录</strong>
            </Link>
          )}
        </nav>
      </main>

      {dialog === 'undo' ? (
        <Dialog title="取消已学完？" onClose={() => setDialog('none')}>
          <div className={s.confirm}>
            <p>取消后，这个知识点会显示为“学习中”。</p>
            <div className={s.confirmActions}>
              <button className={ui.btn} onClick={() => setDialog('none')}>
                不取消
              </button>
              <button
                className={`${ui.btn} ${ui.primary}`}
                onClick={() => {
                  setCompleted(lessonKey, false);
                  setDialog('none');
                }}
              >
                取消已学完
              </button>
            </div>
          </div>
        </Dialog>
      ) : null}
      {dialog === 'export' ? (
        <ExportDialog animation={animation} template={template} onClose={() => setDialog('none')} />
      ) : null}
      {dialog === 'link' ? (
        <Dialog title="复制链接" onClose={() => setDialog('none')}>
          <input
            className={`${ui.field} ${s.linkBox}`}
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            autoFocus
          />
        </Dialog>
      ) : null}
      {toast ? (
        <div className={s.toast} role="status">
          {toast}
        </div>
      ) : null}
    </AssetUrlContext.Provider>
  );
}
