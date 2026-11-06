import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { removeStep, updateStep, type Step, t } from '@flow-see/core';
import { runtimeConfig } from '../config';
import { useEditor } from '../store/editor';
import type { Template } from '../template';
import { Icon } from '../ui/Icon';
import ui from '../ui/ui.module.css';
import { FieldInput } from './FieldInput';
import s from './Editor.module.css';

interface Props {
  step: Step;
  index: number;
  template: Template;
  selected: boolean;
  showAdvanced: boolean;
  onToggleAdvanced(): void;
  canDelete: boolean;
}

/** “停留时间”的选项：自动按朗读 + site.yaml 的 editor.stepDurations */
const durations = () => [
  { value: '', label: t('stepCard.zi_dong_an_lang') },
  ...runtimeConfig().editor.stepDurations.map((n) => ({
    value: String(n),
    label: t('stepCard.seconds', { n }),
  })),
];

export function StepCard({
  step,
  index,
  template,
  selected,
  showAdvanced,
  onToggleAdvanced,
  canDelete,
}: Props) {
  const { apply, select } = useEditor();
  const elements = useEditor((st) => st.animation?.elements ?? []);
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : undefined,
  };
  const patch = (p: Partial<Step>) => apply((a) => updateStep(a, step.id, p));
  const fid = (k: string) => `${step.id}-${k}`;
  const basic = template.stepFields.filter((f) => !f.advanced);
  const advanced = template.stepFields.filter((f) => f.advanced);

  const handle = (
    <button
      ref={setActivatorNodeRef}
      className={s.handle}
      aria-label={t('stepCard.drag_aria', { n: index + 1 })}
      {...attributes}
      {...listeners}
    >
      <Icon name="drag" size={18} />
    </button>
  );

  if (!selected) {
    return (
      <div ref={setNodeRef} style={style} className={s.stepRow}>
        {handle}
        <button className={s.stepCollapsed} onClick={() => select(step.id)}>
          <span className={s.num}>{index + 1}</span>
          <span className={s.stepSummary}>
            <span className={s.stepSummaryTitle}>{step.title || t('common.wei_tian_xie')}</span>
            {step.desc ? <span className={s.stepSummaryDesc}>{step.desc}</span> : null}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className={s.stepRow}>
      {handle}
      <div className={s.stepOpen}>
        <div className={s.stepOpenHead}>
          <span className={`${s.num} ${s.numOn}`}>{index + 1}</span>
          <span className={s.stepOpenLabel}>{t('common.step_n', { n: index + 1 })}</span>
          {canDelete ? (
            <button
              className={`${ui.btn} ${ui.ghost} ${ui.icon}`}
              aria-label={t('stepCard.shan_chu_zhe_yi')}
              onClick={() => apply((a) => removeStep(a, step.id))}
            >
              <Icon name="trash" size={18} />
            </button>
          ) : null}
        </div>

        <div className={s.fieldGroup}>
          <label className={ui.label} htmlFor={fid('title')}>
            {t('stepCard.zhe_yi_bu_fa')}
          </label>
          <input
            id={fid('title')}
            className={ui.field}
            value={step.title}
            placeholder={t('stepCard.li_ru_ke_hu')}
            onChange={(e) => patch({ title: e.target.value })}
            autoFocus={!step.title}
          />
        </div>
        <div className={s.fieldGroup}>
          <label className={ui.label} htmlFor={fid('desc')}>
            {t('stepCard.yi_ju_hua_jie')}
          </label>
          <input
            id={fid('desc')}
            className={ui.field}
            value={step.desc}
            placeholder={t('stepCard.yong_da_bai_hua')}
            onChange={(e) => patch({ desc: e.target.value })}
          />
        </div>

        {basic.map((f) => (
          <div className={s.fieldGroup} key={f.key}>
            <label className={ui.label} htmlFor={fid(f.key)}>
              {f.label}
            </label>
            <FieldInput
              id={fid(f.key)}
              field={f}
              value={step.data[f.key]}
              elements={elements}
              onChange={(v) => patch({ data: { [f.key]: v } })}
            />
          </div>
        ))}

        <button className={s.moreBtn} onClick={onToggleAdvanced} aria-expanded={showAdvanced}>
          {showAdvanced ? t('stepCard.shou_qi_geng_duo') : t('stepCard.geng_duo_she_zhi')}
        </button>

        {showAdvanced ? (
          <div className={s.advanced}>
            {advanced.map((f) => (
              <div className={s.fieldGroup} key={f.key}>
                <label className={ui.label} htmlFor={fid(f.key)}>
                  {f.label}
                </label>
                <FieldInput
                  id={fid(f.key)}
                  field={f}
                  value={step.data[f.key]}
                  elements={elements}
                  onChange={(v) => patch({ data: { [f.key]: v } })}
                />
              </div>
            ))}
            <div className={s.fieldGroup}>
              <label className={ui.label} htmlFor={fid('duration')}>
                {t('stepCard.zhe_yi_bu_ting')}
              </label>
              <select
                id={fid('duration')}
                className={ui.field}
                value={step.duration ? String(step.duration) : ''}
                onChange={(e) =>
                  patch({ duration: e.target.value ? Number(e.target.value) : undefined })
                }
              >
                {durations().map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={`${s.fieldGroup} ${s.span2}`}>
              <label className={ui.label} htmlFor={fid('narration')}>
                {t('stepCard.lang_du_nei_rong')}
              </label>
              <input
                id={fid('narration')}
                className={ui.field}
                value={step.narration ?? ''}
                placeholder={t('stepCard.ke_yi_xie_de')}
                onChange={(e) => patch({ narration: e.target.value || undefined })}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
