// 自己做时舞台右侧的出题控件（垂直排列）：自己调题目里的数字；控件、范围来自知识点配置的 explore。
import { sliderRange, t, type ExploreControl, type Scope } from '@flow-see/core';
import s from './StageControls.module.css';

interface Props {
  controls: ExploreControl[];
  /** 当前取值（已含派生值） */
  values: Scope;
  onChange(patch: Scope): void;
}

export function StageControls({ controls, values, onChange }: Props) {
  return (
    <div className={s.side} role="group" aria-label={t('handsOn.controls_aria')}>
      {controls.map((c) => {
        const v = values[c.param];
        if (c.control === 'slider') {
          const { min, max, step } = sliderRange(c, values);
          const n = Number(v);
          return (
            <div key={c.param} className={s.box}>
              <span className={s.label}>{c.label}</span>
              <div className={s.stepper}>
                <button
                  aria-label={t('handsOn.minus', { name: c.label })}
                  disabled={n - step < min}
                  onClick={() => onChange({ [c.param]: n - step })}
                >
                  −
                </button>
                <strong>{String(v)}</strong>
                <button
                  aria-label={t('handsOn.plus', { name: c.label })}
                  disabled={n + step > max}
                  onClick={() => onChange({ [c.param]: n + step })}
                >
                  +
                </button>
              </div>
            </div>
          );
        }
        if (c.control === 'buttons')
          return (
            <div key={c.param} className={s.box}>
              <span className={s.label}>{c.label}</span>
              <div className={s.chips}>
                {(c.options ?? []).map((o) => (
                  <button
                    key={o.label}
                    data-on={o.value === v}
                    aria-pressed={o.value === v}
                    onClick={() => onChange({ [c.param]: o.value })}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          );
        return (
          <label key={c.param} className={`${s.box} ${s.switchRow}`}>
            <span className={s.label}>{c.label}</span>
            <input
              type="checkbox"
              role="switch"
              checked={!!v}
              onChange={(e) => onChange({ [c.param]: e.target.checked })}
            />
          </label>
        );
      })}
    </div>
  );
}
