import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AssetUrlContext } from '@flow-see/blocks';
import {
  clampParams,
  fillParams,
  resolveParams,
  type ExploreControl,
  type Scope,
  t,
} from '@flow-see/core';
import {
  findLesson,
  lessonNeighbors,
  lessonToAnimation,
  type LessonContent,
  type LessonPlace,
} from '@flow-see/content';
import { useSettings } from '@flow-see/runtime/store/settings.ts';
import ui from '@flow-see/runtime/ui/ui.module.css';
import { getTemplate } from '@flow-see/templates';
import { useDevice } from '../learn/device';
import { ExplorePanel } from '../learn/ExplorePanel';
import { LessonPlayer, type HandsMode } from '../learn/LessonPlayer';
import { lessonPath } from '../learn/paths';
import { assetUrl, content, findSubject, gradeName, loadLesson, site } from '../site';
import { useLearning, type LessonKey } from '../store/learning';
import { useBrowse } from '../store/profile';
import { Dialog } from '../ui/Dialog';
import { ExportDialog } from '../ui/ExportDialog';
import { TopBar } from '../ui/TopBar';
import { NotFound } from './NotFound';
import s from '../learn/Lesson.module.css';

/** 学习方式的名称、放完后的提示（写成字面量，约定检查才能核对 texts.yaml 的键） */
const MODE_NAMES: Record<HandsMode, () => string> = {
  watch: () => t('handsOn.mode_watch'),
  guided: () => t('handsOn.mode_guided'),
  self: () => t('handsOn.mode_self'),
};
const MODE_DONE: Record<HandsMode, () => string> = {
  watch: () => t('handsOn.watch_done'),
  guided: () => t('handsOn.guided_done'),
  self: () => t('handsOn.self_done'),
};
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
          { label: t('common.xue_xi'), to: '/' },
          { label: gName, to: '/', onClick: () => setGrade(entry.grade) },
          { label: subj?.name ?? entry.subject, to: `/learn/${entry.grade}/${entry.subject}` },
          { label: unit.title, to: `/learn/${entry.grade}/${entry.subject}` },
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
        lessonKey={{ lessonId: lesson.id, grade: entry.grade, subject: entry.subject }}
      />
    </div>
  );
}

type Load = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; lesson: LessonContent };

function useLessonContent(id: string) {
  const [state, setState] = useState<Load>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  // 加载没超过 site.yaml 的 player.skeletonDelayMs 不显示骨架，避免闪一下（规格 2.4）
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    let alive = true;
    const timer = window.setTimeout(() => alive && setSlow(true), site.player.skeletonDelayMs);
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

function LessonBody({ lessonId, lessonKey }: { lessonId: string; lessonKey: LessonKey }) {
  const { state, slow, retry } = useLessonContent(lessonId);
  const meta = findLesson(content, lessonId)?.lesson.meta;
  const header = (
    <div className={s.head}>
      <h1 className={p.h1}>{meta?.title ?? lessonId}</h1>
    </div>
  );

  if (state.kind !== 'ready')
    return (
      <main className={`${p.content} ${s.lessonMain}`}>
        {header}
        {state.kind === 'error' ? (
          <div className={s.problem}>
            <div>{t('lessonPage.nei_rong_mei_jia')}</div>
            <button className={`${ui.btn} ${ui.primary}`} onClick={retry}>
              {t('common.chong_shi')}
            </button>
          </div>
        ) : slow ? (
          <div className={s.skeleton} aria-label={t('lessonPage.jia_zai_zhong')} />
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
  const explore = useMemo(() => (lesson.explore ?? []) as ExploreControl[], [lesson]);
  const presets = lesson.presets ?? [];
  const resultIndex = (lesson.resultStep ?? lesson.steps.length) - 1;
  // 有动手做（try）的知识点：看一看 → 跟着做 → 自己做；换例子只在“自己做”里出现
  const hasTry = lesson.steps.some((st) => st.try);

  // 动手试一试：调过的参数只在这次打开里有效（不保存）。
  // 每次调整、换例子、回到标准讲解、换学习方式，播放器都重新开始（n 变了就换 key）。
  const [session, setSession] = useState<{
    trial: Scope | null;
    n: number;
    startIndex: number;
    autoPlay: boolean;
    mode: HandsMode;
  }>(() => {
    // 打开时：首次学习从第 1 步开始并自动播放；有记录则停在上次那一步、暂停；
    // 已学完的从第 1 步开始（规格 P3、3.3）。只在打开时决定一次。
    const r = useLearning.getState().records[lesson.id];
    if (!r)
      return {
        trial: null,
        n: 0,
        startIndex: 0,
        autoPlay: site.defaults.autoplayOnFirstOpen,
        mode: 'watch',
      };
    return {
      trial: null,
      n: 0,
      startIndex: r.completed ? 0 : r.lastStep,
      autoPlay: false,
      mode: 'watch',
    };
  });
  // 刚放完的是哪种学习方式：放完后提示下一种
  const [finished, setFinished] = useState<HandsMode | null>(null);
  const switchMode = (mode: HandsMode) => {
    setFinished(null);
    setSession((st) => ({ ...st, mode, n: st.n + 1, startIndex: 0, autoPlay: true }));
  };
  const animation = useMemo(
    () => lessonToAnimation(lesson, { themeId: defaultTheme, params: session.trial ?? undefined }),
    [lesson, defaultTheme, session.trial],
  );
  const values = animation.params ?? {};
  const tryParams = (patch: Scope) => {
    // 取值超出范围时自动收回（例如“小数”不能小于“11 - 大数”）
    const next = clampParams(
      explore,
      { ...lesson.params, ...(session.trial ?? {}), ...patch },
      lesson.derived,
    );
    setFinished(null);
    // 自己做：换了题从头做起；没有动手做的知识点：暂停播放，跳到结果步骤（默认最后一步）
    setSession((st) =>
      hasTry
        ? { ...st, trial: next, n: st.n + 1, startIndex: 0, autoPlay: true }
        : { ...st, trial: next, n: st.n + 1, startIndex: resultIndex, autoPlay: false },
    );
  };
  const resetTrial = () => {
    setFinished(null);
    setSession((st) => ({ ...st, trial: null, n: st.n + 1, startIndex: 0, autoPlay: hasTry }));
  };
  // 要点里的 {参数名} 跟着当前参数变
  const keyPoints = fillParams(lesson.keyPoints, values);
  const record = useLearning((st) => st.records[lesson.id]);
  const visit = useLearning((st) => st.visit);
  const setCompleted = useLearning((st) => st.setCompleted);

  const [toast, setToast] = useState('');
  const [dialog, setDialog] = useState<'none' | 'undo' | 'export' | 'link'>('none');
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), site.player.toastMs);
    return () => window.clearTimeout(t);
  }, [toast]);

  const url =
    (typeof location !== 'undefined' ? location.origin : '') +
    lessonPath(lessonKey.grade, lessonKey.subject, lesson.id);
  const share = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setToast(t('lessonPage.lian_jie_yi_fu'));
    } catch {
      setDialog('link');
    }
  };

  const markDone = useCallback(() => setCompleted(lessonKey, true), [setCompleted, lessonKey]);
  const mode = hasTry ? session.mode : 'watch';
  const onFinish = useCallback(() => {
    markDone();
    setFinished(mode);
  }, [markDone, mode]);
  // 换一题：从例子里随机挑一个和现在不一样的
  const clampedPresets = presets.map((pr) => ({
    label: pr.label,
    params: clampParams(explore, { ...lesson.params, ...pr.params }, lesson.derived),
  }));
  const others = clampedPresets.filter((pr) =>
    Object.entries(pr.params).some(([k, v]) => values[k] !== v),
  );
  const newProblem = () => {
    const pick = others[Math.floor(Math.random() * others.length)];
    if (pick) tryParams(pick.params);
  };

  if (!template)
    return (
      <main className={`${p.content} ${s.lessonMain}`}>
        {header}
        <div className={s.problem}>
          <div>{t('lessonPage.zhe_ge_dong_hua')}</div>
          <button className={`${ui.btn} ${ui.primary}`} onClick={() => location.reload()}>
            {t('lessonPage.shua_xin')}
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
      <main className={`${p.content} ${s.lessonMain}`}>
        {header}

        {hasTry ? (
          <div className={s.toolbar}>
            <div className={s.modes} role="group" aria-label={t('handsOn.modes_aria')}>
              {(['watch', 'guided', 'self'] as const).map((m) => (
                <button
                  key={m}
                  className={s.mode}
                  data-on={mode === m}
                  aria-pressed={mode === m}
                  onClick={() => switchMode(m)}
                >
                  {MODE_NAMES[m]()}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <LessonPlayer
          key={session.n}
          mode={mode}
          animation={animation}
          template={template}
          startIndex={session.startIndex}
          autoPlay={session.autoPlay}
          largeCaption={lessonKey.grade <= site.player.largeCaptionMaxGrade}
          onVisit={(i) => visit(lessonKey, i)}
          onFinish={onFinish}
          corner={
            <span className={s.stageMeta}>
              {[lesson.duration, t('common.steps_total', { n: lesson.steps.length })]
                .filter(Boolean)
                .join(' · ')}
            </span>
          }
          learned={{
            done: !!record?.completed,
            onMark: markDone,
            onUndo: () => setDialog('undo'),
          }}
          tools={[
            { id: 'share', icon: 'share', label: t('common.fen_xiang'), onClick: share },
            ...(device !== 'phone'
              ? [
                  {
                    id: 'export',
                    icon: 'download' as const,
                    label: t('common.dao_chu'),
                    onClick: () => setDialog('export'),
                  },
                ]
              : []),
          ]}
        />

        {hasTry && finished ? (
          <div className={s.nextMode} role="status">
            <span>{MODE_DONE[finished]()}</span>
            {finished === 'watch' ? (
              <button className={`${ui.btn} ${ui.primary}`} onClick={() => switchMode('guided')}>
                {t('handsOn.go_guided')}
              </button>
            ) : finished === 'guided' ? (
              <button className={`${ui.btn} ${ui.primary}`} onClick={() => switchMode('self')}>
                {t('handsOn.go_self')}
              </button>
            ) : (
              <>
                {others.length ? (
                  <button className={`${ui.btn} ${ui.primary}`} onClick={newProblem}>
                    {t('handsOn.new_problem')}
                  </button>
                ) : null}
                <button className={ui.btn} onClick={() => switchMode('self')}>
                  {t('handsOn.again')}
                </button>
              </>
            )}
          </div>
        ) : null}

        {(explore.length || presets.length) && (!hasTry || mode === 'self') ? (
          <ExplorePanel
            controls={explore}
            presets={clampedPresets}
            values={resolveParams(values, lesson.derived)}
            changed={!!session.trial}
            onChange={tryParams}
            onPreset={(params) => tryParams(params)}
            onReset={resetTrial}
          />
        ) : null}

        <section className={s.points}>
          <h2 className={p.h2}>{t('lessonPage.yao_dian')}</h2>
          <ul>
            {keyPoints.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
        </section>

        <nav className={s.nav} aria-label={t('lessonPage.shang_yi_ge_he')}>
          {prev ? (
            <Link className={s.navLink} to={navTo(prev)}>
              <small>{t('lessonPage.shang_yi_ge')}</small>
              <strong>{prev.lesson.title}</strong>
            </Link>
          ) : (
            <Link className={s.navLink} to={subjectPath}>
              <small>{t('lessonPage.shang_yi_ge')}</small>
              <strong>{t('lessonPage.back_to', { where })}</strong>
            </Link>
          )}
          {next ? (
            <Link className={`${s.navLink} ${s.navNext}`} to={navTo(next)}>
              <small>{t('lessonPage.xia_yi_ge')}</small>
              <strong>{next.lesson.title}</strong>
            </Link>
          ) : (
            <Link className={`${s.navLink} ${s.navNext}`} to={subjectPath}>
              <small>{t('lessonPage.xia_yi_ge')}</small>
              <strong>{t('lessonPage.all_done', { where })}</strong>
            </Link>
          )}
        </nav>
      </main>

      {dialog === 'undo' ? (
        <Dialog title={t('lessonPage.qu_xiao_yi_xue')} onClose={() => setDialog('none')}>
          <div className={s.confirm}>
            <p>{t('lessonPage.qu_xiao_hou_zhe')}</p>
            <div className={s.confirmActions}>
              <button className={ui.btn} onClick={() => setDialog('none')}>
                {t('lessonPage.bu_qu_xiao')}
              </button>
              <button
                className={`${ui.btn} ${ui.primary}`}
                onClick={() => {
                  setCompleted(lessonKey, false);
                  setDialog('none');
                }}
              >
                {t('lessonPage.qu_xiao_yi_xue_2')}
              </button>
            </div>
          </div>
        </Dialog>
      ) : null}
      {dialog === 'export' ? (
        <ExportDialog animation={animation} template={template} onClose={() => setDialog('none')} />
      ) : null}
      {dialog === 'link' ? (
        <Dialog title={t('common.fu_zhi_lian_jie')} onClose={() => setDialog('none')}>
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
