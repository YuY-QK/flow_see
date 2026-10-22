import type { FlowElement } from '@/engine';
import type { FieldDef } from '@/templates/types';
import ui from '@/ui/ui.module.css';

interface Props {
  field: FieldDef;
  value: unknown;
  elements: FlowElement[];
  onChange(value: unknown): void;
  id: string;
}

/** 按模板的字段定义渲染一个表单控件 */
export function FieldInput({ field, value, elements, onChange, id }: Props) {
  if (field.kind === 'element' || field.kind === 'select') {
    const options =
      field.kind === 'element'
        ? elements.map((e) => ({ value: e.id, label: e.name || '（未命名）' }))
        : (field.options ?? []);
    return (
      <select
        id={id}
        className={ui.field}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value || undefined)}
      >
        <option value="">（未指定）</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      id={id}
      className={ui.field}
      type={field.kind === 'number' ? 'number' : 'text'}
      placeholder={field.placeholder}
      value={value === undefined || value === null ? '' : String(value)}
      onChange={(e) =>
        onChange(
          field.kind === 'number'
            ? e.target.value === ''
              ? undefined
              : Number(e.target.value)
            : e.target.value,
        )
      }
    />
  );
}
