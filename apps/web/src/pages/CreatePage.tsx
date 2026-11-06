import { useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { Animation } from '@flow-see/core';
import { repository } from '@flow-see/runtime/services/storage.ts';
import { useSettings } from '@flow-see/runtime/store/settings.ts';
import { TEMPLATE_CARDS, getTemplate } from '@flow-see/templates';
import { TopBar } from '../ui/TopBar';
import { Thumb } from '../ui/Thumb';
import s from './Pages.module.css';

import { t } from '@flow-see/core';
const EXAMPLES = [
  { templateId: 'message', title: t('common.san_ci_wo_shou') },
  { templateId: 'data', title: t('common.mao_pao_pai_xu') },
  { templateId: 'cycle', title: t('common.shui_de_xun_huan') },
  { templateId: 'flow', title: t('common.qing_jia_shen_pi') },
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
      <TopBar title={t('common.chuang_zuo')} />
      <main className={s.content}>
        <div>
          <div className={s.note}>{t('createPage.xin_jian_dong_hua')}</div>
          <h1 className={s.h1}>{t('createPage.ni_xiang_jiang_qing')}</h1>
          <p className={s.sub}>
            {t('createPage.xuan_yi_ge_zui')}
            <Link to="/mine">{t('createPage.wo_de_zuo_pin')}</Link>
          </p>
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
                  {t('createPage.tagline_scenes', { tagline: c.tagline, scenes: c.scenes })}
                </span>
              </button>
            );
          })}
        </div>

        <section className={s.section}>
          <h2 className={s.h2}>{t('createPage.bu_que_ding_cong')}</h2>
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
              {t('createPage.kan_kan_geng_duo')}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
