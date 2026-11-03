import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { removeStep, updateStep, type Step } from '@/engine';
import { useEditor } from '@/store/editor';
import type { Template } from '@/templates/types';
import { Icon } from '@/ui/Icon';
import ui from '@/ui/ui.module.css';
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

const DURATIONS = [
  { value: '', label: '自动（按朗读长度）' },
  { value: '1', label: '1 秒' },
  { value: '2', label: '2 秒' },
  { value: '3', label: '3 秒' },
  { value: '5', label: '5 秒' },
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
      aria-label={`拖动排序：第 ${index + 1} 步`}
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
            <span className={s.stepSummaryTitle}>{step.title || '（未填写）'}</span>
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
          <span className={s.stepOpenLabel}>第 {index + 1} 步</span>
          {canDelete ? (
            <button
              className={`${ui.btn} ${ui.ghost} ${ui.icon}`}
              aria-label="删除这一步"
              onClick={() => apply((a) => removeStep(a, step.id))}
            >
              <Icon name="trash" size={18} />
            </button>
          ) : null}
        </div>

        <div className={s.fieldGroup}>
          <label className={ui.label} htmlFor={fid('title')}>
            这一步发生了什么
          </label>
          <input
            id={fid('title')}
            className={ui.field}
            value={step.title}
            placeholder="例如：客户端发送 SYN"
            onChange={(e) => patch({ title: e.target.value })}
            autoFocus={!step.title}
          />
        </div>
        <div className={s.fieldGroup}>
          <label className={ui.label} htmlFor={fid('desc')}>
            一句话解释（会显示并朗读）
          </label>
          <input
            id={fid('desc')}
            className={ui.field}
            value={step.desc}
            placeholder="用大白话说说为什么"
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
          {showAdvanced ? '收起更多设置 ▴' : '更多设置 ▾'}
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
                这一步停留
              </label>
              <select
                id={fid('duration')}
                className={ui.field}
                value={step.duration ? String(step.duration) : ''}
                onChange={(e) =>
                  patch({ duration: e.target.value ? Number(e.target.value) : undefined })
                }
              >
                {DURATIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={`${s.fieldGroup} ${s.span2}`}>
              <label className={ui.label} htmlFor={fid('narration')}>
                朗读内容（留空则读上面的解释）
              </label>
              <input
                id={fid('narration')}
                className={ui.field}
                value={step.narration ?? ''}
                placeholder="可以写得更口语一点"
                onChange={(e) => patch({ narration: e.target.value || undefined })}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
