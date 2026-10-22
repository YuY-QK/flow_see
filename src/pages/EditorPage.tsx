import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { updateAnimation } from '@/engine';
import { AppearancePanel } from '@/editor/AppearancePanel';
import { ElementsEditor } from '@/editor/ElementsEditor';
import { GeneratedSteps } from '@/editor/GeneratedSteps';
import { ParamsForm } from '@/editor/ParamsForm';
import { StepList } from '@/editor/StepList';
import { useAutosave } from '@/editor/useAutosave';
import s from '@/editor/Editor.module.css';
import { Player } from '@/player/Player';
import { repository } from '@/services/storage';
import { useEditor } from '@/store/editor';
import { getTemplate } from '@/templates/registry';
import { Icon } from '@/ui/Icon';
import ui from '@/ui/ui.module.css';
import { NotFound } from './NotFound';

const SAVE_TEXT = { saved: '已自动保存', saving: '保存中…', error: '保存失败' };

export function EditorPage() {
  const { id = '' } = useParams();
  const { animation, selectedId, saveState, load, apply, select } = useEditor();
  const [missingId, setMissingId] = useState<string | null>(null);
  const [appearance, setAppearance] = useState(false);
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

  if (missingId === id) return <NotFound text="找不到这个作品，它可能已被删除。" />;
  if (!animation || animation.id !== id) return null;

  const template = getTemplate(animation.templateId);
  if (!template) return <NotFound text="这个作品使用的模板暂不支持。" />;

  const selectedIndex = Math.max(
    0,
    animation.steps.findIndex((st) => st.id === selectedId),
  );

  return (
    <div className={s.page}>
      <header className={s.top}>
        <Link to="/" className={s.back}>
          <Icon name="back" size={18} />
          <span className={s.backText}>我的作品</span>
        </Link>
        <label className="sr-only" htmlFor="doc-title">
          动画名称
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
            aria-label="外观"
            aria-expanded={appearance}
            onClick={() => setAppearance((v) => !v)}
          >
            <Icon name="palette" size={18} />
            <span className={s.hideMobile}>外观</span>
          </button>
          <button className={`${ui.btn} ${s.hideMobile}`} disabled title="后续版本开放">
            导出视频 / GIF
          </button>
          <Link to={`/play/${animation.id}`} className={`${ui.btn} ${ui.primary}`}>
            播放
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
                <h2 className={s.sectionTitle}>{template.paramTitle ?? '参数'}</h2>
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
            实时预览
            <span>按空格播放 / 暂停，← → 切换步骤</span>
          </div>
          <Player
            animation={animation}
            template={template}
            focusIndex={selectedIndex}
            variant="embed"
          />
        </div>
      </div>

      <nav className={s.tabs} aria-label="编辑或预览">
        <button aria-pressed={tab === 'edit'} onClick={() => setTab('edit')}>
          编辑
        </button>
        <button aria-pressed={tab === 'preview'} onClick={() => setTab('preview')}>
          预览
        </button>
      </nav>
    </div>
  );
}
