import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { updateAnimation, t } from '@flow-see/core';
import { AppearancePanel } from '@flow-see/runtime/editor/AppearancePanel.tsx';
import { ElementsEditor } from '@flow-see/runtime/editor/ElementsEditor.tsx';
import { GeneratedSteps } from '@flow-see/runtime/editor/GeneratedSteps.tsx';
import { ParamsForm } from '@flow-see/runtime/editor/ParamsForm.tsx';
import { StepList } from '@flow-see/runtime/editor/StepList.tsx';
import { useAutosave } from '@flow-see/runtime/editor/useAutosave.ts';
import s from '@flow-see/runtime/editor/Editor.module.css';
import { Player } from '@flow-see/runtime/player/Player.tsx';
import { repository } from '@flow-see/runtime/services/storage.ts';
import { useEditor } from '@flow-see/runtime/store/editor.ts';
import { getTemplate } from '@flow-see/templates';
import { ExportDialog } from '../ui/ExportDialog';
import { Icon } from '@flow-see/runtime/ui/Icon.tsx';
import { ShareDialog } from '../ui/ShareDialog';
import ui from '@flow-see/runtime/ui/ui.module.css';
import { NotFound } from './NotFound';

const SAVE_TEXT = {
  saved: t('editorPage.yi_zi_dong_bao'),
  saving: t('editorPage.bao_cun_zhong'),
  error: t('editorPage.bao_cun_shi_bai'),
};

export function EditorPage() {
  const { id = '' } = useParams();
  const { animation, selectedId, saveState, load, apply, select } = useEditor();
  const [missingId, setMissingId] = useState<string | null>(null);
  const [appearance, setAppearance] = useState(false);
  const [dialog, setDialog] = useState<'share' | 'export' | null>(null);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  useAutosave();

  useEffect(() => {
    let alive = true;
    repository.get(id).then((a) => {
      if (!alive) return;
      if (a) load(a);
      else setMissingId(id);
    });
    return () => {
      alive = false;
    };
  }, [id, load]);

  // 选中的步骤被删掉后，改为选中最近的一步
  useEffect(() => {
    if (!animation || animation.steps.some((st) => st.id === selectedId)) return;
    select(animation.steps[animation.steps.length - 1]?.id ?? null);
  }, [animation, selectedId, select]);

  if (missingId === id) return <NotFound text={t('common.zhao_bu_dao_zhe')} />;
  if (!animation || animation.id !== id) return null;

  const template = getTemplate(animation.templateId);
  if (!template) return <NotFound text={t('common.zhe_ge_zuo_pin')} />;

  const selectedIndex = Math.max(
    0,
    animation.steps.findIndex((st) => st.id === selectedId),
  );

  return (
    <div className={s.page}>
      <header className={s.top}>
        <Link to="/mine" className={s.back}>
          <Icon name="back" size={18} />
          <span className={s.backText}>{t('common.wo_de_zuo_pin')}</span>
        </Link>
        <label className="sr-only" htmlFor="doc-title">
          {t('editorPage.dong_hua_ming_cheng')}
        </label>
        <input
          id="doc-title"
          className={s.titleInput}
          value={animation.title}
          onChange={(e) => apply((a) => updateAnimation(a, { title: e.target.value }))}
        />
        <span className={s.save} data-state={saveState}>
          {SAVE_TEXT[saveState]}
        </span>
        <div className={s.spacer} />
        <div className={s.topActions}>
          <button
            className={`${ui.btn} ${appearance ? ui.active : ''}`}
            data-appearance-toggle
            aria-label={t('common.wai_guan')}
            aria-expanded={appearance}
            onClick={() => setAppearance((v) => !v)}
          >
            <Icon name="palette" size={18} />
            <span className={s.hideMobile}>{t('common.wai_guan')}</span>
          </button>
          <button className={`${ui.btn} ${s.hideMobile}`} onClick={() => setDialog('export')}>
            <Icon name="download" size={18} />
            {t('common.dao_chu')}
          </button>
          <button
            className={ui.btn}
            aria-label={t('common.fen_xiang')}
            onClick={() => setDialog('share')}
          >
            <Icon name="share" size={18} />
            <span className={s.hideMobile}>{t('common.fen_xiang')}</span>
          </button>
          <Link to={`/play/${animation.id}`} className={`${ui.btn} ${ui.primary}`}>
            {t('common.bo_fang')}
          </Link>
        </div>
        {appearance ? (
          <AppearancePanel animation={animation} onClose={() => setAppearance(false)} />
        ) : null}
      </header>

      <div className={s.body} data-tab={tab}>
        <div className={s.editPane}>
          <div className={s.tplRow}>
            <span
              className={ui.badge}
              style={{
                background: `var(--tpl-${template.id}-bg)`,
                color: `var(--tpl-${template.id}-ink)`,
              }}
            >
              {template.name}
            </span>
            {template.tagline}
          </div>
          {template.maxElements > 0 ? (
            <ElementsEditor animation={animation} template={template} />
          ) : null}
          {template.paramFields?.length ? (
            <section className={s.section}>
              <div className={s.sectionHead}>
                <h2 className={s.sectionTitle}>{template.paramTitle ?? t('editorPage.can_shu')}</h2>
              </div>
              <ParamsForm
                template={template}
                params={animation.params ?? {}}
                elements={animation.elements}
                idPrefix="param"
                onChange={(params) => {
                  if (template.generate) {
                    const steps = template.generate(params);
                    apply((a) => updateAnimation(a, { params, steps }));
                    select(steps[0]?.id ?? null);
                  } else {
                    apply((a) => updateAnimation(a, { params }));
                  }
                }}
              />
            </section>
          ) : null}
          {template.generate ? (
            <GeneratedSteps animation={animation} />
          ) : (
            <StepList animation={animation} template={template} />
          )}
        </div>

        <div className={s.previewPane}>
          <div className={s.previewHead}>
            {t('editorPage.shi_shi_yu_lan')}
            <span>{t('editorPage.an_kong_ge_bo')}</span>
          </div>
          <Player
            animation={animation}
            template={template}
            focusIndex={selectedIndex}
            variant="embed"
          />
        </div>
      </div>

      {dialog === 'share' ? (
        <ShareDialog
          mode="publish"
          animation={animation}
          onClose={() => setDialog(null)}
          onShared={(share) => apply((a) => ({ ...a, share }))}
        />
      ) : null}
      {dialog === 'export' ? (
        <ExportDialog animation={animation} template={template} onClose={() => setDialog(null)} />
      ) : null}

      <nav className={s.tabs} aria-label={t('editorPage.bian_ji_huo_yu')}>
        <button aria-pressed={tab === 'edit'} onClick={() => setTab('edit')}>
          {t('common.bian_ji')}
        </button>
        <button aria-pressed={tab === 'preview'} onClick={() => setTab('preview')}>
          {t('editorPage.yu_lan')}
        </button>
      </nav>
    </div>
  );
}
