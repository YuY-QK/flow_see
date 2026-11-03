import type { FlowElement } from '@/engine';
import type { Template } from '@/templates/types';
import ui from '@/ui/ui.module.css';
import { FieldInput } from './FieldInput';
import s from './Editor.module.css';

interface Props {
  template: Template;
  params: Record<string, unknown>;
  elements: FlowElement[];
  onChange(params: Record<string, unknown>): void;
  idPrefix: string;
}

/** 作品参数表单：编辑器和播放器的“试试改参数”共用 */
export function ParamsForm({ template, params, elements, onChange, idPrefix }: Props) {
  return (
    <div className={s.paramsForm}>
      {(template.paramFields ?? []).map((f) => (
        <div className={s.fieldGroup} key={f.key}>
          <label className={ui.label} htmlFor={`${idPrefix}-${f.key}`}>
            {f.label}
          </label>
          <FieldInput
            id={`${idPrefix}-${f.key}`}
            field={f}
            value={params[f.key]}
            elements={elements}
            onChange={(v) => onChange({ ...params, [f.key]: v })}
          />
        </div>
      ))}
    </div>
  );
}
