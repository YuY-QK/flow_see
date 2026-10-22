import { useState } from 'react';
import type { FlowElement } from '@/engine';
import type { FieldDef } from '@/templates/types';
import ui from '@/ui/ui.module.css';
import s from './Editor.module.css';
import { parseNumbers } from './parseNumbers';

interface Props {
  field: FieldDef;
  value: unknown;
  elements: FlowElement[];
  onChange(value: unknown): void;
  id: string;
}

function NumbersInput({ field, value, onChange, id }: Props) {
  const initial = Array.isArray(value) ? value.join(', ') : '';
  const [text, setText] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  // 外部（如“随机一组”）改了值时同步输入框
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setText(initial);
    setError(null);
  }

  return (
    <>
      <input
        id={id}
        className={ui.field}
        inputMode="text"
        value={text}
        aria-invalid={!!error}
        aria-describedby={`${id}-hint`}
        onChange={(e) => {
          setText(e.target.value);
          const r = parseNumbers(e.target.value, field);
          if ('error' in r) setError(r.error);
          else {
            setError(null);
            setLastValue(r.values);
            onChange(r.values);
          }
        }}
      />
      <span id={`${id}-hint`} className={error ? s.fieldError : s.fieldHint}>
        {error ?? field.hint}
      </span>
    </>
  );
}

/** 按模板的字段定义渲染一个表单控件 */
export function FieldInput(props: Props) {
  const { field, value, elements, onChange, id } = props;
  if (field.kind === 'numbers') return <NumbersInput {...props} />;
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
        {field.kind === 'element' ? <option value="">（未指定）</option> : null}
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
