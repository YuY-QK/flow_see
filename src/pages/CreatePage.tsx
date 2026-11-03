import { useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { Animation } from '@/engine';
import { repository } from '@/services/storage';
import { useSettings } from '@/store/settings';
import { TEMPLATE_CARDS, getTemplate } from '@/templates/registry';
import { AppHeader } from '@/ui/AppHeader';
import { Thumb } from '@/ui/Thumb';
import s from './Pages.module.css';

const EXAMPLES = [
  { templateId: 'message', title: 'TCP 三次握手' },
  { templateId: 'data', title: '冒泡排序' },
  { templateId: 'cycle', title: '水的循环' },
  { templateId: 'flow', title: '请假审批流程' },
];

export function CreatePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const defaultTheme = useSettings((st) => st.defaultTheme);
  const started = useRef(false);

  // 每张模板卡片上用示例作品做预览
  const previews = useMemo(
    () => Object.fromEntries(TEMPLATE_CARDS.map((c) => [c.id, getTemplate(c.id)?.createDefault()])),
    [],
  );

  const open = async (a: Animation, applyTheme: boolean) => {
    if (applyTheme) a = { ...a, themeId: defaultTheme };
    await repository.save(a);
    navigate(`/edit/${a.id}`, { replace: true });
  };

  // 从首页的模板快捷入口进来（/create?tpl=xxx）时直接新建
  useEffect(() => {
    const t = getTemplate(params.get('tpl') ?? '');
    if (t && !started.current) {
      started.current = true;
      open(t.createBlank(), true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  if (params.get('tpl') && getTemplate(params.get('tpl')!)) return null;

  return (
    <div className={s.page}>
      <AppHeader />
      <main className={s.content}>
        <div>
          <div className={s.note}>新建动画 · 第 1 步</div>
          <h1 className={s.h1}>你想讲清楚什么？</h1>
          <p className={s.sub}>选一个最像的样子，之后随时能改内容。</p>
        </div>

        <div className={s.tplGrid}>
          {TEMPLATE_CARDS.map((c) => {
            const preview = previews[c.id];
            return (
              <button
                key={c.id}
                className={s.tplCard}
                onClick={() => {
                  const t = getTemplate(c.id);
                  if (t) open(t.createBlank(), true);
                }}
              >
                {preview ? (
                  <Thumb animation={preview} className={s.tplArt} />
                ) : (
                  <span className={s.tplArt} style={{ background: `var(--tpl-${c.id}-bg)` }} />
                )}
                <span className={s.tplName}>{c.name}</span>
                <span className={s.tplDesc}>
                  {c.tagline}。适合：{c.scenes}
                </span>
              </button>
            );
          })}
        </div>

        <section className={s.section}>
          <h2 className={s.h2}>不确定？从一个示例改起</h2>
          <div className={s.pills}>
            {EXAMPLES.map((e) => (
              <button
                key={e.title}
                className={s.pill}
                onClick={() => {
                  const t = getTemplate(e.templateId);
                  if (t) open(t.createDefault(), true);
                }}
              >
                {e.title}
              </button>
            ))}
            <Link to="/gallery" className={s.pill}>
              去动画广场找灵感 →
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
